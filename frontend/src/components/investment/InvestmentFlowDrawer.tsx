"use client";

import React, { useState, useEffect, useRef } from "react";
import { useInvestmentSession } from "./useInvestmentSession";
import {
  TrendingUp,
  Activity,
  X,
  ShieldAlert,
  CheckCircle2,
  Info,
  Play,
  Coins,
  ChevronRight,
  ArrowRight,
  TrendingDown
} from "lucide-react";

interface InvestmentFlowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InvestmentFlowDrawer({ isOpen, onClose }: InvestmentFlowDrawerProps) {
  const {
    state,
    decisionOutput,
    error,
    wallet,
    executeAnalysis,
    confirmExecution,
    resetSession,
  } = useInvestmentSession();

  const [amount, setAmount] = useState<string>("500");
  const [strategyType, setStrategyType] = useState<"long_term" | "short_term">("long_term");
  const [symbol, setSymbol] = useState<string>("AAPL");

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Efecto para gestionar accesibilidad (Focus trap & Bloqueo de Scroll)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();

      // Cerrar al pulsar Escape
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRunAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    executeAnalysis(parsedAmount, strategyType, symbol);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop de desenfoque de fondo */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del panel (Drawer) */}
      <div
        ref={panelRef}
        className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col justify-between shadow-2xl relative z-10 animate-in slide-in-from-right duration-300"
      >
        {/* Encabezado */}
        <header className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <div>
            <h3 id="drawer-title" className="text-lg font-bold tracking-wide">
              Flujo de Inversión Cuántica
            </h3>
            <p className="text-xs text-slate-400">
              Saldo disponible en Wallet:{" "}
              <span className="text-emerald-400 font-semibold">
                ${wallet ? wallet.balance.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}{" "}
                {wallet?.currency ?? "USD"}
              </span>
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Cerrar panel de inversión"
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition"
          >
            <X size={20} />
          </button>
        </header>

        {/* Contenido Central */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
              <ShieldAlert size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {state === "idle" && (
            <form onSubmit={handleRunAnalysis} className="space-y-6">
              {/* Activo Bursátil */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Activo a analizar (Symbol / Ticker)
                </label>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Ej: AAPL, BTC-USD, MSFT"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 transition text-slate-100 placeholder-slate-600 font-mono"
                />
              </div>

              {/* Monto a invertir */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Monto de capital a asignar (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                  <input
                    type="number"
                    min="100"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Mínimo 100"
                    className="w-full pl-8 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 transition text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Selector de Estrategia */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Estrategia Algorítmica de la IA
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setStrategyType("long_term")}
                    className={`flex items-start gap-4 p-4 rounded-xl border text-left transition ${
                      strategyType === "long_term"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <TrendingUp className="shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-sm">📈 Largo Plazo</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Prioriza rentabilidad de dividendos, solidez fundamental y menor volatilidad histórica.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStrategyType("short_term")}
                    className={`flex items-start gap-4 p-4 rounded-xl border text-left transition ${
                      strategyType === "short_term"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Activity className="shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-sm">⚡ Corto Plazo</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Estrategia reactiva. Prioriza oscilador RSI en sobreventa, volumen inusual y eventos de mercado.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Botón Ejecutar */}
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-xl transition shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Play size={16} fill="currentColor" />
                <span>Ejecutar Análisis IA</span>
              </button>
            </form>
          )}

          {/* Estado de Carga (Analizando en Backend) */}
          {(state === "validating" || state === "analyzing") && (
            <div className="h-96 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <div>
                <h4 className="font-bold text-base">Procesando Análisis Cuantitativo</h4>
                <p className="text-xs text-slate-500 mt-1">
                  yFinance y el motor de IA están calculando indicadores técnicos y de riesgo...
                </p>
              </div>
            </div>
          )}

          {/* Estado Listo (Ready - Muestra el resultado de la IA) */}
          {state === "ready" && decisionOutput && (
            <div className="space-y-6">
              <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Decisión del Bot</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-lg font-extrabold px-2.5 py-0.5 rounded-lg ${
                        decisionOutput.decision === "BUY"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : decisionOutput.decision === "SELL"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {decisionOutput.decision}
                    </span>
                    <span className="text-xs text-slate-500">
                      Confianza: {(decisionOutput.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Capital Asignado</span>
                  <p className="text-lg font-bold text-slate-100 mt-1">
                    ${decisionOutput.allocated_capital.toFixed(2)} USD
                  </p>
                </div>
              </div>

              {/* Órdenes del Plan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Órdenes del Plan de Ejecución
                </h4>
                {decisionOutput.orders.length > 0 ? (
                  decisionOutput.orders.map((order: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                            {order.action}
                          </span>
                          <span className="font-semibold text-sm">{order.symbol}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{order.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-200">Qty: {order.quantity}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Est. Price: ${order.price_estimated}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center gap-3 text-slate-400">
                    <Info size={16} />
                    <p className="text-xs">No se generaron órdenes de negociación (Posición HOLD).</p>
                  </div>
                )}
              </div>

              {/* Razonamiento Académico de la IA (Markdown resumen) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Justificación de la IA
                </h4>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden text-xs space-y-4 max-h-60 overflow-y-auto text-slate-300 font-mono">
                  {decisionOutput.reasoning_markdown.split("\n\n").map((para: string, i: number) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>

              {/* Botón de Confirmación */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={resetSession}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-xl transition"
                >
                  Modificar
                </button>
                <button
                  onClick={confirmExecution}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20"
                >
                  Confirmar Ejecución
                </button>
              </div>
            </div>
          )}

          {/* Estado Ejecutando */}
          {state === "executing" && (
            <div className="h-96 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <div>
                <h4 className="font-bold text-base">Transmitiendo Operaciones</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Enviando órdenes al broker y ajustando tu saldo disponible en tiempo real...
                </p>
              </div>
            </div>
          )}

          {/* Estado Completado con éxito (Done) */}
          {state === "done" && (
            <div className="h-96 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="font-bold text-lg">¡Inversión Liquidada!</h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
                  La estrategia ha sido guardada en la base de datos de Supabase y las operaciones de mercado se completaron con éxito.
                </p>
              </div>
              <button
                onClick={() => {
                  resetSession();
                  onClose();
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition"
              >
                Volver al Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
