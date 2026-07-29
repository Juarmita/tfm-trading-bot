import pytest
from uuid import uuid4
from app.services.ai_engine import AIDecisionOutput, ExecutionOrder
from app.services.order_executor import OrderExecutorService
from app.services.demo_broker import DemoBroker


@pytest.mark.asyncio
async def test_order_executor_hold_decision():
    broker = DemoBroker()
    decision = AIDecisionOutput(
        session_id=uuid4(),
        symbol="AAPL",
        decision="HOLD",
        confidence_score=0.8,
        allocated_capital=0.0,
        orders=[],
        reasoning_markdown="# Análisis IA\nSin señal clara."
    )
    reports = await OrderExecutorService.process_ai_execution_plan(uuid4(), decision, broker)
    assert len(reports) == 0


@pytest.mark.asyncio
async def test_order_executor_buy_decision_success():
    broker = DemoBroker()
    user_id = uuid4()
    session_id = uuid4()
    decision = AIDecisionOutput(
        session_id=session_id,
        symbol="AAPL",
        decision="BUY",
        confidence_score=0.9,
        allocated_capital=1800.0,
        orders=[
            ExecutionOrder(
                action="BUY",
                symbol="AAPL",
                quantity=5.0,
                price_estimated=180.0,
                amount_usd=900.0,
                reason="Señal fuerte"
            )
        ],
        reasoning_markdown="# Análisis IA\nTendencia alcista."
    )
    reports = await OrderExecutorService.process_ai_execution_plan(user_id, decision, broker)
    assert len(reports) == 1
    assert reports[0].status == "filled"
    assert reports[0].symbol == "AAPL"
    assert reports[0].quantity_filled == 5.0


@pytest.mark.asyncio
async def test_order_executor_buy_decision_rejected():
    broker = DemoBroker()
    user_id = uuid4()
    session_id = uuid4()
    # Coste total de 1000 * 200 = $200,000 excede el saldo de $10,000 -> rejected
    decision = AIDecisionOutput(
        session_id=session_id,
        symbol="AAPL",
        decision="BUY",
        confidence_score=0.9,
        allocated_capital=200000.0,
        orders=[
            ExecutionOrder(
                action="BUY",
                symbol="AAPL",
                quantity=1000.0,
                price_estimated=200.0,
                amount_usd=200000.0,
                reason="Orden gigante"
            )
        ],
        reasoning_markdown="# Análisis IA\nExcede capital."
    )
    reports = await OrderExecutorService.process_ai_execution_plan(user_id, decision, broker)
    assert len(reports) == 1
    assert reports[0].status == "rejected"
