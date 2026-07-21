# ✅ Checklist de Pre-Defensa Técnica

> Guía paso a paso para levantar la demo local en <3 minutos, verificar el deploy público y grabar la demostración funcional.

---

## 1. Demo Local en <3 Minutos

### Requisitos previos
- **Python 3.11+** instalado (`python --version`)
- **Node.js 20+** instalado (`node --version`)
- **uv** instalado (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Conexión a Internet (para datos de Yahoo Finance en vivo)

### Paso 1: Clonar y configurar (30 segundos)
```bash
git clone https://github.com/Juarmita/tfm-trading-bot.git
cd tfm-trading-bot

# Copiar variables de entorno (ya pre-configuradas para demo)
cp .env.example backend/.env
```

### Paso 2: Levantar el backend (60 segundos)
```bash
cd backend
uv sync                                    # Instala dependencias
uv run fastapi dev app/main.py --port 8000 # Inicia el servidor
```
> Verificar: abrir `http://localhost:8000/docs` → Swagger UI visible ✅

### Paso 3: Levantar el frontend (60 segundos)
```bash
# En una nueva terminal
cd frontend
npm install --legacy-peer-deps   # Instala dependencias
npm run dev                      # Inicia Next.js
```
> Verificar: abrir `http://localhost:3000` → Landing Page visible ✅

### Paso 4: Iniciar sesión y probar (30 segundos)
- Navegar a `http://localhost:3000/login`
- **Credenciales de prueba**: `evaluador@tfm.com` / `tfm123456`
- Tras login → Dashboard con wallet de $10,000.00 USD ✅

---

## 2. Credenciales de Prueba Seguras (Mock Dev)

| Rol | Email | Password | Wallet Inicial |
|---|---|---|---|
| **Evaluador** (demo) | `evaluador@tfm.com` | `tfm123456` | $10,000.00 USD |
| **Administrador** (autor) | `admin@tfm.com` | `admin123456` | $50,000.00 USD |

> [!NOTE]
> Estas cuentas están pre-sembradas en Supabase con datos de prueba. Los fondos son virtuales — no se realizan transacciones financieras reales en ningún momento.

---

## 3. Deploy Público (Enlaces Verificados)

| Servicio | URL | Estado Esperado |
|---|---|---|
| **Frontend (Vercel)** | [https://frontend-five-kohl-4rc8ugx0s0.vercel.app](https://frontend-five-kohl-4rc8ugx0s0.vercel.app) | Landing Page cargada |
| **Backend (Render)** | [https://tfm-trading-bot.onrender.com](https://tfm-trading-bot.onrender.com) | `{"message": "TFM Trading Bot API"}` |
| **Health Check** | [https://tfm-trading-bot.onrender.com/health](https://tfm-trading-bot.onrender.com/health) | `{"status": "ok"}` |
| **Swagger Docs** | [https://tfm-trading-bot.onrender.com/docs](https://tfm-trading-bot.onrender.com/docs) | Documentación interactiva |
| **Repositorio** | [https://github.com/Juarmita/tfm-trading-bot](https://github.com/Juarmita/tfm-trading-bot) | Código público visible |
| **CI Pipeline** | [GitHub Actions](https://github.com/Juarmita/tfm-trading-bot/actions) | Badge verde ✅ |

> [!WARNING]
> El backend en Render.com puede entrar en modo "sleep" tras 15 minutos de inactividad (plan gratuito). La primera petición puede tardar 30-60 segundos en "despertar" el servicio. Recomendación: abrir el link del Health Check 2 minutos antes de la defensa.

---

## 4. Instrucciones para Grabar Demo Funcional

### Flujo recomendado de grabación (5 minutos)

1. **[0:00-0:30] Landing Page**: Mostrar la página de presentación con la descripción del proyecto.

2. **[0:30-1:00] Login**: Iniciar sesión con `evaluador@tfm.com`. Mostrar la redirección al Dashboard.

3. **[1:00-2:00] Dashboard**: Señalar el balance de la wallet en tiempo real, el historial de trades (si existe), y el indicador de conexión al backend.

4. **[2:00-3:30] Inversión (Flujo completo)**:
   - Clic en "Nueva Inversión" → Se abre el drawer lateral.
   - Seleccionar mercado: "Estados Unidos (NYSE/NASDAQ)".
   - Escribir ticker: `AAPL` (Apple).
   - Capital: `$500.00`.
   - Estrategia: `long_term`.
   - Clic en "Iniciar Análisis" → Esperar 5-10 segundos.
   - **Mostrar**: Score numérico, acción recomendada (BUY/SELL/HOLD), justificación Markdown con ponderaciones.
   - Si es BUY: Clic en "Confirmar Operación" → Trade ejecutado, wallet actualizada.

5. **[3:30-4:30] Portafolio**: Navegar a `/portfolio`. Mostrar:
   - KPIs (valor total, efectivo, capital invertido, ganancia/pérdida).
   - Tabla de posiciones con precios en vivo.
   - Noticias financieras de las empresas en cartera.

6. **[4:30-5:00] Tests**: Abrir terminal y ejecutar `uv run pytest` mostrando los 18 tests pasados.

### Herramientas de grabación recomendadas
- **Windows**: OBS Studio (gratuito) o Xbox Game Bar (`Win+G`)
- **macOS**: QuickTime Player → Nueva grabación de pantalla
- **Resolución**: 1920x1080 (Full HD) recomendado
- **Formato**: MP4 o WebM

---

## 5. Modo Offline (Sin Depender de Claves Externas)

Si Supabase o el deploy no estuvieran disponibles durante la defensa:

1. **Backend funciona sin Supabase**: El `DemoBroker` en modo fallback crea un balance en memoria de $10,000 para cualquier `user_id`. Los endpoints `/analyze` y `/portfolio` funcionan con datos de mercado de Yahoo Finance (solo requiere Internet).

2. **Tests no requieren conexiones externas**: Toda la suite de `pytest` usa mocks. Se ejecuta sin Internet, sin Supabase, sin claves API.

3. **Frontend en modo dev**: Si no hay `.env.local` configurado, la landing page y las páginas estáticas cargan correctamente. El login requerirá credenciales reales de Supabase.

### Comando de verificación rápida sin dependencias:
```bash
cd backend
uv run pytest -v  # ← Funciona sin Internet ni claves
```

---

## 6. Checklist Final Antes de la Defensa

- [ ] Abrir el Health Check del backend 2 minutos antes para "despertar" Render
- [ ] Verificar que el frontend de Vercel carga correctamente
- [ ] Tener las credenciales de prueba anotadas (`evaluador@tfm.com` / `tfm123456`)
- [ ] Tener preparada una terminal con el proyecto clonado localmente (backup)
- [ ] Verificar que `uv run pytest` pasa todos los tests localmente
- [ ] Tener la presentación (`docs/presentacion_defensa.md`) abierta en otra pestaña
- [ ] Tener el Q&A (`docs/defense_qa_prep.md`) abierto como referencia rápida
- [ ] Preparar un ticker de ejemplo para la demo en vivo (`AAPL` para NYSE, `RR` para LSE)
- [ ] Verificar conexión a Internet estable (necesaria para datos de Yahoo Finance)
- [ ] Tener OBS o grabador de pantalla listo si se requiere entregar grabación
