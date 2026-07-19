import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Supabase guarda las sesiones de usuario en cookies del navegador con el prefijo "sb-"
  // (por ejemplo: sb-access-token, sb-refresh-token o sb-<ref>-auth-token)
  const allCookies = request.cookies.getAll();
  const hasSession = allCookies.some((cookie) => cookie.name.startsWith("sb-"));

  const protectedPaths = ["/dashboard", "/invest", "/portfolio"];
  const currentPath = request.nextUrl.pathname;
  
  const isProtectedPath = protectedPaths.some((path) =>
    currentPath.startsWith(path)
  );

  // Redirección segura a /login si no se encuentra cookie de sesión de Supabase
  if (isProtectedPath && !hasSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", currentPath);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// Configuración de rutas a interceptar por el Middleware de Next.js
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invest/:path*",
    "/portfolio/:path*",
  ],
};
