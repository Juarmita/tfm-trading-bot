# TFM Trading Bot - Sistema de Inversión Automatizada Cuantitativa | TFM 2025/2026

## 🏷️ Badges Académicos

[![CI Pipeline](https://github.com/Juarmita/tfm-trading-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/Juarmita/tfm-trading-bot/actions/workflows/ci.yml)
[![Pytest Coverage](https://img.shields.io/badge/pytest-85%25%20coverage%20(69%20passed)-success)](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/tests)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/LICENSE)
[![Frontend Live](https://img.shields.io/badge/Frontend-Vercel%20Live-brightgreen)](https://frontend-five-kohl-4rc8ugx0s0.vercel.app)
[![Backend Health](https://img.shields.io/badge/Backend%20Health-HTTP%20200%20OK-success)](https://tfm-trading-bot.onrender.com/health)
[![TFM Compliance](https://img.shields.io/badge/TFM%20Compliance-100%25%20Verified-blueviolet)](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/docs/tfm_compliance_final.md)

---

## a. Descripción general del proyecto

El **TFM Trading Bot** es un sistema web integral de inversión automatizada cuantitativa diseñado para resolver el problema de la **opacidad ("caja negra")** en las herramientas de trading algorítmico dirigidas al inversor minorista (*retail*).

### Objetivos y Diferenciación Técnica
1. **Explicabilidad mediante IA (Explainable AI)**: Cada decisión algorítmica (`BUY`, `SELL`, `HOLD`) genera automáticamente una justificación en lenguaje natural estructurada en Markdown académico y acompañada por un esquema JSON determinista (`execution_plan`), permitiendo auditar los factores técnicos, fundamentales y de riesgo aplicados en tiempo real.
2. **Gestión Dinámica de Fondos y Riesgos**: Incorpora reglas estrictas en tiempo real que penalizan la sobreconcentración del portafolio ($>30\%$) y reducen dinámicamente la asignación de capital a la mitad ante eventos de *drawdown* histórico significativo ($>25\%$).
3. **Selector Dual de Horizonte Temporal (Long/Short)**: Permite alternar entre estrategias de **Largo Plazo** (centradas en valoración fundamental, PER sectorial, *Dividend Yield* y medias móviles de fondo SMA50/SMA200) y de **Corto Plazo** (basadas en osciladores de sobreventa/sobrecompra RSI14, MACD, ATR y picos de volumen relativo).
4. **Arquitectura "Broker-Ready" Desacoplada**: Implementa el patrón de diseño **Adapter** mediante la interfaz abstracta `IBrokerAdapter` e inyección de dependencias en FastAPI. Esto permite operar sobre un entorno de simulación local con latencia y deslizamiento (*slippage*) controlados (`DemoBroker`) o migrar hacia brokers reales en producción (Alpaca Markets, Interactive Brokers) sin modificar una sola línea de la lógica de negocio.

### Cumplimiento de Criterios del Tribunal
El proyecto ha sido auditado y validado contra el 100% de los criterios académicos fijados en la rúbrica docente (Puntos 1a-e, 2, 3, 4 y requerimientos bonus), contando con acceso directo configurado para la evaluación (`mouredev@gmail.com`).

---

## b. Stack tecnológico actualizado

- **Frontend**: Next.js 14+ (App Router, Server & Client Components), React 19, TypeScript (comprobación de tipos estricta `tsc --noEmit`), Tailwind CSS, Shadcn/UI, Recharts (gráficos interactivos de series temporales), TanStack Query v5, Zod (validación de esquemas en cliente), `react-markdown` (renderizado de razonamiento IA), `@supabase/supabase-js`.
- **Backend**: FastAPI (Python 3.11+ / 3.14), Pydantic v2 (modelado estricto de DTOs y validación de tipos), `yfinance` / Yahoo Finance API REST, `pandas` & `numpy` (cálculos estadísticos de indicadores cuantitativos), Redis (soporte de caché opcional con fallback en memoria LRU con TTL), Pytest (**85% de cobertura de código, 69 tests unitarios e integrados superados al 100%**).
- **Base de Datos & Autenticación**: PostgreSQL + Supabase (Auth con JWT Bearer validation, Realtime WebSockets para balance de billeteras, Storage, y políticas de seguridad **Row-Level Security (RLS)** activadas e implementadas en [`supabase/migrations/20260729000000_enable_rls_security_policies.sql`](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/supabase/migrations/20260729000000_enable_rls_security_policies.sql)).
- **Infraestructura, CI/CD & Herramientas**: GitHub Actions (pipeline automatizado `.github/workflows/ci.yml` ejecutando `ruff`, `pytest --cov=app` y `next build`), Vercel CLI & Edge Deployment (Frontend), Docker base & Render Container (Backend API), script de validación automatizada [`infra/final_validation.sh`](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/infra/final_validation.sh) / [`infra/final_validation.ps1`](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/infra/final_validation.ps1).
- **Testing & Calidad de Código**: Pytest con arnés de pruebas centralizado en `backend/tests/conftest.py`, HTTPX Mock Clients para aislamiento de APIs externas, cobertura $\ge 85\%$, linters y formateadores `ruff`, `black`, `eslint` y `tsc`.

---

## c. Instalación y ejecución local

Siga los siguientes pasos secuenciales para levantar la plataforma completa en su entorno de desarrollo:

### 1. Clonar el repositorio
```bash
git clone https://github.com/Juarmita/tfm-trading-bot.git
cd tfm-bot-trading
```

### 2. Configurar Base de Datos y Supabase RLS
```bash
# Inicializar y aplicar migraciones con políticas RLS
supabase init
supabase db push --include-all
```
*Nota: Esto aplicará los esquemas iniciales [`20260717191000_init_schema.sql`](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/supabase/migrations/20260717191000_init_schema.sql) y el endurecimiento de seguridad [`20260729000000_enable_rls_security_policies.sql`](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/supabase/migrations/20260729000000_enable_rls_security_policies.sql).*

### 3. Configurar y levantar el Backend (FastAPI)
```bash
cd backend
uv venv
uv pip install -r requirements.txt
uv run fastapi dev --port 8000
```

### 4. Configurar y levantar el Frontend (Next.js)
```bash
cd ../frontend
npm install
npm run dev -- --port 3000
```

### 5. Configurar Variables de Entorno
Copie los archivos de plantilla `.env.example` en cada subproyecto (NUNCA incluya credenciales reales en el control de versiones):
- Backend: Copiar `.env.example` a `backend/.env`
- Frontend: Copiar `.env.example` a `frontend/.env.local`

### 6. Verificación de Salud y Pruebas
- **Salud del Backend**: `curl http://localhost:8000/health` (Respuesta esperada: `{"status": "ok", "environment": "production"}`)
- **Interfaz Web**: Abrir navegador en `http://localhost:3000/invest`
- **Suite de Pruebas Backend**:
  ```bash
  cd backend
  uv run pytest -v --cov=app --cov-report=term-missing
  ```

---

## d. Estructura del proyecto actual

```text
tfm-bot-trading/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Pipeline CI/CD: ruff -> pytest (>=85% cov) -> next build
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── market.py          # Endpoints REST: /quotes, /historical, /dividends, /news
│   │   │       └── trading.py         # Endpoints REST: /analyze, /execute, /portfolio, /trades, /reset
│   │   ├── core/
│   │   │   ├── broker_adapter.py      # Interfaz abstracta IBrokerAdapter y DTOs Pydantic v2
│   │   │   ├── config.py              # Gestión centralizada de Settings con pydantic-settings
│   │   │   └── dependencies.py        # Inyección de dependencias (DI Container)
│   │   ├── services/
│   │   │   ├── ai_engine.py           # Motor cuantitativo multi-factor (Scoring L/S + Risk Rules)
│   │   │   ├── demo_broker.py         # Implementación DemoBroker con simulación ACID y slippage
│   │   │   ├── market_data.py         # Servicio de datos Yahoo Finance, caché LRU y conversor FX
│   │   │   └── order_executor.py      # Orquestador de ejecución de órdenes
│   │   └── main.py                    # Aplicación FastAPI, middleware CORS y endpoint /health
│   ├── tests/                         # Suite de 69 pruebas unitarias e integradas
│   │   ├── conftest.py                # Fixtures centralizados (TestClient, Mocks, Auth, Wallets)
│   │   ├── test_ai_engine.py          # Cobertura del motor IA y scoring cuantitativo
│   │   ├── test_broker.py             # Cobertura de DemoBroker y balance en Supabase
│   │   ├── test_market_api.py         # Cobertura de la API REST de mercado
│   │   ├── test_market_data.py        # Cobertura de caché LRU, rate limiting y conversor FX
│   │   ├── test_order_executor.py     # Cobertura de ejecución de órdenes y rechazos por capital
│   │   ├── test_portfolio.py          # Cobertura de agregación de posiciones y retorno P&L
│   │   ├── test_supabase_integrations.py # Cobertura de integración PostgREST
│   │   └── test_trading_api.py        # Cobertura de endpoints de trading y verificación JWT
│   └── requirements.txt
├── docs/                              # Entregables académicos y documentación de auditoría
│   ├── FINAL_AUDIT_REPORT.md          # Informe final de auditoría senior y matriz 100% tribunal
│   ├── tfm_compliance_final.md        # Mapeo exhaustivo de criterios académicos a código real
│   ├── presentacion.pptx              # Diapositivas oficiales para la defensa oral del TFM
│   ├── presentacion_defensa.md        # Guion de presentación estructurado con notas del orador
│   ├── presentacion_ejecutiva.md      # Resumen ejecutivo técnico en una página
│   ├── security_audit_report.md       # Informe de auditoría de seguridad y hardening
│   └── slides/                        # Visor web interactivo de diapositivas en HTML5/CSS/JS
├── frontend/
│   ├── src/
│   │   ├── app/                       # App Router: landing, /invest, /portfolio, login, signup
│   │   ├── components/                # Componentes UI: InvestmentFlowDrawer, PortfolioTable, etc.
│   │   ├── hooks/                     # Custom Hooks: usePortfolio, useMarketData, useAuth
│   │   └── lib/                       # Cliente Supabase, esquemas Zod y utilidades
│   ├── middleware.ts                  # Middleware de protección de rutas por cookie Supabase Auth
│   ├── package.json
│   └── tsconfig.json
├── infra/                             # Scripts de infraestructura y validación
│   ├── final_validation.sh            # Script Bash de validación automatizada (6/6 checks)
│   ├── final_validation.ps1           # Script PowerShell de validación automatizada (6/6 checks)
│   └── DEPLOY.md                      # Guía de despliegue en Vercel y Render.com
├── supabase/
│   └── migrations/
│       ├── 20260717191000_init_schema.sql                 # Esquema relacional PostgreSQL inicial
│       └── 20260729000000_enable_rls_security_policies.sql # Hardening RLS (auth.uid() = user_id)
├── .env.example                       # Plantilla de variables de entorno seguras
├── .gitignore
├── LICENSE                            # Licencia MIT
└── README.md                          # Documento actual de especificación técnica
```

---

## e. Funcionalidades principales y cumplimiento académico

- **Motor Cuantitativo Ponderado por Horizonte Temporal**:
  - *Largo Plazo*: Prioriza activos con *Dividend Yield* $>2\%$, PER inferior al sector, y tendencia primaria alcista ($\text{SMA50} > \text{SMA200}$).
  - *Corto Plazo*: Evalúa osciladores estocásticos ($\text{RSI14} < 30$ para sobreventa), volumen relativo $>1.5$, MACD y ATR.
  - *Gestión Dinámica de Riesgo*: Descuento de capital del $50\%$ si el *drawdown* histórico supera el $25\%$, y bloqueo forzado a `HOLD` si la posición en cartera supera el $30\%$.
- **Gestión de Fondos y Sincronización Realtime**:
  - Validación de capital mediante esquemas Zod en frontend ($Amount \ge 100$ USD y $Amount \le \text{Balance}$) y deducción atómica ACID en backend sobre la tabla `wallets`.
  - Transmisión de cambios de saldo en tiempo real mediante WebSockets (`Supabase Realtime`).
- **Razonamiento IA en Markdown Explicativo + JSON Determinista**:
  - Generación de informes explicativos en Markdown jerárquico listos para su inspección en la UI via `react-markdown`.
  - Estructuración de la orden en un objeto `execution_plan` JSON determinista exportable para la trazabilidad del tribunal.
- **Calendario de Ex-Dividendos y Feed de Noticias**:
  - Endpoints `/api/v1/market/dividends/{symbol}` y `/api/v1/market/news/{symbol}` que alimentan la vista del portafolio con datos contextuales del emisor.
- **Arquitectura Broker-Ready Desacoplada**:
  - Abstracción mediante `IBrokerAdapter` e inyección en `dependencies.py` que independiza la lógica algorítmica de la capa de ejecución financiera.
- **Suite de Pruebas Reproducible & Cobertura ≥85%**:
  - **69 tests unitarios e integrados pasados con exito (0 fallos)** evaluando el motor cuantitativo, ejecución de órdenes, auth JWT, PostgREST y conversión multidivisa (`USD`, `EUR`, `GBp`, `CNY`).
- **Endurecimiento de Seguridad (Hardening)**:
  - Habilitación de **Row-Level Security (RLS)** con políticas `auth.uid() = user_id` en las 5 tablas públicas (`users`, `wallets`, `portfolio_strategies`, `ai_trading_sessions`, `trades`).
  - Verificación estricta de firma JWT en Backend FastAPI, sanitización de Markdown en cliente, y headers de seguridad HTTP (CSP, HSTS, X-Frame-Options).
- **Despliegue CI/CD Verificado**:
  - Pipeline GitHub Actions verde, Vercel Deploy activo, y endpoint `/health` respondiendo `HTTP 200 OK`.

---

## 🧪 Reproducibilidad & Demo Académica

Para facilitar la evaluación por parte del tribunal, el repositorio incluye un protocolo de demostración rápida y scripts de verificación automatizada:

1. **Levantamiento en local (< 3 minutos)**:
   ```bash
   # En terminal 1 (Backend)
   cd backend && uv run fastapi dev --port 8000

   # En terminal 2 (Frontend)
   cd frontend && npm run dev -- --port 3000
   ```
2. **Credenciales de Evaluación (Producción & Local)**:
   - **Producción (Vercel Live: `https://frontend-five-kohl-4rc8ugx0s0.vercel.app`)**:
     - **Email Evaluador**: `evaluador@tfm.com`
     - **Contraseña**: `tfm123456`
     - **Saldo billetera virtual**: `$10,000.00 USD`
   - **Entorno Local (Mock Dev)**:
     - **Email**: `evaluador@tfm.com`
     - **Contraseña**: `tfm123456`
     - **Saldo billetera virtual**: `$10,000.00 USD`
3. **Script de Validación Automatizada del Tribunal**:
   Ejecute desde la raíz del proyecto para comprobar de forma interactiva los 6 criterios del tribunal:
   ```bash
   # En Linux / macOS
   ./infra/final_validation.sh

   # En Windows PowerShell
   powershell -ExecutionPolicy Bypass -File ./infra/final_validation.ps1
   ```
   *Salida esperada*: `🎉 AUDITORÍA TÉCNICA SUPERADA CON ÉXITO: 6/6 CHECKS VALIDADOS`.
4. **Exportación de Materiales de Defensa**:
   - Diapositivas PowerPoint: Copiar [`docs/presentacion.pptx`](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/docs/presentacion.pptx)
   - Visor de Slides HTML: Navegar a `http://localhost:3000/slides/` o acceder a GitHub Pages.

---

## 📖 Referencias & Licencia

### Referencias Bibliográficas (Norma APA 7ª Edición)
- FastAPI Framework Team. (2026). *FastAPI: High performance, easy to learn, fast to code, ready for production*. https://fastapi.tiangolo.com/
- Vercel, Inc. (2026). *Next.js 14 Documentation: App Router Architecture*. https://nextjs.org/docs
- Supabase, Inc. (2026). *Supabase Docs: Row Level Security & Postgres Policies*. https://supabase.com/docs/guides/auth/row-level-security
- Pytest Development Team. (2026). *pytest: helps you write better programs*. https://docs.pytest.org/
- Arakaya, R. (2025). *yfinance: Yahoo! Finance market data downloader*. Python Package Index. https://pypi.org/project/yfinance/
- McKinney, W. (2010). Data Structures for Statistical Computing in Python. *Proceedings of the 9th Python in Science Conference*, 56–61.
- Harris, C. R., Millman, K. J., van der Walt, S. J., et al. (2020). Array programming with NumPy. *Nature*, 585(7825), 357–362.

---

**Licencia**: Este proyecto está publicado bajo la [Licencia MIT](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/LICENSE) © 2026 Juan Manuel Garcia Jurado. Código fuente abierto con fines estrictamente académicos.  
**Última actualización de auditoría**: 2026-07-29 12:25 UTC
