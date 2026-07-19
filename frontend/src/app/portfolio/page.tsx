"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api/client";
import {
  TrendingUp,
  Play,
  Activity,
  Coins,
  Trash2,
  LogOut,
  Briefcase,
  RefreshCw,
  TrendingDown,
  Info,
  DollarSign,
  Newspaper,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function PortfolioPage() {
  const router = useRouter();
  const { user, wallet, refreshSession } = useSession();
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPortfolio = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get(`/trading/portfolio/${user.id}`);
      setPortfolioData(res.data);
    } catch (err: any) {
      console.error("Error al cargar portafolio:", err);
      setErrorMsg(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Fallo de conexión al cargar datos del portafolio."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && user) {
      fetchPortfolio();
    }
  }, [mounted, user]);

  const handleSync = async () => {
    toast.promise(
      (async () => {
        await refreshSession();
        await fetchPortfolio();
      })(),
      {
        loading: "Sincronizando datos de mercado en vivo...",
        success: "Datos actualizados correctamente.",
        error: "Fallo al sincronizar los datos del portafolio.",
      }
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleResetPortfolio = async () => {
    if (!user || isResetting) return;
    if (!window.confirm("¿Seguro que deseas reiniciar el saldo de tu billetera a $10,000.00 USD y vaciar el historial de trades?")) return;

    setIsResetting(true);
    try {
      const { data: userSessions } = await (supabase
        .from("ai_trading_sessions") as any)
        .select("id")
        .eq("user_id", user.id);

      if (userSessions && userSessions.length > 0) {
        const sessionIds = (userSessions as any[]).map((s) => s.id);
        
        await (supabase
          .from("trades") as any)
          .delete()
          .in("session_id", sessionIds);

        await (supabase
          .from("ai_trading_sessions") as any)
          .delete()
          .in("id", sessionIds);
      }

      await (supabase
        .from("wallets") as any)
        .update({ balance: 10000.00 })
        .eq("user_id", user.id);

      setPortfolioData(null);
      await refreshSession();
      await fetchPortfolio();
      toast.success("¡Portafolio e historial restablecidos con éxito!");
    } catch (err) {
      console.error("Error al resetear portafolio:", err);
      toast.error("Error al restablecer los datos del portafolio.");
    } finally {
      setIsResetting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="animate-spin text-emerald-500" size={32} />
        <span>Cargando portafolio...</span>
      </div>
    );
  }

  // Si no ha iniciado sesión
  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4 p-4 text-center">
        <ShieldAlert size={48} className="text-red-500" />
        <h1 className="text-xl font-bold text-white">Sesión no detectada</h1>
        <p className="text-sm text-slate-500 max-w-xs">
          Debes iniciar sesión para visualizar y administrar tu portafolio de trading.
        </p>
        <Link
          href="/login"
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg transition"
        >
          Iniciar Sesión
        </Link>
      </div>
    );
  }

  const summary = portfolioData?.summary;
  const positions = portfolioData?.positions || [];
  const facts = portfolioData?.facts || [];
  const news = portfolioData?.news || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden relative">
      {/* Luces de Fondo */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/5 rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-blue-500/5 rounded-full filter blur-[150px] pointer-events-none" />

      {/* Sidebar de Navegación */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950/80 backdrop-blur-md p-6 flex flex-col justify-between shrink-0 relative z-20">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-extrabold shadow-lg shadow-emerald-500/10">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white">TFM BOT</h1>
              <p className="text-xs text-slate-400">Trading Algorítmico</p>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/50 transition font-medium"
            >
              <Activity size={18} />
              <span>Panel de Control</span>
            </Link>
            <Link
              href="/invest"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/50 transition font-medium"
            >
              <Coins size={18} />
              <span>Módulo de Inversión</span>
            </Link>
            <Link
              href="/portfolio"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium"
            >
              <Briefcase size={18} />
              <span>Mi Portafolio</span>
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-900 pt-4 px-2 space-y-3">
          <button
            onClick={handleResetPortfolio}
            disabled={isResetting}
            className="w-full flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/40 py-2 rounded-lg text-xs font-medium transition active:scale-95 disabled:opacity-50"
          >
            <Trash2 size={14} />
            <span>Restablecer Datos</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 py-2 rounded-lg text-xs font-medium transition active:scale-95"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col relative z-10">
        {/* Header */}
        <header className="border-b border-slate-900 px-8 py-5 bg-slate-950/60 backdrop-blur-md flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Mi Portafolio Cuántico</h2>
            <p className="text-xs text-slate-400">Rendimiento latente y distribución de activos</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/invest"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20 transition active:scale-95 text-sm"
            >
              <Play size={15} fill="currentColor" />
              <span>Nueva Inversión</span>
            </Link>
            <button
              onClick={handleSync}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-lg border border-slate-800 transition active:scale-95 text-sm"
            >
              <RefreshCw size={15} />
              <span>Sincronizar</span>
            </button>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="p-8 space-y-8 flex-1">
          {errorMsg && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
              <ShieldAlert size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading && !portfolioData ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="animate-spin text-emerald-500" size={32} />
              <span>Cargando datos de cartera en tiempo real...</span>
            </div>
          ) : (
            <>
              {/* KPIs Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute right-4 top-4 text-emerald-500/10">
                    <Briefcase size={40} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Valor del Portafolio</span>
                  <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ${summary?.total_portfolio_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">Valor de Mercado + Efectivo</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute right-4 top-4 text-emerald-500/10">
                    <Coins size={40} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Efectivo Líquido (Billetera)</span>
                  <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ${summary?.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">Fondos libres para operar</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute right-4 top-4 text-emerald-500/10">
                    <DollarSign size={40} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Capital Invertido</span>
                  <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ${summary?.total_cost_basis.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2">Costo medio acumulado</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                  <span className="text-xs text-slate-400 font-medium">Ganancia / Pérdida Latente</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h3 className={`text-2xl font-extrabold font-mono ${summary?.total_profit_loss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {summary?.total_profit_loss >= 0 ? "+" : ""}${summary?.total_profit_loss.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded mt-2 ${
                    summary?.total_profit_loss >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {summary?.total_profit_loss >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span>{summary?.total_profit_loss_pct >= 0 ? "+" : ""}{summary?.total_profit_loss_pct.toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Grid Principal: Tabla + Datos de Interés */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tabla de Posiciones */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Briefcase size={16} className="text-emerald-400" />
                        <span>Posiciones Abiertas</span>
                      </h3>
                      <span className="text-xs text-slate-500">{positions.length} activos en cartera</span>
                    </div>

                    {positions.length === 0 ? (
                      <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                        <HelpCircle size={36} className="text-slate-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-400">Sin posiciones abiertas</p>
                        <p className="text-xs text-slate-500 max-w-xs mt-1">
                          Aún no has ejecutado ningún análisis con órdenes ejecutadas en Supabase.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-900 text-xs text-slate-400">
                              <th className="pb-3 font-semibold">Ticker</th>
                              <th className="pb-3 font-semibold text-right">Cantidad</th>
                              <th className="pb-3 font-semibold text-right">Precio Promedio</th>
                              <th className="pb-3 font-semibold text-right">Precio Actual</th>
                              <th className="pb-3 font-semibold text-right">Valor de Mercado</th>
                              <th className="pb-3 font-semibold text-right">Ganancia / ROI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/60">
                            {positions.map((pos: any) => (
                              <tr key={pos.symbol} className="text-sm hover:bg-slate-900/20 transition">
                                <td className="py-3.5 font-bold text-emerald-400 font-mono">{pos.symbol}</td>
                                <td className="py-3.5 text-right font-mono text-slate-300">{pos.quantity}</td>
                                <td className="py-3.5 text-right font-mono text-slate-400">${pos.average_price.toFixed(2)}</td>
                                <td className="py-3.5 text-right font-mono text-slate-300">${pos.current_price.toFixed(2)}</td>
                                <td className="py-3.5 text-right font-mono text-white">${pos.market_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                <td className="py-3.5 text-right">
                                  <span className={`font-bold font-mono block ${pos.profit_loss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {pos.profit_loss >= 0 ? "+" : ""}${pos.profit_loss.toFixed(2)}
                                  </span>
                                  <span className={`text-2xs font-semibold ${pos.profit_loss_pct >= 0 ? "text-emerald-500/80" : "text-red-500/80"}`}>
                                    {pos.profit_loss_pct >= 0 ? "+" : ""}{pos.profit_loss_pct.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Datos Analíticos Interesantes */}
                <div className="space-y-4">
                  <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Compass size={16} className="text-emerald-400" />
                      <span>Insights & Datos de Interés</span>
                    </h3>

                    <div className="space-y-4">
                      {facts.map((fact: any, index: number) => {
                        let colorClasses = "bg-slate-950 border-slate-800 text-slate-300";
                        if (fact.type === "best_performer") {
                          colorClasses = "bg-emerald-950/20 border-emerald-900/40 text-emerald-300";
                        } else if (fact.type === "worst_performer") {
                          colorClasses = "bg-red-950/20 border-red-900/40 text-red-300";
                        } else if (fact.type === "concentration") {
                          colorClasses = "bg-blue-950/20 border-blue-900/40 text-blue-300";
                        }

                        return (
                          <div key={index} className={`p-4 rounded-xl border space-y-1 ${colorClasses}`}>
                            <h4 className="font-bold text-xs uppercase tracking-wider">{fact.title}</h4>
                            <p className="text-xs opacity-90 leading-relaxed">{fact.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Noticias de Mercado Consolidadas */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Newspaper size={16} className="text-emerald-400" />
                  <span>Noticias de tus Acciones en Portafolio</span>
                </h3>

                {news.length === 0 ? (
                  <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-8 text-center text-slate-500">
                    No hay noticias disponibles en este momento. Abre posiciones para ver feeds relevantes.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {news.map((item: any, idx: number) => (
                      <a
                        key={idx}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-900/20 hover:bg-slate-900/40 border border-slate-900 rounded-2xl p-5 block space-y-3 transition group active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between text-2xs text-slate-500 font-medium">
                          <span>{item.publisher}</span>
                          <span>
                            {new Date(item.provider_publish_time).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-200 group-hover:text-white line-clamp-2 transition leading-snug">
                          {item.title}
                        </h4>
                        <div className="text-2xs text-emerald-400 font-semibold flex items-center gap-1 group-hover:underline pt-1">
                          <span>Leer artículo completo</span>
                          <ArrowUpRight size={10} />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
