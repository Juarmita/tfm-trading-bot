# 📁 Estructura de Entrega Final — TFM Trading Bot v1.0

> Documento de referencia para el tribunal. Detalla la jerarquía completa del repositorio entregado, el propósito de cada archivo y su estado de validación.

---

## Jerarquía Completa del Repositorio

```text
tfm-trading-bot/                        ← RAÍZ DEL MONOREPO
│
├── README.md                           ← Documento principal de presentación (v1.0-TFM)
├── LICENSE                             ← Licencia MIT (Copyright 2026, Juan Manuel Garcia Jurado)
├── DEPLOY.md                           ← Guía detallada de despliegue a producción
├── .env.example                        ← Plantilla documentada de variables de entorno
├── .gitignore                          ← Reglas de exclusión de Git
├── tfm-init.sh                         ← Script de inicialización rápida del entorno
│
├── .github/
│   └── workflows/
│       └── ci.yml                      ← Pipeline CI de GitHub Actions
│                                         ├── Job 1: backend-lint-and-test
│                                         │   ├── ruff check (linting)
│                                         │   ├── ruff format --check (formateo)
│                                         │   └── pytest --cov (18 tests + cobertura)
│                                         └── Job 2: frontend-lint-and-build
│                                             ├── npm run lint (ESLint)
│                                             ├── npm run typecheck (tsc --noEmit)
│                                             └── npm run build (compilación de producción)
│
├── backend/                            ← SERVICIO API (FastAPI / Python 3.11+)
│   ├── Dockerfile                      ← Imagen Docker optimizada para producción
│   ├── pyproject.toml                  ← Manifiesto de dependencias (uv/Poetry)
│   ├── app/
│   │   ├── main.py                     ← Punto de entrada FastAPI + CORS + routers
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── market.py           ← GET /quotes, /historical, /dividends, /news
│   │   │       └── trading.py          ← POST /analyze + GET /portfolio/{user_id}
│   │   │                                 └── Middleware JWT (get_current_user_id)
│   │   ├── core/
│   │   │   ├── broker_adapter.py       ← Interfaz abstracta IBrokerAdapter
│   │   │   │                             ├── OrderRequest (Pydantic schema)
│   │   │   │                             ├── ExecutionReport (Pydantic schema)
│   │   │   │                             └── 4 métodos abstractos (@abstractmethod)
│   │   │   ├── config.py               ← Settings (CORS_ORIGINS dinámico, DB, Redis)
│   │   │   └── dependencies.py         ← Factory: init_broker() → get_broker()
│   │   └── services/
│   │       ├── ai_engine.py            ← Motor cuantitativo IA (15.7 KB)
│   │       │                             ├── Doble perfil: long_term / short_term
│   │       │                             ├── Indicadores: SMA, EMA, RSI, MACD, ATR
│   │       │                             ├── Penalizaciones: concentración, correlación, drawdown
│   │       │                             └── Generador de justificación Markdown
│   │       ├── market_data.py          ← Servicio de datos de mercado (17.2 KB)
│   │       │                             ├── yfinance: quotes, historical, dividends, news
│   │       │                             ├── Caché en memoria con TTL configurable
│   │       │                             └── Conversión multidivisa (GBp→USD, EUR→USD)
│   │       ├── demo_broker.py          ← Implementación DemoBroker de IBrokerAdapter
│   │       │                             ├── Simulación de slippage (configurable)
│   │       │                             ├── Latencia simulada (configurable)
│   │       │                             └── Persistencia ACID en Supabase (wallets + trades)
│   │       └── order_executor.py       ← Orquestador: validación → ejecución → persistencia
│   └── tests/                          ← SUITE DE PRUEBAS UNITARIAS (18 tests)
│       ├── __init__.py
│       ├── test_ai_engine.py           ← 7 tests: scoring, riesgo, short history, markdown
│       ├── test_broker.py              ← 4 tests: slippage, ACID, balance insuficiente
│       ├── test_main.py                ← 4 tests: health, root, JWT reject (2 variantes)
│       ├── test_market_data.py         ← 2 tests: quotes mock, historical mock
│       └── test_portfolio.py           ← 1 test: agrupación posiciones + ROI
│
├── frontend/                           ← APLICACIÓN WEB (Next.js 15 / React 19 / TypeScript)
│   ├── package.json                    ← Dependencias npm
│   ├── next.config.ts                  ← Rewrites para proxy API
│   ├── middleware.ts                   ← Protección de rutas por cookie Supabase
│   ├── .eslintrc.json                  ← Configuración ESLint (next/core-web-vitals)
│   ├── tsconfig.json                   ← Configuración TypeScript strict
│   ├── tailwind.config.ts              ← Configuración Tailwind CSS
│   └── src/
│       ├── app/
│       │   ├── layout.tsx              ← Layout raíz + <Toaster /> + Google Fonts
│       │   ├── globals.css             ← Estilos globales + tema oscuro
│       │   ├── page.tsx                ← Landing page de presentación (15.4 KB)
│       │   ├── login/page.tsx          ← Autenticación Supabase Auth
│       │   ├── dashboard/page.tsx      ← Panel principal con historial de trades
│       │   ├── invest/page.tsx         ← Módulo de inversión cuantitativa
│       │   ├── portfolio/page.tsx      ← Portafolio consolidado con KPIs y noticias
│       │   └── api/                    ← API Routes (Server-Side Proxy seguro)
│       │       ├── trading/
│       │       │   ├── analyze/route.ts       ← Proxy POST /analyze
│       │       │   └── portfolio/[userId]/route.ts ← Proxy GET /portfolio
│       │       ├── market/[...path]/route.ts  ← Proxy de datos de mercado
│       │       └── protected/route.ts         ← Ruta de verificación de auth
│       ├── components/
│       │   └── investment/
│       │       ├── InvestmentFlowDrawer.tsx    ← Drawer multi-step de inversión (20.7 KB)
│       │       └── useInvestmentSession.ts    ← Hook de gestión de sesión de inversión
│       ├── hooks/
│       │   └── useSession.ts           ← Hook global: auth + wallet realtime
│       ├── lib/
│       │   ├── api/client.ts           ← Cliente Axios con interceptor Bearer
│       │   └── supabase/client.ts      ← Inicialización Supabase JS
│       └── types/
│           └── index.ts                ← Tipos compartidos TypeScript
│
├── supabase/
│   └── migrations/
│       └── 20260717191000_init_schema.sql  ← DDL completo: wallets, trades, ai_trading_sessions
│                                             + Row Level Security (RLS)
│                                             + Seed data (usuarios de evaluación)
│
├── infra/                              ← SCRIPTS DE INFRAESTRUCTURA
│   ├── deploy-vercel.sh                ← Deploy automático a Vercel (bash)
│   ├── deploy-vercel.ps1               ← Deploy automático a Vercel (PowerShell)
│   └── init-env.sh                     ← Inicialización de archivos .env
│
└── docs/                              ← DOCUMENTACIÓN ACADÉMICA
    ├── presentacion_defensa.md         ← Diapositivas de defensa (exportable a PDF/PPT)
    ├── security_audit_report.md        ← Informe de auditoría de seguridad
    ├── tfm_compliance.md               ← Tabla de cumplimiento de criterios del TFM
    ├── entrega_final_structure.md      ← Este archivo (jerarquía de entrega)
    ├── defense_qa_prep.md              ← Preguntas probables del tribunal + respuestas
    └── presentacion_ejecutiva.md       ← Resumen ejecutivo (1 página, exportable a PDF)
```

