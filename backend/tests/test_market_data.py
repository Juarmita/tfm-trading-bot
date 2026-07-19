import pytest
from unittest.mock import MagicMock, patch
import pandas as pd
from datetime import datetime
from app.services.market_data import (
    MarketDataService,
    Quote,
    HistoricalCandle,
    DividendEvent,
    NewsItem
)

@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_get_quote_success(mock_ticker):
    # Simular DataFrame retornado por yfinance con 2 filas (para calcular cambio)
    mock_history = pd.DataFrame(
        {
            "Open": [170.0, 180.0],
            "High": [175.0, 185.0],
            "Low": [168.0, 178.0],
            "Close": [172.0, 182.0],
            "Volume": [1000, 2000],
        },
        index=[
            pd.Timestamp("2026-07-16 09:30:00"),
            pd.Timestamp("2026-07-17 09:30:00")
        ]
    )
    
    mock_instance = MagicMock()
    mock_instance.history.return_value = mock_history
    mock_ticker.return_value = mock_instance

    quote = await MarketDataService.get_quote("AAPL")
    
    assert isinstance(quote, Quote)
    assert quote.symbol == "AAPL"
    assert quote.price == 182.0
    assert quote.change == 10.0
    assert quote.change_pct == (10.0 / 172.0) * 100.0
    assert quote.volume == 2000
    assert isinstance(quote.timestamp, datetime)

@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_get_quote_empty_data(mock_ticker):
    mock_instance = MagicMock()
    mock_instance.history.return_value = pd.DataFrame()
    mock_ticker.return_value = mock_instance

    # Debe lanzar ValueError si la respuesta está vacía
    with pytest.raises(ValueError, match="Símbolo desconocido o sin cotizaciones recientes"):
        await MarketDataService.get_quote("INVALID")

@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_get_historical_success(mock_ticker):
    mock_history = pd.DataFrame(
        {
            "Open": [170.0, 172.0],
            "High": [175.0, 176.0],
            "Low": [168.0, 170.0],
            "Close": [172.0, 175.0],
            "Volume": [1000, 1500],
        },
        index=[
            pd.Timestamp("2026-07-16"),
            pd.Timestamp("2026-07-17")
        ]
    )
    
    mock_instance = MagicMock()
    mock_instance.history.return_value = mock_history
    mock_ticker.return_value = mock_instance

    candles = await MarketDataService.get_historical("AAPL", period="2d", interval="1d")
    
    assert len(candles) == 2
    assert isinstance(candles[0], HistoricalCandle)
    assert candles[0].close == 172.0
    assert candles[1].close == 175.0
    assert candles[1].volume == 1500

@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_get_dividends_success(mock_ticker):
    mock_dividends = pd.Series(
        [0.24, 0.25],
        index=[
            pd.Timestamp(datetime.now() - pd.Timedelta(days=10)),
            pd.Timestamp(datetime.now() - pd.Timedelta(days=40))
        ]
    )
    
    mock_instance = MagicMock()
    mock_instance.dividends = mock_dividends
    mock_ticker.return_value = mock_instance

    # Filtrar dividendos de los últimos 30 días (solo debe quedar 1 de los 2)
    dividends = await MarketDataService.get_dividends("AAPL", days_range=30)
    
    assert len(dividends) == 1
    assert isinstance(dividends[0], DividendEvent)
    assert dividends[0].value == 0.24

@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_get_news_success(mock_ticker):
    mock_news = [
        {
            "title": "AAPL Stock Rallies",
            "publisher": "Reuters",
            "link": "https://reuters.com/aapl",
            "providerPublishTime": 1784310000
        }
    ]
    
    mock_instance = MagicMock()
    mock_instance.news = mock_news
    mock_ticker.return_value = mock_instance

    news = await MarketDataService.get_news("AAPL", limit=1)
    
    assert len(news) == 1
    assert isinstance(news[0], NewsItem)
    assert news[0].title == "AAPL Stock Rallies"
    assert news[0].publisher == "Reuters"
    assert news[0].link == "https://reuters.com/aapl"

@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_get_quote_cache_hit_consecutive(mock_ticker):
    # Simular DataFrame retornado por yfinance
    mock_history = pd.DataFrame(
        {
            "Open": [170.0, 180.0],
            "High": [175.0, 185.0],
            "Low": [168.0, 178.0],
            "Close": [172.0, 182.0],
            "Volume": [1000, 2000],
        },
        index=[
            pd.Timestamp("2026-07-16 09:30:00"),
            pd.Timestamp("2026-07-17 09:30:00")
        ]
    )
    mock_instance = MagicMock()
    mock_instance.history.return_value = mock_history
    mock_ticker.return_value = mock_instance

    # Primera llamada (miss, setea caché)
    quote1 = await MarketDataService.get_quote("AAPL_TEMP")
    assert quote1.price == 182.0

    # Segunda llamada (hit, lee de caché y parsea)
    quote2 = await MarketDataService.get_quote("AAPL_TEMP")
    assert quote2.price == 182.0

    # Tercera llamada (hit, no debe fallar con fromisoformat: argument must be str)
    quote3 = await MarketDataService.get_quote("AAPL_TEMP")
    assert quote3.price == 182.0

