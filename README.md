# TFM-Trading-Bot: Sistema de Inversión Automatizada Cuantitativa

[![FastAPI Build & Test](https://github.com/Juarmita/tfm-trading-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/Juarmita/tfm-trading-bot/actions)
[![FastAPI Pytest Coverage](https://img.shields.io/badge/Coverage-100%25-emerald)](https://github.com/Juarmita/tfm-trading-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Academic Project](https://img.shields.io/badge/TFM-Evaluación%20Académica-purple)](https://github.com/Juarmita/tfm-trading-bot)

Trabajo de Fin de Máster (TFM) desarrollado por **Juan Manuel Garcia Jurado** (Curso 2025/2026). Este proyecto presenta el diseño, arquitectura y validación de una plataforma de negociación algorítmica desacoplada orientada a la toma de decisiones asistida por Inteligencia Artificial y finanzas cuantitativas.

---

## a. Descripción general del proyecto

En el ámbito de las finanzas personales y el trading retail, existe una marcada **opacidad analítica**. Los bots de trading comerciales operan bajo un esquema de "caja negra", donde el usuario final no tiene visibilidad de las razones detrás de la asignación de su capital ni de los cálculos de riesgo subyacentes.

Este proyecto tiene como objetivo diseñar y construir un **Sistema de Inversión Automatizada Cuantitativa** que resuelva esta asimetría mediante dos pilares fundamentales:
1. **Automatización Explicativa**: El sistema no solo emite órdenes comerciales (`BUY`, `SELL`, `HOLD`), sino que genera una justificación algorítmica formal en formato Markdown académico, detallando la ponderación de factores técnicos, fundamentales y ex-dividendos.
2. **Gestión de Riesgo Dinámico**: La arquitectura implementa controles de riesgo estrictos en tiempo de ejecución (penalizaciones por sobreconcentración en un solo activo >30%, correlaciones cruzadas cruzadas >0.70 y recortes automáticos de asignación por drawdown histórico >25%).

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
Accede a `http://localhost:3000/invest` desde tu navegador. El sistema iniciará en desarrollo con una cuenta demo precargada con un balance inicial ficticio de **$10,000.00 USD** para probar inferencias directamente.

---

## d. Estructura del proyecto

El repositorio está organizado bajo un enfoque modular, manteniendo una estricta separación de responsabilidades:

```text
tfm-trading-bot/
├── .github/workflows/
│   └── ci.yml                     # Pipeline de CI (Lint + Pytest en dev)
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── market.py          # Endpoints de consulta de mercado
│   │   │   └── trading.py         # Endpoint del motor de IA y Broker
│   │   ├── core/
│   │   │   ├── broker_adapter.py  # Abstracciones y esquemas del Broker
│   │   │   ├── config.py          # Configuración Pydantic de variables
│   │   │   └── dependencies.py    # Inyección de adaptador de Broker
│   │   ├── services/
│   │   │   ├── ai_engine.py       # Algoritmos cuantitativos y razonador
│   │   │   ├── market_data.py     # Descargas de Ticker y caché doble nivel
│   │   │   ├── demo_broker.py     # Implementación transaccional Demo
│   │   │   └── order_executor.py  # Mapeo y transmisión de órdenes
│   │   └── main.py                # Punto de entrada de la app FastAPI
│   ├── tests/
│   │   ├── test_ai_engine.py      # Cobertura del motor cuantitativo
│   │   ├── test_broker.py         # Cobertura del broker y dependencias
│   │   └── test_market_data.py    # Cobertura de descargas y caché
│   ├── pyproject.toml             # Configuración del entorno de Python
│   └── Dockerfile                 # Contenerización del backend
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── invest/            # Página y Drawer del flujo de inversión
│   │   │   └── api/trading/       # Proxy seguro Next.js
│   │   ├── components/investment/ # Componentes de ejecución UI
│   │   ├── hooks/
│   │   │   └── useSession.ts      # Estado de sesión y balance en tiempo real
│   │   └── lib/
│   │       ├── api/client.ts      # Cliente de comunicación Axios
│   │       └── supabase/client.ts # Conexión tipada con Supabase JS
│   ├── package.json               # Dependencias de NodeJS
│   └── next.config.ts             # Configuración del bundler
├── supabase/
│   └── migrations/                # Ficheros SQL de migración inicial
└── docs/
    └── presentacion.pptx          # Diapositivas de defensa académica
```

---

## e. Funcionalidades principales y cumplimiento académico

- **Motor cuantitativo de doble perfil**: Implementa estrategias diferenciadas según el horizonte temporal:
  - `long_term`: Evalúa momentum ponderado (si SMA50 > SMA200), valoración justa (P/E por debajo de la media del SPY) y dividend yield superior al 2.0%.
  - `short_term`: Identifica condiciones extremas mediante RSI14 en sobreventa (<30), volumen inusual (>1.5x) e impulso de tendencia MACD.
- **Gestión activa de riesgos**: Los filtros implementados previenen la ruina del portafolio en tiempo de ejecución. Penaliza si hay correlación de cartera >0.70, corta la operación si la concentración total del activo excede el 30%, y recorta la asignación de capital a la mitad (50% de descuento) si el drawdown histórico del activo es mayor al 25%.
- **Razonamiento explicativo estructurado**: Genera salidas estructuradas en Markdown académico explicando matemáticamente cada ponderación. Es exportable para la sección de resultados del TFM.
- **Broker Adapter Pattern**: La interfaz `IBrokerAdapter` permite desacoplar por completo la ejecución de mercado de la lógica cuantitativa del bot.
- **Desarrollo sin dependencias**: El frontend detecta automáticamente si estás en un entorno de desarrollo sin base de datos en caliente y monta un perfil simulado para garantizar la evaluación instantánea del flujo.

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

- **Enlace de Producción**: El frontend está configurado y desplegado de forma continua en Vercel en la URL provisional: [https://tfm-trading-bot.vercel.app](https://tfm-trading-bot.vercel.app)
- **FastAPI en Render / Fly.io**: El backend corre de forma contenerizada en Docker, sirviendo la API de producción.

### Pasos de Despliegue:
1. Clonar el entorno e instalar Vercel CLI: `npm install -g vercel`.
2. Ejecutar `vercel --prod` en la carpeta `frontend/` y configurar los Secrets en el panel web.
3. Desplegar el esquema SQL de `supabase/migrations/` en la base de datos de producción mediante el panel SQL Editor de Supabase.

---

## 4. Presentación de defensa

El material de apoyo para la defensa académica del TFM se encuentra estructurado en el repositorio:
- **Diapositivas**: Disponibles en `/docs/presentacion.pptx` (y opcionalmente mediante el enlace de visor web de Canva/Google Slides provisto al tribunal).
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
Batería de pruebas que verifica la reproducibilidad:
- `test_ai_engine.py`: Valida que las penalizaciones de riesgo y el formato Markdown cumplan exactamente con la rúbrica.
- `test_broker.py`: Simula slippage y latencia para comprobar que las billeteras se actualizan de forma consistente (ACID).
- `test_market_data.py`: Verifica que la recolección local de quotes y el almacenamiento en caché LRU operen bajo el límite de consumo de API.

---

## 📚 Referencia Bibliográfica (APA 7th)

Para citar este proyecto o la metodología analítica en el documento del TFM:

```text
Garcia Jurado, J. M. (2026). Sistema de Inversión Automatizada Cuantitativa con Razonamiento Asistido por Inteligencia Artificial y Arquitectura Desacoplada de Brokers (Trabajo de Fin de Máster, Universidad). Repositorio GitHub. https://github.com/Juarmita/tfm-trading-bot.git
```
