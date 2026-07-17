# TFM: Bot de Trading Web

<!-- Badges -->
[![Build Status](https://img.shields.io/github/actions/workflow/status/juanmgarcia/tfm-bot-trading/ci.yml?branch=main)](https://github.com/juanmgarcia/tfm-bot-trading/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<!-- Enlaces y Placeholders -->
- **Repositorio GitHub:** [https://github.com/juanmgarcia/tfm-bot-trading](https://github.com/juanmgarcia/tfm-bot-trading)
- **URL de Despliegue:** [https://tfm-bot-trading.vercel.app](https://tfm-bot-trading.vercel.app)
- **Diapositivas de la Presentación:** [https://slides.com/juanmgarcia/tfm-bot-trading](https://slides.com/juanmgarcia/tfm-bot-trading) (Ver [presentacion.pptx](docs/presentacion.pptx))

---

## 1. Memoria del Trabajo

### a) Objetivos generales del trabajo
[Escribir aquí los objetivos generales del TFM...]

### b) Motivaciones
[Escribir aquí la motivación del proyecto y su justificación...]

### c) Metodología
[Escribir aquí la metodología de investigación, desarrollo y testing...]

### d) Estructura del repositorio
El proyecto está estructurado de la siguiente forma:

- **`frontend/`**: Aplicación de cliente desarrollada en Next.js (App Router), TypeScript y Tailwind CSS.
- **`backend/`**: Servidor API REST desarrollado en FastAPI y Python 3.11+.
- **`docs/`**: Documentación complementaria y recursos de presentación.
- **`infra/`**: Archivos y scripts de configuración de infraestructura (Supabase, Docker, etc.).

### e) Otras consideraciones
[Escribir aquí las consideraciones adicionales, agradecimientos, limitaciones, etc...]

---

## 2. Requisitos previos e Instalación

### Requisitos previos
- **Node.js** v18+ y **npm** v10+
- **Python** v3.11+
- **Docker** y **Docker Compose**
- Cuenta en **Supabase**

### Instalación

#### Frontend
1. Navega al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```

#### Backend
1. Navega al directorio del backend:
   ```bash
   cd backend
   ```
2. Crea e inicia un entorno virtual:
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   ```
3. Instala las dependencias (usando Poetry o Pip):
   ```bash
   pip install poetry
   poetry install
   ```

---

## 3. Guía de uso y Ejecución

### Frontend
1. Configura el archivo `.env.local` con las variables de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu-url-supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Backend
1. Configura las variables de entorno en un archivo `.env`:
   ```env
   DATABASE_URL=tu-url-supabase-db
   REDIS_URL=redis://localhost:6379/0
   ```
2. Inicia el servidor FastAPI:
   ```bash
   uvicorn app.main:app --reload
   ```

---

## 4. Pruebas y Verificación

### Frontend
- Ejecutar pruebas de tipado y linting:
  ```bash
  npm run typecheck
  npm run lint
  ```

### Backend
- Ejecutar tests unitarios e integración:
  ```bash
  poetry run pytest
  ```
- Ejecutar análisis estático y formateo:
  ```bash
  poetry run ruff check .
  poetry run mypy .
  ```

---

## Reproducibilidad TFM

Para garantizar la reproducibilidad completa del proyecto por parte del tribunal de evaluación, se proveen los siguientes elementos:

1. **Dockerización**: Dockerfile en `/backend` para desplegar el servidor de API en cualquier entorno compatible.
2. **Infraestructura Supabase**: Scripts de configuración y base de datos bajo `/infra/supabase/`.
3. **Flujos de prueba de datos**: Datos de simulación mediante `yfinance` para pruebas sin depender de APIs de brokers de pago en tiempo real.
