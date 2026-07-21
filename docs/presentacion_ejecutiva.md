# Presentación Ejecutiva — TFM Trading Bot v1.0

> **Resumen técnico en una página** · Listo para exportar a PDF  
> Autor: Juan Manuel Garcia Jurado · Curso 2025/2026  
> Exportación: `Ctrl+Shift+P` → "Markdown: Export to PDF" (VSCode) o `pandoc docs/presentacion_ejecutiva.md -o docs/presentacion_ejecutiva.pdf`

---

## 1. Resumen del Proyecto

**Título**: *Sistema de Inversión Automatizada Cuantitativa con Razonamiento Asistido por IA y Arquitectura Desacoplada de Brokers*

**Problema**: Los sistemas de trading algorítmico comerciales operan como "cajas negras", impidiendo al inversor retail comprender las razones de las decisiones de inversión y los riesgos asumidos.

**Solución**: Plataforma web completa que combina un motor cuantitativo explicativo con gestión dinámica de riesgos, generando justificaciones algorítmicas en lenguaje natural para cada decisión de inversión. La arquitectura desacoplada mediante el patrón Adapter permite migrar de un simulador demo a un broker real sin modificar la lógica de negocio.

**Resultado**: Sistema funcional desplegado en producción con análisis en tiempo real de mercados internacionales (NYSE, LSE, XETRA, BME, Euronext), conversión automática multidivisa, portafolio consolidado y 18 tests unitarios automatizados en CI/CD.

---

## 2. Diagrama de Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USUARIO (Navegador)                              │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Landing  │  │  Login   │  │  Dashboard   │  │   Invest + Portfolio   │  │
│  │ page.tsx │  │ page.tsx │  │  page.tsx     │  │   page.tsx (x2)        │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └───────────┬────────────┘  │
│       │              │               │                      │               │
│       └──────────────┴───────────────┴──────────────────────┘               │
│                              │ HTTPS                                        │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 15 SERVER (Vercel Edge)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  middleware.ts          → Protección de rutas por cookie Supabase   │    │
│  │  api/trading/analyze    → Proxy POST + Bearer token injection      │    │
│  │  api/trading/portfolio  → Proxy GET  + Bearer token injection      │    │
│  │  api/market/[...path]   → Proxy de datos de mercado                │    │
│  └─────────────────────────────────┬───────────────────────────────────┘    │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTPS (Bearer JWT)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Render.com)                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  trading.py  →  get_current_user_id()  →  Verifica firma JWT HS256  │  │
│  │              →  POST /analyze  →  AIEngine.analyze()                 │  │
│  │              →  GET /portfolio/{id}  →  Cálculo posiciones en vivo   │  │
│  └───────────────────────┬─────────────────────────┬─────────────────────┘  │
│                          │                         │                        │
│  ┌───────────────────────▼───────┐  ┌──────────────▼────────────────────┐   │
│  │      AIEngine (services/)     │  │    MarketDataService (services/)  │   │
│  │  ├─ Scoring dual (LT / ST)   │  │  ├─ yfinance: quotes, history    │   │
│  │  ├─ Penalizaciones de riesgo  │  │  ├─ Caché en memoria (TTL 5min) │   │
│  │  ├─ Markdown explicativo      │  │  └─ Forex: GBp→USD, EUR→USD     │   │
│  │  └─ Plan de ejecución         │  └─────────────────────────────────┘   │
│  └───────────────┬───────────────┘                                         │
│                  │                                                          │
│  ┌───────────────▼───────────────┐                                         │
│  │  OrderExecutor → IBrokerAdapter │ ← Dependency Injection               │
│  │         ┌─────────┴──────────┐  │                                       │
│  │         │   DemoBroker       │  │  (Sustituible por AlpacaBroker,       │
│  │         │   ├─ Slippage sim  │  │   IBKRBroker sin cambios de código)  │
│  │         │   ├─ Latency sim   │  │                                       │
│  │         │   └─ ACID write    │  │                                       │
│  │         └────────────────────┘  │                                       │
│  └─────────────────────────────────┘                                       │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │ PostgreSQL (SSL)
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + Auth + Realtime)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐               │
│  │   wallets   │  │   trades    │  │  ai_trading_sessions │               │
│  │  (balance)  │  │  (historial)│  │  (sesiones IA)       │               │
│  └─────────────┘  └─────────────┘  └──────────────────────┘               │
│  Row Level Security (RLS) activo · Supabase Realtime para wallet updates  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tabla de Cumplimiento TFM → Entregables

