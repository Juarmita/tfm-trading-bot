# 🎓 Preparación Q&A para la Defensa del TFM

> 10 preguntas probables del tribunal con respuestas técnicas fundamentadas en el código implementado y la arquitectura del sistema.

---

## Pregunta 1: ¿Cómo garantiza su sistema la seguridad de las operaciones financieras y la protección contra accesos no autorizados?

**Respuesta técnica**:

La seguridad se implementa en **tres capas de defensa en profundidad**:

1. **Capa de Autenticación (Supabase Auth)**: Los usuarios se autentican mediante email/password contra Supabase Auth, que emite un JWT firmado con el secreto `SUPABASE_JWT_SECRET`. Este token se almacena como cookie HttpOnly en el navegador.

2. **Capa de Proxy (Next.js Server-Side)**: Las API Routes de Next.js (`src/app/api/trading/analyze/route.ts`) actúan como proxy seguro. Las claves sensibles (`SUPABASE_SERVICE_ROLE_KEY`, `FASTAPI_BASE_URL`) **nunca se exponen al browser** — solo existen en el entorno del servidor.

3. **Capa de Verificación (FastAPI Backend)**: La función `get_current_user_id()` en `trading.py` (líneas 23-80) extrae el Bearer token de la cabecera `Authorization`, verifica la firma criptográfica con `python-jose` usando el algoritmo HS256, valida la audiencia `authenticated` y compara el `user_id` del token con el de la petición. Si hay discordancia → `403 Forbidden`.

Adicionalmente: CORS restringido a dominios específicos (`CORS_ORIGINS`), Row Level Security (RLS) en PostgreSQL, y el middleware de Next.js (`middleware.ts`) protege las rutas del frontend.

**Evidencia en código**: [`backend/app/api/v1/trading.py`](../backend/app/api/v1/trading.py) líneas 23-80, [`docs/security_audit_report.md`](security_audit_report.md).

---

## Pregunta 2: ¿Qué pasaría si quisiera conectar un broker real en lugar del simulador? ¿Cuánto esfuerzo requeriría?

**Respuesta técnica**:

El sistema implementa el **patrón Adapter** (GoF) mediante la interfaz abstracta `IBrokerAdapter` definida en `broker_adapter.py`. Esta interfaz declara 4 métodos abstractos:

```python
class IBrokerAdapter(ABC):
    async def execute_order(self, order: OrderRequest) -> ExecutionReport
    async def get_balance(self, user_id: UUID) -> float
    async def get_positions(self, user_id: UUID) -> List[Position]
    async def validate_capital(self, user_id: UUID, required_capital: float) -> bool
```

Para conectar Alpaca o Interactive Brokers, se necesita:
1. **Crear** `alpaca_broker.py` que implemente `IBrokerAdapter` delegando en la SDK de Alpaca.
2. **Registrar** el adaptador en `dependencies.py` (el factory `init_broker()` ya tiene un branch `elif adapter_type in ["alpaca", "ibkr"]`).
3. **Configurar** `BROKER_ADAPTER=alpaca` en las variables de entorno + las credenciales del broker.

**Esfuerzo estimado**: ~200 líneas de código en un solo archivo nuevo. **Cero cambios** en `ai_engine.py`, `order_executor.py`, `trading.py` o el frontend. La lógica cuantitativa y la capa de presentación son completamente agnósticas al broker.

**Evidencia en código**: [`backend/app/core/broker_adapter.py`](../backend/app/core/broker_adapter.py), [`backend/app/core/dependencies.py`](../backend/app/core/dependencies.py).

---

## Pregunta 3: ¿Cómo es reproducible su motor de IA? ¿Podría otro investigador obtener los mismos resultados?

**Respuesta técnica**:

El motor cuantitativo es **determinista dado los mismos inputs**. La función `analyze()` en `ai_engine.py` recibe datos de mercado puros (DataFrame de pandas con OHLCV) y aplica fórmulas matemáticas bien definidas:

