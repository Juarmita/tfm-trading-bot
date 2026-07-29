import pytest
import pandas as pd
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Fixture client de prueba FastAPI."""
    return TestClient(app)


@pytest.fixture
def demo_wallet():
    """Fixture de billetera de usuario en entorno de pruebas."""
    return {
        "id": "f4b23267-33a3-4874-9f44-48281358efc3",
        "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "currency": "USD",
        "balance": 10000.00,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture
def mock_yahoo_df():
    """Fixture de DataFrame simulando respuesta de Yahoo Finance con indicadores."""
    dates = pd.date_range(end=datetime.now(), periods=100, freq='D')
    df = pd.DataFrame({
        'Open': [150.0 + i * 0.5 for i in range(100)],
        'High': [155.0 + i * 0.5 for i in range(100)],
        'Low': [148.0 + i * 0.5 for i in range(100)],
        'Close': [152.0 + i * 0.5 for i in range(100)],
        'Volume': [1000000 + i * 1000 for i in range(100)],
        'SMA20': [150.0 + i * 0.4 for i in range(100)],
        'SMA50': [145.0 + i * 0.3 for i in range(100)],
        'SMA200': [140.0 + i * 0.2 for i in range(100)],
        'RSI': [55.0 for _ in range(100)],
        'MACD': [1.2 for _ in range(100)],
        'MACD_Signal': [1.0 for _ in range(100)],
        'ATR': [2.5 for _ in range(100)],
    }, index=dates)
    return df


@pytest.fixture
def fake_session():
    """Fixture de sesión de trading simulada generada por IA."""
    return {
        "id": "6e788094-1a3b-4899-ad16-2e8c2579dfde",
        "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "strategy_type": "long_term",
        "available_capital": 5000.00,
        "status": "executed",
        "input_snapshot": {"AAPL": {"price": 180.00, "rsi": 45}},
        "ai_reasoning": "# Análisis IA\nSe aprueba compra a largo plazo.",
        "execution_plan": [
            {
                "action": "BUY",
                "symbol": "AAPL",
                "quantity": 10.0,
                "estimated_amount": 1800.00
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture
def auth_headers():
    """Fixture de cabeceras HTTP con token Bearer ficticio."""
    return {"Authorization": "Bearer mock-test-token-jwt"}
