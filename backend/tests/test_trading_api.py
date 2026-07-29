import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, patch
from fastapi.security import HTTPAuthorizationCredentials
from app.api.v1.trading import (
    get_current_user_id,
    save_session_to_supabase,
    save_trade_to_supabase
)
from app.services.ai_engine import AIDecisionOutput, ExecutionOrder


def test_get_current_user_id_demo_mode_no_credentials(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_DEMO_MODE", "true")
    user_id = get_current_user_id(credentials=None)
    assert user_id is None


def test_get_current_user_id_prod_no_credentials_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret-key")
    monkeypatch.setenv("NEXT_PUBLIC_DEMO_MODE", "false")
    with pytest.raises(Exception) as excinfo:
        get_current_user_id(credentials=None)
    assert "401" in str(excinfo.value)


def test_get_current_user_id_valid_jwt(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret-key")
    token_credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock.jwt.token")
    with patch("jose.jwt.decode", return_value={"sub": "12345-user-id", "aud": "authenticated"}):
        user_id = get_current_user_id(credentials=token_credentials)
        assert user_id == "12345-user-id"


def test_get_current_user_id_missing_sub_raises_401(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret-key")
    token_credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock.jwt.token")
    with patch("jose.jwt.decode", return_value={"aud": "authenticated"}):
        with pytest.raises(Exception) as excinfo:
            get_current_user_id(credentials=token_credentials)
        assert "401" in str(excinfo.value)


def test_analyze_endpoint_success(client):
    user_id = str(uuid4())
    payload = {
        "user_id": user_id,
        "symbol": "AAPL",
        "strategy_type": "long_term",
        "available_capital": 5000.0,
        "currency": "USD",
        "order_mode": "amount",
        "sell_option": "all"
    }

    mock_ai_output = AIDecisionOutput(
        session_id=uuid4(),
        symbol="AAPL",
        decision="BUY",
        confidence_score=0.85,
        allocated_capital=5000.0,
        orders=[
            ExecutionOrder(
                action="BUY",
                symbol="AAPL",
                quantity=10.0,
                price_estimated=180.0,
                amount_usd=1800.0,
                reason="Indicador alcista"
            )
        ],
        reasoning_markdown="# Análisis IA\nSe aprueba compra."
    )

    with patch("app.api.v1.trading.AIEngineService.analyze_and_decide", new=AsyncMock(return_value=mock_ai_output)):
        with patch("app.api.v1.trading.save_session_to_supabase", new=AsyncMock()):
            response = client.post("/api/v1/trading/analyze", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["symbol"] == "AAPL"
            assert data["decision"] == "BUY"


def test_execute_trading_plan_hold(client):
    user_id = str(uuid4())
    session_id = str(uuid4())
    payload = {
        "user_id": user_id,
        "decision_output": {
            "session_id": session_id,
            "symbol": "AAPL",
            "decision": "HOLD",
            "confidence_score": 0.8,
            "allocated_capital": 0.0,
            "orders": [],
            "reasoning_markdown": "# HOLD"
        }
    }
    response = client.post("/api/v1/trading/execute", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "skipped"


def test_execute_trading_plan_buy_success(client):
    user_id = str(uuid4())
    session_id = str(uuid4())
    payload = {
        "user_id": user_id,
        "decision_output": {
            "session_id": session_id,
            "symbol": "AAPL",
            "decision": "BUY",
            "confidence_score": 0.9,
            "allocated_capital": 1800.0,
            "orders": [
                {
                    "action": "BUY",
                    "symbol": "AAPL",
                    "quantity": 5.0,
                    "price_estimated": 180.0,
                    "amount_usd": 900.0,
                    "reason": "Ejecutar compra"
                }
            ],
            "reasoning_markdown": "# BUY"
        }
    }
    with patch("app.api.v1.trading.save_trade_to_supabase", new=AsyncMock()):
        response = client.post("/api/v1/trading/execute", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"


def test_get_portfolio_endpoint_mock(client):
    user_id = str(uuid4())
    response = client.get(f"/api/v1/trading/portfolio/{user_id}")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "positions" in data
    assert "facts" in data


def test_reset_portfolio_endpoint(client):
    user_id = str(uuid4())
    payload = {"user_id": user_id}
    response = client.post("/api/v1/trading/reset", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["balance"] == 10000.00


def test_get_user_trades_endpoint(client):
    user_id = str(uuid4())
    response = client.get(f"/api/v1/trading/trades/{user_id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_save_session_to_supabase_no_keys():
    # Sin variables de entorno de Supabase no arroja excepción
    await save_session_to_supabase(
        session_id=uuid4(),
        user_id=uuid4(),
        strategy_type="long_term",
        available_capital=5000.0,
        input_snapshot={},
        ai_reasoning="Test",
        execution_plan=[],
        status="pending"
    )
    assert True


@pytest.mark.asyncio
async def test_save_trade_to_supabase_no_keys():
    await save_trade_to_supabase(
        trade_id=uuid4(),
        session_id=uuid4(),
        symbol="AAPL",
        action="BUY",
        quantity=5.0,
        price=180.0,
        amount=900.0,
        reason="Test trade"
    )
    assert True
