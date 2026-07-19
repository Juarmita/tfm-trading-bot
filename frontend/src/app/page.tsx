"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import {
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle,
  Github,
  TrendingDown,
  RefreshCw,
  Info,
} from "lucide-react";

type StockQuote = {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
};

export default function LandingPage() {
  const { user } = useSession();
  const [mounted, setMounted] = useState(false);
  const [marketData, setMarketData] = useState<StockQuote[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cargar Ganadoras y Perdedoras del Día
  useEffect(() => {
    if (!mounted) return;

    const fetchMarketSummary = async () => {
      setIsLoadingMarket(true);
      const symbols = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "AMD", "NFLX"];
      
      try {
        // Intentar obtener los datos del Backend FastAPI a través de la ruta proxy
        const res = await fetch(`/api/market/quotes/${symbols.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMarketData(data);
            setIsLoadingMarket(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Fallo de conexión con FastAPI para quotes. Usando fallback directo de Yahoo Finance.");
      }

      // Fallback a través del proxy de Next.js por si el lote del backend falla temporalmente
      try {
        const promises = symbols.map(async (sym) => {
          try {
            const res = await fetch(`/api/market/quotes/${sym}`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                return data[0];
              }
            }
          } catch (e) {
            console.error(`Error de fallback para ${sym}:`, e);
          }
          return null;
        });

        const results = await Promise.all(promises);
        const validResults = results.filter((r): r is StockQuote => r !== null);
        if (validResults.length > 0) {
          setMarketData(validResults);
        }
      } catch (err) {
        console.error("Error crítico al obtener quotes del mercado:", err);
      } finally {
        setIsLoadingMarket(false);
      }
    };

    fetchMarketSummary();
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <span>Cargando portal...</span>
      </div>
    );
  }

  // Clasificar acciones en Ganadoras y Perdedoras
  const gainers = [...marketData]
    .filter((stock) => stock.change_pct >= 0)
    .sort((a, b) => b.change_pct - a.change_pct);

  const losers = [...marketData]
    .filter((stock) => stock.change_pct < 0)
    .sort((a, b) => a.change_pct - b.change_pct);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Background Radial Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full filter blur-[150px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wide text-white">TFM BOT</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Defensa Académica</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/Juarmita/tfm-trading-bot.git"
            target="_blank"
            className="text-slate-400 hover:text-white transition p-2 hover:bg-slate-900 rounded-lg"
          >
            <Github size={20} />
          </Link>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold px-4 py-2 rounded-lg text-sm transition active:scale-95"
          >
            {user ? "Ir al Panel" : "Iniciar Sesión"}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center text-center px-6 py-12 relative z-10 max-w-5xl mx-auto space-y-12">
        <div className="space-y-4">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/15">
            Trabajo de Fin de Máster 2026
          </span>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Sistema de Inversión <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
              Automatizada Cuantitativa
            </span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Plataforma algorítmica premium estructurada en base a un motor cuantitativo en Python
            (FastAPI) conectado a un cliente web reactivo de alto rendimiento (Next.js). Diseñada con 
            explicabilidad de IA y total desacoplamiento transaccional.
          </p>
        </div>

        {/* Acceso al Panel */}
        <div className="flex justify-center pt-2">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20 active:scale-[0.98] transition flex items-center justify-center gap-2 group text-base"
          >
            <span>Acceder al Panel de Control</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Resumen del Mercado: Ganadoras y Perdedoras del Día */}
        <section className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white tracking-wide">Resumen del Mercado del Día</h3>
            <p className="text-xs text-slate-500">Últimos movimientos de acciones líderes de tecnología (Datos de Yahoo Finance)</p>
          </div>

          {isLoadingMarket ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <RefreshCw className="animate-spin text-emerald-500" size={20} />
              <span>Sincronizando cotizaciones de mercado...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
              {/* Ganadoras del día */}
              <div className="bg-slate-900/20 border border-emerald-950/30 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 border-b border-emerald-950/40 pb-3">
                  <TrendingUp size={20} />
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">Ganadoras del Día</h4>
                </div>
                <div className="space-y-3">
                  {gainers.length > 0 ? (
                    gainers.map((stock) => (
                      <div
                        key={stock.symbol}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900 hover:border-slate-800/80 transition"
                      >
                        <div className="text-left">
                          <p className="font-extrabold text-sm text-slate-200">{stock.symbol}</p>
                          <p className="text-[10px] text-slate-500">Tecnología de Mercado</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-slate-200">${stock.price.toFixed(2)}</p>
                          <span className="inline-flex items-center gap-0.5 text-xs text-emerald-400 font-extrabold mt-0.5">
                            +{stock.change_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-6">Sin acciones alcistas registradas hoy.</p>
                  )}
                </div>
              </div>

              {/* Perdedoras del día */}
              <div className="bg-slate-900/20 border border-red-950/30 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-2 text-red-400 border-b border-red-950/40 pb-3">
                  <TrendingDown size={20} />
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">Perdedoras del Día</h4>
                </div>
                <div className="space-y-3">
                  {losers.length > 0 ? (
                    losers.map((stock) => (
                      <div
                        key={stock.symbol}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-900 hover:border-slate-800/80 transition"
                      >
                        <div className="text-left">
                          <p className="font-extrabold text-sm text-slate-200">{stock.symbol}</p>
                          <p className="text-[10px] text-slate-500">Tecnología de Mercado</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-slate-200">${stock.price.toFixed(2)}</p>
                          <span className="inline-flex items-center gap-0.5 text-xs text-red-400 font-extrabold mt-0.5">
                            {stock.change_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-6">Sin acciones bajistas registradas hoy.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Pillars / Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-6">
          {/* Feature 1 */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 text-left backdrop-blur-sm relative hover:border-slate-800 transition">
            <div className="text-emerald-400 mb-4 bg-emerald-500/5 w-10 h-10 rounded-lg flex items-center justify-center border border-emerald-500/10">
              <Cpu size={20} />
            </div>
            <h3 className="font-bold text-base text-slate-100">Explicabilidad IA</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Inferencia algorítmica estructurada en Markdown detallando factores técnicos (SMA, RSI, MACD), 
              ponderaciones e indicadores fundamentales del emisor antes de ordenar cualquier transacción.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 text-left backdrop-blur-sm relative hover:border-slate-800 transition">
            <div className="text-emerald-400 mb-4 bg-emerald-500/5 w-10 h-10 rounded-lg flex items-center justify-center border border-emerald-500/10">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-base text-slate-100">Gestión de Riesgo Activa</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Reglas matemáticas preventivas en tiempo de ejecución: penalización inmediata por volatilidad extrema 
              (drawdowns) y límites de sobreconcentración por activo de hasta el 30% del capital de la cartera.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 text-left backdrop-blur-sm relative hover:border-slate-800 transition">
            <div className="text-emerald-400 mb-4 bg-emerald-500/5 w-10 h-10 rounded-lg flex items-center justify-center border border-emerald-500/10">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-base text-slate-100">Arquitectura Desacoplada</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Aislamiento de lógica de trading a través de la interfaz abstracta `IBrokerAdapter`. Facilidad de 
              escalabilidad para integrar brokers reales (Alpaca, IBKR) sin reescribir el frontend ni el core del motor.
            </p>
          </div>
        </div>

        {/* Tech Stack List */}
        <div className="w-full pt-4 space-y-4">
          <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Stack Tecnológico Utilizado</p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="bg-slate-900/60 border border-slate-800/80 px-3.5 py-1.5 rounded-full text-xs text-slate-300 flex items-center gap-1.5">
              <CheckCircle size={12} className="text-emerald-400" /> Next.js 15
            </span>
            <span className="bg-slate-900/60 border border-slate-800/80 px-3.5 py-1.5 rounded-full text-xs text-slate-300 flex items-center gap-1.5">
              <CheckCircle size={12} className="text-emerald-400" /> FastAPI
            </span>
            <span className="bg-slate-900/60 border border-slate-800/80 px-3.5 py-1.5 rounded-full text-xs text-slate-300 flex items-center gap-1.5">
              <CheckCircle size={12} className="text-emerald-400" /> PostgreSQL + Supabase
            </span>
            <span className="bg-slate-900/60 border border-slate-800/80 px-3.5 py-1.5 rounded-full text-xs text-slate-300 flex items-center gap-1.5">
              <CheckCircle size={12} className="text-emerald-400" /> Docker
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-500 relative z-10 bg-slate-950">
        <p>Trabajo de Fin de Máster © 2026 - Juan Manuel Garcia Jurado</p>
      </footer>
    </div>
  );
}
