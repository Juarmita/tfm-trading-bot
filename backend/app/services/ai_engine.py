import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Literal
from uuid import UUID, uuid4

import numpy as np
import pandas as pd
import yfinance as yf
from pydantic import BaseModel, ConfigDict, Field

# Logger setup (structured JSONL logs)
logger = logging.getLogger("ai_engine")
logger.setLevel(logging.INFO)


def log_academic_jsonl(
    symbol: str,
    factors_used: List[str],
    weights: Dict[str, float],
    confidence: float,
    latency_ms: float,
    cache_status: str,
    decision_id: UUID,
) -> None:
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "decision_id": str(decision_id),
        "symbol": symbol,
        "factors_used": factors_used,
        "weights_applied": weights,
        "confidence": round(confidence, 2),
        "latency_ms": round(latency_ms, 2),
        "cache_status": cache_status,
    }
    print(json.dumps(log_entry))


# -------------------------------------------------------------------------
# 1. PYDANTIC SCHEMAS (Pydantic v2)
# -------------------------------------------------------------------------


class ExecutionOrder(BaseModel):
    action: Literal["BUY", "SELL", "HOLD"] = Field(..., description="Acción de orden comercial")
    symbol: str = Field(..., description="Ticker del activo financiero")
    quantity: float = Field(..., description="Cantidad calculada de acciones a comprar/vender")
    price_estimated: float = Field(..., description="Precio estimado de mercado")
    amount_usd: float = Field(..., description="Monto total estimado de la operación en USD")
    reason: str = Field(..., description="Razón individual asociada a esta orden")


class AIDecisionOutput(BaseModel):
    session_id: UUID = Field(..., description="Identificador único de la sesión de toma de decisiones")
    symbol: str = Field(..., description="Símbolo del activo analizado")
    decision: Literal["BUY", "SELL", "HOLD"] = Field(..., description="Decisión final recomendada")
    confidence_score: float = Field(..., description="Nivel de confianza de la decisión", ge=0.0, le=1.0)
    allocated_capital: float = Field(..., description="Capital fiduciario total asignado para la operación")
    orders: List[ExecutionOrder] = Field(..., description="Arreglo de órdenes de compra/venta generadas")
    reasoning_markdown: str = Field(..., description="Razonamiento lógico completo formateado en Markdown académico")


