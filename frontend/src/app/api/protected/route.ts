import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const supabase = createClient();

  // 1. Extraer el token JWT Bearer del encabezado de Autorización (Authorization Header)
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "No autorizado: Encabezado Authorization Bearer ausente o incorrecto." },
      { status: 401 }
    );
  }

  const token = authHeader.split(" ")[1];

  // 2. Validar el token directamente con Supabase Auth
  // Se usa getUser(token) en lugar de getSession() para validar criptográficamente en el servidor
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json(
      { error: "No autorizado: Token inválido, corrupto o expirado." },
      { status: 401 }
    );
  }

  // 3. Si es válido, devolver los datos protegidos
  return NextResponse.json({
    authenticated: true,
    message: "Acceso concedido a la API del TFM Trading Bot",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