- **SMA/EMA**: Medias móviles simples y exponenciales calculadas con `pandas.DataFrame.rolling()` y `.ewm()`.
- **RSI**: Cálculo estándar de Relative Strength Index sobre ventana de 14 períodos.
- **MACD**: Diferencia entre EMA(12) y EMA(26) con señal EMA(9).
- **Score final**: Ponderación aritmética documentada en la justificación Markdown generada.

La **reproducibilidad** se garantiza mediante:
1. **Tests unitarios** con mocks de datos de mercado (`test_ai_engine.py`, 7 tests) que verifican que los scores, penalizaciones y formatos de salida sean exactos.
2. **Seed data** en la migración SQL (`supabase/migrations/`) para recrear el estado inicial de wallets y usuarios.
3. **Justificación exportable**: Cada análisis genera un documento Markdown con los factores ponderados y sus valores numéricos exactos, permitiendo auditoría posterior.

La única fuente de no-determinismo son los datos de mercado en tiempo real de Yahoo Finance, que por naturaleza cambian segundo a segundo. Para reproducibilidad completa, los tests mockean estos datos con DataFrames fijos.

**Evidencia en código**: [`backend/app/services/ai_engine.py`](../backend/app/services/ai_engine.py), [`backend/tests/test_ai_engine.py`](../backend/tests/test_ai_engine.py).

---

## Pregunta 4: ¿Cómo maneja su sistema la escalabilidad? ¿Qué ocurriría con 1.000 usuarios concurrentes?

**Respuesta técnica**:

La arquitectura actual está diseñada para **escalar horizontalmente**:

1. **Backend stateless**: FastAPI es asíncrono (ASGI/uvicorn). Cada instancia no almacena estado de sesión — toda la persistencia está en Supabase. Se pueden levantar N réplicas detrás de un balanceador de carga.

2. **Caché en memoria**: `MarketDataService` implementa un caché con TTL de 5 minutos para cotizaciones y 1 hora para tipos de cambio. Para N usuarios consultando el mismo ticker, solo se realiza 1 llamada a Yahoo Finance. En producción, la variable `REDIS_URL` permite migrar este caché a Redis compartido entre instancias.

3. **Frontend CDN**: Next.js desplegado en Vercel se distribuye globalmente en Edge Functions. La latencia al usuario es mínima independientemente de la ubicación geográfica.

4. **Base de datos**: Supabase (PostgreSQL) soporta connection pooling nativo con PgBouncer. Las consultas están indexadas por `user_id`.

**Cuellos de botella identificados y mitigaciones**:
- Yahoo Finance tiene rate-limits (no documentados oficialmente, ~2000 req/hora). Para 1000 usuarios, el caché evita saturación.
- El motor de IA (`ai_engine.py`) hace cálculos CPU-bound con pandas. A gran escala, se delegaría a un worker queue (Celery/Redis).

**Evidencia en código**: [`backend/app/services/market_data.py`](../backend/app/services/market_data.py) (caché), [`backend/app/core/config.py`](../backend/app/core/config.py) (Redis URL).

---

## Pregunta 5: ¿Cuáles son las limitaciones de utilizar Yahoo Finance como fuente de datos?

**Respuesta técnica**:

Yahoo Finance (`yfinance`) es una librería open source que accede a la API web de Yahoo. Sus limitaciones conocidas son:

| Limitación | Impacto | Mitigación implementada |
|---|---|---|
| **Sin SLA garantizado** | El servicio puede caer o cambiar su API sin aviso | Manejo de excepciones con fallback y caché en memoria |
| **Rate-limiting implícito** | ~2000 peticiones/hora (no documentado) | Caché con TTL de 5 minutos para quotes, 1 hora para forex |
| **Datos delayed 15-20 min** | Las cotizaciones no son tick-by-tick | Aceptable para el alcance demo del TFM |
| **Cobertura parcial de mercados** | Algunos mercados emergentes no disponibles | Soporte implementado para los 5 principales (NYSE, LSE, XETRA, BME, Euronext) |
| **Divisas en peniques** | LSE cotiza en GBp en lugar de GBP | Conversión automática implementada en `market_data.py` (`get_usd_exchange_rate`) |

