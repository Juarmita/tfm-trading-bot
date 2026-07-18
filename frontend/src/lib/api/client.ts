import axios from "axios";

// Determinar la URL base según el entorno (Servidor vs Navegador)
const baseURL =
  typeof window === "undefined"
    ? (process.env.FASTAPI_BASE_URL || "http://localhost:8000")
    : "/api"; // En el cliente, usamos el Proxy de Next.js para evitar problemas de CORS

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 segundos
});

// Interceptor para inyectar automáticamente el Bearer Token en llamadas directas al backend en producción
apiClient.interceptors.request.use(
  async (config) => {
    // Si estamos en el cliente y tenemos una sesión de Supabase
    if (typeof window !== "undefined") {
      // Intentar obtener el token de localStorage o de la cookie
      const tokenKey = Object.keys(localStorage).find((key) =>
        key.startsWith("sb-") && key.endsWith("-auth-token")
      );
      if (tokenKey) {
        const sessionData = localStorage.getItem(tokenKey);
        if (sessionData) {
          try {
            const session = JSON.parse(sessionData);
            const accessToken = session.access_token;
            if (accessToken) {
              config.headers["Authorization"] = `Bearer ${accessToken}`;
            }
          } catch (e) {
            console.error("Error al parsear token de sesión en interceptor:", e);
          }
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
