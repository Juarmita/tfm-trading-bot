from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Literal
from uuid import UUID

from pydantic import BaseModel, Field

# -------------------------------------------------------------------------
# 1. PYDANTIC SCHEMAS DE ENTRADA Y SALIDA
# -------------------------------------------------------------------------


class OrderRequest(BaseModel):
    user_id: UUID = Field(..., description="ID del usuario dueño de la cuenta de trading")
    symbol: str = Field(..., description="Ticker bursátil o activo a operar (ej: AAPL, BTC-USD)")
    action: Literal["BUY", "SELL", "HOLD"] = Field(..., description="Acción de orden de mercado")
    quantity: float = Field(..., description="Cantidad de acciones/criptomonedas a operar")
    price_estimated: float = Field(..., description="Precio de mercado estimado al momento del análisis")


class ExecutionReport(BaseModel):
    order_id: UUID = Field(..., description="ID único asignado a la transacción")
    symbol: str = Field(..., description="Ticker bursátil del activo")
    action: Literal["BUY", "SELL", "HOLD"] = Field(..., description="Dirección de la operación realizada")
    quantity_filled: float = Field(..., description="Cantidad de volumen efectivamente negociada")
    price_filled: float = Field(..., description="Precio neto final de ejecución")
    slippage_usd: float = Field(..., description="Slippage (desviación de precio) calculada de la operación en USD")
    execution_latency_ms: float = Field(..., description="Latencia total de ejecución en milisegundos")
    timestamp: datetime = Field(..., description="Marca de tiempo UTC de confirmación de llenado (fill)")
    status: Literal["filled", "rejected", "failed"] = Field(..., description="Estado de la orden en el broker")


class Position(BaseModel):
    symbol: str = Field(..., description="Ticker bursátil")
    quantity: float = Field(..., description="Cantidad de acciones retenidas")
    average_price: float = Field(..., description="Precio medio de compra")
    market_value: float = Field(..., description="Valor actual de mercado de la posición")


class AccountSnapshot(BaseModel):
    user_id: UUID = Field(..., description="ID de usuario")
    cash_available: float = Field(..., description="Efectivo líquido disponible para operar")
    total_equity: float = Field(..., description="Valor total de la cuenta (efectivo + valor de posiciones)")
    positions: List[Position] = Field(..., description="Lista de posiciones activas en cartera")


# -------------------------------------------------------------------------
# 2. INTERFAZ ABSTRACTA DE ADAPTADORES (BROKER ADAPTER PATTERN)
# -------------------------------------------------------------------------


class IBrokerAdapter(ABC):
    @abstractmethod
    async def execute_order(self, order: OrderRequest) -> ExecutionReport:
        """Envía una orden al broker y retorna el reporte detallado de llenado (ExecutionReport)."""
        pass

    @abstractmethod
    async def get_balance(self, user_id: UUID) -> float:
        """Consulta el saldo de efectivo fiduciario actual del usuario."""
        pass

    @abstractmethod
    async def get_positions(self, user_id: UUID) -> List[Position]:
        """Obtiene las posiciones abiertas activas del portafolio."""
        pass

    @abstractmethod
    async def validate_capital(self, user_id: UUID, required_capital: float) -> bool:
        """Verifica si el usuario cuenta con fondos suficientes antes del envío de la orden."""
        pass
