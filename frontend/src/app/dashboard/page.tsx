"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api/client";
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
  Cpu,
  CheckCircle2,
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
import { PortfolioResponse } from "@/types";

type DatabaseTrade = {
  id: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  price_executed: number;
  amount_usd: number;
  created_at: string;
};

type TimeFrame = "1D" | "1W" | "1M" | "1Y";

export default function DashboardPage() {
  const { user, wallet, refreshSession, refreshWallet, updateWalletBalance } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [trades, setTrades] = useState<DatabaseTrade[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceValue, setEditBalanceValue] = useState("");
  const [isSavingBalance, setIsSavingBalance] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeFrame>("1M");

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
      const res = await apiClient.get<DatabaseTrade[]>(`/trading/trades/${user.id}`);
      if (res.data && Array.isArray(res.data)) {
        setTrades(res.data);
      }
    } catch (err) {
      console.error("Error al cargar trades en dashboard:", err);
    }
  };

  // 3b. Cargar datos del portafolio (posiciones reales y PnL)
  const fetchPortfolio = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get<PortfolioResponse>(`/trading/portfolio/${user.id}`);
      if (res.data) {
        setPortfolio(res.data);
      }
    } catch (err) {
      console.error("Error al cargar portafolio en dashboard:", err);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchTrades();
    fetchPortfolio();

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
          fetchPortfolio();
          refreshSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3c. Sincronizar todos los datos manualmente
  const handleSync = async () => {
    await refreshSession();
    await checkConnection();
    await fetchTrades();
    await fetchPortfolio();
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

      setTrades([]);
      await refreshSession();
      await refreshWallet();
      toast.success("¡Portafolio e historial restablecidos con éxito a $10,000.00 USD!");
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

  // Cálculos dinámicos reales
  const currentBalance = wallet ? wallet.balance : 10000.00;
  const initialBalance = 10000.00;
  const positionsValue = portfolio?.summary?.total_positions_value ?? 0.0;
  const totalPortfolioValue = currentBalance + positionsValue;
  const profitLossAmount = portfolio?.summary?.total_profit_loss ?? (totalPortfolioValue - initialBalance);
  const profitLossPercent = initialBalance > 0 ? (profitLossAmount / initialBalance) * 100 : 0.0;

  const totalOperationsCount = trades.length;

  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let winRate = 0.0;

  if (totalOperationsCount === 0) {
    winningTradesCount = 0;
    losingTradesCount = 0;
    winRate = 0.0;
  } else if (portfolio && portfolio.positions && portfolio.positions.length > 0) {
    winningTradesCount = portfolio.positions.filter((p) => p.profit_loss > 0).length;
    losingTradesCount = portfolio.positions.filter((p) => p.profit_loss < 0).length;
    const evaluated = portfolio.positions.length;
    winRate = evaluated > 0 ? Number(((winningTradesCount / evaluated) * 100).toFixed(1)) : 0.0;
  } else {
    if (profitLossAmount > 0) {
      winningTradesCount = totalOperationsCount;
      losingTradesCount = 0;
      winRate = 100.0;
    } else if (profitLossAmount < 0) {
      winningTradesCount = 0;
      losingTradesCount = totalOperationsCount;
      winRate = 0.0;
    } else {
      winningTradesCount = 0;
      losingTradesCount = 0;
      winRate = 0.0;
    }
  }

  const generateChartData = () => {
    const pct = Number(profitLossPercent.toFixed(2));
    if (totalOperationsCount === 0) {
      if (timeframe === "1D") {
        return [
          { name: "00:00", rendimiento: 0 },
          { name: "04:00", rendimiento: 0 },
          { name: "08:00", rendimiento: 0 },
          { name: "12:00", rendimiento: 0 },
          { name: "16:00", rendimiento: 0 },
          { name: "20:00", rendimiento: 0 },
          { name: "Ahora", rendimiento: 0 },
        ];
      } else if (timeframe === "1W") {
        return [
          { name: "Lun", rendimiento: 0 },
          { name: "Mar", rendimiento: 0 },
          { name: "Mié", rendimiento: 0 },
          { name: "Jue", rendimiento: 0 },
          { name: "Vie", rendimiento: 0 },
          { name: "Sáb", rendimiento: 0 },
          { name: "Dom", rendimiento: 0 },
        ];
      } else if (timeframe === "1Y") {
        return [
          { name: "Ene", rendimiento: 0 },
          { name: "Mar", rendimiento: 0 },
          { name: "May", rendimiento: 0 },
          { name: "Jul", rendimiento: 0 },
          { name: "Sep", rendimiento: 0 },
          { name: "Nov", rendimiento: 0 },
          { name: "Actual", rendimiento: 0 },
        ];
      } else {
        return [
          { name: "Inicio", rendimiento: 0 },
          { name: "Semana 1", rendimiento: 0 },
          { name: "Semana 2", rendimiento: 0 },
          { name: "Semana 3", rendimiento: 0 },
          { name: "Semana 4", rendimiento: 0 },
          { name: "Actual", rendimiento: 0 },
        ];
      }
    }

    if (timeframe === "1D") {
      return [
        { name: "00:00", rendimiento: Number((pct * 0.1).toFixed(2)) },
        { name: "04:00", rendimiento: Number((pct * 0.25).toFixed(2)) },
        { name: "08:00", rendimiento: Number((pct * 0.45).toFixed(2)) },
        { name: "12:00", rendimiento: Number((pct * 0.65).toFixed(2)) },
        { name: "16:00", rendimiento: Number((pct * 0.8).toFixed(2)) },
        { name: "20:00", rendimiento: Number((pct * 0.92).toFixed(2)) },
        { name: "Ahora", rendimiento: pct },
      ];
    } else if (timeframe === "1W") {
      return [
        { name: "Lun", rendimiento: Number((pct * 0.15).toFixed(2)) },
        { name: "Mar", rendimiento: Number((pct * 0.30).toFixed(2)) },
        { name: "Mié", rendimiento: Number((pct * 0.45).toFixed(2)) },
        { name: "Jue", rendimiento: Number((pct * 0.60).toFixed(2)) },
        { name: "Vie", rendimiento: Number((pct * 0.75).toFixed(2)) },
        { name: "Sáb", rendimiento: Number((pct * 0.88).toFixed(2)) },
        { name: "Dom", rendimiento: pct },
      ];
    } else if (timeframe === "1Y") {
      return [
        { name: "Ene", rendimiento: Number((pct * 0.05).toFixed(2)) },
        { name: "Mar", rendimiento: Number((pct * 0.20).toFixed(2)) },
        { name: "May", rendimiento: Number((pct * 0.40).toFixed(2)) },
        { name: "Jul", rendimiento: Number((pct * 0.60).toFixed(2)) },
        { name: "Sep", rendimiento: Number((pct * 0.80).toFixed(2)) },
        { name: "Nov", rendimiento: Number((pct * 0.92).toFixed(2)) },
        { name: "Actual", rendimiento: pct },
      ];
    } else {
      return [
        { name: "Inicio", rendimiento: 0 },
        { name: "Semana 1", rendimiento: Number((pct * 0.25).toFixed(2)) },
        { name: "Semana 2", rendimiento: Number((pct * 0.50).toFixed(2)) },
        { name: "Semana 3", rendimiento: Number((pct * 0.75).toFixed(2)) },
        { name: "Semana 4", rendimiento: Number((pct * 0.90).toFixed(2)) },
        { name: "Actual", rendimiento: pct },
      ];
    }
  };

  const chartData = generateChartData();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col justify-between p-4 relative z-10">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-wide">TFM BOT</h1>
              <p className="text-[10px] text-slate-400 font-mono">Trading Algorítmico</p>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition"
            >
              <Activity size={16} />
              <span>Panel de Control</span>
            </Link>
            <Link
              href="/investment"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 text-xs font-medium transition"
            >
              <Cpu size={16} />
              <span>Módulo de Inversión</span>
            </Link>
            <Link
              href="/portfolio"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 text-xs font-medium transition"
            >
              <Briefcase size={16} />
              <span>Mi Portafolio</span>
            </Link>
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-900">
          <button
            onClick={handleResetPortfolio}
            disabled={isResetting}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-950/20 hover:bg-red-900/40 border border-red-900/40 text-red-400 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isResetting ? "animate-spin" : ""} />
            <span>{isResetting ? "Restableciendo..." : "Restablecer Datos"}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold transition active:scale-95"
          >
            <LogOut size={13} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Panel de Control Cuántico</h2>
              <p className="text-xs text-slate-400 mt-1">
                Monitoreo en tiempo real de operaciones, liquidez y conectividad del motor IA.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
              >
                <RefreshCw size={13} />
                <span>Sincronizar</span>
              </button>
              <Link
                href="/investment"
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <Cpu size={14} />
                <span>Nueva Inversión</span>
              </Link>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Balance Wallet */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Efectivo Disponible</span>
                <Wallet size={16} className="text-emerald-400" />
              </div>
              {isEditingBalance ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="number"
                    value={editBalanceValue}
                    onChange={(e) => setEditBalanceValue(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-1 text-sm font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ej. 10000.00"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveBalance}
                      disabled={isSavingBalance}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1 rounded text-2xs transition active:scale-95 disabled:opacity-50"
                    >
                      <Check size={10} />
                      <span>Guardar</span>
                    </button>
                    <button
                      onClick={handleCancelEditBalance}
                      className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1 rounded text-2xs transition active:scale-95"
                    >
                      <X size={10} />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-extrabold text-white mt-2 font-mono">
                    ${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-400">Billetera Virtual USD</span>
                    <button
                      onClick={handleStartEditBalance}
                      className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition group"
                    >
                      <Pencil size={9} />
                      <span className="group-hover:underline">Modificar</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Card 2: Portafolio Total */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Valor Total Portafolio</span>
                <Briefcase size={16} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white mt-2 font-mono">
                ${totalPortfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2">Efectivo + Inversiones Activas</p>
            </div>

            {/* Card 3: Retorno Latente (PnL) */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Retorno Latente (PnL)</span>
                <TrendingUp size={16} className={profitLossAmount >= 0 ? "text-emerald-400" : "text-red-400"} />
              </div>
              <h3 className={`text-xl font-extrabold mt-2 font-mono ${profitLossAmount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {profitLossAmount >= 0 ? "+" : ""}${profitLossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <span className={`text-[10px] font-bold ${profitLossAmount >= 0 ? "text-emerald-400" : "text-red-400"} block mt-2`}>
                {profitLossPercent >= 0 ? "+" : ""}{profitLossPercent.toFixed(2)}% vs Base
              </span>
            </div>

            {/* Card 4: Operaciones Ganadoras (Win Rate) */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Operaciones Ganadoras</span>
                <CheckCircle2 size={16} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white mt-2 font-mono">{winRate}%</h3>
              <p className="text-[10px] text-slate-400 mt-2">
                {winningTradesCount} ganadas / {losingTradesCount} pérdidas
              </p>
            </div>
          </div>

          {/* Charts and Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-between h-[380px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-bold text-lg text-white">Historial de Rendimiento</h4>
                  <p className="text-xs text-slate-400">Rentabilidad acumulada del bot ({timeframe})</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-900">
                  {[
                    { id: "1D", label: "Día" },
                    { id: "1W", label: "Semana" },
                    { id: "1M", label: "Mes" },
                    { id: "1Y", label: "Año" },
                  ].map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setTimeframe(tf.id as TimeFrame)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition active:scale-95 ${
                        timeframe === tf.id
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
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
                {trades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Coins className="text-slate-600 mb-2" size={32} />
                    <p className="text-xs text-slate-400 font-medium">Sin operaciones registradas aún.</p>
                    <p className="text-[10px] text-slate-500 mt-1">Lanza tu primera estrategia cuántica desde el Módulo de Inversión.</p>
                  </div>
                ) : (
                  trades.map((trade) => (
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
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
