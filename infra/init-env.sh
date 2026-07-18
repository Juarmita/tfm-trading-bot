#!/bin/bash

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}=== TFM Trading Bot - Inicializador de Entorno Local ===${NC}"
echo ""

# Determinar rutas absolutas
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
EXAMPLE_ENV="$ROOT_DIR/.env.example"
FRONTEND_ENV="$ROOT_DIR/frontend/.env.local"
BACKEND_ENV="$ROOT_DIR/backend/.env"

if [ ! -f "$EXAMPLE_ENV" ]; then
  echo -e "${RED}[ERROR] Archivo .env.example no encontrado en la raíz del proyecto.${NC}"
  exit 1
fi

# Copiar archivos
echo "Copiando variables de entorno desde .env.example..."
cp "$EXAMPLE_ENV" "$FRONTEND_ENV"
cp "$EXAMPLE_ENV" "$BACKEND_ENV"

echo -e "${GREEN}[OK] Creado archivo de entorno para Frontend en:${NC} frontend/.env.local"
echo -e "${GREEN}[OK] Creado archivo de entorno para Backend en:${NC} backend/.env"
echo ""

# Función de validación de formato
validate_env() {
  local env_file=$1
  local file_label=$2
  local issue_count=0

  # Verificar si contiene strings de plantilla
  if grep -q "tu-proyecto-ref" "$env_file"; then
    echo -e "${YELLOW}[ADVERTENCIA] NEXT_PUBLIC_SUPABASE_URL en $file_label tiene el marcador de posición por defecto.${NC}"
    issue_count=$((issue_count + 1))
  fi

  if grep -q "tu-clave-anonima-publica" "$env_file"; then
    echo -e "${YELLOW}[ADVERTENCIA] NEXT_PUBLIC_SUPABASE_ANON_KEY en $file_label tiene el marcador de posición por defecto.${NC}"
    issue_count=$((issue_count + 1))
  fi

  if grep -q "tu-secreto-jwt-super-seguro" "$env_file"; then
    echo -e "${YELLOW}[ADVERTENCIA] JWT_SECRET en $file_label tiene el marcador de posición por defecto.${NC}"
    issue_count=$((issue_count + 1))
  fi

  # Validar que los campos críticos no estén vacíos
  while IFS= read -r line; do
    if [[ ! "$line" =~ ^# ]] && [[ "$line" =~ = ]]; then
      key=$(echo "$line" | cut -d'=' -f1)
      val=$(echo "$line" | cut -d'=' -f2-)
      if [ -z "$val" ]; then
        echo -e "${RED}[ERROR] La variable $key en $file_label está vacía.${NC}"
        issue_count=$((issue_count + 1))
      fi
    fi
  done < "$env_file"

  return $issue_count
}

echo "Ejecutando chequeos de integridad de variables de entorno..."
validate_env "$FRONTEND_ENV" "frontend/.env.local"
FRONTEND_ISSUES=$?

validate_env "$BACKEND_ENV" "backend/.env"
BACKEND_ISSUES=$?

TOTAL_ISSUES=$((FRONTEND_ISSUES + BACKEND_ISSUES))

echo ""
if [ $TOTAL_ISSUES -gt 0 ]; then
  echo -e "${YELLOW}${BOLD}[AVISO] Archivos generados correctamente pero requieren configuración manual.${NC}"
  echo -e "Edita los archivos ${BOLD}frontend/.env.local${NC} y ${BOLD}backend/.env${NC} con tus credenciales reales antes de arrancar los servidores."
else
  echo -e "${GREEN}${BOLD}¡Esquema de variables de entorno configurado con éxito!${NC}"
fi
