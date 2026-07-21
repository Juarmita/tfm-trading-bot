import os
from unittest.mock import patch
from uuid import uuid4

import pytest

from app.core.broker_adapter import OrderRequest
from app.core.dependencies import get_broker, init_broker
from app.services.demo_broker import DemoBroker


@pytest.mark.asyncio
async def test_demo_broker_capital_validation():
    broker = DemoBroker()
    user_id = uuid4()

    # Validar con balance de $500 simulado
    with patch.object(DemoBroker, "get_balance", return_value=500.0):
        # Requerir $300 debe ser True
        assert await broker.validate_capital(user_id, 300.0) is True
        # Requerir $600 debe ser False
        assert await broker.validate_capital(user_id, 600.0) is False


@pytest.mark.asyncio
async def test_demo_broker_order_execution_rejection():
    broker = DemoBroker(mock_latency_ms=0)
    user_id = uuid4()

    # Simular saldo insuficiente ($100) para una orden que requiere $300
    with patch.object(DemoBroker, "get_balance", return_value=100.0):
        order = OrderRequest(
            user_id=user_id, symbol="AAPL", action="BUY", quantity=2.0, price_estimated=150.0  # Costo estimado $300
        )

        report = await broker.execute_order(order)
        assert report.status == "rejected"
        assert report.quantity_filled == 0.0
        assert report.price_filled == 0.0


@pytest.mark.asyncio
async def test_demo_broker_order_execution_success():
    # Inicializar con slippage de 1% (0.01) y latencia 0 para agilidad
    broker = DemoBroker(slippage_pct=0.01, mock_latency_ms=0)
    user_id = uuid4()

    with patch.object(DemoBroker, "get_balance", return_value=1000.0):
        with patch.object(DemoBroker, "_update_supabase_balance", return_value=None):
            order = OrderRequest(user_id=user_id, symbol="AAPL", action="BUY", quantity=2.0, price_estimated=100.0)

            report = await broker.execute_order(order)

            assert report.status == "filled"
            assert report.quantity_filled == 2.0
            # El precio de compra final es $101 por el 1% de slippage
            assert report.price_filled == 101.0
            # Desviación de $1.0 por acción * 2 acciones = $2.0 slippage total
            assert report.slippage_usd == 2.0


def test_broker_dependency_fallback():
    # 1. Probar que si no está definido el broker, cae en DemoBroker
    with patch.dict(os.environ, {"BROKER_ADAPTER": "unknown"}):
        init_broker()
        broker = get_broker()
        assert isinstance(broker, DemoBroker)

    # 2. Probar que cae en DemoBroker de fallback si se especifica alpaca pero no hay credenciales reales
    with patch.dict(os.environ, {"BROKER_ADAPTER": "alpaca"}):
        init_broker()
        broker = get_broker()
        assert isinstance(broker, DemoBroker)
