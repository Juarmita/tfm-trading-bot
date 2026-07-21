import logging
from typing import List
from uuid import UUID

from app.core.broker_adapter import ExecutionReport, IBrokerAdapter, OrderRequest
from app.services.ai_engine import AIDecisionOutput

logger = logging.getLogger("order_executor")


class OrderExecutorService:
    @staticmethod
    async def process_ai_execution_plan(
        user_id: UUID, decision_output: AIDecisionOutput, broker: IBrokerAdapter
    ) -> List[ExecutionReport]:
        """
        Hook de integración que toma el plan de ejecución arrojado por el análisis de la IA,
        lo convierte y valida contra el esquema OrderRequest, y lo transmite mediante el Broker.
        """
        reports: List[ExecutionReport] = []

        # Si el motor IA decidió HOLD, no hay órdenes a ejecutar
        if decision_output.decision == "HOLD" or not decision_output.orders:
            logger.info(f"Sesión IA {decision_output.session_id} arrojó HOLD. No se envían órdenes al Broker.")
            return reports

        for order in decision_output.orders:
            # Validación estricta en tiempo de ejecución mapeando a OrderRequest
            order_request = OrderRequest(
                user_id=user_id,
                symbol=order.symbol,
                action=order.action,
                quantity=order.quantity,
                price_estimated=order.price_estimated,
            )

            logger.info(
                f"Transmitiendo orden {order_request.action} {order_request.quantity} {order_request.symbol} al broker..."
            )

            # Ejecutar mediante la abstracción del adaptador de broker inyectado
            report = await broker.execute_order(order_request)
            reports.append(report)

            if report.status == "filled":
                logger.info(
                    f"Orden llenada con éxito. ID: {report.order_id}, Fill Price: {report.price_filled}, Latencia: {report.execution_latency_ms:.2f}ms"
                )
            else:
                logger.error(f"Orden rechazada o fallida por el broker. ID: {report.order_id}, Status: {report.status}")

        return reports
