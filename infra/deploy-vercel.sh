#!/bin/bash
# -------------------------------------------------------------------------
# Script de Despliegue Automatizado para Vercel - Entornos de Producción TFM
# -------------------------------------------------------------------------

set -e # Detener script si ocurre algún error

echo "=========================================================="
echo "🚀 Iniciando Despliegue del Frontend del TFM en Vercel"
echo "=========================================================="

# Comprobar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI no está instalado en el sistema."
    echo "Instálalo globalmente ejecutando: npm install -g vercel"
    exit 1
fi

# Moverse al directorio del frontend
cd "$(dirname "$0")/../frontend"

echo "🔗 1. Vinculando proyecto con Vercel..."
# Vincula de forma no interactiva utilizando valores por defecto
vercel link --yes

echo "📝 2. Cargando e inyectando variables de entorno desde .env.local..."

ENV_FILE="../frontend/.env.local"
SUPABASE_URL="https://gayixfotlfpxslcsgfqh.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheWl4Zm90bGZweHNsY3NnZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDAyMDEsImV4cCI6MjA5OTg3NjIwMX0.A65PRn76MT3TuzRtSwyrDHc9H9foVNaurWOqO_vZCOM"
FASTAPI_URL="https://tfm-trading-bot.onrender.com"

if [ -f "$ENV_FILE" ]; then
    echo "📖 Cargando variables de configuración desde $ENV_FILE..."
    while IFS= read -r line || [ -n "$line" ]; do
        # Omitir comentarios y líneas vacías
        if [[ ! "$line" =~ ^# ]] && [[ "$line" == *"="* ]]; then
            key=$(echo "$line" | cut -d'=' -f1 | tr -d '[:space:]')
            value=$(echo "$line" | cut -d'=' -f2- | tr -d '[:space:]' | tr -d '"' | tr -d "'")
            if [ "$key" = "NEXT_PUBLIC_SUPABASE_URL" ]; then SUPABASE_URL="$value"; fi
            if [ "$key" = "NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then SUPABASE_KEY="$value"; fi
            if [ "$key" = "FASTAPI_BASE_URL" ]; then FASTAPI_URL="$value"; fi
        fi
    done < "$ENV_FILE"
fi

echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production || true
echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview || true
echo "$SUPABASE_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production || true
echo "$SUPABASE_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview || true
echo "$FASTAPI_URL" | vercel env add FASTAPI_BASE_URL production || true
echo "$FASTAPI_URL" | vercel env add FASTAPI_BASE_URL preview || true
echo "true" | vercel env add NPM_CONFIG_LEGACY_PEER_DEPS production || true
echo "true" | vercel env add NPM_CONFIG_LEGACY_PEER_DEPS preview || true
echo "true" | vercel env add NEXT_PUBLIC_DEMO_MODE production || true
echo "true" | vercel env add NEXT_PUBLIC_DEMO_MODE preview || true

echo "🏗️ 3. Construyendo y desplegando bundle en producción..."
# Desplegar en modo producción y extraer la URL final arrojada
DEPLOY_URL=$(vercel --prod --yes)

echo "=========================================================="
echo "✅ Despliegue Finalizado Correctamente!"
echo "URL de producción: $DEPLOY_URL"
echo "=========================================================="

# 4. Verificación de Health Check post-despliegue
echo "🔍 4. Verificando estado del servicio (Health Check)..."
HEALTH_URL="${DEPLOY_URL}/health"
echo "Enviando solicitud GET a: $HEALTH_URL"

# Esperar 3 segundos para que los DNS y la propagación de Vercel se asienten
sleep 3

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 308 ] || [ "$HTTP_STATUS" -eq 307 ]; then
    echo "✅ Verificación exitosa. Status HTTP recibido: $HTTP_STATUS"
else
    echo "⚠️ Advertencia: Código HTTP devuelto es: $HTTP_STATUS."
    echo "Por favor, verifica el estado del despliegue en el panel web de Vercel."
fi
