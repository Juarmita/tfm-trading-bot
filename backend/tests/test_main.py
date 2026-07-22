from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_read_root() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_health_check() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "TFM Trading Bot API"}


def test_analyze_without_token_raises_401_in_prod() -> None:
    # Simular entorno productivo con JWT_SECRET configurado
    with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": "test_secret_supabase", "NEXT_PUBLIC_DEMO_MODE": "false"}):
        response = client.post(
            "/api/v1/trading/analyze",
            json={
                "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
                "symbol": "AAPL",
                "strategy_type": "long_term",
                "available_capital": "1000.00",
            },
        )
        assert response.status_code == 401
        assert "Token de autorización ausente" in response.json()["detail"]


def test_analyze_with_invalid_token_raises_401_in_prod() -> None:
    with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": "test_secret_supabase", "NEXT_PUBLIC_DEMO_MODE": "false"}):
        response = client.post(
            "/api/v1/trading/analyze",
            json={
                "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
                "symbol": "AAPL",
                "strategy_type": "long_term",
                "available_capital": "1000.00",
            },
            headers={"Authorization": "Bearer token_invalido_de_prueba"},
        )
        assert response.status_code == 401
        assert "Token" in response.json()["detail"]


def test_reset_portfolio_endpoint() -> None:
    response = client.post(
        "/api/v1/trading/reset",
        json={"user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["balance"] == 10000.00
