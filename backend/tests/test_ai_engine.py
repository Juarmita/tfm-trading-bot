from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pandas as pd
import pytest

from app.services.ai_engine import AIDecisionOutput, AIEngineService


@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_analyze_and_decide_long_term_buy(mock_ticker):
    # Simular DataFrame de 260 días con tendencia alcista (SMA200 > SMA50 y SMA50 > SMA20)
    dates = pd.date_range(end="2026-07-18", periods=260)
    prices = [100.0 + i * 0.5 for i in range(260)]  # Tendencia alcista
    df = pd.DataFrame(
        {
            "Open": prices,
            "High": [p + 2.0 for p in prices],
            "Low": [p - 2.0 for p in prices],
            "Close": prices,
            "Volume": [10000] * 260,
        },
        index=dates,
    )

    mock_instance = MagicMock()
    mock_instance.history.return_value = df
    mock_instance.info = {
        "forwardPE": 15.0,  # Barata (P/E < 24 sector)
        "dividendYield": 0.04,  # 4% de dividendo
        "debtToEquity": 45.0,
    }
    mock_ticker.return_value = mock_instance

    # Ejecutar análisis
    user_id = uuid4()
    output = await AIEngineService.analyze_and_decide(
        user_id=user_id, symbol="AAPL", strategy_type="long_term", available_capital=Decimal("1000.00")
    )

    # Validaciones del DTO de salida
    assert isinstance(output, AIDecisionOutput)
    assert output.symbol == "AAPL"
    assert output.decision == "BUY"
    assert output.confidence_score >= 0.7
    assert output.allocated_capital == 1000.00
    assert len(output.orders) == 1
    assert output.orders[0].action == "BUY"

    # Verificar formato obligatorio de Markdown
    assert "# Decisión IA" in output.reasoning_markdown
    assert "## 📊 Factores Técnicos" in output.reasoning_markdown
    assert "## 🏢 Fundamentales y Dividendos" in output.reasoning_markdown
    assert "## ⚖️ Gestión de Riesgo" in output.reasoning_markdown
    assert "## 🎯 Horizonte: LONG_TERM" in output.reasoning_markdown
    assert "## ✅ Exec Plan JSON" in output.reasoning_markdown


@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_concentration_risk_override(mock_ticker):
    # Simular tendencia alcista para forzar un "BUY" técnico
    dates = pd.date_range(end="2026-07-18", periods=260)
    prices = [100.0 + i * 0.5 for i in range(260)]
    df = pd.DataFrame(
        {
            "Open": prices,
            "High": [p + 2.0 for p in prices],
            "Low": [p - 2.0 for p in prices],
            "Close": prices,
            "Volume": [10000] * 260,
        },
        index=dates,
    )

    mock_instance = MagicMock()
    mock_instance.history.return_value = df
    mock_instance.info = {"forwardPE": 15.0, "dividendYield": 0.04, "debtToEquity": 45.0}
    mock_ticker.return_value = mock_instance

    # Mockear concentración de portafolio para simular sobreexposición (>30%)
    with patch.object(AIEngineService, "get_portfolio_concentration", return_value=0.35):
        user_id = uuid4()
        output = await AIEngineService.analyze_and_decide(
            user_id=user_id, symbol="AAPL", strategy_type="long_term", available_capital=Decimal("1000.00")
        )

        # La decisión BUY debe ser forzada a HOLD por gestión de riesgos
        assert output.decision == "HOLD"
        assert output.allocated_capital == 0.0
        assert len(output.orders) == 0
        assert "Excedida >30% - OPERACIÓN CANCELADA (HOLD)" in output.reasoning_markdown


@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_drawdown_risk_reduction(mock_ticker):
    # Simular una caída severa reciente para disparar penalización de drawdown (>25%)
    dates = pd.date_range(end="2026-07-18", periods=260)
    prices = [100.0] * 170 + [200.0] * 40 + [140.0] * 50  # Caída severa al final: (200 - 140)/200 = 30% drawdown
    df = pd.DataFrame(
        {"Open": prices, "High": prices, "Low": prices, "Close": prices, "Volume": [10000] * 260}, index=dates
    )

    mock_instance = MagicMock()
    mock_instance.history.return_value = df
    mock_instance.info = {"forwardPE": 15.0, "dividendYield": 0.04, "debtToEquity": 45.0}
    mock_ticker.return_value = mock_instance

    # Mockear baja concentración y baja correlación
    with patch.object(AIEngineService, "get_portfolio_concentration", return_value=0.10):
        with patch.object(AIEngineService, "get_portfolio_correlation", return_value=0.30):
            user_id = uuid4()
            output = await AIEngineService.analyze_and_decide(
                user_id=user_id, symbol="AAPL", strategy_type="long_term", available_capital=Decimal("1000.00")
            )

            # La decisión puede seguir siendo BUY, pero el capital asignado debe recortarse al 50% por drawdown alto (>25%)
            assert output.decision == "BUY"
            assert output.allocated_capital == 500.00  # 50% de $1000
            assert len(output.orders) == 1
            assert "Excedido >25% - Asignación reducida en 50%" in output.reasoning_markdown


@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_analyze_and_decide_empty_dataframe_raises_error(mock_ticker):
    # Simular DataFrame vacío
    df = pd.DataFrame()
    mock_instance = MagicMock()
    mock_instance.history.return_value = df
    mock_ticker.return_value = mock_instance

    user_id = uuid4()
    with pytest.raises(ValueError) as exc_info:
        await AIEngineService.analyze_and_decide(
            user_id=user_id, symbol="INVALID_TICKER", strategy_type="long_term", available_capital=Decimal("1000.00")
        )
    assert "no existe en Yahoo Finance o ha sido deslistado" in str(exc_info.value)


@pytest.mark.asyncio
@patch("yfinance.Ticker")
async def test_analyze_and_decide_short_history_succeeds(mock_ticker):
    # Simular DataFrame con historial corto (5 días)
    dates = pd.date_range(end="2026-07-18", periods=5)
    prices = [100.0] * 5
    df = pd.DataFrame(
        {"Open": prices, "High": prices, "Low": prices, "Close": prices, "Volume": [1000] * 5}, index=dates
    )

    mock_instance = MagicMock()
    mock_instance.history.return_value = df
    mock_instance.info = {"forwardPE": 15.0, "dividendYield": 0.0, "debtToEquity": 50.0}
    mock_ticker.return_value = mock_instance

    user_id = uuid4()
    output = await AIEngineService.analyze_and_decide(
        user_id=user_id, symbol="NEWSTOCK", strategy_type="short_term", available_capital=Decimal("1000.00")
    )
    # Debe completar con éxito sin lanzar ValueError
    assert isinstance(output, AIDecisionOutput)
    assert output.symbol == "NEWSTOCK"
