import os
from fastapi import Depends
from app.core.broker_adapter import IBrokerAdapter
from app.services.demo_broker import DemoBroker

# Instancia global del broker singleton
_broker_instance: IBrokerAdapter = None

def init_broker():
    """Inicializa la instancia del broker según las variables de entorno."""
    global _broker_instance
    adapter_type = os.getenv("BROKER_ADAPTER", "demo").lower()

    if adapter_type == "demo":
        slippage = float(os.getenv("DEMO_SLIPPAGE", "0.0"))
        latency = float(os.getenv("DEMO_LATENCY_MS", "50.0"))
        _broker_instance = DemoBroker(slippage_pct=slippage, mock_latency_ms=latency)
    elif adapter_type in ["alpaca", "ibkr"]:
        # Simulación de Brokers Reales en el futuro:
        # En una fase real, aquí se inicializarían los adaptadores:
        # _broker_instance = AlpacaAdapter(api_key=..., api_secret=...)
        # Para cumplir con el desacoplamiento de la Fase 2, caemos en DemoBroker temporalmente
        logger_name = "broker_dependency"
        import logging
        logging.getLogger(logger_name).warning(
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
    return _broker_instance
