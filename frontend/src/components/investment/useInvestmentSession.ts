import { useState } from "react";
import { z } from "zod";
import { useSession } from "@/hooks/useSession";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

// Definición de estados de la Máquina de Estados Finita (FSM)
export type SessionState =
  | "idle"        // Estado inicial de espera
  | "validating"  // Validando campos del formulario en cliente
  | "analyzing"   // Procesando inferencia cuántica en el motor de FastAPI (yfinance + metrics)
  | "ready"       // Análisis listo, esperando confirmación del usuario para órdenes
  | "executing"   // Ejecutando transacciones en mercado / Supabase DB
  | "done";       // Flujo finalizado con éxito

// Esquema de validación en tiempo de ejecución (Zod)
export const createInvestmentSchema = (maxBalance: number) => {
  return z.object({
    amount: z
      .number({ invalid_type_error: "El monto debe ser un valor numérico." })
      .min(100, { message: "El monto mínimo de inversión es de $100 USD." })
      .max(maxBalance, {
        message: `Fondos insuficientes. Tu balance real disponible es $${maxBalance.toFixed(2)} USD.`,
      }),
    strategyType: z.enum(["long_term", "short_term"], {
      required_error: "Debes seleccionar un perfil de estrategia.",
    }),
    symbol: z
      .string()
      .min(1, { message: "Debes ingresar un símbolo de activo bursátil válido." })
      .toUpperCase(),
  });
};

export function useInvestmentSession() {
  const { user, wallet } = useSession();
  const [state, setState] = useState<SessionState>("idle");
  const [decisionOutput, setDecisionOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ejecuta el análisis de la IA enviando la orden al backend de FastAPI
   */
  const executeAnalysis = async (
    amount: number,
    strategyType: "long_term" | "short_term",
    symbol: string
  ) => {
    // Protección contra race conditions y double submits
    if (state === "validating" || state === "analyzing" || state === "executing") {
      return;
    }

    setError(null);
    setState("validating");

    const maxBalance = wallet?.balance ?? 0;
    const schema = createInvestmentSchema(maxBalance);
    const result = schema.safeParse({ amount, strategyType, symbol });

    if (!result.success) {
      const errorMsg = result.error.errors[0]?.message || "Datos incorrectos.";
      setError(errorMsg);
      setState("idle");
      toast.error(errorMsg);
      return;
    }

    if (!user) {
      const authError = "Sesión no detectada. Por favor, inicia sesión de nuevo.";
      setError(authError);
      setState("idle");
      toast.error(authError);
      return;
    }

    setState("analyzing");
    toast.info("Iniciando análisis cuántico de la IA en mercado...");

    try {
      // Llamada asíncrona segura a través del API proxy de Next.js
      const response = await apiClient.post("/trading/analyze", {
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        strategy_type: strategyType,
        available_capital: amount,
      });

      setDecisionOutput(response.data);
      setState("ready");
      toast.success("¡Análisis de mercado completado por la IA!");
    } catch (err: any) {
      const serverError =
        err.response?.data?.detail || "Fallo de conexión con el motor cuantitativo de IA.";
      setError(serverError);
      setState("idle");
      toast.error(serverError);
    }
  };

  /**
   * Confirma la ejecución de las órdenes arrojadas por la decisión de la IA
   */
  const confirmExecution = async () => {
    if (state !== "ready" || !decisionOutput) {
      return;
    }

    setState("executing");
    toast.info("Transmitiendo órdenes de trading en firme...");

    try {
      // Simular latencia de red para la transacción de mercado en firma
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setState("done");
      toast.success("¡Estrategia y órdenes de mercado liquidadas con éxito!");
    } catch (err) {
      setError("Error crítico de transmisión al broker.");
      setState("ready");
      toast.error("Fallo al ejecutar las órdenes.");
    }
  };

  /**
   * Resetea el flujo al estado inicial (idle)
   */
  const resetSession = () => {
    setState("idle");
    setDecisionOutput(null);
    setError(null);
  };

  return {
    state,
    decisionOutput,
    error,
    wallet,
    executeAnalysis,
    confirmExecution,
    resetSession,
  };
}
