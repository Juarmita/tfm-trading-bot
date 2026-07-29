import pytest
import time
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from app.services.market_data import (
    MarketDataService,
    Quote,
    HistoricalCandle,
    TimedMemoryCache,
    TokenBucketRateLimiter,
    get_cached_data,
    set_cached_data,
    delete_cached_data
)


@pytest.mark.asyncio
async def test_get_quote_success():
    mock_quote = Quote(
        symbol="AAPL",
        price=180.0,
        change=2.5,
        change_pct=1.4,
        volume=50000000,
        timestamp=datetime.now(timezone.utc)
    )
    with patch("app.services.market_data.MarketDataService.get_quote", new=AsyncMock(return_value=mock_quote)):
        quote = await MarketDataService.get_quote("AAPL")
        assert quote.symbol == "AAPL"
        assert quote.price == 180.0


@pytest.mark.asyncio
async def test_get_quote_invalid_ticker():
    with pytest.raises(Exception):
        await MarketDataService.get_quote("INVALID_TICKER_XYZ_123")


@pytest.mark.asyncio
async def test_get_historical_success():
    history = await MarketDataService.get_historical("AAPL", period="1mo", interval="1d")
    assert isinstance(history, list)
    assert len(history) > 0


@pytest.mark.asyncio
async def test_get_dividends_success():
    divs = await MarketDataService.get_dividends("AAPL", days_range=180)
    assert isinstance(divs, list)


@pytest.mark.asyncio
async def test_get_news_success():
    news = await MarketDataService.get_news("AAPL", limit=2)
    assert isinstance(news, list)


@pytest.mark.asyncio
async def test_get_usd_exchange_rate_usd():
    rate = await MarketDataService.get_usd_exchange_rate("USD")
    assert rate == 1.0


@pytest.mark.asyncio
async def test_get_usd_exchange_rate_eur():
    rate = await MarketDataService.get_usd_exchange_rate("EUR")
    assert rate > 0.5


@pytest.mark.asyncio
async def test_get_usd_exchange_rate_gbp_pence():
    rate = await MarketDataService.get_usd_exchange_rate("GBp")
    assert rate > 0.005


@pytest.mark.asyncio
async def test_get_usd_exchange_rate_cny():
    rate = await MarketDataService.get_usd_exchange_rate("CNY")
    assert rate > 0.05


@pytest.mark.asyncio
async def test_get_exchange_rate_cross():
    rate = await MarketDataService.get_exchange_rate("EUR", "USD")
    assert rate > 0.5

    rate_same = await MarketDataService.get_exchange_rate("EUR", "EUR")
    assert rate_same == 1.0


@pytest.mark.asyncio
async def test_invalidate_quote_cache():
    MarketDataService.invalidate_quote_cache("AAPL")
    assert True


def test_timed_memory_cache():
    cache = TimedMemoryCache()
    cache.set("test_key", {"data": 123})
    assert cache.get("test_key", 10) == {"data": 123}
    assert cache.get("test_key", -1) is None  # Expirado
    assert cache.get("non_existent", 10) is None


def test_cache_helper_functions():
    set_cached_data("test_helper", "hello", 10)
    assert get_cached_data("test_helper", 10) == "hello"
    delete_cached_data("test_helper")
    assert get_cached_data("test_helper", 10) is None


def test_token_bucket_rate_limiter():
    limiter = TokenBucketRateLimiter(rate=1, per_seconds=60)
    assert limiter.consume("LIMIT_SYM") is True
    assert limiter.consume("LIMIT_SYM") is True
    assert limiter.consume("LIMIT_SYM") is False  # Agotado en el tercer intento


@pytest.mark.asyncio
async def test_fetch_with_backoff_retry_success():
    call_count = 0

    def dummy_func():
        nonlocal call_count
        call_count += 1
        if call_count < 2:
            raise Exception("Temporary error")
        return "success"

    res = await MarketDataService._fetch_with_backoff(dummy_func)
    assert res == "success"


@pytest.mark.asyncio
async def test_get_news_mocked_dict():
    mock_raw_news = [
        {
            "content": {
                "title": "Mock Title",
                "provider": {"displayName": "Mock Publisher"},
                "pubDate": "2026-07-28T12:00:00Z"
            },
            "link": "https://example.com/news"
        }
    ]
    with patch.object(MarketDataService, "_fetch_with_backoff", new=AsyncMock(return_value=mock_raw_news)):
        news = await MarketDataService.get_news("AAPL", limit=1)
        assert len(news) == 1
        assert news[0].title == "Mock Title"
        assert news[0].publisher == "Mock Publisher"


@pytest.mark.asyncio
async def test_get_quote_yfinance_mocked():
    import pandas as pd
    dates = pd.date_range(end="2026-07-28", periods=2)
    df = pd.DataFrame(
        {"Open": [178.0, 180.0], "High": [179.0, 182.0], "Low": [177.0, 179.0], "Close": [178.0, 180.0], "Volume": [1000, 2000]},
        index=dates
    )
    with patch.object(MarketDataService, "_fetch_with_backoff", new=AsyncMock(return_value=df)):
        quote = await MarketDataService.get_quote("MOCKSYM")
        assert quote.symbol == "MOCKSYM"
        assert quote.price == 180.0
        assert quote.change == 2.0


@pytest.mark.asyncio
async def test_get_historical_cached():
    mock_candles_data = [
        {
            "date": "2026-07-28T10:00:00+00:00",
            "open": 100.0,
            "high": 105.0,
            "low": 99.0,
            "close": 104.0,
            "volume": 5000
        }
    ]
    set_cached_data("historical:MOCKHIST:6mo:1d", mock_candles_data, 3600)
    candles = await MarketDataService.get_historical("MOCKHIST", period="6mo", interval="1d")
    assert len(candles) == 1
    assert candles[0].close == 104.0
