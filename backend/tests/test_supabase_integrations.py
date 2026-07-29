import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, patch
from app.api.v1.trading import (
    save_session_to_supabase,
    save_trade_to_supabase
)


@pytest.mark.asyncio
async def test_save_session_to_supabase_success(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://mock.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key")

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_res = AsyncMock()
        mock_res.raise_for_status = lambda: None
        mock_post.return_value = mock_res

        await save_session_to_supabase(
            session_id=uuid4(),
            user_id=uuid4(),
            strategy_type="long_term",
            available_capital=5000.0,
            input_snapshot={"symbol": "AAPL"},
            ai_reasoning="# Reasoning",
            execution_plan=[],
            status="pending"
        )
        assert mock_post.called


@pytest.mark.asyncio
async def test_save_session_to_supabase_error_handled(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://mock.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key")

    with patch("httpx.AsyncClient.post", side_effect=Exception("HTTP Error")):
        await save_session_to_supabase(
            session_id=uuid4(),
            user_id=uuid4(),
            strategy_type="long_term",
            available_capital=5000.0,
            input_snapshot={},
            ai_reasoning="",
            execution_plan=[],
            status="pending"
        )
        # Se maneja la excepción internamente con log.error sin crash
        assert True


@pytest.mark.asyncio
async def test_save_trade_to_supabase_success(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://mock.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key")

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_res = AsyncMock()
        mock_res.raise_for_status = lambda: None
        mock_post.return_value = mock_res

        await save_trade_to_supabase(
            trade_id=uuid4(),
            session_id=uuid4(),
            symbol="AAPL",
            action="BUY",
            quantity=10.0,
            price=180.0,
            amount=1800.0,
            reason="Compra probada"
        )
        assert mock_post.called


def test_get_portfolio_with_supabase_trades(client, monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://mock.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key")
    user_id = str(uuid4())

    mock_wallet_res = AsyncMock()
    mock_wallet_res.raise_for_status = lambda: None
    mock_wallet_res.json = lambda: [{"balance": 8200.00}]

    mock_trades_res = AsyncMock()
    mock_trades_res.raise_for_status = lambda: None
    mock_trades_res.json = lambda: [
        {
            "symbol": "AAPL",
            "action": "BUY",
            "quantity": 10.0,
            "price_executed": 170.0,
            "amount_usd": 1700.0,
            "ai_trading_sessions": {"user_id": user_id, "created_at": "2026-07-28T10:00:00Z"}
        }
    ]

    async def mock_get(url, headers=None):
        if "wallets" in url:
            return mock_wallet_res
        return mock_trades_res

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        response = client.get(f"/api/v1/trading/portfolio/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["cash"] == 8200.00
        assert len(data["positions"]) == 1
        assert data["positions"][0]["symbol"] == "AAPL"


def test_reset_portfolio_with_supabase_success(client, monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://mock.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key")
    user_id = str(uuid4())

    mock_res = AsyncMock()
    mock_res.raise_for_status = lambda: None
    mock_res.json = lambda: [{"id": str(uuid4())}]

    async def mock_get(url, headers=None):
        return mock_res

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        with patch("httpx.AsyncClient.delete", new=AsyncMock(return_value=mock_res)):
            with patch("httpx.AsyncClient.patch", new=AsyncMock(return_value=mock_res)):
                response = client.post("/api/v1/trading/reset", json={"user_id": user_id})
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "success"
                assert data["balance"] == 10000.00


def test_get_user_trades_with_supabase_success(client, monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://mock.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key")
    user_id = str(uuid4())

    mock_trades_res = AsyncMock()
    mock_trades_res.raise_for_status = lambda: None
    mock_trades_res.json = lambda: [
        {
            "id": str(uuid4()),
            "symbol": "AAPL",
            "action": "BUY",
            "quantity": 5.0,
            "price_executed": 180.0,
            "amount_usd": 900.0,
            "ai_trading_sessions": {"user_id": user_id, "created_at": "2026-07-28T10:00:00Z"}
        }
    ]

    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_trades_res)):
        response = client.get(f"/api/v1/trading/trades/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["symbol"] == "AAPL"
