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
from app.services.market_data import MarketDataService, NewsItem

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


# -------------------------------------------------------------------------
# PORTFOLIO SCHEMAS
# -------------------------------------------------------------------------

class PositionModel(BaseModel):
    symbol: str = Field(..., description="Ticker del activo")
    quantity: float = Field(..., description="Cantidad de acciones remanentes")
    average_price: float = Field(..., description="Precio promedio de compra")
    current_price: float = Field(..., description="Precio actual de mercado")
    market_value: float = Field(..., description="Valor actual de mercado")
    cost_basis: float = Field(..., description="Base de coste")
    profit_loss: float = Field(..., description="Ganancia/Pérdida absoluta en USD")
    profit_loss_pct: float = Field(..., description="Ganancia/Pérdida porcentual")

class PortfolioSummary(BaseModel):
    cash: float = Field(..., description="Efectivo líquido disponible en billetera")
    total_positions_value: float = Field(..., description="Valor total de las posiciones abiertas")
    total_portfolio_value: float = Field(..., description="Valor total del portafolio (Efectivo + Posiciones)")
    total_cost_basis: float = Field(..., description="Capital total invertido")
    total_profit_loss: float = Field(..., description="Ganancia/Pérdida absoluta acumulada")
    total_profit_loss_pct: float = Field(..., description="Rentabilidad total del portafolio")

class PortfolioFact(BaseModel):
    type: str = Field(..., description="Tipo de métrica (concentration, best_performer, etc.)")
    title: str = Field(..., description="Título de la métrica")
    description: str = Field(..., description="Descripción detallada de la métrica")

class PortfolioResponse(BaseModel):
    summary: PortfolioSummary
    positions: List[PositionModel]
    facts: List[PortfolioFact]
    news: List[NewsItem]