| Criterio del Tribunal | Entregable | Ubicación |
|---|---|---|
| **1a. Código fuente** | Monorepo completo con separación frontend/backend | `/backend/`, `/frontend/` |
| **1b. Tests unitarios** | 18 tests con cobertura 100% en CI | `/backend/tests/` |
| **1c. Seguridad** | Auditoría completa + JWT + CORS + RLS | `docs/security_audit_report.md` |
| **1d. Calidad de código** | ruff ✓, black ✓, tsc ✓, ESLint ✓ | CI pipeline `.github/workflows/ci.yml` |
| **1e. Documentación** | README, DEPLOY, defensa, compliance | `/docs/`, `README.md`, `DEPLOY.md` |
| **2. Repositorio Git** | Repositorio público con historial de commits | [GitHub](https://github.com/Juarmita/tfm-trading-bot) |
| **3. Deploy** | Frontend (Vercel) + Backend (Render) operativos | Enlaces en README.md §3 |
| **4. Defensa** | Presentación + Q&A preparadas | `docs/presentacion_defensa.md`, `docs/defense_qa_prep.md` |

---

## 4. Tecnologías Clave y Justificación

| Tecnología | Justificación de Elección |
|---|---|
| **FastAPI** | Framework asíncrono de alto rendimiento con documentación OpenAPI automática, ideal para APIs financieras |
| **Next.js 15** | Server-side rendering para proxy seguro (secrets nunca llegan al browser) + deploy instantáneo en Vercel |
| **Supabase** | PostgreSQL administrado con Auth integrado, Realtime y Row Level Security — elimina la necesidad de implementar un sistema de autenticación propio |
| **yfinance** | Acceso gratuito a datos de mercado en tiempo real de Yahoo Finance sin necesidad de API key de pago |
| **Patrón Adapter** | Desacopla la lógica cuantitativa del broker concreto, permitiendo migración a producción real sin refactorización |
| **GitHub Actions** | CI/CD integrado con el repositorio, ejecuta lint + test + build en cada push |

---

## 5. Agradecimientos Institucionales

Este Trabajo de Fin de Máster ha sido desarrollado en el marco del programa de Máster de la Universidad, bajo la supervisión académica correspondiente.

Agradecimientos especiales a:
- **Tribunal evaluador** por su dedicación en la revisión y retroalimentación del proyecto.
- **Comunidad open source** de FastAPI, Next.js, Supabase y yfinance por las herramientas que hicieron posible este desarrollo.
- **Universidad** por proporcionar el marco académico y los recursos necesarios para la investigación aplicada en finanzas cuantitativas e Inteligencia Artificial.

---

> **Instrucciones de exportación a PDF**:  
> - **VSCode**: Instalar extensión "Markdown PDF" → `Ctrl+Shift+P` → "Markdown PDF: Export (pdf)"  
> - **CLI**: `pandoc docs/presentacion_ejecutiva.md -o docs/presentacion_ejecutiva.pdf --pdf-engine=xelatex`  
> - **Web**: Pegar en [https://dillinger.io](https://dillinger.io) → Export as PDF  
>  
> **Instrucciones de exportación a PPT**:  
> - `pandoc docs/presentacion_ejecutiva.md -o docs/presentacion_ejecutiva.pptx`  
> - O usar [Marp](https://marp.app/) con directivas `<!-- slide -->` para slides individuales
