import React from 'react';
import { useFarm } from '../context/FarmContext';
import { formatDols } from '../utils/formatters';
import { 
  DollarSign, 
  UserCheck, 
  RotateCcw, 
  PlusCircle, 
  ShieldAlert, 
  TrendingUp,
  Sparkles
} from 'lucide-react';

export function Navbar({ onOpenNewTransaction, activeTab, setActiveTab }) {
  const { 
    totalBalance, 
    currentUser, 
    currentRole, 
    setCurrentUserId, 
    members,
    refreshDbConnection
  } = useFarm();

  const handleSync = async () => {
    if (refreshDbConnection) {
      await refreshDbConnection();
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return {
          label: '👑 Visão Dono',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        };
      case 'manager':
        return {
          label: '👔 Visão Gerente',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        };
      default:
        return {
          label: '🌾 Visão Membro',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        };
    }
  };

  const roleInfo = getRoleBadge(currentRole);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Farm Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-900/30 text-2xl ring-2 ring-emerald-400/20">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-wider text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-200 to-amber-300">
                  Fazenda Pantaneiros
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RP & Gestão
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Fluxo de Caixa • Metas em Cascata • Repartição de Lucros
              </p>
            </div>
          </div>

          {/* Center Box Highlight - CAIXA DA FAZENDA */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-emerald-500/30 shadow-inner">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Total no Caixa da Fazenda
              </div>
              <div className="text-lg font-mono font-extrabold text-emerald-400 flex items-center gap-1.5">
                {formatDols(totalBalance)}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action: User Role Simulation & Actions */}
          <div className="flex items-center gap-3">
            
            {/* User Switcher (Dono / Gerente / Membro) */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">Simulando:</span>
                <select
                  value={currentUser.id}
                  onChange={(e) => setCurrentUserId(e.target.value)}
                  className="bg-slate-800 text-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.avatar} {m.name} ({m.role === 'owner' ? 'Dono' : m.role === 'manager' ? 'Gerente' : 'Membro'})
                    </option>
                  ))}
                </select>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 mt-1 rounded-full border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Novo Lançamento</span>
            </button>

            {/* Sincronização em Nuvem */}
            <button
              onClick={handleSync}
              title="Sincronizar em tempo real com o banco de dados Supabase"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 border border-slate-700/50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 py-2 border-t border-slate-800/60 overflow-x-auto scrollbar-none text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'cashflow'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            📊 Fluxo de Caixa & Extrato
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'goals'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            🎯 Gestão de Metas ({currentRole === 'owner' ? 'Dono &rarr; Gerente' : currentRole === 'manager' ? 'Gerente &rarr; Membro' : 'Minhas Metas'})
          </button>

          {/* Owner Tab - Profit Split */}
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'profit'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-slate-400 hover:text-amber-200 hover:bg-slate-800/60'
            }`}
          >
            <span>👑 Repartição de Lucros</span>
            {currentRole === 'owner' && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/30 text-amber-200">
                Visão Dono
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'members'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            👥 Equipe & Ranking
          </button>
        </div>
      </div>
    </header>
  );
}