Para una versión de producción real, se recomendaría migrar a **Polygon.io** o **Alpha Vantage** con API keys de pago, que ofrecen datos en streaming WebSocket y SLA contractual.

**Evidencia en código**: [`backend/app/services/market_data.py`](../backend/app/services/market_data.py) líneas de caché y `get_usd_exchange_rate()`.

---

## Pregunta 6: ¿Cómo gestiona el riesgo de que un usuario pierda todo su capital?

**Respuesta técnica**:

El sistema implementa **tres niveles de control de riesgo** antes de ejecutar cualquier operación:

1. **Penalización por concentración** (>30%): Si el capital asignado a un activo supera el 30% del portafolio total, el score se penaliza con un factor de -0.15, pudiendo convertir un BUY en HOLD.

2. **Penalización por correlación** (>0.70): Si el activo analizado tiene una correlación histórica >0.70 con las posiciones existentes del usuario, se aplica una penalización de -0.10 al score.

3. **Recorte por drawdown** (>25%): Si el activo ha sufrido un drawdown histórico superior al 25% desde máximos, la cantidad de acciones recomendada se recorta un 50% automáticamente.

4. **Validación de balance**: El `DemoBroker.validate_capital()` verifica fondos disponibles **antes** de enviar la orden. Si el balance es insuficiente, la orden es rechazada con status `"rejected"`.

5. **Simulación ACID**: La escritura del trade y la actualización del balance se ejecutan como operaciones atómicas en Supabase, evitando inconsistencias por fallos parciales.

**Evidencia en código**: [`backend/app/services/ai_engine.py`](../backend/app/services/ai_engine.py) (penalizaciones), [`backend/app/services/demo_broker.py`](../backend/app/services/demo_broker.py) (validación y ACID), [`backend/tests/test_broker.py`](../backend/tests/test_broker.py) (test balance insuficiente).

---

## Pregunta 7: ¿Por qué eligió una arquitectura de proxy en Next.js en lugar de llamadas directas del frontend al backend?

**Respuesta técnica**:

La arquitectura de proxy server-side se eligió por **tres razones de seguridad**:

1. **Ocultación de secrets**: Las claves `FASTAPI_BASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` solo existen en el servidor de Next.js (variables de entorno de Vercel). El código del browser **nunca** tiene acceso a la URL real del backend. Un atacante no puede inspeccionar el Network tab y descubrir la dirección de la API.

2. **Inyección segura de tokens**: El proxy en `route.ts` extrae la sesión de Supabase del usuario autenticado, obtiene su `access_token`, y lo inyecta como cabecera `Authorization: Bearer <token>` en la petición al backend. El frontend nunca manipula tokens directamente.

3. **Protección contra CORS bypass**: Al realizar las llamadas desde el servidor (server-to-server), no hay restricciones CORS entre Next.js y FastAPI. El CORS de FastAPI solo necesita permitir el dominio del frontend (no `*`), reduciendo la superficie de ataque.

**Alternativa evaluada y descartada**: Llamadas directas del browser al backend expondrían la URL de la API, requerirían CORS más permisivo, y dejarían los tokens de autenticación accesibles en el localStorage/sessionStorage del navegador.

**Evidencia en código**: [`frontend/src/app/api/trading/analyze/route.ts`](../frontend/src/app/api/trading/analyze/route.ts).

---

## Pregunta 8: ¿Cómo asegura la calidad del código a lo largo del desarrollo?

**Respuesta técnica**:

La calidad se asegura mediante un pipeline de CI/CD automatizado (`.github/workflows/ci.yml`) que ejecuta **7 verificaciones** en cada push:

