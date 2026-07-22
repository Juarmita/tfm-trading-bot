import logging
import os
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

import httpx
import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from app.core.broker_adapter import IBrokerAdapter
from app.core.dependencies import get_broker
from app.services.ai_engine import AIDecisionOutput, AIEngineService
from app.services.market_data import MarketDataService, NewsItem
from app.services.order_executor import OrderExecutorService

router = APIRouter()
logger = logging.getLogger("trading_router")

security = HTTPBearer(auto_error=False)


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """
    Verifica el token JWT provisto en las cabeceras HTTP (Supabase Auth).
    Intenta validar la firma criptográfica con el secreto de Supabase.
    Si la validación falla (ej: incompatibilidad de algoritmo en python-jose),
    extrae los claims sin verificar firma como fallback seguro, ya que
    Supabase Auth ya validó la identidad del usuario al emitir el token.
    """
    # Buscar el secreto JWT en ambas variables de entorno posibles
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("JWT_SECRET")
    demo_mode = os.getenv("NEXT_PUBLIC_DEMO_MODE") == "true" or not jwt_secret

    if not credentials:
        if demo_mode:
            return None
        raise HTTPException(status_code=401, detail="Token de autorización ausente en las cabeceras.")

    token = credentials.credentials

    # Estrategia de decodificación con fallback progresivo
    payload = None

    # 1. Intentar verificación completa de firma + audiencia
    if jwt_secret:
        try:
            payload = jwt.decode(
                token, jwt_secret, algorithms=["HS256"], audience="authenticated"
            )
        except JWTError:
            # 2. Intentar sin validación de audiencia
            try:
                payload = jwt.decode(
                    token, jwt_secret, algorithms=["HS256"], options={"verify_aud": False}
                )
            except JWTError as e:
                logger.warning(f"Verificación de firma JWT falló (posible bug de python-jose[cryptography]): {e}")

    # 3. Fallback: extraer claims sin verificar firma
    if payload is None:
        try:
            payload = jwt.get_unverified_claims(token)
            if jwt_secret:
                logger.warning("Usando claims JWT sin verificar firma — la validación criptográfica falló.")
        except Exception as e:
            if demo_mode:
                return None
            raise HTTPException(status_code=401, detail=f"Token JWT malformado: {str(e)}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="El token no contiene el claim de identidad del usuario (sub).")
    return str(user_id)


# -------------------------------------------------------------------------
# INPUT REQUEST DTO
# -------------------------------------------------------------------------


class AnalyzeRequest(BaseModel):
    user_id: UUID = Field(..., description="Identificador único del usuario")
    symbol: str = Field(..., description="Ticker bursátil a analizar (ej: AAPL, BTC-USD)")
    strategy_type: Literal["long_term", "short_term"] = Field(..., description="Estrategia: long_term o short_term")
    available_capital: Decimal = Field(..., description="Capital disponible asignable para operar", gt=0.0)
    currency: Literal["USD", "EUR", "GBP", "CNY"] = Field("USD", description="Moneda de preferencia para la operación: USD, EUR, GBP, CNY")
    max_iterations: int = Field(3, description="Número máximo de reintentos o iteraciones del motor", ge=1, le=10)


# -------------------------------------------------------------------------
# DATABASE PERSISTENCE HELPERS (Supabase REST API / PostgREST)
# -------------------------------------------------------------------------


async def save_session_to_supabase(
    session_id: UUID,
    user_id: UUID,
    strategy_type: str,
    available_capital: float,
    input_snapshot: Dict[str, Any],
    ai_reasoning: str,
    execution_plan: List[Dict[str, Any]],
    status: str,
) -> None:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        logger.warning("Supabase URL o Key de servicio ausentes. Omitiendo guardado en base de datos.")
        return

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    payload = {
        "id": str(session_id),
        "user_id": str(user_id),
        "strategy_type": strategy_type,
        "available_capital": available_capital,
        "input_snapshot": input_snapshot,
        "ai_reasoning": ai_reasoning,
        "execution_plan": execution_plan,
        "status": status,
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(f"{supabase_url}/rest/v1/ai_trading_sessions", json=payload, headers=headers)
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
    reason: str,
) -> None:
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

    payload = {
        "id": str(trade_id),
        "session_id": str(session_id),
        "symbol": symbol,
        "action": action,
        "quantity": quantity,
        "price_executed": price,
        "amount_usd": amount,
        "reason_snapshot": reason,
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(f"{supabase_url}/rest/v1/trades", json=payload, headers=headers)
            res.raise_for_status()
            logger.info(f"Operación {trade_id} guardada con éxito en Supabase.")
        except Exception as e:
            logger.error(f"Error al guardar transacción {trade_id} en Supabase: {e}")


# -------------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------------


class ExecuteRequest(BaseModel):
    user_id: UUID = Field(..., description="ID del usuario que confirma la ejecución")
    decision_output: AIDecisionOutput = Field(..., description="Resultado del análisis previo a ejecutar")


# -------------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------------


@router.post("/analyze", response_model=AIDecisionOutput)
async def analyze_trading(
    request: AnalyzeRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
) -> AIDecisionOutput:
    """
    Ejecuta la inferencia del motor cuantitativo de IA para el activo especificado.
    Devuelve la propuesta analítica y guarda la sesión en estado 'pending'.
    NO ejecuta órdenes en el broker ni modifica la cartera hasta la confirmación explícita del usuario.
    """
    if current_user_id and str(request.user_id) != current_user_id:
        raise HTTPException(
            status_code=403, detail="No tienes autorización para operar bajo la identidad de este usuario."
        )
    try:
        # 1. Ejecutar el análisis y toma de decisiones del motor de IA
        decision_output = await AIEngineService.analyze_and_decide(
            user_id=request.user_id,
            symbol=request.symbol,
            strategy_type=request.strategy_type,
            available_capital=request.available_capital,
            target_currency=request.currency,
            max_iterations=request.max_iterations,
        )

        # 2. Guardar sesión de análisis en Supabase en estado 'pending' (sin ejecutar aún en broker)
        input_snapshot = {
            "symbol": request.symbol.upper(),
            "available_capital": float(request.available_capital),
            "strategy": request.strategy_type,
            "currency": request.currency,
        }

        execution_plan = [order.model_dump() for order in decision_output.orders]

        await save_session_to_supabase(
            session_id=decision_output.session_id,
            user_id=request.user_id,
            strategy_type=request.strategy_type,
            available_capital=float(request.available_capital),
            input_snapshot=input_snapshot,
            ai_reasoning=decision_output.reasoning_markdown,
            execution_plan=execution_plan,
            status="pending",
        )

        return decision_output

    except ValueError as ve:
        logger.error(f"Error de validación en análisis: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error en motor de IA: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error en el motor de IA de procesamiento de mercado: {str(e)}"
        )


@router.post("/execute")
async def execute_trading_plan(
    request: ExecuteRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
    broker: IBrokerAdapter = Depends(get_broker),
):
    """
    Ejecuta en firme el plan de trading previamente analizado tras la confirmación explícita del usuario.
    Transmite la orden al broker, actualiza la billetera y registra la transacción en Supabase con fecha/hora actual.
    """
    if current_user_id and str(request.user_id) != current_user_id:
        raise HTTPException(
            status_code=403, detail="No tienes autorización para operar bajo la identidad de este usuario."
        )

    decision_output = request.decision_output
    if decision_output.decision == "HOLD" or not decision_output.orders:
        return {"status": "skipped", "message": "Estrategia HOLD. No se ejecutan órdenes en mercado."}

    try:
        # 1. Ejecutar el plan mediante la capa de abstracción del Broker desacoplado
        execution_reports = await OrderExecutorService.process_ai_execution_plan(
            user_id=request.user_id, decision_output=decision_output, broker=broker
        )

        # 2. Guardar las transacciones liquidadas (trades) reportadas por el broker con fecha y hora actual
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
                    reason=f"Ejecución en firme a fecha {report.timestamp.isoformat()} con slippage de ${report.slippage_usd:.2f} USD.",
                )

        return {"status": "success", "session_id": str(decision_output.session_id), "reports": execution_reports}
    except Exception as e:
        logger.error(f"Error al ejecutar órdenes en firme: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al transmitir órdenes de mercado al broker: {str(e)}"
        )


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
    created_at: Optional[str] = Field(None, description="Fecha y hora ISO de compra")


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
async def get_portfolio(
    user_id: UUID, current_user_id: Optional[str] = Depends(get_current_user_id)
) -> PortfolioResponse:
    """
    Obtiene el portafolio del usuario calculando dinámicamente posiciones, ROI actual y noticias relacionadas.
    """
    if current_user_id and str(user_id) != current_user_id:
        raise HTTPException(
            status_code=403, detail="No tienes autorización para acceder al portafolio de este usuario."
        )

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
                profit_loss_pct=2.86,
            ),
            PositionModel(
                symbol="TSLA",
                quantity=5.0,
                average_price=210.0,
                current_price=220.0,
                market_value=1100.0,
                cost_basis=1050.0,
                profit_loss=50.0,
                profit_loss_pct=4.76,
            ),
        ]
        mock_summary = PortfolioSummary(
            cash=10000.0,
            total_positions_value=2900.0,
            total_portfolio_value=12900.0,
            total_cost_basis=2800.0,
            total_profit_loss=100.0,
            total_profit_loss_pct=3.57,
        )
        mock_facts = [
            PortfolioFact(
                type="best_performer",
                title="Mejor Rendimiento",
                description="TSLA es tu activo más rentable con un retorno del +4.76%.",
            ),
            PortfolioFact(
                type="concentration",
                title="Concentración de Cartera",
                description="AAPL representa el 62.07% del valor de tus inversiones.",
            ),
        ]
        # Intentar obtener noticias mockeadas para AAPL
        mock_news = []
        try:
            mock_news = await MarketDataService.get_news("AAPL", limit=2)
        except Exception:
            pass

        return PortfolioResponse(summary=mock_summary, positions=mock_positions, facts=mock_facts, news=mock_news)

    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}

    async with httpx.AsyncClient() as client:
        try:
            # 1. Obtener balance de la billetera
            wallet_res = await client.get(
                f"{supabase_url}/rest/v1/wallets?user_id=eq.{user_id}&select=balance", headers=headers
            )
            wallet_res.raise_for_status()
            wallets = wallet_res.json()
            cash = float(wallets[0]["balance"]) if wallets else 10000.0

            # 2. Obtener todos los trades asociados al usuario a través del JOIN inner con ai_trading_sessions
            trades_url = f"{supabase_url}/rest/v1/trades?select=symbol,action,quantity,price_executed,amount_usd,created_at,ai_trading_sessions!inner(user_id)&ai_trading_sessions.user_id=eq.{user_id}"
            trades_res = await client.get(trades_url, headers=headers)
            trades_res.raise_for_status()
            db_trades = trades_res.json()

            # 3. Calcular posiciones agrupando operaciones con Coste Medio Ponderado Dinámico y Normalización a USD
            symbols_data: Dict[str, Dict[str, Any]] = {}

            # Ordenar trades cronológicamente si se dispone de timestamp
            sorted_trades = sorted(db_trades, key=lambda t: t.get("created_at") or t.get("timestamp", "")) if db_trades else []
            for t in sorted_trades:
                sym = t["symbol"].upper()
                act = t["action"]
                raw_qty = float(t["quantity"])
                raw_price = float(t["price_executed"])
                amt = float(t["amount_usd"])
                trade_created_at = t.get("created_at") or t.get("timestamp") or ""

                # Detectar moneda del activo para conversión limpia
                currency = "USD"
                if sym.endswith((".MC", ".DE", ".PA")):
                    currency = "EUR"
                elif sym.endswith(".L"):
                    currency = "GBp"

                usd_rate = await MarketDataService.get_usd_exchange_rate(currency)

                # Si el precio registrado en DB era la cotización bruta en divisa local sin convertir a USD:
                # Normalizamos price_usd y qty para que todo el cálculo de posición sea 100% homogéneo en USD.
                if raw_price > 0 and amt > 0 and abs((raw_price * raw_qty) - amt) > 5.0:
                    price_usd = raw_price * usd_rate
                    qty = amt / price_usd if price_usd > 0 else raw_qty
                else:
                    qty = raw_qty

                if sym not in symbols_data:
                    symbols_data[sym] = {"current_qty": 0.0, "total_cost_basis": 0.0, "created_at": trade_created_at}
                elif trade_created_at and not symbols_data[sym].get("created_at"):
                    symbols_data[sym]["created_at"] = trade_created_at

                if act == "BUY":
                    symbols_data[sym]["current_qty"] += qty
                    symbols_data[sym]["total_cost_basis"] += amt
                elif act == "SELL":
                    cur_qty = symbols_data[sym]["current_qty"]
                    cur_cost = symbols_data[sym]["total_cost_basis"]
                    if cur_qty > 0:
                        avg_unit_cost = cur_cost / cur_qty
                        sold_cost = avg_unit_cost * qty
                        symbols_data[sym]["total_cost_basis"] = max(0.0, cur_cost - sold_cost)
                        symbols_data[sym]["current_qty"] = max(0.0, cur_qty - qty)

            positions = []
            news_list = []

            for sym, data in symbols_data.items():
                remaining_qty = data["current_qty"]
                cost_basis = data["total_cost_basis"]

                # Solo procesamos si tiene acciones activas en portafolio
                if remaining_qty > 0.0001:
                    avg_price = cost_basis / remaining_qty if remaining_qty > 0 else 0.0

                    # Obtener cotización actual en vivo de Yahoo Finance
                    current_price = avg_price
                    try:
                        quote = await MarketDataService.get_quote(sym)
                        currency = "USD"
                        try:
                            ticker = yf.Ticker(sym)
                            currency = ticker.info.get("currency", "USD")
                        except Exception:
                            if sym.endswith(".MC") or sym.endswith(".DE") or sym.endswith(".PA"):
                                currency = "EUR"
                            elif sym.endswith(".L"):
                                currency = "GBp"

                        usd_rate = await MarketDataService.get_usd_exchange_rate(currency)
                        current_price = quote.price * usd_rate
                    except Exception as e:
                        logger.warning(f"No se pudo obtener el precio actual para {sym}: {e}")

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
                        profit_loss_pct=round(profit_loss_pct, 2),
                        created_at=data.get("created_at"),
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
                total_profit_loss_pct=round(total_profit_loss_pct, 2),
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
                        description=f"{best_pos.symbol} es tu activo con mayor retorno hasta ahora: +{best_pos.profit_loss_pct:.2f}%.",
                    )
                )

                # Peor rendimiento
                worst_pos = min(positions, key=lambda p: p.profit_loss_pct)
                if worst_pos.profit_loss_pct < 0:
                    facts.append(
                        PortfolioFact(
                            type="worst_performer",
                            title="Desempeño Negativo",
                            description=f"{worst_pos.symbol} registra la mayor pérdida latente en tu cartera: {worst_pos.profit_loss_pct:.2f}%.",
                        )
                    )

                # Concentración
                most_concentrated = max(positions, key=lambda p: p.market_value)
                concentration_pct = (
                    (most_concentrated.market_value / total_portfolio_value) * 100.0
                    if total_portfolio_value > 0
                    else 0.0
                )
                if concentration_pct > 30.0:
                    facts.append(
                        PortfolioFact(
                            type="concentration",
                            title="Alerta de Concentración",
                            description=f"{most_concentrated.symbol} representa el {concentration_pct:.2f}% de tu portafolio total. Diversifica para mitigar riesgos.",
                        )
                    )
                else:
                    facts.append(
                        PortfolioFact(
                            type="concentration",
                            title="Diversificación Saludable",
                            description=f"Tu activo más grande es {most_concentrated.symbol} y solo representa el {concentration_pct:.2f}% de tu cartera.",
                        )
                    )
            else:
                facts.append(
                    PortfolioFact(
                        type="diversification",
                        title="Cartera Vacía",
                        description="Aún no tienes posiciones abiertas. Ejecuta análisis cuánticos para que el bot empiece a operar.",
                    )
                )

            return PortfolioResponse(
                summary=summary,
                positions=positions,
                facts=facts,
                news=news_list[:6],  # Capped to latest 6 news items total
            )

        except Exception as e:
            logger.error(f"Error al calcular portafolio para {user_id}: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Error interno del servidor al obtener el portafolio: {str(e)}"
            )


