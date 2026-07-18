"use client";

import React, { useState } from "react";
import InvestmentFlowDrawer from "@/components/investment/InvestmentFlowDrawer";
import { TrendingUp, Coins } from "lucide-react";
import Link from "next/link";

export default function InvestPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-8 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10 flex-1 flex flex-col justify-between">
        {/* Cabecera / Navegación */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold flex items-center justify-center transition hover:bg-emerald-400"
            >
              <TrendingUp size={20} />
            </Link>
            <div>
              <h1 className="font-bold text-lg tracking-wide">Módulo de Inversión</h1>
              <p className="text-xs text-slate-400">TFM Bot de Trading</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white transition font-medium"
          >
            Volver al Panel
          </Link>
        </header>

        {/* Contenido Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 my-auto">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full">
                Operaciones Algorítmicas
              </span>
              <h2 className="text-3xl font-extrabold text-white leading-tight">
                Distribuye tu Capital Inteligente
              </h2>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Analiza activos financieros utilizando nuestro motor de Inteligencia Artificial conectado
              directamente a FastAPI. Configura el monto de entrada y evalúa en tiempo real los
              indicadores técnicos y de riesgo ponderados según tu horizonte de inversión.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-4 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20 active:scale-[0.98] transition flex items-center gap-2"
              >
                <Coins size={18} />
                <span>Abrir Flujo de Inversión</span>
              </button>
            </div>
          </div>

          {/* Tarjetas Informativas de Estrategias */}
          <div className="space-y-4">
            <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-sm">
              <h3 className="font-bold text-sm text-slate-200">
                📈 Estrategia de Crecimiento (Largo Plazo)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Diseñada para crear riqueza consistente en base a dividendos periódicos y estabilidad
                tendencial calculada mediante la relación del precio sobre las SMA 50 y 200.
              </p>
            </div>

            <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-sm">
              <h3 className="font-bold text-sm text-slate-200">
                ⚡ Estrategia Activa (Corto Plazo)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Aprovecha volatilidades instantáneas de mercado basadas en condiciones extremas de
                sobrecompra o sobreventa del oscilador RSI (14) y volumen inusual de operaciones.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-slate-800/80 text-xs text-slate-500">
          Trabajo de Fin de Máster © 2026 - Juan Manuel Garcia Jurado
        </footer>
      </div>

      {/* Componente Drawer de Inversión */}
      <InvestmentFlowDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
}
