# 🚀 Guía de Despliegue en Producción - TFM Trading Bot

Esta guía detalla el procedimiento formal para desplegar el frontend de Next.js y el backend de FastAPI en un entorno de producción (Vercel + Supabase + Render/Fly.io), así como las estrategias académicas de mitigación y demostración local.

---

## 1. Configuración de Base de Datos y Supabase (Producción)

Supabase actúa como el motor PostgreSQL, autenticación y sincronizador en tiempo real.

### Paso A: Creación del Proyecto
1. Ingresa a [Supabase Console](https://supabase.com) y crea un nuevo proyecto en producción.
2. Anota la **URL del proyecto** y la **Service Role Key** (guardada en un gestor seguro de credenciales).

### Paso B: Ejecución de Migraciones SQL
Para inicializar el esquema completo de la base de datos (tablas `users`, `wallets`, `portfolio_strategies`, `ai_trading_sessions`, `trades` y enums correspondientes):
1. Ve al panel lateral de Supabase y haz clic en **SQL Editor**.
2. Copia el contenido del archivo de migración localizado en: [supabase/migrations/20260717000000_init_schema.sql](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/supabase/migrations/20260717000000_init_schema.sql)
3. Ejecuta la consulta para crear la estructura relacional e índices óptimos.

---

## 2. Despliegue del Frontend (Next.js en Vercel)

El frontend está optimizado para construirse y servirse de forma estática y Server-Side mediante Vercel CLI.

### Opción A: Despliegue Manual con Script
Hemos desarrollado un script automatizado que realiza el enlace y el empaquetado del bundle. Ejecuta desde la raíz:
```bash
bash infra/deploy-vercel.sh
```

### Opción B: Despliegue desde Panel Web
1. Importa tu repositorio `tfm-trading-bot` en Vercel.
2. En la sección **Environment Variables**, inyecta las siguientes variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL API de producción de Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave pública anon de Supabase.
   - `FASTAPI_BASE_URL`: URL HTTPS donde está alojado tu backend de FastAPI.
3. Haz clic en **Deploy**.

---

## 3. Despliegue del Backend (FastAPI en Render / Fly.io)

El backend corre sobre contenedores Docker. El archivo `Dockerfile` de producción está optimizado en peso y caché en la carpeta `backend/`.

### Configuración en Render:
1. Crea un nuevo **Web Service** y conéctalo a tu repositorio de GitHub.
2. Selecciona como entorno de compilación **Docker**.
3. Configura las siguientes variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL API de Supabase (requerido para llamadas internas HTTP PostgREST).
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave de rol de servicio de Supabase (requerido para omitir políticas de seguridad RLS e insertar sesiones y trades de los usuarios).
   - `REDIS_URL` (Opcional): Si deseas activar caché externa de alta velocidad. Si no se provee, caerá automáticamente en caché en memoria LRU de 10 minutos para quotes y 1 hora para históricos.
4. Render iniciará la construcción de la imagen y expondrá un endpoint HTTPS seguro (ej: `https://tfm-backend.onrender.com`).

---

## 4. Gestión de Contingencias y Operaciones

### Rotación de Claves de API
Si las claves de Supabase o las del broker real son vulneradas:
1. Ve al panel de control de Supabase -> Settings -> API y haz clic en **Roll Key** para generar nuevas keys.
2. Inmediatamente, actualiza las variables en el panel de Vercel y Render.
3. Ejecuta una nueva compilación en Vercel para forzar a Next.js a inyectar las nuevas variables públicas en el bundle del cliente.

### Rollback Rápido (Reversión de Producción)
Si introduces un bug crítico en producción en la UI o API:
1. **Frontend**: Ve a la consola web de Vercel, entra en la pestaña **Deployments**, haz clic en los tres puntos de la última versión estable conocida y selecciona **Redeploy** o **Promote to Production**. Esto revierte el bundle en menos de 10 segundos sin requerir confirmación de commits de Git.
2. **Backend**: Ejecuta `git revert HEAD` en tu rama principal y realiza un push a la rama `main` para disparar el despliegue automático del contenedor Docker en Render.

---

## 5. Fallback Local para Defensa ante el Tribunal (TFM)

> [!TIP]
> Durante la defensa en vivo ante el tribunal universitario, las redes de la facultad o cortes de red externa pueden provocar fallos en servicios en la nube de producción. 

Para mitigar esto, hemos diseñado un **Modo de Demostración Local de Alta Resiliencia**:
- **Bypass de Supabase Auth**: El frontend Next.js detecta que corre en entorno `development` sin sesión de red activa y monta automáticamente una **sesión mockeada** con el usuario semilla y un saldo inicial virtual de **$10,000.00 USD**.
- **Bypass de Base de Datos**: El backend de FastAPI detecta la ausencia de credenciales de red, omitiendo las llamadas remotas de Supabase a través de bloques `try-except`, permitiendo que el motor de IA corra la inferencia cuantitativa completa en memoria y retorne la simulación del broker virtual con éxito al Drawer del frontend.
- **Cómo iniciarlo en la defensa**:
  1. En una consola en `backend/`: `uv run fastapi dev app/main.py --port 8000`
  2. En otra consola en `frontend/`: `npm run dev`
  3. Navega a `http://localhost:3000/invest` y ejecuta el Drawer. El tribunal presenciará el análisis en vivo, cálculos financieros e histórico simulado sin riesgos de conexión.

---

## 6. Reproducibilidad para Tribunal (Auditoría Académica)

Para verificar y auditar el sistema, los miembros del tribunal pueden ejecutar los siguientes comandos y validaciones en un entorno limpio:

### A. Verificación del Servidor y Motor Cuantitativo (Backend)
```bash
cd backend
uv sync
# Ejecutar las 18 pruebas unitarias automatizadas
uv run pytest
```

### B. Verificación de la Interfaz y Tipado (Frontend)
```bash
cd frontend
npm install --legacy-peer-deps
# Comprobación estricta de tipos TypeScript
npm run typecheck
# Compilación del bundle optimizado para producción
npm run build
```

### C. Inspección de Diferencias en Esquemas de Bases de Datos
```bash
# Validar migraciones locales
supabase db diff
```

### D. Vista Previa de Despliegue Frontend
```bash
# Ejecutar despliegue de previsualización en Vercel
vercel preview
```

### E. Credenciales de Demo Seguras para Pruebas en Vivo
*   **Perfil Evaluador TFM (Simulación)**:
    *   **Email**: `evaluador@tfm.com`
    *   **Contraseña**: `tfm123456`
    *   **Saldo**: `$10,000.00 USD` (Semilla Supabase)
*   **Perfil Administrador**:
    *   **Email**: `admin@tfm.com`
    *   **Contraseña**: `admin123456`
    *   **Saldo**: `$50,000.00 USD` (Semilla Supabase)

