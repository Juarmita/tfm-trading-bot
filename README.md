# TFM-Trading-Bot: Sistema de Inversión Automatizada Cuantitativa

> **Versión de Entrega: v1.0-TFM** · Julio 2026

[![CI Pipeline](https://github.com/Juarmita/tfm-trading-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/Juarmita/tfm-trading-bot/actions)
[![Tests](https://img.shields.io/badge/Tests-18%20passed-brightgreen)](https://github.com/Juarmita/tfm-trading-bot/actions)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-emerald)](https://github.com/Juarmita/tfm-trading-bot)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%20✓-blue)](https://github.com/Juarmita/tfm-trading-bot)
[![ESLint](https://img.shields.io/badge/ESLint-0%20errors-blue)](https://github.com/Juarmita/tfm-trading-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Academic Project](https://img.shields.io/badge/TFM-Evaluación%20Académica-purple)](https://github.com/Juarmita/tfm-trading-bot)

Trabajo de Fin de Máster (TFM) desarrollado por **Juan Manuel Garcia Jurado** (Curso 2025/2026). Este proyecto presenta el diseño, arquitectura y validación de una plataforma de negociación algorítmica desacoplada orientada a la toma de decisiones asistida por Inteligencia Artificial y finanzas cuantitativas.

---

## 📦 Estado de Entrega

| Criterio | Estado | Evidencia |
|---|---|---|
| **1a. Código fuente completo** | ✅ Entregado | Repositorio monorepo `frontend/` + `backend/` |
| **1b. Tests unitarios** | ✅ 18 tests pasan | `uv run pytest` (CI verde) |
| **1c. Auditoría de seguridad** | ✅ Completada | [`docs/security_audit_report.md`](docs/security_audit_report.md) |
| **1d. Calidad de código** | ✅ Sin violaciones | `ruff` ✓, `black` ✓, `tsc --noEmit` ✓, `ESLint` ✓ |
| **1e. Documentación técnica** | ✅ Completa | README, DEPLOY.md, diagramas, defensa |
| **2. Repositorio Git** | ✅ Público | [github.com/Juarmita/tfm-trading-bot](https://github.com/Juarmita/tfm-trading-bot) |
| **3. Deploy en producción** | ✅ Operativo | [Frontend Vercel](https://frontend-five-kohl-4rc8ugx0s0.vercel.app) · [Backend Render](https://tfm-trading-bot.onrender.com) |
| **4. Presentación de defensa** | ✅ Preparada | [`docs/presentacion_defensa.md`](docs/presentacion_defensa.md) |

---

## a. Descripción general del proyecto

En el ámbito de las finanzas personales y el trading retail, existe una marcada **opacidad analítica**. Los bots de trading comerciales operan bajo un esquema de "caja negra", donde el usuario final no tiene visibilidad de las razones detrás de la asignación de su capital ni de los cálculos de riesgo subyacentes.

Este proyecto tiene como objetivo diseñar y construir un **Sistema de Inversión Automatizada Cuantitativa** que resuelva esta asimetría mediante dos pilares fundamentales:
1. **Automatización Explicativa**: El sistema no solo emite órdenes comerciales (`BUY`, `SELL`, `HOLD`), sino que genera una justificación algorítmica formal en formato Markdown académico, detallando la ponderación de factores técnicos, fundamentales y ex-dividendos.
2. **Gestión de Riesgo Dinámico**: La arquitectura implementa controles de riesgo estrictos en tiempo de ejecución (penalizaciones por sobreconcentración en un solo activo >30%, correlaciones cruzadas >0.70 y recortes automáticos de asignación por drawdown histórico >25%).

El alcance de este desarrollo abarca una versión **demo de alta fidelidad** totalmente funcional que interactúa con datos de mercado en tiempo real, persistencia local y en la nube (Supabase) y un motor simulador transaccional virtual compatible con ACID. La arquitectura está diseñada utilizando el patrón **Adapter**, lo que permite una integración inmediata con brokers reales en producción (como Alpaca o Interactive Brokers) mediante la mera adición de credenciales de red y sin requerir ninguna modificación o refactorización del núcleo del motor de toma de decisiones.

---

## b. Stack tecnológico utilizado

- **Frontend**: Next.js 15 (App Router) en React 19, TypeScript, Tailwind CSS, Shadcn/UI, Recharts (KPIs y gráficas de rendimiento), TanStack Query (gestión de caché de UI), Zod (esquemas de validación de entradas) y `react-markdown`.
- **Backend**: FastAPI (Python 3.11+), Pydantic v2 (tipado estricto y validaciones de entrada/salida), `yfinance` / `yahoo-finance2` (recolección asíncrona de datos de mercado históricos y en tiempo real), pandas/numpy (cálculo de indicadores SMA, EMA, RSI, MACD, ATR y matrices de correlación) y Redis (opcional, caché en producción).
- **Base de datos**: PostgreSQL administrado mediante Supabase (con integración para autenticación segura Supabase Auth, persistencia y sincronización de balances en tiempo real Supabase Realtime).
- **Testing**: `pytest`, `pytest-asyncio` para el backend FastAPI y `tsc --noEmit` / `next lint` para el tipado y aseguramiento de código del frontend.
- **Infra/CI**: GitHub Actions (workflow de integración continua para linting y paso de batería de pruebas con cada commit en `dev/tfm-v1`), Vercel CLI para despliegue del frontend, y Dockerfile base optimizado para el backend de FastAPI.

---

## c. Instalación y ejecución local

### 1. Clonado del repositorio
```bash
git clone https://github.com/Juarmita/tfm-trading-bot.git
cd tfm-trading-bot
```

### 2. Configuración de Variables de Entorno
Copia los archivos de ejemplo en las respectivas carpetas y rellena las claves necesarias:
```bash
# Para el Backend (FastAPI)
cp backend/.env.example backend/.env

# Para el Frontend (Next.js)
cp frontend/.env.local.example frontend/.env.local
```
> [!IMPORTANT]
> Configura las variables críticas: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `FASTAPI_BASE_URL`. Si trabajas localmente sin base de datos, el sistema se iniciará en modo demo usando mocks seguros.

### 3. Levantar el Backend (FastAPI)
El proyecto utiliza `uv` como gestor de paquetes ultrarrápido de Python:
```bash
cd backend
# Instalar dependencias en el entorno virtual
uv sync
# Ejecutar el servidor de desarrollo local
uv run fastapi dev app/main.py --port 8000
```
Verifica que el backend esté funcionando abriendo `http://localhost:8000/docs` (Swagger UI) o `http://localhost:8000/health`.

### 4. Levantar el Frontend (Next.js)
En una nueva terminal:
```bash
cd frontend
# Instalar paquetes
npm install --legacy-peer-deps
# Ejecutar en dev
npm run dev
```
Accede a `http://localhost:3000` desde tu navegador para ver la Landing Page de presentación del TFM. Desde allí puedes iniciar sesión con las credenciales de prueba preestablecidas en la base de datos:
- **Evaluador (Demo)**: `evaluador@tfm.com` / `tfm123456` (Billetera: `$10,000.00 USD`)
- **Administrador (Autor)**: `admin@tfm.com` / `admin123456` (Billetera: `$50,000.00 USD`)

Una vez autenticado, serás redirigido al panel de control interactivo (`/dashboard`) donde podrás ingresar a realizar análisis cuantitativos en el módulo `/invest`.

---

## d. Estructura del proyecto

El repositorio está organizado bajo un enfoque modular, manteniendo una estricta separación de responsabilidades:

```text
tfm-trading-bot/
├── .github/workflows/
│   └── ci.yml                     # Pipeline CI: lint + test + build
├── DEPLOY.md                      # Guía de despliegue principal en producción
├── README.md                      # Documento de presentación principal (este archivo)
├── LICENSE                        # Licencia MIT
├── .env.example                   # Plantilla de variables de entorno documentada
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── market.py          # Endpoints de consulta de mercado
│   │   │   └── trading.py         # Endpoints de operaciones y portafolio
│   │   ├── core/
│   │   │   ├── broker_adapter.py  # Abstracciones del Broker (IBrokerAdapter)
│   │   │   ├── config.py          # Carga de variables de entorno
│   │   │   └── dependencies.py    # Inyección de dependencias (Factory)
│   │   ├── services/
│   │   │   ├── ai_engine.py       # Algoritmo de scoring y razonador IA
│   │   │   ├── market_data.py     # Descarga de datos y tipos de cambio
│   │   │   ├── demo_broker.py     # Simulación ACID transaccional
│   │   │   └── order_executor.py  # Ejecución de órdenes de mercado
│   │   └── main.py                # Entrada principal FastAPI
│   ├── tests/
│   │   ├── test_ai_engine.py      # Tests del motor algorítmico (7 tests)
│   │   ├── test_broker.py         # Tests del broker y balance insuficiente (4 tests)
│   │   ├── test_main.py           # Tests de endpoints + seguridad JWT (4 tests)
│   │   ├── test_market_data.py    # Tests de yfinance y caché (2 tests)
│   │   └── test_portfolio.py      # Tests de agrupación y ROI (1 test)
│   ├── pyproject.toml             # Dependencias del backend (uv/Poetry)
│   └── Dockerfile                 # Contenerización Docker para producción
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/         # Dashboard principal con métricas
│   │   │   ├── invest/            # Interfaz de simulación y Drawer de inversión
│   │   │   ├── login/             # Control de accesos seguro
│   │   │   ├── portfolio/         # Vista consolidada del portafolio del usuario
│   │   │   ├── api/               # Proxy seguro Next.js (trading + market + portfolio)
│   │   │   └── page.tsx           # Landing page de presentación
│   │   ├── components/investment/ # Drawer de inversión y hooks del flujo
│   │   ├── hooks/useSession.ts    # Realtime balances e info de sesión
│   │   └── lib/
│   │       ├── api/client.ts      # Cliente HTTP Axios con Bearer token
│   │       └── supabase/client.ts # Inicialización del cliente JS Supabase
│   ├── middleware.ts              # Protección de rutas sensibles
│   ├── .eslintrc.json             # Configuración ESLint
│   ├── package.json               # Dependencias del frontend
│   └── next.config.ts             # Configuración del bundler
├── supabase/
│   └── migrations/                # Esquema SQL completo (DDL + RLS + seeds)
├── infra/
│   ├── deploy-vercel.sh           # Script de despliegue automático
│   └── init-env.sh                # Inicialización de entorno
└── docs/
    ├── presentacion_defensa.md    # Diapositivas de defensa académica
    ├── security_audit_report.md   # Informe de auditoría de seguridad
    ├── entrega_final_structure.md # Jerarquía de entrega para el tribunal
    ├── defense_qa_prep.md         # Preguntas probables del tribunal + respuestas
    └── tfm_compliance.md          # Tabla de cumplimiento académico
```

---

## e. Funcionalidades principales y cumplimiento académico

- **Motor cuantitativo de doble perfil**: Implementa estrategias diferenciadas según el horizonte temporal:
  - `long_term`: Evalúa momentum ponderado (si SMA50 > SMA200), valoración justa (P/E por debajo de la media del SPY) y dividend yield superior al 2.0%.
  - `short_term`: Identifica condiciones extremas mediante RSI14 en sobreventa (<30), volumen inusual (>1.5x) e impulso de tendencia MACD.
- **Gestión activa de riesgos**: Los filtros implementados previenen la ruina del portafolio en tiempo de ejecución. Penaliza si hay correlación de cartera >0.70, corta la operación si la concentración total del activo excede el 30%, y recorta la asignación de capital a la mitad (50% de descuento) si el drawdown histórico del activo es mayor al 25%.
- **Razonamiento explicativo estructurado**: Genera salidas estructuradas en Markdown académico explicando matemáticamente cada ponderación. Es exportable para la sección de resultados del TFM.
- **Broker Adapter Pattern**: La interfaz `IBrokerAdapter` permite desacoplar por completo la ejecución de mercado de la lógica cuantitativa del bot.
- **Conversión multidivisa en tiempo real**: Soporte para mercados internacionales (LSE, XETRA, BME, Euronext) con conversión automática de divisas (GBp, EUR, GBP) a USD vía tipos de cambio en vivo.
- **Portafolio consolidado**: Vista unificada de posiciones abiertas con valoración en tiempo real, KPIs de rendimiento, noticias financieras cruzadas y análisis de concentración.

---

## 2. Repositorio y control de versiones

El repositorio está alojado públicamente en GitHub:
- **URL del Repositorio**: [https://github.com/Juarmita/tfm-trading-bot.git](https://github.com/Juarmita/tfm-trading-bot.git)

### Estructura de ramas:
- `main`: Rama de producción estable. Protegida contra pushes directos.
- `dev/tfm-v1`: Rama de integración donde se consolidan las funcionalidades de la fase de desarrollo. Requiere Pull Request aprobado y verificación de CI para integrarse en `main`.
- `docs/slides`: Rama dedicada a la documentación del proyecto y la presentación de diapositivas de defensa.

> [!NOTE]
> De ser requerido un acceso de lectura por parte del tribunal bajo la modalidad de repositorio privado temporal, se puede añadir el usuario de evaluación asignado o invitar a `mouredev@gmail.com` para los accesos y auditoría de código.

---

## 3. Despliegue en producción

- **Enlace de Producción**: El frontend está configurado y desplegado de forma continua en Vercel en la URL: [https://frontend-five-kohl-4rc8ugx0s0.vercel.app](https://frontend-five-kohl-4rc8ugx0s0.vercel.app)
- **FastAPI en Render**: El backend corre en Render.com expuesto bajo el subdominio de producción: [https://tfm-trading-bot.onrender.com](https://tfm-trading-bot.onrender.com)

### Pasos de Despliegue:
1. Clonar el entorno e instalar Vercel CLI: `npm install -g vercel`.
2. Ejecutar `vercel --prod` en la carpeta `frontend/` y configurar los Secrets en el panel web.
3. Desplegar el esquema SQL de `supabase/migrations/` en la base de datos de producción mediante el panel SQL Editor de Supabase.

---

## 4. Presentación de defensa

El material de apoyo para la defensa académica del TFM se encuentra estructurado en el repositorio:
- **Diapositivas y Presentación**: Disponible en [`docs/presentacion_defensa.md`](docs/presentacion_defensa.md).
- **Preparación Q&A del Tribunal**: [`docs/defense_qa_prep.md`](docs/defense_qa_prep.md) — 10 preguntas probables con respuestas técnicas fundamentadas.
- **Índice de la Defensa**:
  1. Introducción y Planteamiento del Problema
  2. Objetivos Académicos y Diferenciación
  3. Arquitectura del Sistema (Backend desacoplado + Next.js Server-Side Proxy)
  4. Algoritmo Cuantitativo y Reglas de Control de Riesgo
  5. Demostración en Vivo y Flujo de Inversión
  6. Conclusiones y Líneas de Trabajo Futuro

---

## 🛡️ Reproducibilidad TFM

Para recrear el entorno académico y validar el correcto funcionamiento de las transacciones virtuales con seed local, corre la suite de pruebas desde el directorio `backend/`:

```bash
# Iniciar las pruebas unitarias
uv run pytest
```
Batería de pruebas que verifica la reproducibilidad (18 tests unitarios pasados):
- `test_ai_engine.py`: Valida que las penalizaciones de riesgo, formatos de reporte de justificación y soporte para tickers de historial corto operen según lo estipulado.
- `test_broker.py`: Simula slippage y latencia para comprobar la consistencia atómica (ACID) del balance de la billetera al ejecutar órdenes de compra y venta.
- `test_market_data.py`: Verifica la obtención de cotizaciones, descargas históricas y el funcionamiento del almacenamiento en caché de doble nivel.
- `test_portfolio.py`: Valida los cálculos financieros de agregación de posiciones netas, coste medio y retorno de inversión (ROI) del portafolio.
- `test_main.py`: Asegura la respuesta y salud básica de los endpoints del servidor FastAPI + bloqueo de peticiones no autorizadas (JWT).

### Verificación rápida de calidad de código:
```bash
# Backend
cd backend && uv run ruff check . && uv run ruff format --check .

# Frontend
cd frontend && npm run typecheck && npm run lint
```

---

## 📚 Referencia Bibliográfica (APA 7th)

Para citar este proyecto o la metodología analítica en el documento del TFM:

```text
Garcia Jurado, J. M. (2026). Sistema de Inversión Automatizada Cuantitativa con Razonamiento Asistido por Inteligencia Artificial y Arquitectura Desacoplada de Brokers (Trabajo de Fin de Máster, Universidad). Repositorio GitHub. https://github.com/Juarmita/tfm-trading-bot.git
```
