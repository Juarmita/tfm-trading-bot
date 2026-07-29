import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from app.services.market_data import Quote, HistoricalCandle, DividendEvent, NewsItem


def test_get_quotes_api_success(client):
    mock_quote = Quote(
        symbol="AAPL",
        price=180.0,
        change=2.5,
        change_pct=1.4,
        volume=50000000,
        timestamp=datetime.now(timezone.utc)
    )
    with patch("app.services.market_data.MarketDataService.get_quote", new=AsyncMock(return_value=mock_quote)):
        response = client.get("/api/v1/market/quotes/AAPL")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["symbol"] == "AAPL"
        assert data[0]["price"] == 180.0


def test_get_quotes_api_empty_symbol(client):
    response = client.get("/api/v1/market/quotes/%20")
    assert response.status_code == 400
    assert "Falta el parámetro" in response.json()["detail"]


def test_get_quotes_api_failure_all(client):
    with patch("app.services.market_data.MarketDataService.get_quote", side_effect=Exception("API Error")):
        response = client.get("/api/v1/market/quotes/BADSYMBOL")
        assert response.status_code == 400
        assert "No se pudo recuperar ninguna cotización" in response.json()["detail"]


def test_get_historical_api_success(client):
    mock_candles = [
        HistoricalCandle(date=datetime.now(timezone.utc), open=179.0, high=181.0, low=178.5, close=180.0, volume=1000000)
    ]
    with patch("app.services.market_data.MarketDataService.get_historical", new=AsyncMock(return_value=mock_candles)):
        response = client.get("/api/v1/market/historical/AAPL?period=1mo&interval=1d")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["close"] == 180.0


def test_get_historical_api_failure(client):
    with patch("app.services.market_data.MarketDataService.get_historical", side_effect=Exception("Data Error")):
        response = client.get("/api/v1/market/historical/INVALID")
        assert response.status_code == 400


def test_get_dividends_api_success(client):
    mock_divs = [
        DividendEvent(date=datetime.now(timezone.utc), value=0.25)
    ]
    with patch("app.services.market_data.MarketDataService.get_dividends", new=AsyncMock(return_value=mock_divs)):
        response = client.get("/api/v1/market/dividends/AAPL?range=60d")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["value"] == 0.25


def test_get_dividends_api_failure(client):
    with patch("app.services.market_data.MarketDataService.get_dividends", side_effect=Exception("Dividend fetch error")):
        response = client.get("/api/v1/market/dividends/ERR?range=invalid")
        assert response.status_code == 400


def test_get_news_api_success(client):
    mock_news = [
        NewsItem(title="Apple Quarter Results", publisher="Reuters", link="https://example.com", provider_publish_time=datetime.now(timezone.utc))
    ]
    with patch("app.services.market_data.MarketDataService.get_news", new=AsyncMock(return_value=mock_news)):
        response = client.get("/api/v1/market/news/AAPL?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Apple Quarter Results"


def test_get_news_api_failure(client):
    with patch("app.services.market_data.MarketDataService.get_news", side_effect=Exception("News Error")):
        response = client.get("/api/v1/market/news/ERR")
        assert response.status_code == 400
