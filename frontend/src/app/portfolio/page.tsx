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
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PortfolioResponse } from "@/types";
import { AxiosError } from "axios";

export default function PortfolioPage() {
  const router = useRouter();
  const { user, wallet, refreshSession, refreshWallet, updateWalletBalance } = useSession();
  const [portfolioData, setPortfolioData] = useState<PortfolioResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceValue, setEditBalanceValue] = useState("");
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchPortfolio = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get<PortfolioResponse>(`/trading/portfolio/${user.id}`);
      setPortfolioData(res.data);
    } catch (err: unknown) {
      console.error("Error al cargar portafolio:", err);
      const axiosErr = err as AxiosError<{ detail?: string; error?: string }>;
      setErrorMsg(
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.error ||
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // 1. Invocar endpoint seguro en backend para limpiar BD y reiniciar wallet a $10,000
      await apiClient.post("/trading/reset", { user_id: user.id });

      // 2. Limpieza de cliente Supabase como resguardo
      const { data: userSessions } = await supabase
        .from("ai_trading_sessions")
        .select("id")
        .eq("user_id", user.id);

      if (userSessions && userSessions.length > 0) {
        const sessionIds = userSessions.map((s: { id: string }) => s.id);
        await supabase.from("trades").delete().in("session_id", sessionIds);
        await supabase.from("ai_trading_sessions").delete().in("id", sessionIds);
      }

      await updateWalletBalance(10000.00);

      setPortfolioData(null);
      await refreshSession();
      await refreshWallet();
      await fetchPortfolio();
      toast.success("¡Portafolio e historial restablecidos con éxito a $10,000.00 USD!");
    } catch (err) {
      console.error("Error al resetear portafolio:", err);
      toast.error("Error al restablecer los datos del portafolio.");
    } finally {
      setIsResetting(false);
    }
  };

  // Editar saldo manualmente
  const currentCash = wallet?.balance ?? 0;

  const handleStartEditBalance = () => {
    setEditBalanceValue(currentCash.toFixed(2));
    setIsEditingBalance(true);
  };

  const handleCancelEditBalance = () => {
    setIsEditingBalance(false);
    setEditBalanceValue("");
  };

  const handleSaveBalance = async () => {
    const newBalance = parseFloat(editBalanceValue);
    if (isNaN(newBalance) || newBalance < 0) {
      toast.error("Introduce un saldo válido (≥ $0).");
      return;
    }
    setIsSavingBalance(true);
    const success = await updateWalletBalance(newBalance);
    if (success) {
      toast.success(`Saldo actualizado a $${newBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD.`);
      setIsEditingBalance(false);
      await fetchPortfolio();
    } else {
      toast.error("Error al actualizar el saldo.");
    }
    setIsSavingBalance(false);
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

  const profitLoss = summary?.total_profit_loss ?? 0;
  const profitLossPct = summary?.total_profit_loss_pct ?? 0;

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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Consolidando valoraciones y noticias en vivo...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto">
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
            <div>
              <h3 className="font-bold text-lg text-white">Error al cargar datos</h3>
              <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
            </div>
            <button
              onClick={fetchPortfolio}
              className="px-4 py-2 rounded-xl bg-red-900/40 border border-red-800 text-xs font-bold text-red-200 hover:bg-red-800 transition"
            >
              Reintentar Conexión
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                <span className="text-xs text-slate-400 font-medium">Valor Total Portafolio</span>
                <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">
                  ${summary?.total_portfolio_value?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "0.00"}
                </h3>
                <p className="text-xs text-slate-500 mt-2">Efectivo + Valoraciones de Mercado</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                <span className="text-xs text-slate-400 font-medium">Efectivo Disponible</span>
                {isEditingBalance ? (
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editBalanceValue}
                        onChange={(e) => setEditBalanceValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveBalance(); if (e.key === "Escape") handleCancelEditBalance(); }}
                        autoFocus
                        className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 transition text-white font-mono text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveBalance}
                        disabled={isSavingBalance}
                        className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 rounded-lg text-xs transition active:scale-95 disabled:opacity-50"
                      >
                        <Check size={12} />
                        <span>Guardar</span>
                      </button>
                      <button
                        onClick={handleCancelEditBalance}
                        className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 rounded-lg text-xs transition active:scale-95"
                      >
                        <X size={12} />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                      ${summary?.cash?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "0.00"}
                    </h3>
                    <button
                      onClick={handleStartEditBalance}
                      className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 mt-2 font-semibold transition group"
                    >
                      <Pencil size={10} />
                      <span className="group-hover:underline">Modificar saldo ›</span>
                    </button>
                  </>
                )}
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                <span className="text-xs text-slate-400 font-medium">Capital Invertido (Cost Basis)</span>
                <h3 className="text-2xl font-extrabold text-slate-200 mt-1 font-mono">
                  ${summary?.total_cost_basis?.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "0.00"}
                </h3>
                <p className="text-xs text-slate-500 mt-2">Costo medio acumulado</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                <span className="text-xs text-slate-400 font-medium">Ganancia / Pérdida Latente</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className={`text-2xl font-extrabold font-mono ${profitLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {profitLoss >= 0 ? "+" : ""}${profitLoss.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded mt-2 ${
                  profitLoss >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {profitLoss >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  <span>{profitLossPct >= 0 ? "+" : ""}{profitLossPct.toFixed(2)}%</span>
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
                              <th className="pb-3 font-semibold">Fecha / Hora Compra</th>
                              <th className="pb-3 font-semibold text-right">Cantidad</th>
                              <th className="pb-3 font-semibold text-right">Precio Promedio</th>
                              <th className="pb-3 font-semibold text-right">Precio Actual</th>
                              <th className="pb-3 font-semibold text-right">Valor de Mercado</th>
                              <th className="pb-3 font-semibold text-right">Ganancia / ROI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/60">
                            {positions.map((pos: any) => {
                              const dateFormatted = pos.created_at
                                ? new Date(pos.created_at).toLocaleString("es-ES", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "En vivo";
                              return (
                                <tr key={pos.symbol} className="text-sm hover:bg-slate-900/20 transition">
                                  <td className="py-3.5 font-bold text-emerald-400 font-mono">{pos.symbol}</td>
                                  <td className="py-3.5 text-xs text-slate-400 font-mono">{dateFormatted}</td>
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
                              );
                            })}
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
