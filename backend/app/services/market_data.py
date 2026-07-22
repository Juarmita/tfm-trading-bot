import asyncio
import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import redis
import yfinance as yf
from pydantic import BaseModel, Field

# Logger configuration (Structured JSON output)
logger = logging.getLogger("market_data_service")
logger.setLevel(logging.INFO)


def log_structured(symbol: str, cache_hit: bool, latency_ms: float, source: str, status: str = "success") -> None:
    log_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "INFO",
        "service": "market_data",
        "symbol": symbol,
        "cache_hit": cache_hit,
        "latency_ms": round(latency_ms, 2),
        "source": source,
        "status": status,
    }
    print(json.dumps(log_data))


# -------------------------------------------------------------------------
# 1. PYDANTIC SCHEMAS
# -------------------------------------------------------------------------


class Quote(BaseModel):
    symbol: str = Field(..., description="Ticker bursátil o par de criptomonedas")
    price: float = Field(..., description="Precio actual de ejecución")
    change: float = Field(..., description="Cambio absoluto en la sesión")
    change_pct: float = Field(..., description="Cambio porcentual en la sesión")
    volume: int = Field(..., description="Volumen acumulado transaccionado")
    timestamp: datetime = Field(..., description="Marca de tiempo de la cotización")


class HistoricalCandle(BaseModel):
    date: datetime = Field(..., description="Fecha de la vela")
    open: float = Field(..., description="Precio de apertura")
    high: float = Field(..., description="Precio máximo alcanzado")
    low: float = Field(..., description="Precio mínimo alcanzado")
    close: float = Field(..., description="Precio de cierre")
    volume: int = Field(..., description="Volumen negociado")


class DividendEvent(BaseModel):
    date: datetime = Field(..., description="Fecha de pago del dividendo")
    value: float = Field(..., description="Monto distribuido por acción")


class NewsItem(BaseModel):
    title: str = Field(..., description="Título de la noticia")
    publisher: str = Field(..., description="Proveedor o editor de la noticia")
    link: str = Field(..., description="Enlace web completo a la noticia")
    provider_publish_time: datetime = Field(..., description="Fecha y hora de publicación")


# -------------------------------------------------------------------------
# 2. SISTEMA DE CACHÉ (Memoria LRU con fallback a Redis)
# -------------------------------------------------------------------------


class TimedMemoryCache:
    def __init__(self) -> None:
        self._cache: Dict[str, tuple[float, Any]] = {}

    def get(self, key: str, max_age_seconds: int) -> Optional[Any]:
        if key not in self._cache:
            return None
        timestamp, value = self._cache[key]
        if time.time() - timestamp > max_age_seconds:
            del self._cache[key]
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = (time.time(), value)


# Inicializar caché en memoria
memory_cache = TimedMemoryCache()

# Conexión opcional a Redis
redis_client: Optional[redis.Redis] = None
redis_url = os.getenv("REDIS_URL")
if redis_url:
    try:
        redis_client = redis.from_url(redis_url, decode_responses=True)
        logger.info("Conectado con éxito a Redis para almacenamiento de caché.")
    except Exception as e:
        logger.warning(f"Error al conectar con Redis ({e}). Usando caché en memoria local.")


def get_cached_data(key: str, max_age_seconds: int) -> Optional[Any]:
    if redis_client:
        try:
            cached_val = redis_client.get(key)
            if cached_val:
                return json.loads(cached_val)
        except Exception:
            pass
    return memory_cache.get(key, max_age_seconds)


def set_cached_data(key: str, value: Any, max_age_seconds: int) -> None:
    if redis_client:
        try:
            redis_client.setex(key, max_age_seconds, json.dumps(value))
            return
        except Exception:
            pass
    memory_cache.set(key, value)


# -------------------------------------------------------------------------
# 3. RATE LIMITING LOCAL (Token Bucket por Símbolo)
# -------------------------------------------------------------------------


