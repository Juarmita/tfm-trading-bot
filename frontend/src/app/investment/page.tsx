"use client";

import React, { useState } from "react";
import InvestmentFlowDrawer from "@/components/investment/InvestmentFlowDrawer";
import { TrendingUp, Coins } from "lucide-react";
import Link from "next/link";

export default function InvestmentPage() {
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
              href="/dashboard"
              className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold flex items-center justify-center transition hover:bg-emerald-400"
            >
              <TrendingUp size={20} />
            </Link>
            <div>
              <h1 className="font-bold text-lg tracking-wide">Módulo de Inversión</h1>
              <p className="text-xs text-slate-400">TFM Bot de Trading</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs text-slate-400 hover:text-white transition font-medium"
            >
              Panel de Control
            </Link>
            <Link
              href="/portfolio"
              className="text-xs text-slate-400 hover:text-white transition font-medium"
            >
              Mi Portafolio
            </Link>
          </div>
        </header>

        {/* Hero Section del Módulo */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-sm text-center space-y-6 max-w-2xl mx-auto my-auto">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
            <Coins size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Análisis e Inversión Cuántica</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Genera análisis predictivos explicables con el algoritmo multi-factor. Selecciona un ticker, evalúa los
              indicadores técnicos y de riesgo ponderados según tu horizonte de inversión.
            </p>
          </div>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mx-auto"
          >
            <Coins size={18} />
            <span>Abrir Flujo de Inversión</span>
          </button>
        </div>

        {/* Footer info */}
        <footer className="text-center text-xs text-slate-500 pt-6 border-t border-slate-900">
          TFM Trading Bot &copy; 2026 - Universidad de Educación a Distancia
        </footer>
      </div>

      {/* Componente Drawer de Inversión */}
      <InvestmentFlowDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
