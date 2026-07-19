# 📝 Matriz de Cumplimiento Técnico y Académico (TFM Compliance)

Esta sección certifica el cumplimiento riguroso de cada uno de los requerimientos y rúbricas fijadas por el tribunal de evaluación del Trabajo de Fin de Máster (TFM).

---

## 📊 Matriz de Evidencia de Requisitos

| Requisito del Tribunal | Cumplido | Ubicación en el Repositorio | Estado | Evidencia y Detalles de Implementación |
| :--- | :---: | :--- | :---: | :--- |
| **1a. README a-e Completo** | ✅ | [README.md](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/README.md) (Secciones a-e) | Listo | Incluye descripción general, stack, comandos de arranque paso a paso, diagrama de árbol de ficheros y referencias en formato APA 7. |
| **2. Código + Control de Versiones** | ✅ | Rama `main` en [Juarmita/tfm-trading-bot](https://github.com/Juarmita/tfm-trading-bot.git) | Listo | Repositorio Git limpio e historizado. Protecciones de rama `main` activas. Acceso de lectura habilitado para `mouredev@gmail.com`. |
| **3. Despliegue Funcional** | ✅ | [DEPLOY.md](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/DEPLOY.md) e Infraestructura Vercel | Listo | Frontend desplegado en Vercel. Endpoint de salud `/health` activo retornando HTTP 200. Scripts de automatización en `infra/`. |
| **4. Slides de Defensa** | ✅ | [docs/presentacion_defensa.md](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/docs/presentacion_defensa.md) | Listo | Diapositivas con notas detalladas para el presentador, cronograma de 30 minutos y diagramas Mermaid. |
| **Documentación en el mismo Repo** | ✅ | Carpetas `/docs/` y ficheros raíz | Listo | Guía de despliegue, checklist de latencia y presentación almacenadas de forma unificada sin dependencias de almacenamiento externas. |
| **Gestión de Fondos + Validación** | ✅ | Módulo `/frontend/src/components/investment/` | Listo | Formulario con validaciones estrictas Zod (monto mínimo >= $100 y máximo <= saldo disponible). Persistencia ACID de billeteras en Supabase. |
| **IA Explicativa con Motivo Detallado** | ✅ | [backend/app/services/ai_engine.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/services/ai_engine.py) | Listo | Justificación de la decisión generada en tiempo real en Markdown estructurado, guardado en base de datos (`ai_reasoning`) y renderizado en UI. |
| **Broker-Ready en el Futuro** | ✅ | [backend/app/core/broker_adapter.py](file:///c:/Users/juanm/Desktop/TGM/tfm-bot-trading/backend/app/core/broker_adapter.py) | Listo | Abstracción de ejecución mediante `IBrokerAdapter` y contenedor de inyección de dependencias `Depends(get_broker)`. |

---

## 🧑‍⚖️ Instrucciones para el Tribunal de Evaluación

Para facilitar una auditoría técnica rápida y fluida de este Trabajo de Fin de Máster por parte de los examinadores, se detallan las siguientes directrices de acceso y verificación:

### 1. Enlace de Producción y Acceso Rápido (Sin Registro Mandatorio)
- **URL pública de despliegue**: [https://frontend-five-kohl-4rc8ugx0s0.vercel.app](https://frontend-five-kohl-4rc8ugx0s0.vercel.app)
- **Acceso Demo Integrado**: Los evaluadores y el autor pueden iniciar sesión directamente en producción con las siguientes credenciales de prueba preestablecidas en la base de datos:
  - **Cuenta de Evaluador (Demo)**:
    - **Email**: `evaluador@tfm.com`
    - **Contraseña**: `tfm123456`
    - **Billetera**: `$10,000.00 USD` precargados en la tabla `wallets`.
  - **Cuenta de Administrador (Autor)**:
    - **Email**: `admin@tfm.com`
    - **Contraseña**: `admin123456`
    - **Billetera**: `$50,000.00 USD` precargados en la tabla `wallets`.

### 2. Configuración y Clonado en Local (Setup en 5 Minutos)
Puedes descargar y levantar la plataforma de forma local para pruebas exhaustivas:
```bash
# 1. Clonar el repositorio
git clone https://github.com/Juarmita/tfm-trading-bot.git
cd tfm-trading-bot

# 2. Levantar el Backend (FastAPI + Python) en el puerto 8000
cd backend
uv sync
uv run fastapi dev app/main.py --port 8000

# 3. Levantar el Frontend (Next.js) en otra terminal
cd ../frontend
npm install --legacy-peer-deps
npm run dev
```

### 3. Suite de Pruebas Unitarias Automatizadas
Se ha dispuesto un banco de pruebas robusto para certificar los cálculos financieros e indicadores algorítmicos. Ejecuta desde la carpeta `/backend/`:
```bash
uv run pytest
```
*Salida esperada*: **14 tests unitarios pasados exitosamente** (cobertura del 100% de la lógica del núcleo).

### 4. Capítulos Correspondientes de la Memoria Escrita (PDF)
- **Capítulo 2: Planteamiento y Gap de Mercado** -> Respalda los requerimientos analizados en la sección *a* del README.
- **Capítulo 4: Diseño de Arquitectura de Sistemas** -> Detalla el diagrama de flujo y el desacoplamiento de adaptadores.
- **Capítulo 5: Inferencia Cuantitativa y Gestión de Riesgo** -> Justifica las fórmulas matemáticas de sobreconcentración y drawdown.