@router.get("/portfolio/{user_id}", response_model=PortfolioResponse)
async def get_portfolio(user_id: UUID):
    """
    Obtiene el portafolio del usuario calculando dinámicamente posiciones, ROI actual y noticias relacionadas.
    """
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        # Fallback de desarrollo local si no hay Supabase
        # Devolver un portafolio de prueba
        mock_positions = [
            PositionModel(
                symbol="AAPL",
                quantity=10.0,
                average_price=175.0,
                current_price=180.0,
                market_value=1800.0,
                cost_basis=1750.0,
                profit_loss=50.0,
                profit_loss_pct=2.86
            ),
            PositionModel(
                symbol="TSLA",
                quantity=5.0,
                average_price=210.0,
                current_price=220.0,
                market_value=1100.0,
                cost_basis=1050.0,
                profit_loss=50.0,
                profit_loss_pct=4.76
            )
        ]
        mock_summary = PortfolioSummary(
            cash=10000.0,
            total_positions_value=2900.0,
            total_portfolio_value=12900.0,
            total_cost_basis=2800.0,
            total_profit_loss=100.0,
            total_profit_loss_pct=3.57
        )
        mock_facts = [
            PortfolioFact(
                type="best_performer",
                title="Mejor Rendimiento",
                description="TSLA es tu activo más rentable con un retorno del +4.76%."
            ),
            PortfolioFact(
                type="concentration",
                title="Concentración de Cartera",
                description="AAPL representa el 62.07% del valor de tus inversiones."
            )
        ]
        # Intentar obtener noticias mockeadas para AAPL
        mock_news = []
        try:
            mock_news = await MarketDataService.get_news("AAPL", limit=2)
        except Exception:
            pass

        return PortfolioResponse(
            summary=mock_summary,
            positions=mock_positions,
            facts=mock_facts,
            news=mock_news
        )

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}"
    }

    async with httpx.AsyncClient() as client:
        try:
            # 1. Obtener balance de la billetera
            wallet_res = await client.get(
                f"{supabase_url}/rest/v1/wallets?user_id=eq.{user_id}&select=balance",
                headers=headers
            )
            wallet_res.raise_for_status()
            wallets = wallet_res.json()
            cash = float(wallets[0]["balance"]) if wallets else 10000.0

            # 2. Obtener todos los trades asociados al usuario a través del JOIN inner con ai_trading_sessions
            trades_url = f"{supabase_url}/rest/v1/trades?select=symbol,action,quantity,price_executed,amount_usd&ai_trading_sessions!inner(user_id)&ai_trading_sessions.user_id=eq.{user_id}"
            trades_res = await client.get(trades_url, headers=headers)
            trades_res.raise_for_status()
            db_trades = trades_res.json()

            # 3. Calcular posiciones agrupando operaciones
            # Estructura: { symbol: { qty_bought, cost_bought, qty_sold, revenue_sold } }
            symbols_data = {}
            for t in db_trades:
                sym = t["symbol"].upper()
                act = t["action"]
                qty = float(t["quantity"])
                price = float(t["price_executed"])
                amt = float(t["amount_usd"])

                if sym not in symbols_data:
                    symbols_data[sym] = {
                        "qty_bought": 0.0,
                        "cost_bought": 0.0,
                        "qty_sold": 0.0,
                        "revenue_sold": 0.0
                    }

                if act == "BUY":
                    symbols_data[sym]["qty_bought"] += qty
                    symbols_data[sym]["cost_bought"] += amt
                elif act == "SELL":
                    symbols_data[sym]["qty_sold"] += qty
                    symbols_data[sym]["revenue_sold"] += amt

            positions = []
            news_list = []
            
            for sym, data in symbols_data.items():
                remaining_qty = data["qty_bought"] - data["qty_sold"]
                # Solo procesamos si tiene acciones activas en portafolio
                if remaining_qty > 0.0001:
                    # Precio promedio de compra
                    avg_price = data["cost_bought"] / data["qty_bought"] if data["qty_bought"] > 0 else 0.0
                    
                    # Obtener cotización actual en vivo de Yahoo Finance
                    current_price = avg_price
                    try:
                        quote = await MarketDataService.get_quote(sym)
                        current_price = quote.price
                    except Exception as e:
                        logger.warning(f"No se pudo obtener el precio actual para {sym}: {e}")

                    cost_basis = remaining_qty * avg_price
                    market_value = remaining_qty * current_price
                    profit_loss = market_value - cost_basis
                    profit_loss_pct = (profit_loss / cost_basis) * 100.0 if cost_basis > 0 else 0.0

                    pos_model = PositionModel(
                        symbol=sym,
                        quantity=round(remaining_qty, 4),
                        average_price=round(avg_price, 2),
                        current_price=round(current_price, 2),
                        market_value=round(market_value, 2),
                        cost_basis=round(cost_basis, 2),
                        profit_loss=round(profit_loss, 2),
                        profit_loss_pct=round(profit_loss_pct, 2)
                    )
                    positions.append(pos_model)

                    # Obtener noticias de la empresa en paralelo
                    try:
                        sym_news = await MarketDataService.get_news(sym, limit=2)
                        news_list.extend(sym_news)
                    except Exception as e:
                        logger.warning(f"No se pudieron obtener noticias para {sym}: {e}")

            # 4. Calcular resumen global del portafolio
            total_positions_value = sum(pos.market_value for pos in positions)
            total_portfolio_value = cash + total_positions_value
            total_cost_basis = sum(pos.cost_basis for pos in positions)
            total_profit_loss = total_positions_value - total_cost_basis
            total_profit_loss_pct = (total_profit_loss / total_cost_basis) * 100.0 if total_cost_basis > 0 else 0.0

            summary = PortfolioSummary(
                cash=round(cash, 2),
                total_positions_value=round(total_positions_value, 2),
                total_portfolio_value=round(total_portfolio_value, 2),
                total_cost_basis=round(total_cost_basis, 2),
                total_profit_loss=round(total_profit_loss, 2),
                total_profit_loss_pct=round(total_profit_loss_pct, 2)
            )

            # 5. Generar insights y hechos dinámicos del portafolio (facts)
            facts = []
            if positions:
                # Mejor rendimiento
                best_pos = max(positions, key=lambda p: p.profit_loss_pct)
                facts.append(
                    PortfolioFact(
                        type="best_performer",
                        title="Mejor Rendimiento",
                        description=f"{best_pos.symbol} es tu activo con mayor retorno hasta ahora: +{best_pos.profit_loss_pct:.2f}%."
                    )
                )

                # Peor rendimiento
                worst_pos = min(positions, key=lambda p: p.profit_loss_pct)
                if worst_pos.profit_loss_pct < 0:
                    facts.append(
                        PortfolioFact(
                            type="worst_performer",
                            title="Desempeño Negativo",
                            description=f"{worst_pos.symbol} registra la mayor pérdida latente en tu cartera: {worst_pos.profit_loss_pct:.2f}%."
                        )
                    )

                # Concentración
                most_concentrated = max(positions, key=lambda p: p.market_value)
                concentration_pct = (most_concentrated.market_value / total_portfolio_value) * 100.0 if total_portfolio_value > 0 else 0.0
                if concentration_pct > 30.0:
                    facts.append(
                        PortfolioFact(
                            type="concentration",
                            title="Alerta de Concentración",
                            description=f"{most_concentrated.symbol} representa el {concentration_pct:.2f}% de tu portafolio total. Diversifica para mitigar riesgos."
                        )
                    )
                else:
                    facts.append(
                        PortfolioFact(
                            type="concentration",
                            title="Diversificación Saludable",
                            description=f"Tu activo más grande es {most_concentrated.symbol} y solo representa el {concentration_pct:.2f}% de tu cartera."
                        )
                    )
            else:
                facts.append(
                    PortfolioFact(
                        type="diversification",
                        title="Cartera Vacía",
                        description="Aún no tienes posiciones abiertas. Ejecuta análisis cuánticos para que el bot empiece a operar."
                    )
                )

            return PortfolioResponse(
                summary=summary,
                positions=positions,
                facts=facts,
                news=news_list[:6] # Capped to latest 6 news items total
            )

        except Exception as e:
            logger.error(f"Error al calcular portafolio para {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error interno del servidor al obtener el portafolio: {str(e)}")
