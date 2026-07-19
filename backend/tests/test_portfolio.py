import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import app
from app.services.market_data import Quote, NewsItem
from datetime import datetime

client = TestClient(app)

@pytest.mark.asyncio
@patch.dict("os.environ", {"NEXT_PUBLIC_SUPABASE_URL": "https://mock.supabase.co", "SUPABASE_SERVICE_ROLE_KEY": "mock_key"})
@patch("httpx.AsyncClient.get")
@patch("app.services.market_data.MarketDataService.get_quote")
@patch("app.services.market_data.MarketDataService.get_news")
async def test_get_portfolio_success(mock_get_news, mock_get_quote, mock_get_http):
    user_id = uuid4()
    
    # 1. Mock de wallets (Supabase)
    mock_wallet_res = MagicMock()
    mock_wallet_res.status_code = 200
    mock_wallet_res.json.return_value = [{"balance": "5000.00"}]
    
    # 2. Mock de trades (Supabase)
    mock_trades_res = MagicMock()
    mock_trades_res.status_code = 200
    mock_trades_res.json.return_value = [
        # AAPL: Compras 10 a 150 = 1500, Compras 5 a 160 = 800. Total = 15 a 153.33 = 2300
        # Vendes 5 a 170. Restan 10 acciones
        {"symbol": "AAPL", "action": "BUY", "quantity": "10.0", "price_executed": "150.0", "amount_usd": "1500.0"},
        {"symbol": "AAPL", "action": "BUY", "quantity": "5.0", "price_executed": "160.0", "amount_usd": "800.0"},
        {"symbol": "AAPL", "action": "SELL", "quantity": "5.0", "price_executed": "170.0", "amount_usd": "850.0"},
        # TSLA: Compras 2 a 200 = 400. Total = 2 a 200. Restan 2 acciones
        {"symbol": "TSLA", "action": "BUY", "quantity": "2.0", "price_executed": "200.0", "amount_usd": "400.0"}
    ]
    
    # Configurar respuestas secuenciales de httpx
    mock_get_http.side_effect = [mock_wallet_res, mock_trades_res]
    
    # 3. Mock yfinance quotes
    # AAPL precio actual = 180 (coste promedio = 153.33, cantidad restante = 10, valor = 1800, ganancia = 266.67)
    # TSLA precio actual = 190 (coste promedio = 200, cantidad restante = 2, valor = 380, ganancia = -20)
    mock_get_quote.side_effect = lambda sym: {
        "AAPL": Quote(symbol="AAPL", price=180.0, change=1.5, change_pct=0.84, volume=50000, timestamp=datetime.now()),
        "TSLA": Quote(symbol="TSLA", price=190.0, change=-2.0, change_pct=-1.04, volume=20000, timestamp=datetime.now())
    }[sym]
    
    # 4. Mock news items
    mock_get_news.return_value = [
        NewsItem(title="AAPL Tech Breakout", publisher="Bloomberg", link="https://bloomberg.com/aapl", provider_publish_time=datetime.now())
    ]
    
    # 5. Hacer llamada HTTP
    response = client.get(f"/api/v1/trading/portfolio/{user_id}")
    
    assert response.status_code == 200
    data = response.json()
    
    # Assert resumen global
    assert data["summary"]["cash"] == 5000.0
    assert data["summary"]["total_cost_basis"] == 1933.33  # 10 * 153.333 + 2 * 200 = 1933.33
    assert data["summary"]["total_positions_value"] == 1800.0 + 380.0 # 10 * 180 + 2 * 190 = 2180
    assert data["summary"]["total_portfolio_value"] == 5000.0 + 2180.0 # 7180
    
    # Assert posiciones individuales
    positions = {p["symbol"]: p for p in data["positions"]}
    assert len(positions) == 2
    
    aapl = positions["AAPL"]
    assert aapl["quantity"] == 10.0
    assert aapl["average_price"] == 153.33  # (1500 + 800) / 15
    assert aapl["current_price"] == 180.0
    assert aapl["market_value"] == 1800.0
    assert aapl["profit_loss"] == 266.67
    
    tsla = positions["TSLA"]
    assert tsla["quantity"] == 2.0
    assert tsla["average_price"] == 200.0
    assert tsla["current_price"] == 190.0
    assert tsla["profit_loss"] == -20.0
    
    # Assert facts
    assert len(data["facts"]) > 0
    assert len(data["news"]) == 2  # 1 por cada activo ya que mock_get_news retorna 1 por llamada
