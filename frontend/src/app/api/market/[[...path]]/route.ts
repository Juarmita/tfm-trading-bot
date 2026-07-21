import { NextRequest, NextResponse } from "next/server";

// Fallback de Yahoo Finance en NodeJS (Server-Side) para evitar CORS en el cliente
async function fetchYahooFinanceQuotes(symbolsStr: string) {
  const symbols = symbolsStr.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
  const quotes = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=5d`;
        const res = await fetch(url);
        if (res.ok) {
          const yfData = await res.json();
          const result = yfData.chart?.result?.[0];
          if (result) {
            const meta = result.meta;
            const closePrices = (result.indicators?.quote?.[0]?.close?.filter((p: unknown) => p !== null && p !== undefined) || []) as number[];
            const price = meta.regularMarketPrice || closePrices[closePrices.length - 1] || 150.0;
            const prevClose = meta.chartPreviousClose || closePrices[closePrices.length - 2] || price;
            const change = price - prevClose;
            const change_pct = (change / prevClose) * 100;
            return {
              symbol: sym,
              price,
              change,
              change_pct,
              volume: meta.regularMarketVolume || 0,
              timestamp: new Date().toISOString()
            };
          }
        }
      } catch (err) {
        console.error(`Error in Next.js Yahoo Finance fallback for ${sym}:`, err);
      }
      return null;
    })
  );
  return quotes.filter(q => q !== null);
}

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

  const isQuotesPath = pathArray[0] === "quotes" && pathArray[1];

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: headers,
    });

    if (!res.ok && isQuotesPath) {
      console.warn("Backend retornó error para quotes. Usando fallback de Yahoo Finance en Next.js...");
      const fallbackData = await fetchYahooFinanceQuotes(pathArray[1]);
      if (fallbackData.length > 0) {
        return NextResponse.json(fallbackData, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      }
    }

    const data = (await res.json()) as unknown;

    // Retornar los datos con cabeceras CORS adecuadas
    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: unknown) {
    console.error("Error en proxy de Next.js hacia FastAPI:", error);
    
    if (isQuotesPath) {
      console.warn("Fallo de conexión con FastAPI. Usando fallback de Yahoo Finance en Next.js...");
      try {
        const fallbackData = await fetchYahooFinanceQuotes(pathArray[1]);
        if (fallbackData.length > 0) {
          return NextResponse.json(fallbackData, {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
          });
        }
      } catch (fallbackError) {
        console.error("Fallo también el fallback de Yahoo Finance:", fallbackError);
      }
    }

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
