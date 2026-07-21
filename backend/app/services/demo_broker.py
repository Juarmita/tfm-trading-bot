import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import List
from uuid import UUID, uuid4

import httpx

from app.core.broker_adapter import ExecutionReport, IBrokerAdapter, OrderRequest, Position

logger = logging.getLogger("demo_broker")


class DemoBroker(IBrokerAdapter):
    """
    Simulador de Broker con cumplimiento de ACID. Sincroniza con Supabase DB si
    está disponible y calcula fills con desfases de latencia y slippage simulados.
    """

    def __init__(self, slippage_pct: float = 0.0, mock_latency_ms: float = 50.0):
        self.slippage_pct = slippage_pct
        self.mock_latency_ms = mock_latency_ms

    async def get_balance(self, user_id: UUID) -> float:
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            logger.warning("Falta variables de Supabase, utilizando balance Mock de $10,000 USD.")
            return 10000.0

        headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}

        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(
                    f"{supabase_url}/rest/v1/wallets?user_id=eq.{user_id}&select=balance", headers=headers
                )
                res.raise_for_status()
                data = res.json()
                if data:
                    return float(data[0]["balance"])
            except Exception as e:
                logger.error(f"Fallo al recuperar balance de Supabase: {e}")

        return 10000.0

    async def validate_capital(self, user_id: UUID, required_capital: float) -> bool:
        balance = await self.get_balance(user_id)
        return balance >= required_capital

    async def get_positions(self, user_id: UUID) -> List[Position]:
        # Simulación académica de posiciones
        return [
            Position(symbol="AAPL", quantity=10.0, average_price=175.00, market_value=1820.00),
            Position(symbol="TSLA", quantity=5.0, average_price=210.00, market_value=1100.00),
        ]

    async def execute_order(self, order: OrderRequest) -> ExecutionReport:
        start_time = time.time()
        order_id = uuid4()

        # Simular latencia de transmisión de red del broker
        if self.mock_latency_ms > 0:
            await asyncio.sleep(self.mock_latency_ms / 1000.0)

        total_cost = order.quantity * order.price_estimated

        # Validaciones de Capital antes de mandar orden si es compra
        if order.action == "BUY":
            has_capital = await self.validate_capital(order.user_id, total_cost)
            if not has_capital:
                latency = (time.time() - start_time) * 1000.0
                report = ExecutionReport(
                    order_id=order_id,
                    symbol=order.symbol,
                    action=order.action,
                    quantity_filled=0.0,
                    price_filled=0.0,
                    slippage_usd=0.0,
                    execution_latency_ms=latency,
                    timestamp=datetime.now(timezone.utc),
                    status="rejected",
                )
                self.log_execution(report)
                return report

        # Simular llenado de precio con Slippage configurable
        # Si es compra, el slippage eleva el precio final; si es venta, lo disminuye
        slippage_factor = 1.0 + self.slippage_pct if order.action == "BUY" else 1.0 - self.slippage_pct
        fill_price = order.price_estimated * slippage_factor
        slippage_usd = (fill_price - order.price_estimated) * order.quantity

        # Actualizar fondos en Supabase si aplica (Transacción virtual)
        if order.action == "BUY":
            await self._update_supabase_balance(order.user_id, -total_cost)
        elif order.action == "SELL":
            await self._update_supabase_balance(order.user_id, total_cost)

        latency = (time.time() - start_time) * 1000.0

        report = ExecutionReport(
            order_id=order_id,
            symbol=order.symbol,
            action=order.action,
            quantity_filled=order.quantity,
            price_filled=fill_price,
            slippage_usd=slippage_usd,
            execution_latency_ms=latency,
            timestamp=datetime.now(timezone.utc),
            status="filled",
        )

        self.log_execution(report)
        return report

    async def _update_supabase_balance(self, user_id: UUID, change_amount: float) -> None:
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_key:
            return

        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(f"{supabase_url}/rest/v1/wallets?user_id=eq.{user_id}", headers=headers)
                res.raise_for_status()
                wallets = res.json()
                if wallets:
                    wallet = wallets[0]
                    new_balance = float(wallet["balance"]) + change_amount

                    # Actualización en caliente
                    update_res = await client.patch(
                        f"{supabase_url}/rest/v1/wallets?id=eq.{wallet['id']}",
                        json={"balance": new_balance},
                        headers=headers,
                    )
                    update_res.raise_for_status()
            except Exception as e:
                logger.error(f"Error al sincronizar saldo de billetera en Supabase: {e}")

    def log_execution(self, report: ExecutionReport) -> None:
        log_entry = {
            "timestamp": report.timestamp.isoformat(),
            "level": "INFO",
            "event": "broker_order_execution",
            "order_id": str(report.order_id),
            "symbol": report.symbol,
            "action": report.action,
            "fill_price": round(report.price_filled, 2),
            "slippage_usd": round(report.slippage_usd, 2),
            "latency_ms": round(report.execution_latency_ms, 2),
            "status": report.status,
        }
        print(json.dumps(log_entry))
