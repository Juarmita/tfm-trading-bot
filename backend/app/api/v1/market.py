from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.services.market_data import (
    MarketDataService,
    Quote,
    HistoricalCandle,
    DividendEvent,
    NewsItem
)

router = APIRouter()

@router.get("/quotes/{symbols}", response_model=List[Quote])
async def get_quotes(symbols: str):
    """
    Obtiene la cotización actual para uno o varios símbolos bursátiles (separados por comas).
    Soporte batch: /api/v1/market/quotes/AAPL,MSFT,BTC-USD
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        raise HTTPException(
            status_code=400,
            detail="Falta el parámetro de símbolos o está vacío."
        )

    quotes = []
    errors = []

    for sym in symbol_list:
        try:
            quote = await MarketDataService.get_quote(sym)
            quotes.append(quote)
        except Exception as e:
            errors.append(f"{sym}: {str(e)}")

    # Si no se pudo obtener ninguna cotización y hubo errores, lanzar excepción 400
    if not quotes and errors:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo recuperar ninguna cotización. Detalles: {'; '.join(errors)}"
        )

    return quotes

@router.get("/historical/{symbol}", response_model=List[HistoricalCandle])
async def get_historical(
    symbol: str,
    period: str = Query("6mo", description="Rango temporal (ej. 1mo, 3mo, 6mo, 1y, max)"),
    interval: str = Query("1d", description="Frecuencia de las velas (ej. 15m, 1h, 1d, 1wk)")
):
    """
    Obtiene el historial de velas japonesas (OHLCV) para un activo financiero específico.
    """
    try:
        candles = await MarketDataService.get_historical(symbol, period, interval)
        return candles
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/dividends/{symbol}", response_model=List[DividendEvent])
async def get_dividends(
    symbol: str,
    range: str = Query("30d", description="Rango de búsqueda hacia atrás (ej: 30d, 90d, 365d)")
):
    """
    Obtiene los eventos de pago de dividendos distribuidos por una compañía.
    """
    # Intentar parsear los días del rango, default a 30
    days = 30
    try:
        days_str = range.lower().replace("d", "")
        days = int(days_str)
    except ValueError:
        pass

    try:
        dividends = await MarketDataService.get_dividends(symbol, days)
        return dividends
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/news/{symbol}", response_model=List[NewsItem])
async def get_news(
    symbol: str,
    limit: int = Query(5, ge=1, le=10, description="Límite máximo de artículos a recuperar")
):
    """
    Obtiene los últimos artículos de prensa financiera y noticias del activo.
    """
    try:
        news = await MarketDataService.get_news(symbol, limit)
        return news
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