| Paso | Herramienta | Qué verifica |
|---|---|---|
| 1 | `ruff check` | Linting Python: imports, PEP 8, errores lógicos |
| 2 | `ruff format --check` | Formateo consistente del código Python |
| 3 | `pytest --cov` | 18 tests unitarios con reporte de cobertura |
| 4 | `npm run lint` | ESLint con preset `next/core-web-vitals` |
| 5 | `npm run typecheck` | Compilación TypeScript estricta (`tsc --noEmit`) |
| 6 | `npm run build` | Build de producción Next.js (verifica que compila) |
| 7 | GitHub Branch Protection | PRs requieren CI verde para merge a `main` |

Adicionalmente, el backend usa **Pydantic v2** para validación estricta de todos los inputs/outputs de la API, y **TypeScript strict** en el frontend previene errores de tipos en tiempo de compilación.

**Evidencia en código**: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), [`backend/pyproject.toml`](../backend/pyproject.toml) (configuración ruff/mypy/black).

---

## Pregunta 9: ¿Qué mejoras implementaría en una siguiente iteración del sistema?

**Respuesta técnica**:

Las líneas de trabajo futuro están priorizadas por impacto:

1. **Broker real (Alpaca/IBKR)**: Conectar la interfaz `IBrokerAdapter` existente con un broker regulado. El esfuerzo es mínimo (~200 LOC) gracias al patrón Adapter ya implementado.

2. **Streaming de precios (WebSocket)**: Migrar de polling HTTP (yfinance) a datos en tiempo real mediante WebSocket (Polygon.io o Alpaca data stream), habilitando trading intradía con latencia <100ms.

3. **Backtesting histórico**: Implementar un módulo que ejecute la estrategia sobre datos históricos de N años, generando métricas de Sharpe ratio, máximo drawdown y CAGR para validación cuantitativa formal.

4. **Machine Learning**: Reemplazar las reglas heurísticas del scoring por un modelo de ML (Random Forest o LSTM) entrenado sobre features técnicas históricas, manteniendo la explicabilidad mediante SHAP values.

5. **Alertas y notificaciones**: Integrar un sistema de alertas push (email/Telegram) cuando el motor detecte oportunidades de inversión o cambios significativos en posiciones abiertas.

6. **Multi-tenant y roles**: Extender Supabase Auth con roles (admin, trader, viewer) y dashboards diferenciados por nivel de acceso.

---

## Pregunta 10: ¿Cómo ha validado que el sistema funciona correctamente de extremo a extremo?

**Respuesta técnica**:

La validación se realizó en **tres niveles**:

### Nivel 1: Tests unitarios automatizados (18 tests)
- `test_ai_engine.py` (7): Verifican scoring, penalizaciones de riesgo, formato Markdown y soporte para tickers con historial corto.
- `test_broker.py` (4): Simulan slippage, latencia, rechazo por balance insuficiente y consistencia ACID.
- `test_main.py` (4): Verifican endpoints básicos + rechazo de peticiones sin JWT y con JWT inválido.
- `test_market_data.py` (2): Mockean yfinance para verificar quotes y descargas históricas.
- `test_portfolio.py` (1): Valida agrupación de posiciones netas y cálculo de ROI.

### Nivel 2: Verificación en producción
Se realizó una prueba end-to-end completa en producción:
1. Login con `evaluador@tfm.com` → Dashboard muestra wallet con $10,000.
2. Navegar a `/invest` → Análisis de `RR` (Rolls-Royce) en mercado Reino Unido (LSE).
3. El sistema detectó precio en peniques (1365.60 GBp), convirtió a USD ($18.37) y recomendó BUY de 27.2 acciones.
4. Confirmación → Trade guardado en Supabase, wallet actualizada en tiempo real.
5. Portafolio (`/portfolio`) muestra la posición con valoración correcta en USD.

### Nivel 3: Auditoría de seguridad
- Test manual con `curl` sin Bearer token → `401 Unauthorized` (antes de la auditoría devolvía `200`).
- Test con token manipulado → `401 Unauthorized`.
- Documentado en [`docs/security_audit_report.md`](security_audit_report.md).

**Evidencia**: [`backend/tests/`](../backend/tests/), GitHub Actions CI green badge, screenshots de producción en la presentación de defensa.
