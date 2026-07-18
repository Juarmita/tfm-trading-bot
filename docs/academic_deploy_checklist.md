# 📋 Lista de Verificación de Despliegue Académico (Academic Deploy Checklist)

Esta checklist proporciona una rúbrica formal para certificar la estabilidad, rendimiento y reproducibilidad del sistema ante el tribunal evaluador del TFM.

| Identificador | Componente / Flujo | Criterio de Aceptación Académico | Estado de Verificación | Método de Validación | Notas de Rendimiento / Auditoría |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **VAL-001** | **Backend API Health** | GET `/health` retorna status 200 y JSON `{"status": "ok"}` | ✅ Verificado | Ejecución de `curl -i http://localhost:8000/health` | Latencia típica: `< 5ms`. |
| **VAL-002** | **Market Data Fetch** | GET `/api/v1/market/quotes/AAPL` retorna cotización sin nulos en tiempo real | ✅ Verificado | Consulta directa desde Swagger en `/docs` | Recuperación desde la API de Yahoo Finance. Integrado con LRU Cache. |
| **VAL-003** | **Capa de Autenticación** | Redirección del Middleware de Next.js redirige `/dashboard` a `/login` si no hay sesión | ✅ Verificado | Navegación manual a `/dashboard` en ventana de incógnito | Gestión segura mediante Supabase Edge Middleware. |
| **VAL-004** | **Flujo /invest (Inferencia)** | POST `/api/trading/analyze` calcula indicadores de momentum y genera plan de ejecución en menos de 500ms si el ticker está en caché | ✅ Verificado | Clic en "Ejecutar Análisis IA" con el ticker precargado en caché | Primera petición (MISS): `~1.2s` (descarga y cálculo). Siguientes peticiones (HIT): `< 50ms`. |
| **VAL-005** | **Gestión de Riesgo** | Bloqueo automático de compra de activo si la concentración supera el 30% | ✅ Verificado | Test automatizado `test_concentration_risk_override` | El DTO de salida cambia la decisión de la orden a `HOLD` y capital a `0.0`. |
| **VAL-006** | **Simulación Broker** | Las transacciones virtuales actualizan el saldo de wallets de forma atómica | ✅ Verificado | Test automatizado `test_demo_broker_order_execution_success` | Modificación del balance en Supabase DB respetando la consistencia ACID. |
| **VAL-007** | **Accesibilidad (A11y)** | Cumplimiento de especificaciones ARIA, foco de teclado y trampas en Drawer | ✅ Verificado | Auditoría rápida de Lighthouse y navegación por teclado (Tab) | El Drawer bloquea el scroll de fondo y asienta el foco en el botón de cerrar. |
| **VAL-008** | **Caché de Doble Nivel** | La latencia de datos históricos cae por debajo de 2ms tras la primera petición de la sesión | ✅ Verificado | Comparación de latencia en logs estructurados del servidor | El primer GET tarda 800ms. La lectura en la caché LRU (memoria/Redis) es casi instantánea. |
| **VAL-009** | **Integración Continua** | Los workflows de GitHub Actions se completan exitosamente sin fallos de linter o compilación | ✅ Verificado | Status badge verde en la rama principal `main` | Ejecuta de forma aislada ruff lint, check types de NodeJS y tests unitarios. |

---

## 🔬 Instrucciones para Auditoría de Rendimiento

Para certificar que los tiempos de respuesta en el módulo `/invest` y consultas de mercado se mantienen por debajo de los límites estipulados (`< 500ms` con caché), puedes monitorear los logs JSON estructurados del backend. 

Ejemplo de salida de log registrada al procesar una petición en caché:

```json
{
  "timestamp": "2026-07-18T16:42:48.166615+00:00",
  "decision_id": "40632ab1-00b2-4818-8b5b-b90df5cf4196",
  "symbol": "AAPL",
  "factors_used": ["dividend_yield", "momentum", "valuation"],
  "weights_applied": {"dividend_yield": 0.3, "momentum": 0.4, "valuation": 0.3},
  "confidence": 0.7,
  "latency_ms": 1.25,
  "cache_status": "HIT"
}
```

> [!NOTE]
> Como se observa en la auditoría del log anterior, cuando el motor cuantitativo experimenta un `cache_status: HIT` en los datos históricos descargados de Yahoo Finance, la latencia total de procesamiento se reduce a **1.25 milisegundos**, superando con creces la cota de rendimiento requerida por el tribunal.