class MarketDataSnapshot(BaseModel):
    """DTO desacoplado con la instantánea de datos de mercado necesaria para inferencia pura."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    symbol: str
    historical_df: Any  # pd.DataFrame
    info: Dict[str, Any]
    currency: str
    usd_rate: float
    concentration: float
    correlation: float


# -------------------------------------------------------------------------
# 2. MOTOR DE CÁLCULO E INFERENCIA QUANTITATIVA (AI ENGINE)
# -------------------------------------------------------------------------


class AIEngineService:
    @staticmethod
    def calculate_technical_indicators(df: pd.DataFrame) -> Dict[str, float]:
        """Calcula indicadores técnicos de mercado (SMA, EMA, RSI, MACD, ATR, Vol).

        Es una función matemática pura sin efectos secundarios ni I/O.
        """
        close = df["Close"]
        high = df["High"]
        low = df["Low"]
        volume = df["Volume"]

        # 1. SMAs
        sma20 = float(close.rolling(20).mean().iloc[-1])
        sma50 = float(close.rolling(50).mean().iloc[-1])
        sma200 = float(close.rolling(200).mean().iloc[-1])

        # 2. EMAs
        ema12 = float(close.ewm(span=12, adjust=False).mean().iloc[-1])
        ema26 = float(close.ewm(span=26, adjust=False).mean().iloc[-1])

        # 3. RSI14
        delta = close.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(14).mean()
        avg_loss = loss.rolling(14).mean()
        rs = avg_gain / avg_loss
        rsi14 = float((100 - (100 / (1 + rs))).iloc[-1])

        # 4. MACD (12, 26, 9)
        macd_line = close.ewm(span=12, adjust=False).mean() - close.ewm(span=26, adjust=False).mean()
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        macd_val = float(macd_line.iloc[-1])
        macd_signal = float(signal_line.iloc[-1])

        # 5. ATR14 (Average True Range)
        prev_close = close.shift(1)
        tr = pd.concat([high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1).max(axis=1)
        atr14 = float(tr.rolling(14).mean().iloc[-1])

        # 6. Volumen Relativo vs Media 20d
        vol_sma20 = volume.rolling(20).mean()
        rel_vol = float((volume / vol_sma20).iloc[-1])

        # 7. Drawdown Máximo (últimos 90 días)
        last_90 = close.iloc[-90:] if len(close) >= 90 else close
        roll_max = last_90.cummax()
        drawdown = (last_90 - roll_max) / roll_max
        max_drawdown = float(drawdown.min() * -100.0)

        latest_price = float(close.iloc[-1])
        metrics = {
            "price": latest_price,
            "sma20": sma20 if not np.isnan(sma20) else latest_price,
            "sma50": sma50 if not np.isnan(sma50) else latest_price,
            "sma200": sma200 if not np.isnan(sma200) else latest_price,
            "ema12": ema12 if not np.isnan(ema12) else latest_price,
            "ema26": ema26 if not np.isnan(ema26) else latest_price,
            "rsi14": rsi14 if not np.isnan(rsi14) else 50.0,
            "macd": macd_val if not np.isnan(macd_val) else 0.0,
            "macd_signal": macd_signal if not np.isnan(macd_signal) else 0.0,
            "atr14": atr14 if not np.isnan(atr14) else 1.0,
            "rel_vol": rel_vol if not np.isnan(rel_vol) else 1.0,
            "max_drawdown": max_drawdown if not np.isnan(max_drawdown) else 0.0,
        }
        return metrics

    @staticmethod
    def get_portfolio_concentration(user_id: UUID, symbol: str) -> float:
        """Simula la concentración actual de este símbolo en la cartera del usuario."""
        return 0.12

    @staticmethod
    def get_portfolio_correlation(symbol: str) -> float:
        """Simula la correlación de rendimientos históricos de este símbolo vs portafolio."""
        return 0.45

    @classmethod
    def evaluate_quantitative_strategy(
        cls,
        snapshot: MarketDataSnapshot,
        user_id: UUID,
        symbol: str,
        strategy_type: Literal["long_term", "short_term"],
        available_capital: Decimal,
        session_id: UUID,
        start_time: float,
    ) -> AIDecisionOutput:
        """Función pura de evaluación estratégica e inferencia cuantitativa (Clean Domain Layer).

        Realiza cálculos de puntuación, evaluación de riesgo, dimensionamiento de posición y
        generación de orden sin realizar ninguna llamada de red ni E/S.
        """
        symbol_upper = symbol.upper()
        df: pd.DataFrame = snapshot.historical_df
        metrics = cls.calculate_technical_indicators(df)
        info = snapshot.info

        # Fundamental data parsing
        pe = float(info.get("forwardPE") or info.get("trailingPE") or 22.0)
        sector_pe = 25.0
        div_yield = float((info.get("dividendYield") or 0.0) * 100.0)
        debt_equity = float(info.get("debtToEquity") or 85.0)

        fundamentals = {"pe": pe, "sector_pe": sector_pe, "div_yield": div_yield, "debt_equity": debt_equity}

        concentration = snapshot.concentration
        correlation = snapshot.correlation

        risk_factors = {
            "concentration_pct": concentration * 100.0,
            "correlation": correlation,
            "max_drawdown": metrics["max_drawdown"],
        }

        # Penalizaciones de riesgo
        concentration_penalty = concentration > 0.30
        drawdown_penalty = metrics["max_drawdown"] > 25.0
        correlation_penalty = correlation > 0.70

        # Enrutamiento de Estrategia
        decision: Literal["BUY", "SELL", "HOLD"] = "HOLD"
        score = 0
        factors_used: List[str] = []
        weights: Dict[str, float] = {}

        if strategy_type == "long_term":
            factors_used = ["dividend_yield", "momentum", "valuation"]
            weights = {"dividend_yield": 0.3, "momentum": 0.4, "valuation": 0.3}

            if div_yield > 2.0:
                score += 3
            if metrics["sma50"] > metrics["sma200"]:
                score += 4
            if pe < sector_pe:
                score += 3

            if score >= 7:
                decision = "BUY"
            elif score <= 3:
                decision = "SELL"

        else:  # short_term
            factors_used = ["rsi_oscillator", "relative_volume", "macd_momentum"]
            weights = {"rsi_oscillator": 0.4, "relative_volume": 0.3, "macd_momentum": 0.3}

            if metrics["rsi14"] < 30:
                score += 4
            elif metrics["rsi14"] > 70:
                score = 0
                decision = "SELL"

            if metrics["rel_vol"] > 1.5:
                score += 3
            if metrics["macd"] > metrics["macd_signal"]:
                score += 3

            if decision != "SELL":
                if score >= 6:
                    decision = "BUY"
                elif score <= 2:
                    decision = "SELL"

        # Aplicar restricciones de Gestión de Riesgo sobre la decisión BUY
        final_capital = float(available_capital)
        confidence = float(score) / 10.0 if decision != "HOLD" else 0.5
        confidence = min(max(confidence, 0.0), 1.0)

        if decision == "BUY":
            if concentration_penalty:
                decision = "HOLD"
                confidence = 0.3
                final_capital = 0.0
            else:
                if drawdown_penalty:
                    final_capital *= 0.5
                if correlation_penalty:
                    final_capital *= 0.8

        price = metrics["price"]
        currency = snapshot.currency
        usd_rate = snapshot.usd_rate
        price_usd = price * usd_rate

        qty = (final_capital / price_usd) if price_usd > 0 and final_capital > 0 else 0.0

        orders: List[ExecutionOrder] = []
        if decision != "HOLD" and qty > 0:
            orders.append(
                ExecutionOrder(
                    action=decision,
                    symbol=symbol_upper,
                    quantity=round(qty, 4),
                    price_estimated=round(price_usd, 2),
                    amount_usd=round(qty * price_usd, 2),
                    reason=f"Ejecución de orden automática gatillada por estrategia {strategy_type}.",
                )
            )

        price_display = (
            f"${price:.2f} USD" if currency == "USD" else f"{price:.2f} {currency} (equiv. a ${price_usd:.2f} USD)"
        )

        reasoning_md = f"""# Decisión IA (ID: {session_id})

