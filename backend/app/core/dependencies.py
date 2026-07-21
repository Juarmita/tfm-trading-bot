import logging
import os
from typing import Optional

from app.core.broker_adapter import IBrokerAdapter
from app.services.demo_broker import DemoBroker

# Instancia global del broker singleton
_broker_instance: Optional[IBrokerAdapter] = None


def init_broker() -> None:
    """Inicializa la instancia del broker según las variables de entorno."""
    global _broker_instance
    adapter_type = os.getenv("BROKER_ADAPTER", "demo").lower()

    if adapter_type == "demo":
        slippage = float(os.getenv("DEMO_SLIPPAGE", "0.0"))
        latency = float(os.getenv("DEMO_LATENCY_MS", "50.0"))
        _broker_instance = DemoBroker(slippage_pct=slippage, mock_latency_ms=latency)
    elif adapter_type in ["alpaca", "ibkr"]:
        logging.getLogger("broker_dependency").warning(
            f"Adaptador '{adapter_type}' no configurado con credenciales reales. Usando DemoBroker por seguridad."
        )
        _broker_instance = DemoBroker()
    else:
        _broker_instance = DemoBroker()


def get_broker() -> IBrokerAdapter:
    """Retorna la instancia inyectable del broker actual."""
    global _broker_instance
    if _broker_instance is None:
        init_broker()
    assert _broker_instance is not None
    return _broker_instance
