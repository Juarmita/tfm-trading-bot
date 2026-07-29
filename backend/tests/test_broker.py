import pytest
from datetime import datetime, timezone
from uuid import uuid4
from unittest.mock import AsyncMock, patch
from app.services.demo_broker import DemoBroker
from app.core.broker_adapter import ExecutionReport, OrderRequest, Position


@pytest.mark.asyncio
async def test_demo_broker_get_balance_default():
    broker = DemoBroker()
    balance = await broker.get_balance(uuid4())
    assert balance == 10000.0


@pytest.mark.asyncio
async def test_demo_broker_get_positions():
    broker = DemoBroker()
    positions = await broker.get_positions(uuid4())
    assert isinstance(positions, list)
    assert len(positions) >= 1
    assert isinstance(positions[0], Position)


@pytest.mark.asyncio
async def test_demo_broker_execute_order_buy_success():
    broker = DemoBroker(slippage_pct=0.01, mock_latency_ms=10.0)
    order = OrderRequest(
        user_id=uuid4(),
        symbol="AAPL",
        action="BUY",
        quantity=2.0,
        price_estimated=180.0
    )
    report = await broker.execute_order(order)
    assert report.status == "filled"
    assert report.symbol == "AAPL"
    assert report.price_filled >= 180.0


@pytest.mark.asyncio
async def test_demo_broker_execute_order_sell():
    broker = DemoBroker(slippage_pct=0.005, mock_latency_ms=5.0)
    order = OrderRequest(
        user_id=uuid4(),
        symbol="TSLA",
        action="SELL",
        quantity=5.0,
        price_estimated=200.0
    )
    report = await broker.execute_order(order)
    assert report.status == "filled"
    assert report.action == "SELL"


@pytest.mark.asyncio
async def test_demo_broker_get_balance_supabase_success():
    broker = DemoBroker()
    user_id = uuid4()
    with patch("os.getenv") as mock_env:
        mock_env.side_effect = lambda key, default=None: "https://mock.supabase.co" if key == "NEXT_PUBLIC_SUPABASE_URL" else ("mock-key" if key == "SUPABASE_SERVICE_ROLE_KEY" else default)
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_res = AsyncMock()
            mock_res.raise_for_status = lambda: None
            mock_res.json = lambda: [{"balance": 7500.50}]
            mock_get.return_value = mock_res
            balance = await broker.get_balance(user_id)
            assert balance == 7500.50


@pytest.mark.asyncio
async def test_demo_broker_update_supabase_balance(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://mock.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "mock-key")
    broker = DemoBroker()
    user_id = uuid4()

    mock_res = AsyncMock()
    mock_res.raise_for_status = lambda: None
    mock_res.json = lambda: [{"id": "w123", "balance": 10000.0}]

    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_res)):
        with patch("httpx.AsyncClient.patch", new=AsyncMock(return_value=mock_res)):
            await broker._update_supabase_balance(user_id, -1500.0)
            assert True


def test_demo_broker_log_execution():
    broker = DemoBroker()
    report = ExecutionReport(
        order_id=uuid4(),
        symbol="AAPL",
        action="BUY",
        quantity_filled=1.0,
        price_filled=180.0,
        slippage_usd=0.0,
        execution_latency_ms=50.0,
        status="filled",
        timestamp=datetime.now(timezone.utc)
    )
    broker.log_execution(report)
    assert report.status == "filled"
