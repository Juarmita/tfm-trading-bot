# -------------------------------------------------------------------------
# Script de Despliegue Automatizado para Vercel - Windows PowerShell
# -------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "🚀 Iniciando Despliegue del Frontend del TFM en Vercel (PowerShell)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# Comprobar si Vercel CLI está instalado
if (-not (Get-Command "vercel" -ErrorAction SilentlyContinue)) {
    Write-Error "Error: Vercel CLI no está instalado en el sistema. Instálalo con: npm install -g vercel"
    exit 1
}

# Guardar la ubicación actual del script
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location "$ScriptPath\..\frontend"

Write-Host "🔗 1. Vinculando proyecto con Vercel..." -ForegroundColor Cyan
& vercel link --yes

Write-Host "📝 2. Inyectando variables de entorno en producción..." -ForegroundColor Cyan
# Agregar variables de entorno (ignora errores si ya existen)
try { & vercel env add NEXT_PUBLIC_SUPABASE_URL production "https://tu-proyecto.supabase.co" --yes } catch { $_.Exception.Message }
try { & vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production "tu-anon-key" --yes } catch { $_.Exception.Message }
try { & vercel env add FASTAPI_BASE_URL production "https://tu-backend-fastapi.render.com" --yes } catch { $_.Exception.Message }

Write-Host "🏗️ 3. Construyendo y desplegando bundle en producción..." -ForegroundColor Cyan
# Desplegar en modo producción y extraer la URL final
$DeployUrl = & vercel --prod --yes

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ Despliegue Finalizado Correctamente!" -ForegroundColor Green
Write-Host "URL de producción: $DeployUrl" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# 4. Verificación de Health Check post-despliegue
Write-Host "🔍 4. Verificando estado del servicio (Health Check)..." -ForegroundColor Cyan
$HealthUrl = "$DeployUrl/health"
Write-Host "Enviando solicitud GET a: $HealthUrl" -ForegroundColor Gray

# Esperar 3 segundos para que los DNS y la propagación de Vercel se asienten
Start-Sleep -Seconds 3

try {
    $Response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 10
    $HttpStatus = $Response.StatusCode
    Write-Host "✅ Verificación exitosa. Status HTTP recibido: $HttpStatus" -ForegroundColor Green
} catch {
    if ($_.Exception.Response) {
        $HttpStatus = [int]$_.Exception.Response.StatusCode
        Write-Host "⚠️ Advertencia: Código HTTP devuelto es: $HttpStatus." -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ Advertencia: No se pudo conectar al endpoint de Health Check." -ForegroundColor Yellow
    }
    Write-Host "Por favor, verifica el estado del despliegue en el panel de Vercel." -ForegroundColor Yellow
}
