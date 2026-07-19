import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const fastapiBaseUrl = process.env.FASTAPI_BASE_URL || "http://localhost:8000";
  const targetUrl = `${fastapiBaseUrl}/api/v1/trading/analyze`;

  // Copiar cabeceras necesarias, incluyendo el token Bearer para validación JWT
  const headers = new Headers();
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  headers.set("Content-Type", "application/json");

  let body: any = null;

  try {
    body = await request.json();

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: any) {
    console.error("Error en proxy POST /api/trading/analyze:", error);
    
    // Fallback dinámico para demostraciones locales o modo Demo en producción
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development";
    if (isDemo) {
      const symbol = (body?.symbol || "AAPL").toUpperCase();
      const amount = Number(body?.available_capital) || 500;

      const mockData = {
        session_id: "c07469a4-23db-4e78-9e5b-b9d9dfdbaf55",
        symbol: symbol,
        decision: "BUY",
        confidence_score: 0.85,
        allocated_capital: amount,
        orders: [
          {
            action: "BUY",
            symbol: symbol,
            quantity: Math.round((amount / 180.0) * 100) / 100,
            price_estimated: 180.0,
            amount_usd: amount,
            reason: `Modo Demostración Activo. Activo ${symbol} muestra una sólida estructura de precios.`
          }
        ],
        reasoning_markdown: `# Decisión IA: BUY [${symbol}]\n**Confianza**: 85% | **Fecha**: 2026-07-19 UTC\n\n## 📊 Factores Técnicos\n- Tendencia alcista detectada: SMA50 por encima de la SMA200.\n- RSI14 se sitúa en 48.6 (Zona neutral, momentum ascendente).\n\n## 🏢 Fundamentales y Dividendos\n- P/E ratio del activo: 18.50 (Valoración favorable vs promedio sectorial).\n- Rentabilidad por dividendos anualizada: 3.20%.\n\n## ⚖️ Gestión de Riesgo\n- Concentración del portafolio: 5.00% (Sin penalización, límite del 30% no excedido).\n- Drawdown histórico reciente: 8.50% (Límite del 25% no excedido).\n\n## ✅ Exec Plan JSON`
      };

      return NextResponse.json(mockData, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    return NextResponse.json(
      { error: "Error de comunicación con el servidor FastAPI de ejecución de órdenes." },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
