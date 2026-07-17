#!/bin/bash

# Exit on error
set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${BLUE}${BOLD}=== TFM Trading Bot - Inicialización de Git ===${RESET}"
echo ""

# 1. git init
echo -e "${YELLOW}[1/3] Inicializando repositorio Git...${RESET}"
git init

# Configure default branch name to 'main'
git checkout -b main 2>/dev/null || git branch -M main

# 2. Add files and initial commit
echo -e "${YELLOW}[2/3] Creando commit inicial con todos los archivos...${RESET}"
git add .
git commit -m "Initial commit: Base repository structure, workflows, and configs"

# 3. Create branches
echo -e "${YELLOW}[3/3] Creando estructura de ramas...${RESET}"
echo "-> Creando rama dev/tfm-v1 (Desarrollo)"
git branch dev/tfm-v1
echo "-> Creando rama docs/slides (Diapositivas y Presentación)"
git branch docs/slides

echo ""
echo -e "${GREEN}${BOLD}¡Repositorio Git inicializado con éxito!${RESET}"
echo ""

echo -e "${BLUE}${BOLD}========================================================================${RESET}"
echo -e "${BLUE}${BOLD}    INSTRUCCIONES PARA LA CONFIGURACIÓN DEL REPOSITORIO EN GITHUB      ${RESET}"
echo -e "${BLUE}${BOLD}========================================================================${RESET}"
echo ""
echo -e "${BOLD}1. Crear el Repositorio en GitHub:${RESET}"
echo "   a. Entra en https://github.com/new"
echo "   b. Nombre del repositorio: tfm-bot-trading"
echo "   c. Descripción: [Tu descripción personalizada]"
echo "   d. Elige entre Público (recomendado) o Privado."
echo "   e. NO selecciones ninguna de las opciones: 'Add a README', 'Add .gitignore' o 'Choose a license'"
echo "      (ya que las hemos creado localmente)."
echo "   f. Haz clic en 'Create repository'."
echo ""
echo -e "${BOLD}2. Vincular y subir el repositorio local:${RESET}"
echo "   Ejecuta los siguientes comandos en tu terminal:"
echo -e "   ${YELLOW}git remote add origin https://github.com/[TU-USUARIO]/tfm-bot-trading.git${RESET}"
echo -e "   ${YELLOW}git push -u origin main${RESET}"
echo -e "   ${YELLOW}git push --all origin${RESET}"
echo ""
echo -e "${BOLD}3. Configurar Reglas de Protección de Ramas (Branch Protection Rules):${RESET}"
echo "   a. En tu repositorio de GitHub, ve a 'Settings' (Configuración) -> 'Branches' (Ramas)."
echo "   b. Haz clic en 'Add branch protection rule' (Añadir regla de protección de rama)."
echo "   c. Pattern del nombre de la rama: ${YELLOW}main${RESET}"
echo "   d. Activa la casilla: ${BOLD}'Require a pull request before merging'${RESET} (Requerir Pull Request)."
echo "   e. Activa la casilla: ${BOLD}'Require approvals'${RESET} y selecciona ${BOLD}'1'${RESET} como número de aprobaciones."
echo "   f. Haz clic en 'Create' al final de la página."
echo ""
echo -e "${BOLD}4. Acceso del Tribunal (Repositorio Privado Temporal):${RESET}"
echo "   Si el tribunal exige que el repositorio sea estrictamente privado durante la evaluación:"
echo "   a. Ve a 'Settings' -> 'Collaborators' (Colaboradores)."
echo "   b. Haz clic en 'Add people' (Añadir personas)."
echo -e "   c. Introduce el correo: ${YELLOW}mouredev@gmail.com${RESET} (Acceso de Lectura/Read Access)."
echo "   d. Haz clic en 'Add mouredev to this repository'."
echo ""
echo -e "${BOLD}5. Activar GitHub Actions (CI Pipeline):${RESET}"
echo -e "   El workflow básico ya está creado en ${YELLOW}.github/workflows/ci.yml${RESET}."
echo "   Se ejecutará automáticamente cada vez que realices un 'push' a la rama 'dev/tfm-v1'."
echo "   Puedes ver su estado en la pestaña 'Actions' de tu repositorio en GitHub."
echo ""

echo -e "${BLUE}${BOLD}========================================================================${RESET}"
echo -e "${BLUE}${BOLD}              CHECKLIST VISUAL DE VALIDACIÓN POST-INICIALIZACIÓN        ${RESET}"
echo -e "${BLUE}${BOLD}========================================================================${RESET}"
echo ""
echo -e "   [ ] ${BOLD}Git Inicializado:${RESET} 'git status' muestra que estás en la rama 'main' sin archivos pendientes."
echo -e "   [ ] ${BOLD}Ramas Creadas:${RESET} 'git branch' muestra: 'main' (rama activa), 'dev/tfm-v1' y 'docs/slides'."
echo -e "   [ ] ${BOLD}Repositorio Remoto:${RESET} 'git remote -v' muestra la URL correcta de tu GitHub."
echo -e "   [ ] ${BOLD}Protección de Rama:${RESET} Intento de push directo a 'main' desde dev/tfm-v1 sin PR es rechazado."
echo -e "   [ ] ${BOLD}Colaborador Añadido:${RESET} 'mouredev@gmail.com' figura como colaborador invitado/aceptado."
echo -e "   [ ] ${BOLD}Flujo de CI Activo:${RESET} Pestaña 'Actions' muestra la ejecución verde del CI en la rama dev."
echo ""
echo -e "${GREEN}${BOLD}¡Todo listo para comenzar el desarrollo del TFM!${RESET}"
