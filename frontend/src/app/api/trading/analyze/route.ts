import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequest } from "@/types";

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

  let body: AnalyzeRequest | null = null;

  try {
    body = (await request.json()) as AnalyzeRequest;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as unknown;

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: unknown) {
    console.error("Error en proxy POST /api/trading/analyze:", error);
    
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