## 📊 Factores Técnicos
- **Precio de Cierre Actual**: {price_display}
- **SMA (20 / 50 / 200)**: {metrics['sma20']:.2f} / {metrics['sma50']:.2f} / {metrics['sma200']:.2f}
- **RSI (14)**: {metrics['rsi14']:.2f} ({"Sobrecompra (>70)" if metrics['rsi14'] > 70 else "Sobreventa (<30)" if metrics['rsi14'] < 30 else "Neutral"})
- **MACD (12, 26, 9)**: MACD {metrics['macd']:.4f} (Señal: {metrics['macd_signal']:.4f})
- **ATR (14)**: {metrics['atr14']:.2f} (Volatilidad del Activo)
- **Volumen Relativo**: {metrics['rel_vol']:.2f}x (comparado con la media de 20 días)

## 🏢 Fundamentales y Dividendos
- **Ratio Precio/Ganancias (P/E)**: {fundamentals['pe']:.2f} (Media Sectorial: {fundamentals['sector_pe']:.2f})
- **Rendimiento de Dividendos Anualizado**: {fundamentals['div_yield']:.2f}%
- **Ratio Deuda / Patrimonio (Debt to Equity)**: {fundamentals['debt_equity']:.2f}%

## ⚖️ Gestión de Riesgo
- **Drawdown Máximo 90d**: {metrics['max_drawdown']:.2f}% ({"Excedido >25% - Asignación reducida en 50%" if drawdown_penalty else "Dentro de límites"})
- **Concentración de Cartera**: {risk_factors['concentration_pct']:.2f}% ({"Excedida >30% - OPERACIÓN CANCELADA (HOLD)" if concentration_penalty else "Adecuada"})
- **Correlación del Portafolio**: {risk_factors['correlation']:.2f} ({"Alta >0.70 - Tamaño reducido en 20%" if correlation_penalty else "Nivel de diversificación correcto"})

