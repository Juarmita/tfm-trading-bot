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

Write-Host "📝 2. Cargando e inyectando variables de entorno desde .env.local..." -ForegroundColor Cyan

$EnvFile = "$ScriptPath\..\frontend\.env.local"
$SupabaseUrl = "https://gayixfotlfpxslcsgfqh.supabase.co"
$SupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheWl4Zm90bGZweHNsY3NnZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDAyMDEsImV4cCI6MjA5OTg3NjIwMX0.A65PRn76MT3TuzRtSwyrDHc9H9foVNaurWOqO_vZCOM"
$FastApiUrl = "https://tfm-trading-bot.onrender.com"

if (Test-Path $EnvFile) {
    Write-Host "📖 Cargando variables de configuración desde $EnvFile..." -ForegroundColor Gray
    Get-Content $EnvFile | Foreach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $index = $line.IndexOf("=")
            $key = $line.Substring(0, $index).Trim()
            $value = $line.Substring($index + 1).Trim().Trim('"').Trim("'")
            
            if ($key -eq "NEXT_PUBLIC_SUPABASE_URL") { $SupabaseUrl = $value }
            if ($key -eq "NEXT_PUBLIC_SUPABASE_ANON_KEY") { $SupabaseKey = $value }
            if ($key -eq "FASTAPI_BASE_URL" -and -not $value.Contains("localhost") -and -not $value.Contains("127.0.0.1")) { $FastApiUrl = $value }
        }
    }
}

try { $SupabaseUrl | & vercel env add NEXT_PUBLIC_SUPABASE_URL production } catch { $_.Exception.Message }
try { $SupabaseUrl | & vercel env add NEXT_PUBLIC_SUPABASE_URL preview } catch { $_.Exception.Message }
try { $SupabaseKey | & vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production } catch { $_.Exception.Message }
try { $SupabaseKey | & vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview } catch { $_.Exception.Message }
try { $FastApiUrl | & vercel env add FASTAPI_BASE_URL production } catch { $_.Exception.Message }
try { $FastApiUrl | & vercel env add FASTAPI_BASE_URL preview } catch { $_.Exception.Message }
try { "true" | & vercel env add NPM_CONFIG_LEGACY_PEER_DEPS production } catch { $_.Exception.Message }
try { "true" | & vercel env add NPM_CONFIG_LEGACY_PEER_DEPS preview } catch { $_.Exception.Message }
try { "false" | & vercel env add NEXT_PUBLIC_DEMO_MODE production } catch { $_.Exception.Message }
try { "false" | & vercel env add NEXT_PUBLIC_DEMO_MODE preview } catch { $_.Exception.Message }

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
