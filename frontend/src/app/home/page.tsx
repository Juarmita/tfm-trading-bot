"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  LogOut,
  LayoutDashboard,
  Briefcase,
  Coins,
  Wallet,
  Newspaper,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Globe,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { PortfolioResponse } from "@/types";

type StockQuote = {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  volume?: number;
  timestamp?: string;
};

type NewsItemType = {
  title: string;
  publisher: string;
  link: string;
  provider_publish_time: string;
};

const INDEX_SYMBOLS = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq 100" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "BTC-USD", label: "Bitcoin" },
  { symbol: "ETH-USD", label: "Ethereum" },
  { symbol: "EURUSD=X", label: "EUR / USD" },
];

const DEFAULT_FEATURED = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD"];

export default function HomePage() {
  const router = useRouter();
  const { user, wallet, refreshSession, refreshWallet } = useSession();
  const [mounted, setMounted] = useState(false);

  // Estados de Mercado Live
  const [indices, setIndices] = useState<StockQuote[]>([]);
  const [featuredStocks, setFeaturedStocks] = useState<StockQuote[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Buscador de Tickers
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<StockQuote | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Noticias de Mercado
  const [news, setNews] = useState<NewsItemType[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // Datos de Resumen de Cartera
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Cargar Cotizaciones de Mercado
  const fetchMarketData = useCallback(async () => {
    setIsLoadingMarket(true);
    try {
      // A. Cargar Índices
      const indexSyms = INDEX_SYMBOLS.map((i) => i.symbol).join(",");
      const resIndices = await fetch(`/api/market/quotes/${indexSyms}`);
      if (resIndices.ok) {
        const dataIndices = await resIndices.json();
        if (Array.isArray(dataIndices)) {
          setIndices(dataIndices);
        }
      }

      // B. Cargar Acciones Destacadas
      const stockSyms = DEFAULT_FEATURED.join(",");
      const resStocks = await fetch(`/api/market/quotes/${stockSyms}`);
      if (resStocks.ok) {
        const dataStocks = await resStocks.json();
        if (Array.isArray(dataStocks)) {
          setFeaturedStocks(dataStocks);
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error al cargar cotizaciones live:", err);
    } finally {
      setIsLoadingMarket(false);
    }
  }, []);

  // 2. Cargar Noticias de Mercado Live desde yfinance
  const fetchMarketNews = useCallback(async () => {
    setIsLoadingNews(true);
    try {
      const res = await fetch("/api/market/news/AAPL?limit=6");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNews(data);
        }
      }
    } catch (err) {
      console.error("Error al obtener noticias:", err);
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  // 3. Cargar Resumen de Portafolio
  const fetchPortfolioSummary = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient.get<PortfolioResponse>(`/trading/portfolio/${user.id}`);
      if (res.data) {
        setPortfolio(res.data);
      }
    } catch (err) {
      console.error("Error al obtener resumen de portafolio:", err);
    }
  }, [user]);

  // Carga Inicial
  useEffect(() => {
    if (!mounted) return;
    fetchMarketData();
    fetchMarketNews();
    if (user) {
      fetchPortfolioSummary();
    }
  }, [mounted, user, fetchMarketData, fetchMarketNews, fetchPortfolioSummary]);

  // Polling / Auto-refresh cada 15 segundos
  useEffect(() => {
    if (!mounted || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchMarketData();
      if (user) {
        fetchPortfolioSummary();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [mounted, autoRefresh, fetchMarketData, user, fetchPortfolioSummary]);

  // Manejar Búsqueda Manual de Ticker
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const sym = searchQuery.trim().toUpperCase();
    if (!sym) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await fetch(`/api/market/quotes/${sym}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSearchResult(data[0]);
        } else {
          setSearchError(`No se encontraron datos para el símbolo "${sym}".`);
        }
      } else {
        setSearchError(`Fallo al consultar "${sym}". Verifica el ticker.`);
      }
    } catch (err) {
      setSearchError("Error de conexión al consultar yfinance.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="animate-spin text-emerald-500 mr-2" size={24} />
        <span>Iniciando panel principal...</span>
      </div>
    );
  }

  // Clasificar acciones en Ganadoras y Perdedoras
  const gainers = [...featuredStocks]
    .filter((s) => s.change_pct >= 0)
    .sort((a, b) => b.change_pct - a.change_pct);

  const losers = [...featuredStocks]
    .filter((s) => s.change_pct < 0)
    .sort((a, b) => a.change_pct - b.change_pct);

  const userEmail = user?.email || "Inversor";
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative font-sans overflow-x-hidden">
      {/* Glow Ambient Decoration */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-emerald-500/5 rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-[500px] h-[500px] bg-blue-500/5 rounded-full filter blur-[140px] pointer-events-none" />

      {/* HEADER / NAVIGATION BAR */}
      <header className="w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wide text-white flex items-center gap-2">
                TFM Trading Bot
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">Mercados y Control Cuantitativo</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80">
            <Link
              href="/home"
              className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <Globe size={15} />
              <span>Inicio</span>
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <LayoutDashboard size={15} />
              <span>Panel de Control</span>
            </Link>
            <Link
              href="/portfolio"
              className="text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <Briefcase size={15} />
              <span>Portafolio</span>
            </Link>
            <Link
              href="/invest"
              className="text-slate-400 hover:text-white hover:bg-slate-800/60 font-semibold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <Coins size={15} />
              <span>Inversión</span>
            </Link>
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Wallet size={16} className="text-emerald-400" />
              <div className="text-left">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Saldo Disponible</p>
                <p className="text-xs font-extrabold text-white">
                  ${(wallet?.balance ?? portfolio?.summary?.cash ?? 10000).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                {userInitials}
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-xl transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-900 py-2 px-4 bg-slate-950">
          <Link href="/home" className="text-emerald-400 font-bold text-xs flex flex-col items-center gap-1">
            <Globe size={16} />
            <span>Inicio</span>
          </Link>
          <Link href="/dashboard" className="text-slate-400 hover:text-white text-xs flex flex-col items-center gap-1">
            <LayoutDashboard size={16} />
            <span>Panel</span>
          </Link>
          <Link href="/portfolio" className="text-slate-400 hover:text-white text-xs flex flex-col items-center gap-1">
            <Briefcase size={16} />
            <span>Portafolio</span>
          </Link>
          <Link href="/invest" className="text-slate-400 hover:text-white text-xs flex flex-col items-center gap-1">
            <Coins size={16} />
            <span>Invertir</span>
          </Link>
        </div>
      </header>

      {/* TICKER DE ÍNDICES GLOBALES EN TIEMPO REAL */}
      <section className="w-full bg-slate-900/40 border-b border-slate-900 py-2.5 px-4 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-6 min-w-max">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider pr-4 border-r border-slate-800 shrink-0">
            <Activity size={14} className="text-emerald-400 animate-pulse" />
            <span>Índices yfinance</span>
          </div>

          {isLoadingMarket && indices.length === 0 ? (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="animate-spin text-emerald-400" size={14} />
              <span>Cargando índices globales...</span>
            </div>
          ) : (
            INDEX_SYMBOLS.map((idx) => {
              const quote = indices.find((q) => q.symbol === idx.symbol);
              const isPositive = (quote?.change_pct ?? 0) >= 0;
              return (
                <div key={idx.symbol} className="flex items-center gap-2 text-xs shrink-0">
                  <span className="font-extrabold text-slate-300">{idx.label}</span>
                  {quote ? (
                    <>
                      <span className="font-semibold text-slate-100">
                        {quote.price.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={`inline-flex items-center text-[11px] font-bold ${
                          isPositive ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {isPositive ? "+" : ""}
                        {quote.change_pct.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-600">--</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 flex-1 w-full">
        {/* WELCOME BANNER & STATS */}
        <section className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/80 rounded-3xl p-6 md:p-8 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full filter blur-[100px] pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Sesión Activa
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={13} />
                  {lastUpdated
                    ? `Actualizado: ${lastUpdated.toLocaleTimeString("es-ES")}`
                    : "Sincronizando..."}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                ¡Bienvenido de nuevo, <span className="text-emerald-400">{userEmail.split("@")[0]}</span>!
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Supervisa el estado del mercado financiero internacional en vivo mediante **yfinance**, consulta cotizaciones en tiempo real y gestiona tus algoritmos cuantitativos.
              </p>
            </div>

            {/* Controles de Refresco Live */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                  autoRefresh
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className={`w-2 h-9 rounded-full ${autoRefresh ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
                <span>{autoRefresh ? "Auto-Refresco (15s)" : "Pausado"}</span>
              </button>

              <button
                onClick={fetchMarketData}
                disabled={isLoadingMarket}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 p-2.5 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-2"
                title="Actualizar datos ahora"
              >
                <RefreshCw size={16} className={isLoadingMarket ? "animate-spin text-emerald-400" : ""} />
                <span className="hidden sm:inline">Refrescar</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Valor Total Portafolio</p>
              <p className="text-xl font-extrabold text-white mt-1">
                ${(portfolio?.summary?.total_portfolio_value ?? wallet?.balance ?? 10000).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Efectivo + Evaluación Activa</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Ganancia / Pérdida (PnL)</p>
              <p
                className={`text-xl font-extrabold mt-1 ${
                  (portfolio?.summary?.total_profit_loss ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {(portfolio?.summary?.total_profit_loss ?? 0) >= 0 ? "+" : ""}
                ${(portfolio?.summary?.total_profit_loss ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
              </p>

              <span className="text-[10px] text-slate-400">
                {(portfolio?.summary?.total_profit_loss_pct ?? 0) >= 0 ? "▲" : "▼"} {" "}
                {(portfolio?.summary?.total_profit_loss_pct ?? 0).toFixed(2)}% retorno acumulado
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Posiciones Abiertas</p>
              <p className="text-xl font-extrabold text-white mt-1">
                {portfolio?.positions?.length ?? 0} activos
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Cartera diversificada</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Motor Cuantitativo</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Zap size={18} className="text-emerald-400" />
                <span className="text-sm font-extrabold text-slate-200">FastAPI + yfinance</span>
              </div>
              <p className="text-[10px] text-emerald-400 mt-0.5 font-semibold">● Conexión segura lista</p>
            </div>
          </div>
        </section>

        {/* ACCESOS DIRECTOS A MÓDULOS */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Zap size={18} className="text-emerald-400" />
            Panel de Control y Módulos de Operación
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card Panel de Control */}
            <Link
              href="/dashboard"
              className="group bg-slate-900/40 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 backdrop-blur-sm transition duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LayoutDashboard size={24} />
                </div>
                <h4 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition">
                  Panel de Control Algorítmico
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Supervisa sesiones de bot activas, historial de órdenes transaccionadas y gráficos de balance general.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Ir al Panel de Control</span>
                <ArrowUpRight size={16} />
              </div>
            </Link>

            {/* Card Mi Portafolio */}
            <Link
              href="/portfolio"
              className="group bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 backdrop-blur-sm transition duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase size={24} />
                </div>
                <h4 className="font-extrabold text-base text-white group-hover:text-blue-400 transition">
                  Mi Portafolio Bursátil
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Analiza el rendimiento en vivo de tus activos mantenidos, PnL porcentual y valoración constante.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                <span>Ver Mi Portafolio</span>
                <ArrowUpRight size={16} />
              </div>
            </Link>

            {/* Card Módulo de Inversión */}
            <Link
              href="/invest"
              className="group bg-slate-900/40 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 backdrop-blur-sm transition duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Coins size={24} />
                </div>
                <h4 className="font-extrabold text-base text-white group-hover:text-purple-400 transition">
                  Módulo de Inversión IA
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ejecuta análisis multi-factor algorítmico, simula operaciones y emite decisiones con explicabilidad.
                </p>
              </div>
              <div className="pt-6 flex items-center gap-1 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                <span>Abrir Flujo de Inversión</span>
                <ArrowUpRight size={16} />
              </div>
            </Link>
          </div>
        </section>

        {/* HERRAMIENTA DE BÚSQUEDA Y CONSULTA EN TIEMPO REAL */}
        <section className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Search size={20} className="text-emerald-400" />
                Consulta de Cotizaciones en Vivo (yfinance)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Busca cualquier símbolo internacional o criptomoneda para obtener su cotización y variación actual.
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej: TSLA, AMD, SAN.MC, BTC-USD..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shrink-0"
              >
                {isSearching ? <RefreshCw className="animate-spin" size={14} /> : <span>Buscar</span>}
              </button>
            </form>
          </div>

          {/* Resultado de Búsqueda */}
          {searchError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{searchError}</span>
            </div>
          )}

          {searchResult && (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Resultado yfinance
                </span>
                <h4 className="text-xl font-extrabold text-white flex items-center gap-2">
                  {searchResult.symbol}
                </h4>
                <p className="text-xs text-slate-400">
                  Último volumen: {(searchResult.volume ?? 0).toLocaleString()} acciones
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <p className="text-2xl font-black text-white">
                  ${searchResult.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <div
                  className={`inline-flex items-center gap-1 font-bold text-sm ${
                    searchResult.change_pct >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {searchResult.change_pct >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  <span>
                    {searchResult.change >= 0 ? "+" : ""}
                    {searchResult.change.toFixed(2)} ({searchResult.change_pct.toFixed(2)}%)
                  </span>
                </div>
              </div>

              <Link
                href={`/invest?symbol=${searchResult.symbol}`}
                className="bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <span>Invertir en {searchResult.symbol}</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </section>

        {/* SECCIÓN PRINCIPAL: RESUMEN DE MERCADO (DESTACADAS / GANADORAS / PERDEDORAS) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 size={20} className="text-emerald-400" />
                Resumen de Mercado Tecnológico en Vivo
              </h3>
              <p className="text-xs text-slate-400">
                Cotizaciones live de los principales activos negociados en Wall Street
              </p>
            </div>

            <span className="text-xs text-slate-500 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-400" />
              Fuente de datos: Yahoo Finance API
            </span>
          </div>

          {isLoadingMarket && featuredStocks.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
              <RefreshCw className="animate-spin text-emerald-500" size={20} />
              <span>Cargando datos de mercado en directo...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Ganadoras del día */}
              <div className="bg-slate-900/30 border border-emerald-950/40 rounded-3xl p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-950/50 pb-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm uppercase tracking-wider">
                    <TrendingUp size={18} />
                    <span>Ganadoras del Día</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    {gainers.length} Activos
                  </span>
                </div>

                <div className="space-y-3">
                  {gainers.length > 0 ? (
                    gainers.map((stock) => (
                      <div
                        key={stock.symbol}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-900 hover:border-slate-800 transition"
                      >
                        <div>
                          <p className="font-extrabold text-sm text-white">{stock.symbol}</p>
                          <p className="text-[10px] text-slate-500">Mercado NASDAQ / NYSE</p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-sm text-slate-100">
                            ${stock.price.toFixed(2)}
                          </p>
                          <span className="inline-flex items-center text-xs font-extrabold text-emerald-400">
                            <ArrowUpRight size={14} />+{stock.change_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-8 text-center">
                      No hay acciones en positivo en la muestra actual.
                    </p>
                  )}
                </div>
              </div>

              {/* Perdedoras del día */}
              <div className="bg-slate-900/30 border border-red-950/40 rounded-3xl p-6 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between border-b border-red-950/50 pb-3">
                  <div className="flex items-center gap-2 text-red-400 font-extrabold text-sm uppercase tracking-wider">
                    <TrendingDown size={18} />
                    <span>Perdedoras del Día</span>
                  </div>
                  <span className="text-xs text-red-400 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full">
                    {losers.length} Activos
                  </span>
                </div>

                <div className="space-y-3">
                  {losers.length > 0 ? (
                    losers.map((stock) => (
                      <div
                        key={stock.symbol}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-900 hover:border-slate-800 transition"
                      >
                        <div>
                          <p className="font-extrabold text-sm text-white">{stock.symbol}</p>
                          <p className="text-[10px] text-slate-500">Mercado NASDAQ / NYSE</p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-sm text-slate-100">
                            ${stock.price.toFixed(2)}
                          </p>
                          <span className="inline-flex items-center text-xs font-extrabold text-red-400">
                            <ArrowDownRight size={14} />
                            {stock.change_pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-8 text-center">
                      No hay acciones bajistas en la muestra actual.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* FEED DE NOTICIAS DE MERCADO EN VIVO */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Newspaper size={20} className="text-emerald-400" />
              Titulares de Prensa Financiera en Vivo
            </h3>
            <span className="text-xs text-slate-500">Vía yfinance Feed</span>
          </div>

          {isLoadingNews ? (
            <div className="flex items-center justify-center py-10 text-slate-500 gap-2">
              <RefreshCw className="animate-spin text-emerald-400" size={18} />
              <span>Sincronizando noticias de mercado...</span>
            </div>
          ) : news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-900/30 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl backdrop-blur-sm transition flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {item.publisher || "Noticias"}
                    </span>
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-2 leading-relaxed">
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                    <span>
                      {item.provider_publish_time
                        ? new Date(item.provider_publish_time).toLocaleDateString("es-ES")
                        : "Reciente"}
                    </span>
                    <span className="text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                      Leer <ArrowUpRight size={12} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-900/30 border border-slate-800 rounded-2xl text-xs text-slate-500 text-center">
              No hay noticias disponibles en este momento.
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-500 bg-slate-950 mt-12">
        <p>Trabajo de Fin de Máster © 2026 - Juan Manuel Garcia Jurado</p>
      </footer>
    </div>
  );
}
