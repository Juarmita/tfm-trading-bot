import React from "react";
import {
  TrendingUp,
  Play,
  Square,
  Settings,
  Activity,
  Wallet,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-md flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider">TFM BOT</h1>
              <p className="text-xs text-slate-400">Trading Algorítmico</p>
            </div>
          </div>

          <nav className="space-y-1">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium"
            >
              <Activity size={18} />
              <span>Panel de Control</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition"
            >
              <Wallet size={18} />
              <span>Cartera y Fondos</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition"
            >
              <Settings size={18} />
              <span>Configuración</span>
            </a>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-200">
              JM
            </div>
            <div>
              <p className="text-sm font-semibold">Juan Manuel G.</p>
              <p className="text-xs text-slate-500">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-800 px-8 py-4 bg-slate-900/30 backdrop-blur-md flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Estado del Bot</h2>
            <p className="text-xs text-slate-400">Actualizado hace unos segundos</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg shadow-lg shadow-emerald-500/20 transition">
              <Play size={16} fill="currentColor" />
              <span>Iniciar Bot</span>
            </button>
            <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 font-bold px-4 py-2 rounded-lg transition border border-slate-700">
              <Square size={16} fill="currentColor" />
              <span>Detener</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 space-y-8 flex-1">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl"></div>
              <p className="text-sm text-slate-400 font-medium">Rentabilidad Total</p>
              <h3 className="text-2xl font-bold mt-2 text-emerald-400">+14.65%</h3>
              <div className="flex items-center gap-1 text-xs text-emerald-500 mt-2">
                <ArrowUpRight size={14} />
                <span>+2.4% esta semana</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl"></div>
              <p className="text-sm text-slate-400 font-medium">Balance de Cuenta</p>
              <h3 className="text-2xl font-bold mt-2">$24,850.00</h3>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                <span>Supabase Main Wallet</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full filter blur-xl"></div>
              <p className="text-sm text-slate-400 font-medium">Operaciones Ganadoras</p>
              <h3 className="text-2xl font-bold mt-2">68.4%</h3>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                <span>74 ganadas / 34 perdidas</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full filter blur-xl"></div>
              <p className="text-sm text-slate-400 font-medium">Estado de Conexión</p>
              <h3 className="text-2xl font-bold mt-2 text-emerald-400">ACTIVO</h3>
              <div className="flex items-center gap-1 text-xs text-emerald-500 mt-2">
                <RefreshCw size={12} className="animate-spin" />
                <span>Conectado a FastAPI</span>
              </div>
            </div>
          </div>

          {/* Charts and Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area Mock */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-between h-[380px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-lg">Historial de Rendimiento</h4>
                  <p className="text-xs text-slate-400">Rentabilidad acumulada del bot</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded bg-slate-800 text-xs font-semibold text-slate-200">1D</button>
                  <button className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-semibold">1W</button>
                  <button className="px-3 py-1 rounded bg-slate-800 text-xs font-semibold text-slate-200">1M</button>
                </div>
              </div>

              {/* Graphic Mock */}
              <div className="flex-1 w-full bg-slate-950/50 rounded-lg border border-slate-800/80 p-4 flex flex-col justify-end relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <TrendingUp size={120} />
                </div>
                <div className="h-full w-full flex items-end justify-between gap-1 pt-6">
                  {/* Visual wave columns simulation */}
                  <div className="bg-slate-800 w-[8%] h-[30%] rounded-t"></div>
                  <div className="bg-slate-800 w-[8%] h-[42%] rounded-t"></div>
                  <div className="bg-slate-800 w-[8%] h-[38%] rounded-t"></div>
                  <div className="bg-emerald-500/30 w-[8%] h-[48%] rounded-t"></div>
                  <div className="bg-emerald-500/50 w-[8%] h-[55%] rounded-t"></div>
                  <div className="bg-emerald-500/40 w-[8%] h-[50%] rounded-t"></div>
                  <div className="bg-emerald-500/60 w-[8%] h-[68%] rounded-t"></div>
                  <div className="bg-emerald-500/80 w-[8%] h-[72%] rounded-t"></div>
                  <div className="bg-emerald-500 w-[8%] h-[85%] rounded-t shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
                </div>
              </div>
            </div>

            {/* Live Activities / Orders */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col h-[380px]">
              <h4 className="font-bold text-lg mb-4">Últimas Operaciones</h4>
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-slate-800/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded">COMPRA</span>
                      <span className="font-semibold text-sm">BTC/USDT</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Precio: $64,250.00</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-100">+0.015 BTC</p>
                    <p className="text-xs text-slate-400 mt-1">Hace 2m</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-slate-800/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-red-500/10 text-red-400 font-bold px-1.5 py-0.5 rounded">VENTA</span>
                      <span className="font-semibold text-sm">ETH/USDT</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Precio: $3,450.00</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-100">-0.50 ETH</p>
                    <p className="text-xs text-slate-400 mt-1">Hace 15m</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-slate-800/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded">COMPRA</span>
                      <span className="font-semibold text-sm">SOL/USDT</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Precio: $142.10</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-100">+5.20 SOL</p>
                    <p className="text-xs text-slate-400 mt-1">Hace 1h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
