import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path: pathArray = [] } = await context.params;
  const path = pathArray.join("/");
  const searchParams = request.nextUrl.searchParams.toString();

  const fastapiBaseUrl = process.env.FASTAPI_BASE_URL || "http://localhost:8000";
  const targetUrl = `${fastapiBaseUrl}/api/v1/market/${path}${
    searchParams ? `?${searchParams}` : ""
  }`;

  // Copiar cabeceras importantes, sobre todo el token de autorización JWT
  const headers = new Headers();
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  headers.set("Content-Type", "application/json");

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: headers,
    });

    const data = await res.json();

    // Retornar los datos con cabeceras CORS adecuadas
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: any) {
    console.error("Error en proxy de Next.js hacia FastAPI:", error);
    return NextResponse.json(
      { error: "Error de comunicación con el servidor FastAPI" },
      { status: 500 }
    );
  }
}

// Manejador OPTIONS para solicitudes CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