## 🎯 Horizonte: {strategy_type.upper()}
- **Decisión Final**: {decision}
- **Score Acumulado**: {score}/10
- **Nivel de Confianza**: {confidence * 100:.1f}%
- **Monto de Capital Asignado**: ${final_capital:.2f} USD

## ✅ Exec Plan JSON
```json
{{
  "action": "{decision}",
  "symbol": "{symbol_upper}",
  "confidence": {confidence:.2f},
  "allocated_capital": {final_capital:.2f}
}}
```
"""

        decision_output = AIDecisionOutput(
            session_id=session_id,
            symbol=symbol_upper,
            decision=decision,
            confidence_score=confidence,
            allocated_capital=round(final_capital, 2),
            orders=orders,
            reasoning_markdown=reasoning_md,
        )

        latency = (time.time() - start_time) * 1000
        log_academic_jsonl(symbol_upper, factors_used, weights, confidence, latency, "MISS", session_id)

        return decision_output

    @classmethod
    async def analyze_and_decide(
        cls,
        user_id: UUID,
        symbol: str,
        strategy_type: Literal["long_term", "short_term"],
        available_capital: Decimal,
        max_iterations: int = 3,
    ) -> AIDecisionOutput:
        """Orquestador de Aplicación (Clean Infrastructure/App Layer).

        Recupera datos de E/S externas y delega el cálculo puro al dominio.
        """
        start_time = time.time()
        session_id = uuid4()
        symbol_upper = symbol.upper()

        # 1. Obtener Histórico (E/S externa)
        ticker = yf.Ticker(symbol_upper)
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(None, lambda: ticker.history(period="1y"))

        if df.empty or len(df) == 0:
            raise ValueError(
                f"El símbolo '{symbol_upper}' no existe en Yahoo Finance o ha sido deslistado. "
                f"Verifica el ticker e inténtalo de nuevo."
            )

        # 2. Obtener Info Fundamental (E/S externa)
        info: Dict[str, Any] = {}
        try:
            info = ticker.info or {}
        except Exception:
            info = {}

        # 3. Moneda y tasa de cambio (E/S externa)
        currency = "USD"
        try:
            currency = str(info.get("currency") or "USD")
        except Exception:
            if symbol_upper.endswith((".MC", ".DE", ".PA")):
                currency = "EUR"
            elif symbol_upper.endswith(".L"):
                currency = "GBp"

        # Importación diferida para prevenir ciclo circular de módulos
        from app.services.market_data import MarketDataService

        usd_rate = await MarketDataService.get_usd_exchange_rate(currency)
        concentration = cls.get_portfolio_concentration(user_id, symbol_upper)
        correlation = cls.get_portfolio_correlation(symbol_upper)

        snapshot = MarketDataSnapshot(
            symbol=symbol_upper,
            historical_df=df,
            info=info,
            currency=currency,
            usd_rate=usd_rate,
            concentration=concentration,
            correlation=correlation,
        )

        return cls.evaluate_quantitative_strategy(
            snapshot=snapshot,
            user_id=user_id,
            symbol=symbol_upper,
            strategy_type=strategy_type,
            available_capital=available_capital,
            session_id=session_id,
            start_time=start_time,
        )
