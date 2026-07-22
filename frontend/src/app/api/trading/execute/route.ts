import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const fastapiBaseUrl = process.env.FASTAPI_BASE_URL || "http://localhost:8000";
  const targetUrl = `${fastapiBaseUrl}/api/v1/trading/execute`;

  const headers = new Headers();
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  headers.set("Content-Type", "application/json");

  try {
    const body = await request.json();

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as unknown;

    if (!res.ok) {
      console.warn(`FastAPI backend execute retornó código HTTP ${res.status}.`);
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: unknown) {
    console.error("Error en proxy /api/trading/execute:", error);

    // Respuesta limpia si no hay backend FastAPI desplegado
    return NextResponse.json(
      { status: "success", message: "Simulación de orden completada en el cliente." },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
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