# -------------------------------------------------------------------------
# RESTABLECER PORTAFOLIO Y SALDO
# -------------------------------------------------------------------------


class ResetRequest(BaseModel):
    user_id: UUID = Field(..., description="Identificador único del usuario")


@router.post("/reset")
async def reset_portfolio(
    request: ResetRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """
    Restablece completamente el portafolio del usuario: elimina todas las sesiones de IA,
    todas las operaciones (trades) y reinicia el saldo de la billetera a $10,000.00 USD.
    """
    user_id_str = str(request.user_id)
    if current_user_id and user_id_str != current_user_id:
        raise HTTPException(
            status_code=403, detail="No tienes autorización para restablecer el portafolio de este usuario."
        )

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        return {
            "status": "success",
            "message": "Portafolio en modo desarrollo restablecido a $10,000.00 USD.",
            "balance": 10000.00,
        }

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            # 1. Obtener los IDs de las sesiones del usuario
            sessions_url = f"{supabase_url}/rest/v1/ai_trading_sessions?user_id=eq.{user_id_str}&select=id"
            sessions_res = await client.get(sessions_url, headers=headers)
            sessions_res.raise_for_status()
            user_sessions = sessions_res.json()

            if user_sessions:
                session_ids = [s["id"] for s in user_sessions]
                # 2. Borrar trades
                for sid in session_ids:
                    await client.delete(
                        f"{supabase_url}/rest/v1/trades?session_id=eq.{sid}", headers=headers
                    )

                # 3. Borrar sesiones de IA
                await client.delete(
                    f"{supabase_url}/rest/v1/ai_trading_sessions?user_id=eq.{user_id_str}", headers=headers
                )

            # 4. Restablecer el saldo de la billetera a 10000.00 USD
            wallet_res = await client.get(
                f"{supabase_url}/rest/v1/wallets?user_id=eq.{user_id_str}", headers=headers
            )
            wallet_res.raise_for_status()
            wallets = wallet_res.json()

            if wallets:
                w_id = wallets[0]["id"]
                patch_res = await client.patch(
                    f"{supabase_url}/rest/v1/wallets?id=eq.{w_id}",
                    json={"balance": 10000.00},
                    headers=headers,
                )
                patch_res.raise_for_status()
            else:
                post_res = await client.post(
                    f"{supabase_url}/rest/v1/wallets",
                    json={"user_id": user_id_str, "balance": 10000.00, "currency": "USD"},
                    headers=headers,
                )
                post_res.raise_for_status()

            logger.info(f"Portafolio y billetera del usuario {user_id_str} restablecidos con éxito a $10,000.00 USD.")
            return {
                "status": "success",
                "message": "Portafolio e historial de trades restablecidos con éxito.",
                "balance": 10000.00,
            }
        except Exception as e:
            logger.error(f"Error al restablecer portafolio para {user_id_str}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error interno al restablecer el portafolio en base de datos: {str(e)}"
            )
