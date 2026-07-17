# Guía de Despliegue - TFM Bot de Trading

Esta guía detalla los pasos necesarios para desplegar la aplicación completa (Frontend, Backend, Base de Datos y Caché) en entornos de producción.

---

## 1. Base de Datos (Supabase)

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Copia la URL del proyecto (`SUPABASE_URL`) y la clave API anónima (`SUPABASE_ANON_KEY`) desde la configuración de la consola API de Supabase.
3. Ejecuta los scripts de inicialización SQL situados en `infra/supabase/` en la consola SQL del panel de Supabase para inicializar las tablas de usuarios, configuraciones y logs de trading.

---

## 2. Backend (FastAPI)

El backend está preparado para desplegarse mediante Docker en plataformas como **Render**, **Railway**, **Heroku** o **AWS ECS**.

### Variables de Entorno Requeridas:
- `DATABASE_URL`: URL de conexión PostgreSQL de Supabase.
- `REDIS_URL`: URL del servidor Redis.

### Despliegue con Docker:
El archivo `Dockerfile` en el directorio `/backend` está configurado para compilar la aplicación con Python 3.11 y ejecutarla usando Uvicorn:

```bash
docker build -t tfm-bot-backend ./backend
docker run -d -p 8000:8000 --env-file .env tfm-bot-backend
```

---

## 3. Caché y Colas (Redis)

El bot de trading requiere una base de datos Redis para gestionar colas de tareas asíncronas y caching de datos de mercado.
- Puedes utilizar un proveedor gestionado como **Upstash** (recomendado para Supabase) o **Redis Cloud**.
- Copia la URL de conexión de Redis (por ejemplo, `redis://default:password@host:port/0`) y configúrala en el backend.

---

## 4. Frontend (Next.js)

El frontend está optimizado para su despliegue en **Vercel** debido al uso de Next.js.

### Variables de Entorno en Vercel:
Añade las siguientes variables de entorno en la configuración del proyecto en Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto de Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima del proyecto de Supabase.
- `NEXT_PUBLIC_API_URL`: URL pública donde se ha desplegado el Backend de FastAPI.

### Comandos de Construcción:
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