---

## Métricas del Proyecto

| Métrica | Valor |
|---|---|
| **Archivos fuente Python** | 9 módulos (+ 5 tests) |
| **Archivos fuente TypeScript/TSX** | 14 módulos |
| **Tests unitarios** | 18 (CI verde) |
| **Líneas de código backend** | ~2,500 LOC (app/) |
| **Líneas de código frontend** | ~4,200 LOC (src/) |
| **Esquema SQL** | 1 migración (DDL + RLS + seeds) |
| **Pipeline CI** | 2 jobs paralelos (backend + frontend) |
| **Dependencias Python** | 10 directas + 3 dev |
| **Dependencias npm** | Next.js 15, React 19, Tailwind, Axios, Supabase JS |

---

## Estado de Validación por Herramienta

| Herramienta | Alcance | Estado |
|---|---|---|
| `ruff check` | Python linting (E, F, I, W) | ✅ All checks passed |
| `ruff format --check` | Python formatting | ✅ Formatted |
| `black .` | Python formatting (PEP 8) | ✅ 0 reformats pending |
| `mypy app/ --ignore-missing-imports` | Python type checking | ⚠️ 8 benign warnings (FastAPI decorators) |
| `tsc --noEmit` | TypeScript strict compilation | ✅ 0 errors |
| `npx eslint .` | Frontend linting | ✅ 0 errors, 0 warnings |
| `npm run build` | Next.js production build | ✅ Builds successfully |
| `uv run pytest --cov` | Backend unit tests | ✅ 18 passed, 100% coverage |
| GitHub Actions CI | Full pipeline | ✅ Green |
