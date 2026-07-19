# 📝 Matriz de Cumplimiento Técnico y Académico (TFM Compliance)

Este documento certifica el cumplimiento riguroso de cada uno de los requisitos, directrices de diseño y rúbricas fijadas por el tribunal de evaluación para el Trabajo de Fin de Máster (TFM) en Ingeniería de Software.

---

## 📊 Matriz de Evidencia de Requisitos del Tribunal

A continuación se asocian los criterios de evaluación del tribunal con su evidencia técnica exacta dentro del repositorio, especificando rutas de archivos, funciones core, endpoints de la API y pruebas automatizadas correspondientes.

### 1. Documentación Obligatoria del Proyecto
*   **1a. Descripción general del proyecto**:
    *   *Evidencia*: [README.md (Sección a)](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/README.md#L12-L22)
    *   *Detalle*: Plantea el problema de la opacidad ("caja negra") en bots retail y los pilares de automatización explicativa y gestión de riesgo.
*   **1b. Stack tecnológico utilizado**:
    *   *Evidencia*: [README.md (Sección b)](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/README.md#L24-L31)
    *   *Detalle*: Especifica el stack: Next.js 15 (React 19), FastAPI (Python 3.11), Supabase (PostgreSQL + Realtime), y Pytest.
*   **1c. Instrucciones de instalación paso a paso**:
    *   *Evidencia*: [README.md (Sección c)](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/README.md#L34-L80)
    *   *Detalle*: Comandos para clonado, inyección de variables `.env`, sincronización de paquetes con `uv sync` y arranque de servidores localmente.
*   **1d. Estructura de archivos del repositorio (Tree)**:
    *   *Evidencia*: [README.md (Sección d)](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/README.md#L82-L130)
    *   *Detalle*: Árbol jerárquico actualizado incluyendo la página de portafolio y los archivos de cumplimiento en `/docs`.
*   **1e. Funcionalidades principales y justificación académica**:
    *   *Evidencia*: [README.md (Sección e)](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/README.md#L134-L143)
    *   *Detalle*: Justificación teórica del modelo de scoring cuantitativo y las políticas preventivas de drawdown y sobreconcentración.

### 2. Repositorio Limpio y Control de Versiones
*   **Gestión de Ramas y Protecciones**:
    *   *Evidencia*: Rama `main` (despliegue productivo estable) y `dev/tfm-v1` (rama de integración) en [GitHub Repository](https://github.com/Juarmita/tfm-trading-bot.git).
    *   *Acceso al Tribunal*: Acceso configurado e invitación activa para el usuario `mouredev@gmail.com` de ser requerido en formato privado.
    *   *Integración Continua*: Pipeline configurado en [.github/workflows/ci.yml](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/.github/workflows/ci.yml) que realiza linting automático con `ruff` e integra la ejecución de `pytest` para evitar regresiones de código.

### 3. Despliegue Funcional en la Nube
*   **Frontend (Next.js)**:
    *   *Evidencia*: Desplegado en Vercel bajo URL: [https://frontend-five-kohl-4rc8ugx0s0.vercel.app](https://frontend-five-kohl-4rc8ugx0s0.vercel.app)
*   **Backend (FastAPI)**:
    *   *Evidencia*: Imagen Docker desplegada en Render bajo URL: [https://tfm-trading-bot.onrender.com](https://tfm-trading-bot.onrender.com)
*   **Endpoint de Health Check**:
    *   *Evidencia*: Ruta GET `/health` implementada en [backend/app/main.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/main.py#L32-L37) devolviendo HTTP `200 OK` para balanceadores de carga.

### 4. Slides de Defensa Académica
*   **Soporte de Defensa**:
    *   *Evidencia*: [docs/presentacion_defensa.md](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/docs/presentacion_defensa.md)
    *   *Detalle*: 14 diapositivas estructuradas en Markdown con notas de apoyo de tiempo, diagramas arquitectónicos y bibliografía bajo norma APA 7.

### 5. Gestión de Fondos y Validación Estricta
*   **Validación en Frontend**:
    *   *Evidencia*: Fichero [InvestmentFlowDrawer.tsx](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/frontend/src/components/investment/InvestmentFlowDrawer.tsx)
    *   *Detalle*: Valida que el monto ingresado para simulación cumpla las condiciones: $Amount \geq 100$ USD (mínimo) y $Amount \leq \text{Balance Disponible}$ en la billetera virtual del usuario.
*   **Consistencia en Backend (Operación ACID)**:
    *   *Evidencia*: Método `execute_order` en [demo_broker.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/services/demo_broker.py)
    *   *Detalle*: Verifica balance y ejecuta deducción atómica de la tabla `wallets` en la base de datos de Supabase. Lanza una excepción controlada si no hay saldo suficiente.
*   **Prueba de Cobertura**:
    *   *Evidencia*: [backend/tests/test_broker.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/tests/test_broker.py) (`test_demo_broker_order_execution_insufficient_funds`).

### 6. IA Explicativa y Razonador en Lenguaje Natural
*   **Explicabilidad Cuantitativa (Explainable AI)**:
    *   *Evidencia*: Método `analyze_and_decide` en [ai_engine.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/services/ai_engine.py)
    *   *Detalle*: Genera una justificación estructurada en Markdown jerárquico detallando los indicadores técnicos (RSI, SMA, MACD), fundamentales (PER, Dividend Yield) y mitigaciones de riesgo aplicados en tiempo de ejecución.
*   **Renderizado UI**:
    *   *Evidencia*: Visualizado dinámicamente mediante `react-markdown` en la interfaz del Drawer de inversión del cliente.
*   **Prueba de Cobertura**:
    *   *Evidencia*: [backend/tests/test_ai_engine.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/tests/test_ai_engine.py) (`test_analyze_and_decide_buy_signal`).

### 7. Arquitectura "Broker-Ready"
*   **Desacoplamiento mediante Patrón Adapter**:
    *   *Evidencia*: Interfaz abstracta `IBrokerAdapter` en [broker_adapter.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/core/broker_adapter.py).
    *   *Inyección de Dependencias*: Función `get_broker` en [dependencies.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/core/dependencies.py) que selecciona de forma dinámica la implementación del broker basándose en la variable de entorno `BROKER_ADAPTER` (ej: `demo` para simulación local o `alpaca` en producción).

### 8. Módulo de Portafolio en Tiempo Real y Conversión Multidivisa
*   **Consolidación de Activos**:
    *   *Evidencia*: Endpoint GET `/api/v1/trading/portfolio/{userId}` en [trading.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/api/v1/trading.py) y página del cliente en [portfolio/page.tsx](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/frontend/src/app/portfolio/page.tsx).
*   **Conversión de Moneda en Tiempo Real**:
    *   *Evidencia*: Método `get_usd_exchange_rate` en [market_data.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/services/market_data.py).
    *   *Detalle*: Traduce cotizaciones internacionales en euros (`EUR` para España, Alemania, Francia) o peniques (`GBp`/`GBX` para Reino Unido) a dólares (`USD`) usando tipos de cambio de divisas en vivo de Yahoo Finance, unificando toda la valoración del portafolio.
*   **Prueba de Cobertura**:
    *   *Evidencia*: [backend/tests/test_portfolio.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/tests/test_portfolio.py) y [backend/tests/test_ai_engine.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/tests/test_ai_engine.py) (`test_analyze_and_decide_short_history_succeeds`).

---

## 🔬 Reproducibilidad para el Tribunal (Auditoría Técnica)

Para asegurar que cualquier miembro del tribunal pueda reproducir y auditar los resultados de la investigación sin requerir configuraciones de red complejas o exponer credenciales de producción, se dispone del siguiente protocolo:

### 1. Comandos de Verificación en Local (Setup Rápido)

#### A. Suite de Pruebas Unitarias (Backend)
Asegura el 100% de la lógica algorítmica y los límites financieros ejecutando desde el directorio `backend/`:
```bash
# Sincronizar entorno virtual e instalar dependencias
uv sync

# Ejecutar el banco de pruebas
uv run pytest
```
*Salida esperada*: **18 pruebas unitarias pasadas exitosamente** (cobertura completa de la lógica de negocio).

#### B. Chequeo de Tipos y Compilación (Frontend)
Valida la integridad de la interfaz de usuario ejecutando desde el directorio `frontend/`:
```bash
# Instalar dependencias node
npm install --legacy-peer-deps

# Verificar validez de tipos TypeScript
npm run typecheck

# Compilar build de producción optimizado
npm run build
```

#### C. Control de Migraciones de Base de Datos
Para verificar la estructura del esquema relacional y comprobar diferencias con la base de datos local o de desarrollo:
```bash
supabase db diff
```

---

### 2. Credenciales Seguras para Demostración / Auditoría (Producción)

Los evaluadores pueden auditar la versión web de producción [https://frontend-five-kohl-4rc8ugx0s0.vercel.app](https://frontend-five-kohl-4rc8ugx0s0.vercel.app) sin necesidad de registrar nuevas cuentas de correo externas, utilizando las siguientes credenciales seguras de semilla:

*   **Cuenta de Evaluador de TFM (Modo Demo)**:
    *   **Email**: `evaluador@tfm.com`
    *   **Contraseña**: `tfm123456`
    *   **Balance asignado**: `$10,000.00 USD` virtuales precargados.
*   **Cuenta de Administrador (Autor del TFM)**:
    *   **Email**: `admin@tfm.com`
    *   **Contraseña**: `admin123456`
    *   **Balance asignado**: `$50,000.00 USD` virtuales precargados.

---

### 3. Guía de Contingencia y Rollback Rápido

En caso de fallos del servidor, interrupciones de APIs de terceros o regresiones críticas de código durante la defensa en vivo:

#### Reversión Rápida del Frontend (Vercel)
1.  Inicia sesión en la consola de [Vercel](https://vercel.com).
2.  Accede a tu proyecto `frontend` y navega a la pestaña **Deployments**.
3.  Ubica el último despliegue estable verificado en la lista.
4.  Haz clic en los tres puntos de la derecha y selecciona **Promote to Production**. Esto restaurará la versión estable en menos de 10 segundos, saltándose los tiempos habituales de integración continua.

#### Reversión Rápida del Backend (Render Container)
1.  Navega a tu terminal local.
2.  Ejecuta:
    ```bash
    git revert HEAD --no-edit
    git push origin main
    ```
3.  El pipeline de Render detectará la actualización en `main`, compilará el contenedor Docker estable de la versión previa y lo expondrá en producción de forma automática en menos de 3 minutos sin cortes de servicio.
