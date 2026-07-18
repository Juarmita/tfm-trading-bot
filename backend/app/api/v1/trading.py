import os
import logging
from uuid import UUID, uuid4
from decimal import Decimal
from typing import Literal, List
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.services.ai_engine import AIEngineService, AIDecisionOutput
from app.core.dependencies import get_broker
from app.services.order_executor import OrderExecutorService

router = APIRouter()
logger = logging.getLogger("trading_router")

# -------------------------------------------------------------------------
# INPUT REQUEST DTO
# -------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    user_id: UUID = Field(..., description="Identificador único del usuario")
    symbol: str = Field(..., description="Ticker bursátil a analizar (ej: AAPL, BTC-USD)")
    strategy_type: Literal["long_term", "short_term"] = Field(..., description="Estrategia: long_term o short_term")
    available_capital: Decimal = Field(..., description="Capital disponible asignable para operar", gt=0.0)
    max_iterations: int = Field(3, description="Número máximo de reintentos o iteraciones del motor", ge=1, le=10)

# -------------------------------------------------------------------------
# DATABASE PERSISTENCE HELPERS (Supabase REST API / PostgREST)
# -------------------------------------------------------------------------

async def save_session_to_supabase(
    session_id: UUID,
    user_id: UUID,
    strategy_type: str,
    available_capital: float,
    input_snapshot: dict,
    ai_reasoning: str,
    execution_plan: list,
    status: str
):
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        logger.warning("Supabase URL o Key de servicio ausentes. Omitiendo guardado en base de datos.")
        return

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    payload = {
        "id": str(session_id),
        "user_id": str(user_id),
        "strategy_type": strategy_type,
        "available_capital": available_capital,
        "input_snapshot": input_snapshot,
        "ai_reasoning": ai_reasoning,
        "execution_plan": execution_plan,
        "status": status
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{supabase_url}/rest/v1/ai_trading_sessions",
                json=payload,
                headers=headers
            )
            res.raise_for_status()
            logger.info(f"Sesión {session_id} guardada con éxito en Supabase.")
        except Exception as e:
            logger.error(f"Error al guardar sesión {session_id} en Supabase: {e}")

async def save_trade_to_supabase(
    trade_id: UUID,
    session_id: UUID,
    symbol: str,
    action: str,
    quantity: float,
    price: float,
    amount: float,
    reason: str
):
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        return

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    payload = {
        "id": str(trade_id),
        "session_id": str(session_id),
        "symbol": symbol,
        "action": action,
        "quantity": quantity,
        "price_executed": price,
        "amount_usd": amount,
        "reason_snapshot": reason
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{supabase_url}/rest/v1/trades",
                json=payload,
                headers=headers
            )
            res.raise_for_status()
            logger.info(f"Operación {trade_id} guardada con éxito en Supabase.")
        except Exception as e:
            logger.error(f"Error al guardar transacción {trade_id} en Supabase: {e}")

# -------------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------------

@router.post("/analyze", response_model=AIDecisionOutput)
async def analyze_trading(request: AnalyzeRequest, broker=Depends(get_broker)):
    """
    Ejecuta el motor de decisión cuantitativo basado en IA para el activo especificado.
    Realiza las validaciones de riesgo, guarda la sesión, ejecuta las órdenes mediante el broker
    desacoplado y almacena los reportes de ejecución en Supabase.
    """
    try:
        # 1. Ejecutar el análisis y toma de decisiones del motor de IA
        decision_output = await AIEngineService.analyze_and_decide(
            user_id=request.user_id,
            symbol=request.symbol,
            strategy_type=request.strategy_type,
            available_capital=request.available_capital,
            max_iterations=request.max_iterations
        )

        # 2. Ejecutar el plan mediante la capa de abstracción del Broker desacoplado
        execution_reports = await OrderExecutorService.process_ai_execution_plan(
            user_id=request.user_id,
            decision_output=decision_output,
            broker=broker
        )

        # 3. Guardar sesión de análisis en Supabase en segundo plano
        input_snapshot = {
            "symbol": request.symbol.upper(),
            "available_capital": float(request.available_capital),
            "strategy": request.strategy_type
        }
        
        execution_plan = [order.model_dump() for order in decision_output.orders]

        # Guardado en base de datos
        status = "executed" if decision_output.decision != "HOLD" else "pending"
        await save_session_to_supabase(
            session_id=decision_output.session_id,
            user_id=request.user_id,
            strategy_type=request.strategy_type,
            available_capital=float(request.available_capital),
            input_snapshot=input_snapshot,
            ai_reasoning=decision_output.reasoning_markdown,
            execution_plan=execution_plan,
            status=status
        )

        # 4. Guardar las transacciones liquidadas (trades) reportadas por el broker
        for report in execution_reports:
            if report.status == "filled":
                await save_trade_to_supabase(
                    trade_id=report.order_id,
                    session_id=decision_output.session_id,
                    symbol=report.symbol,
                    action=report.action,
                    quantity=report.quantity_filled,
                    price=report.price_filled,
                    amount=report.quantity_filled * report.price_filled,
                    reason=f"Ejecutada con éxito por el broker con slippage de ${report.slippage_usd:.2f} USD."
                )

        return decision_output

    except ValueError as ve:
        logger.error(f"Error de validación en análisis: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error crítico inesperado en motor de IA: {e}")
        raise HTTPException(status_code=500, detail="Ocurrió un error inesperado en el servidor durante el procesamiento.")