class TokenBucketRateLimiter:
    def __init__(self, rate: int = 60, per_seconds: int = 60) -> None:
        self.rate = rate
        self.per_seconds = per_seconds
        self.buckets: Dict[str, tuple[float, float]] = {}

    def consume(self, symbol: str) -> bool:
        now = time.time()
        if symbol not in self.buckets:
            self.buckets[symbol] = (now, float(self.rate))
            return True

        last_update, tokens = self.buckets[symbol]
        elapsed = now - last_update
        # Reponer tokens basado en el tiempo transcurrido
        new_tokens = min(float(self.rate), tokens + elapsed * (self.rate / self.per_seconds))

        if new_tokens >= 1.0:
            self.buckets[symbol] = (now, new_tokens - 1.0)
            return True

        self.buckets[symbol] = (now, new_tokens)
        return False


rate_limiter = TokenBucketRateLimiter(rate=60, per_seconds=60)

# -------------------------------------------------------------------------
# 4. IMPLEMENTACIÓN DE BÚSQUEDA Y VALIDACIÓN DE DATOS (yfinance)
# -------------------------------------------------------------------------


class MarketDataService:
    _exchange_rates_cache: Dict[str, float] = {}
    _exchange_rates_timestamp: Dict[str, float] = {}

    @staticmethod
    async def _fetch_with_backoff(func: Any, *args: Any, **kwargs: Any) -> Any:
        """Ejecuta una llamada yFinance de forma segura con retardo exponencial."""
        retries = 3
        delay = 1.0
        for i in range(retries):
            try:
                # Ejecutar yfinance sincrónico en un executor asíncrono para no bloquear la app
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, lambda: func(*args, **kwargs))
            except Exception as e:
                if i == retries - 1:
                    raise e
                await asyncio.sleep(delay)
                delay *= 2.0

    @classmethod
    async def get_quote(cls, symbol: str) -> Quote:
        # 1. Comprobar Rate Limiting
        if not rate_limiter.consume(symbol):
            raise ValueError(f"Límite de solicitudes superado (Rate Limit: 60/min) para: {symbol}")

        # 2. Comprobar Caché (10 minutos para Quotes)
        cache_key = f"quote:{symbol.upper()}"
        cached = get_cached_data(cache_key, 600)
        start_time = time.time()

        if cached:
            log_structured(symbol, True, (time.time() - start_time) * 1000, "cache")
            # Parsear fecha almacenada (copiando para evitar mutación in-place del caché)
            cached_copy = dict(cached)
            if isinstance(cached_copy["timestamp"], str):
                cached_copy["timestamp"] = datetime.fromisoformat(cached_copy["timestamp"])
            return Quote(**cached_copy)

        # 3. Consultar yFinance
        try:
            ticker = yf.Ticker(symbol)
            # Descargamos los últimos 2 días para calcular el cambio
            history = await cls._fetch_with_backoff(ticker.history, period="2d")

            if history.empty:
                raise ValueError(f"Símbolo desconocido o sin cotizaciones recientes: {symbol}")

            latest = history.iloc[-1]
            prev_close = history.iloc[-2]["Close"] if len(history) > 1 else latest["Open"]

            # Limpieza y conversión a tipos nativos de python
            price = float(latest["Close"])
            prev_close_val = float(prev_close)
            change = price - prev_close_val
            change_pct = (change / prev_close_val) * 100.0 if prev_close_val else 0.0
            volume = int(latest["Volume"])
            timestamp = history.index[-1].to_pydatetime()

            if np.isnan(price) or np.isnan(change):
                raise ValueError("Se detectaron valores NaN inválidos en la respuesta de mercado.")

            quote = Quote(
                symbol=symbol.upper(),
                price=price,
                change=change,
                change_pct=change_pct,
                volume=volume,
                timestamp=timestamp,
            )

            # Serializar y almacenar en caché
            cache_val = quote.model_dump()
            cache_val["timestamp"] = quote.timestamp.isoformat()
            set_cached_data(cache_key, cache_val, 600)

            log_structured(symbol, False, (time.time() - start_time) * 1000, "yfinance")
            return quote

        except Exception as e:
            log_structured(symbol, False, (time.time() - start_time) * 1000, "yfinance", "failed")
            raise ValueError(f"Error al obtener cotización para {symbol}: {str(e)}")

    @classmethod
    async def get_historical(cls, symbol: str, period: str = "6mo", interval: str = "1d") -> List[HistoricalCandle]:
        # 1. Comprobar Caché (1 hora para históricos)
        cache_key = f"historical:{symbol.upper()}:{period}:{interval}"
        cached = get_cached_data(cache_key, 3600)
        start_time = time.time()

        if cached:
            log_structured(symbol, True, (time.time() - start_time) * 1000, "cache")
            candles = []
            for candle in cached:
                candle_copy = dict(candle)
                if isinstance(candle_copy["date"], str):
                    candle_copy["date"] = datetime.fromisoformat(candle_copy["date"])
                candles.append(HistoricalCandle(**candle_copy))
            return candles

        # 2. Consultar yFinance
        try:
            ticker = yf.Ticker(symbol)
            history = await cls._fetch_with_backoff(ticker.history, period=period, interval=interval)

            if history.empty:
                raise ValueError(f"Símbolo desconocido o sin datos históricos: {symbol}")

            candles = []
            for dt, row in history.iterrows():
                # Filtrar valores nulos o corruptos
                if pd.isna(row["Open"]) or pd.isna(row["Close"]):
                    continue

                candles.append(
                    HistoricalCandle(
                        date=dt.to_pydatetime(),
                        open=float(row["Open"]),
                        high=float(row["High"]),
                        low=float(row["Low"]),
                        close=float(row["Close"]),
                        volume=int(row["Volume"]),
                    )
                )

            # Almacenar en caché
            cache_val = [c.model_dump() for c in candles]
            for c in cache_val:
                c["date"] = c["date"].isoformat()

            set_cached_data(cache_key, cache_val, 3600)

            log_structured(symbol, False, (time.time() - start_time) * 1000, "yfinance")
            return candles

        except Exception as e:
            log_structured(symbol, False, (time.time() - start_time) * 1000, "yfinance", "failed")
            raise ValueError(f"Error al obtener datos históricos para {symbol}: {str(e)}")

    @classmethod
    async def get_dividends(cls, symbol: str, days_range: int = 30) -> List[DividendEvent]:
        # 1. Consultar yFinance
        start_time = time.time()
        try:
            ticker = yf.Ticker(symbol)
            dividends = await cls._fetch_with_backoff(lambda: ticker.dividends)

            events = []
            if dividends is not None and not dividends.empty:
                cutoff_date = datetime.now() - timedelta(days=days_range)
                for dt, val in dividends.items():
                    event_date = dt.to_pydatetime().replace(tzinfo=None)
                    if event_date >= cutoff_date:
                        events.append(DividendEvent(date=dt.to_pydatetime(), value=float(val)))

            log_structured(symbol, False, (time.time() - start_time) * 1000, "yfinance")
            return events

        except Exception as e:
            log_structured(symbol, False, (time.time() - start_time) * 1000, "yfinance", "failed")
            raise ValueError(f"Error al obtener dividendos para {symbol}: {str(e)}")

    @classmethod
    async def get_news(cls, symbol: str, limit: int = 5) -> List[NewsItem]:
        start_time = time.time()
        try:
            ticker = yf.Ticker(symbol)
            raw_news = await cls._fetch_with_backoff(lambda: ticker.news)

            news_items = []
            if raw_news and isinstance(raw_news, list):
                for item in raw_news[:limit]:
                    if not isinstance(item, dict):
                        continue

                    content = item.get("content") or {}
                    if not isinstance(content, dict):
                        content = {}

                    if content:
                        title = content.get("title") or item.get("title") or "Sin Título"
                        provider = content.get("provider") or {}
                        if not isinstance(provider, dict):
                            provider = {}

                        publisher = (
                            provider.get("displayName")
                            or provider.get("name")
                            or item.get("publisher")
                            or "Desconocido"
                        )

                        click_url = content.get("clickThroughUrl") or {}
                        if not isinstance(click_url, dict):
                            click_url = {}

                        canon_url = content.get("canonicalUrl") or {}
                        if not isinstance(canon_url, dict):
                            canon_url = {}

                        link = click_url.get("url") or canon_url.get("url") or item.get("link") or "#"
                        pub_date_str = content.get("pubDate")
                        if pub_date_str and isinstance(pub_date_str, str):
                            try:
                                if pub_date_str.endswith("Z"):
                                    pub_date_str = pub_date_str[:-1] + "+00:00"
                                provider_publish_time = datetime.fromisoformat(pub_date_str)
                            except Exception:
                                provider_publish_time = datetime.now(timezone.utc)
                        else:
                            pub_ts = item.get("providerPublishTime", 0)
                            try:
                                provider_publish_time = datetime.fromtimestamp(float(pub_ts), timezone.utc)
                            except Exception:
                                provider_publish_time = datetime.now(timezone.utc)
                    else:
                        title = item.get("title") or "Sin Título"
                        publisher = item.get("publisher") or "Desconocido"
                        link = item.get("link") or "#"
                        pub_ts = item.get("providerPublishTime", 0)
                        try:
                            provider_publish_time = datetime.fromtimestamp(float(pub_ts), timezone.utc)
                        except Exception:
                            provider_publish_time = datetime.now(timezone.utc)

                    news_items.append(
                        NewsItem(
                            title=str(title),
                            publisher=str(publisher),
                            link=str(link),
                            provider_publish_time=provider_publish_time,
                        )
                    )

            log_structured(symbol, False, (time.time() - start_time) * 1000, "yfinance")
            return news_items

        except Exception as e:
            log_structured(symbol, False, (time.time() - start_time) * 1000, "yfinance", "failed")
            logger.warning(f"No se pudieron obtener noticias para {symbol}: {str(e)}")
            return []

    @classmethod
    async def get_usd_exchange_rate(cls, currency: str) -> float:
        """Obtiene la tasa de cambio a USD para una moneda dada (ej: EUR, GBP, GBp, CNY)."""
        if not hasattr(cls, "_exchange_rates_cache"):
            cls._exchange_rates_cache = {}
            cls._exchange_rates_timestamp = {}

        if not currency:
            return 1.0

        currency_upper = currency.upper().strip()
        if currency_upper in ("USD", "U.S. DOLLAR", "$"):
            return 1.0

        # Identificar si es peniques (GBp o GBX)
        is_pence = currency_upper in ("GBp", "GBX", "PENCE")
        lookup_curr = "GBP" if is_pence else currency_upper

        now = time.time()
        # Caché de 1 hora
        if lookup_curr in cls._exchange_rates_cache and (
            now - cls._exchange_rates_timestamp.get(lookup_curr, 0.0) < 3600
        ):
            rate_val: float = float(cls._exchange_rates_cache[lookup_curr])
            return (rate_val / 100.0) if is_pence else rate_val

        fallbacks = {"EUR": 1.09, "GBP": 1.28, "CNY": 0.14, "RMB": 0.14}
        rate = fallbacks.get(lookup_curr, 1.0)

        try:
            if lookup_curr in ("CNY", "RMB"):
                # Para CNY, yfinance usa USDCNY=X (cuántos CNY por 1 USD)
                fx_ticker = yf.Ticker("USDCNY=X")
                loop = asyncio.get_event_loop()
                df = await loop.run_in_executor(None, lambda: fx_ticker.history(period="1d"))
                if not df.empty and float(df["Close"].iloc[-1]) > 0:
                    cny_per_usd = float(df["Close"].iloc[-1])
                    rate = 1.0 / cny_per_usd
            else:
                fx_ticker = yf.Ticker(f"{lookup_curr}USD=X")
                loop = asyncio.get_event_loop()
                df = await loop.run_in_executor(None, lambda: fx_ticker.history(period="1d"))
                if not df.empty and float(df["Close"].iloc[-1]) > 0:
                    rate = float(df["Close"].iloc[-1])
        except Exception:
            pass

        cls._exchange_rates_cache[lookup_curr] = rate
        cls._exchange_rates_timestamp[lookup_curr] = now

        return (rate / 100.0) if is_pence else rate

    @classmethod
    async def get_exchange_rate(cls, from_currency: str, to_currency: str) -> float:
        """Obtiene la tasa de conversión directa entre dos divisas cualesquiera (ej: EUR a CNY, GBP a EUR)."""
        from_curr = (from_currency or "USD").upper().strip()
        to_curr = (to_currency or "USD").upper().strip()

        if from_curr == to_curr:
            return 1.0

        rate_from_usd = await cls.get_usd_exchange_rate(from_curr)
        rate_to_usd = await cls.get_usd_exchange_rate(to_curr)

        if rate_to_usd <= 0:
            return 1.0

        return rate_from_usd / rate_to_usd
