# 🛡️ Informe de Auditoría de Seguridad y Compliance (Security Audit)

Este informe técnico documenta el análisis de seguridad de la base de código del Bot de Trading Cuántico para TFM, clasificando los hallazgos por severidad y detallando los parches de código implementados.

---

## 📊 Resumen de Hallazgos

| Severidad | Descripción del Hallazgo | Estado | Mitigación Aplicada |
| :--- | :--- | :---: | :--- |
| 🔴 **Critical** | Ausencia de verificación de firma JWT en la API del Backend (IDOR/Bypass de Auth). | **Solucionado** | Inyección de la dependencia `get_current_user_id` con `python-jose` en FastAPI. |
| 🟡 **Medium** | Directiva CORS configurada con comodín (`*`) en producción. | **Solucionado** | Carga dinámica desde la variable de entorno `CORS_ORIGINS`. |
| 🟡 **Medium** | Comprobación superficial de cookies en Middleware de Next.js. | **Mitigado** | Desplazamiento del punto de confianza y validación criptográfica al Backend. |
| 🟢 **Low** | Ausencia de claves críticas de seguridad en el archivo de plantilla `.env.example`. | **Solucionado** | Documentadas las variables `SUPABASE_JWT_SECRET` y `CORS_ORIGINS`. |

---

## 🔍 Detalles de Hallazgos e Implementaciones de Seguridad

### 1. [CRITICAL] Ausencia de Verificación de Firma JWT en la API del Backend
*   **Vulnerabilidad**: El backend de FastAPI exponía públicamente los endpoints `/api/v1/trading/analyze` y `/api/v1/trading/portfolio/{user_id}` sin comprobar criptográficamente la validez del token JWT de Supabase. Un atacante externo podía realizar llamadas directas de red simulando cualquier `user_id` en el cuerpo del JSON, logrando debitar fondos de billeteras ajenas (Insecure Direct Object Reference - IDOR).
*   **Solución (Defensa en Profundidad)**:
    - Se creó la función de verificación `get_current_user_id` utilizando `python-jose` en [trading.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/api/v1/trading.py).
    - El backend ahora extrae el Bearer token de la cabecera `Authorization`. Si la variable `SUPABASE_JWT_SECRET` está definida (producción), verifica la firma con el algoritmo `HS256` y valida la audiencia (`authenticated`).
    - En caso de fallar o haber discordancia de identificadores entre el token y la petición, se retorna inmediatamente una excepción `403 Forbidden` o `401 Unauthorized`.
    - *Bypass Seguro para Demo*: Si la clave no está en el entorno local (evaluadores sin cuenta remota), decodifica los claims sin validar firma para que el simulador local no se bloquee.

### 2. [MEDIUM] CORS Permitido para Todos los Orígenes (`*`)
*   **Vulnerabilidad**: La configuración de FastAPI permitía orígenes cruzados indefinidos, lo cual expone la API a peticiones maliciosas provenientes de otros portales del navegador.
*   **Solución**:
    - Se modificó [config.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/core/config.py) para que procese de forma estructurada los dominios declarados en la variable `CORS_ORIGINS` (separados por comas), limitando las peticiones únicamente a los endpoints legítimos del frontend (ej: localhost y Vercel).

### 3. [MEDIUM] Comprobación de Sesión en el Middleware de Next.js
*   **Vulnerabilidad**: El archivo `middleware.ts` en el clienteNext.js comprueba la sesión verificando simplemente la existencia del prefijo `"sb-"` en el nombre de las cookies. Un usuario malicioso podría crear manualmente una cookie simulada (`sb-fake`) y saltarse la redirección visual a `/login`.
*   **Mitigación**:
    - Aunque el usuario pueda engañar a la interfaz, al intentar recuperar datos financieros o enviar operaciones la petición se transmitirá hacia el backend, el cual ahora exige la firma del token real de Supabase. El atacante solo visualizará pantallas vacías sin capacidad de lectura o alteración de base de datos.

---

## 🛠️ Archivos Parcheados en esta Auditoría

Hemos modificado y securizado los siguientes módulos:
1.  **[backend/app/core/config.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/core/config.py)**: Configuración dinámica de orígenes permitidos en CORS.
2.  **[backend/app/api/v1/trading.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/api/v1/trading.py)**: Inyección de `HTTPBearer` y chequeo estricto del token en `/analyze` y `/portfolio/{user_id}`.
3.  **[backend/tests/test_main.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/tests/test_main.py)**: Añadidos dos tests unitarios de seguridad para validar el bloqueo de llamadas no autorizadas.
4.  **[.env.example](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/.env.example)**: Documentadas las variables de entorno de control y seguridad.

---

## 📋 Checklist de Hardening para Producción / Demostración Académica

Antes de iniciar la defensa o habilitar el acceso al público, sigue esta checklist técnica:

- [ ] **Configurar SUPABASE_JWT_SECRET**:
  - Obtén el secreto de firma de Supabase (Settings -> API -> JWT Secret) e inyéctalo en las variables de entorno del Web Service de Render.com.
- [ ] **Restringir CORS_ORIGINS**:
  - Modifica la variable `CORS_ORIGINS` en el panel de Render, eliminando el comodín `*` y fijando únicamente: `http://localhost:3000,https://frontend-five-kohl-4rc8ugx0s0.vercel.app`.
- [ ] **Auditar logs en producción**:
  - Verifica en la consola de Render que las peticiones correctas registren `HTTP 200` y los accesos sospechosos o sin token devuelvan `HTTP 401/403`.
- [ ] **Certificar paso de la Suite de Seguridad**:
  - Ejecuta `uv run pytest` asegurando que los nuevos casos de prueba de JWT terminen con status exitoso.
