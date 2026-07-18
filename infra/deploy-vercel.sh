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

echo "📝 2. Inyectando variables de entorno en producción..."
# Agregar variables de entorno (ignora errores si ya existen)
vercel env add NEXT_PUBLIC_SUPABASE_URL production "https://tu-proyecto.supabase.co" --yes || true
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production "tu-anon-key" --yes || true
vercel env add FASTAPI_BASE_URL production "https://tu-backend-fastapi.render.com" --yes || true

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
