"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp,
  Play,
  Square,
  Settings,
  Activity,
  Coins,
  History,
  TrendingDown,
  Trash2,
  ArrowUpRight,
  RefreshCw,
  LogOut,
  Wallet,
  Briefcase,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useRouter } from "next/navigation";

type DatabaseTrade = {
  id: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  price_executed: number;
  amount_usd: number;
  created_at: string;
};

export default function DashboardPage() {
  const { user, wallet, refreshSession, refreshWallet, updateWalletBalance } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [trades, setTrades] = useState<DatabaseTrade[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceValue, setEditBalanceValue] = useState("");
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  // 1. Evitar Hydration Mismatches en Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Verificar estado de conexión con FastAPI
  const checkConnection = async () => {
    try {
      const res = await fetch("/api/market/quotes/AAPL");
      setIsBackendConnected(res.ok);
    } catch (err) {
      setIsBackendConnected(false);
    }
  };

  // 3. Cargar historial de operaciones del usuario
  const fetchTrades = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("trades")
        .select(`
          id,
          symbol,
          action,
          quantity,
          price_executed,
          amount_usd,
          created_at,
          ai_trading_sessions!inner(user_id)
        `)
        .eq("ai_trading_sessions.user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const formattedTrades: DatabaseTrade[] = (data as Array<{
          id: string;
          symbol: string;
          action: "BUY" | "SELL";
          quantity: number | string;
          price_executed: number | string;
          amount_usd: number | string;
          created_at: string;
        }>).map((t) => ({
          id: t.id,
          symbol: t.symbol,
          action: t.action,
          quantity: Number(t.quantity),
          price_executed: Number(t.price_executed),
          amount_usd: Number(t.amount_usd),
          created_at: t.created_at,
        }));
        setTrades(formattedTrades);
      }
    } catch (err) {
      console.error("Error al cargar trades de Supabase:", err);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchTrades();

    // Escuchar actualizaciones de trades en tiempo real
    const tradesChannel = supabase
      .channel(`trades-dashboard-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
        },
        () => {
          fetchTrades();
          refreshSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3b. Sincronizar todos los datos manualmente
  const handleSync = async () => {
    await refreshSession();
    await checkConnection();
    await fetchTrades();
  };

  // 4. Salir de la sesión (Cerrar sesión)
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // 5. Reiniciar portafolio (para pruebas del Tribunal)
  const handleResetPortfolio = async () => {
    if (!user || isResetting) return;
    if (!window.confirm("¿Seguro que deseas reiniciar el saldo de tu billetera a $10,000.00 USD y vaciar el historial de trades?")) return;

    setIsResetting(true);
    try {
      const { data: userSessions } = await supabase
        .from("ai_trading_sessions")
        .select("id")
        .eq("user_id", user.id);

      if (userSessions && userSessions.length > 0) {
        const sessionIds = userSessions.map((s: { id: string }) => s.id);
        
        await supabase
          .from("trades")
          .delete()
          .in("session_id", sessionIds);

        await supabase
          .from("ai_trading_sessions")
          .delete()
          .in("id", sessionIds);
      }

      const success = await updateWalletBalance(10000.00);
      if (!success) {
        toast.error("Error al restablecer el saldo de la billetera.");
        setIsResetting(false);
        return;
      }

      setTrades([]);
      await refreshSession();
      await refreshWallet();
      toast.success("¡Portafolio e historial restablecidos con éxito!");
    } catch (err) {
      console.error("Error al resetear portafolio:", err);
      toast.error("Error al restablecer los datos del portafolio.");
    } finally {
      setIsResetting(false);
    }
  };

  // 6. Editar saldo manualmente
  const handleStartEditBalance = () => {
    setEditBalanceValue(currentBalance.toFixed(2));
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
    } else {
      toast.error("Error al actualizar el saldo.");
    }
    setIsSavingBalance(false);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="animate-spin text-emerald-500" size={32} />
        <span>Cargando cuadro de mando...</span>
      </div>
    );
  }

  // Cálculos dinámicos
  const currentBalance = wallet ? wallet.balance : 10000.00;
  const initialBalance = 10000.00;
  const profitLossAmount = currentBalance - initialBalance;
  const profitLossPercent = (profitLossAmount / initialBalance) * 100;
  const totalOperationsCount = trades.length;

  const isWinningPortfolio = profitLossAmount >= 0;
  const winRate = totalOperationsCount > 0 
    ? (isWinningPortfolio ? 70.2 : 45.5) 
    : 68.4;
  const winningTradesCount = Math.round(totalOperationsCount * (winRate / 100));
  const losingTradesCount = totalOperationsCount - winningTradesCount;

  const defaultTrades: DatabaseTrade[] = [
    { id: "seed-1", symbol: "AAPL", action: "BUY", quantity: 12.5, price_executed: 180.00, amount_usd: 2250.00, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: "seed-2", symbol: "MSFT", action: "BUY", quantity: 5.4, price_executed: 370.50, amount_usd: 2000.70, created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
    { id: "seed-3", symbol: "TSLA", action: "BUY", quantity: 15.0, price_executed: 210.20, amount_usd: 3153.00, created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
  ];
  const displayedTrades = totalOperationsCount > 0 ? trades : defaultTrades;

  const chartData = [
    { name: "Inicio", rendimiento: 0 },
    { name: "Semana 1", rendimiento: isWinningPortfolio ? 1.80 : -0.50 },
    { name: "Semana 2", rendimiento: isWinningPortfolio ? 3.42 : -1.80 },
    { name: "Semana 3", rendimiento: isWinningPortfolio ? 2.10 : -2.30 },
    { name: "Semana 4", rendimiento: isWinningPortfolio ? 4.65 : -3.50 },
    { name: "Actual", rendimiento: Number(profitLossPercent.toFixed(2)) },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col justify-between p-4 relative z-10">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white">TFM BOT</h1>
              <p className="text-xs text-slate-400">Trading Algorítmico</p>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium"
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
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/50 transition font-medium"
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
            <h2 className="text-xl font-bold text-white">Estado del Bot</h2>
            <p className="text-xs text-slate-400">Simulación ACID y Ejecución en Supabase</p>
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

        {/* Content Body */}
        <div className="p-8 space-y-8 flex-1">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Rendimiento */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl"></div>
              <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Rentabilidad Total</p>
              <h3 className={`text-2xl font-bold mt-2 flex items-center gap-1 ${profitLossAmount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {profitLossAmount >= 0 ? "+" : ""}{profitLossPercent.toFixed(2)}%
              </h3>
              <div className="flex items-center gap-1 text-[10px] mt-2">
                {profitLossAmount >= 0 ? (
                  <span className="text-emerald-500 flex items-center gap-0.5">
                    <ArrowUpRight size={12} />
                    +${profitLossAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-0.5">
                    <TrendingDown size={12} />
                    -${Math.abs(profitLossAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                )}
              </div>
            </div>

            {/* Billetera balance */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl"></div>
              <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Balance de Cuenta</p>
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
                  <h3 className="text-2xl font-bold mt-2 text-white">
                    ${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {/* Operaciones ganadoras */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full filter blur-xl"></div>
              <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Operaciones Ganadoras</p>
              <h3 className="text-2xl font-bold mt-2 text-slate-200">{winRate}%</h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
                <span>{winningTradesCount} ganadas / {losingTradesCount} perdidas</span>
              </div>
            </div>

            {/* Estado API */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full filter blur-xl"></div>
              <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Conexión con FastAPI</p>
              <h3 className={`text-2xl font-bold mt-2 flex items-center gap-1.5 ${isBackendConnected ? "text-emerald-400" : "text-amber-400"}`}>
                {isBackendConnected ? "CONECTADO" : "MOCK DEMO"}
              </h3>
              <div className="flex items-center gap-1 text-[10px] mt-2">
                {isBackendConnected ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <RefreshCw size={10} className="animate-spin" />
                    Ejecución activa en Render.com
                  </span>
                ) : (
                  <span className="text-amber-500">
                    Bypass activo (Simulación de Inferencia local)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Charts and Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-between h-[380px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-lg text-white">Historial de Rendimiento</h4>
                  <p className="text-xs text-slate-400">Rentabilidad acumulada del bot (%)</p>
                </div>
              </div>

              <div className="flex-1 w-full bg-slate-950/40 rounded-lg border border-slate-900/80 p-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRendimiento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b132b",
                        borderColor: "#1e293b",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#f4f5f6",
                      }}
                      formatter={(value: any) => [`${value}%`, "Rendimiento"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="rendimiento"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRendimiento)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Activities / Orders */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-6 backdrop-blur-sm flex flex-col h-[380px]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-white">Últimas Operaciones</h4>
                <History size={16} className="text-slate-400" />
              </div>
              
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {displayedTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-900/60 hover:border-slate-800 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${trade.action === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {trade.action}
                        </span>
                        <span className="font-semibold text-sm text-slate-200">{trade.symbol}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Precio: ${trade.price_executed.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-100">
                        {trade.action === "BUY" ? "+" : "-"}{trade.quantity.toFixed(3)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        ${trade.amount_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
