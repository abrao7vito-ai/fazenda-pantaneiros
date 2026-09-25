import React from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols } from '../../utils/formatters';
import { CompanySwitcher } from '../Company/CompanySwitcher';
import { 
  LayoutDashboard, 
  Target, 
  Crown, 
  Users, 
  PlusCircle, 
  TrendingUp, 
  Sparkles,
  Wheat, 
  Lock, 
  LogOut, 
  Clock, 
  Key, 
  ShieldCheck, 
  Database,
  Building2,
  Compass
} from 'lucide-react';

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  onOpenNewTransaction,
  onOpenSubmitDelivery,
  onOpenDiscordSettings,
  onOpenEditProfile,
  onOpenDatabaseSettings,
  onOpenCreateCompany,
}) {
  const { 
    totalBalance, 
    currentUser, 
    currentRole, 
    members, 
    myPendingDeliveries, 
    logout,
    minutesRemaining,
    currentCompany,
  } = useFarm();

  const isMaster = currentRole === 'master';
  const isLeader = currentRole === 'owner' || isMaster;
  const pendingCount = myPendingDeliveries.length;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'master':
        return {
          label: '⚡ Master Holding',
          badge: 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold',
        };
      case 'owner':
        return {
          label: '👑 Líder / Dono',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'manager':
        return {
          label: '👔 Gerente Geral',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      default:
        return {
          label: '🌾 Membro Produtor',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
    }
  };

  const roleBadge = getRoleBadge(currentRole);

  // Nav items: Se for Master, o Painel de Empresas / Holding vem em primeiro lugar no menu!
  const navItems = isMaster
    ? [
        {
          id: 'company',
          label: 'Gestão de Empresas',
          subtitle: 'Criar, Gerenciar & Holding',
          icon: Building2,
          badge: '⚡ Master',
          badgeColor: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
        },
        {
          id: 'routes',
          label: 'Rotas & Missões',
          subtitle: 'Checklist de Cargas',
          icon: Compass,
          badge: 'Checklist',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
        },
        {
          id: 'goals',
          label: 'Metas & Entregas',
          subtitle: `${currentCompany?.unitLabel || 'Produção'} & Validação`,
          icon: Target,
          badge: pendingCount > 0 ? `${pendingCount} Pendente` : null,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse',
        },
        {
          id: 'cashflow',
          label: 'Fluxo de Caixa',
          subtitle: 'Lançamentos em DOLS',
          icon: LayoutDashboard,
          badge: null,
        },
      ]
    : [
        {
          id: 'routes',
          label: 'Rotas & Missões',
          subtitle: 'Checklist de Cargas',
          icon: Compass,
          badge: 'Checklist',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
        },
        {
          id: 'goals',
          label: 'Metas & Entregas',
          subtitle: `${currentCompany?.unitLabel || 'Produção'} & Validação`,
          icon: Target,
          badge: pendingCount > 0 ? `${pendingCount} Pendente` : null,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse',
        },
        {
          id: 'cashflow',
          label: 'Fluxo de Caixa',
          subtitle: 'Lançamentos em DOLS',
          icon: LayoutDashboard,
          badge: null,
        },
        ...(isLeader
          ? [
              {
                id: 'company',
                label: 'Painel da Empresa',
                subtitle: 'Lucros, Equipe & Conexões',
                icon: Building2,
                badge: '👑 Dono',
                badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
              },
            ]
          : []),
      ];

  return (
    <aside className="w-72 bg-white border-r border-stone-200/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto select-none shadow-sm">
      
      {/* Top Branding Section with Dynamic Company Logo & WestBaron Fallback */}
      <div>
        <div className="p-4 border-b border-stone-200/80 bg-[#fbfaf6]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                key={currentCompany?.id || 'company-logo'}
                src={currentCompany?.logoUrl || '/logo_westbaron.svg'}
                alt={currentCompany?.name || 'WestBaron'}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/logo_westbaron.svg';
                }}
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-ouro-500/30 shadow-md border border-stone-200 bg-stone-900"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-[10px]">
                {currentCompany?.icon || '🏛️'}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-extrabold tracking-wide text-stone-900 uppercase truncate" title={currentCompany?.name}>
                {currentCompany?.name || 'WestBaron'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold text-pantanal-700 uppercase tracking-widest px-1.5 py-0.2 rounded bg-pantanal-100/80 border border-pantanal-200 shrink-0">
                  {currentCompany?.code ? currentCompany.code.split('•')[0].trim() : 'WEST FOX'}
                </span>
                <span className="text-[10px] text-stone-500 font-medium truncate" title={currentCompany?.slogan || currentCompany?.code || 'Holding'}>
                  {currentCompany?.slogan || currentCompany?.code || 'Holding'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Multi-Company Switcher */}
        <div className="px-3 pt-3">
          <CompanySwitcher onOpenCreateCompany={onOpenCreateCompany} />
        </div>

        {/* Live Active Company Box Clean Card */}
        <div className="p-4 mx-3 mt-3 rounded-2xl bg-[#f8f6f0] border border-ouro-500/30 shadow-card">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-stone-500 tracking-wider">
            <span className="flex items-center gap-1.5 text-stone-700 truncate">
              <TrendingUp className="w-3.5 h-3.5 text-pantanal-600 shrink-0" />
              <span className="truncate">Caixa {currentCompany?.name?.split(' ')[0]}</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-semibold shrink-0">
              Ativo
            </span>
          </div>
          <div className="text-xl font-mono font-extrabold text-stone-900 mt-1.5">
            {formatDols(totalBalance)}
          </div>
          <div className="text-[10px] text-stone-500 mt-1 flex items-center justify-between">
            <span className="truncate">Saldo em Caixa</span>
            <button
              onClick={onOpenNewTransaction}
              className="text-[10px] text-ouro-600 hover:text-ouro-700 font-bold flex items-center gap-0.5 underline decoration-ouro-500/40 shrink-0"
            >
              + Lançar
            </button>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="px-3 mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Lançar DOLS</span>
          </button>

          <button
            onClick={onOpenSubmitDelivery}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#6d3f23] hover:bg-[#54301b] text-white font-bold text-xs shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer truncate"
            title={`Registrar entrega de ${currentCompany?.unitLabel}`}
          >
            <span className="text-xs">{currentCompany?.icon || '🌾'}</span>
            <span className="truncate">Entregar</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 mt-2">
          <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
            Navegação Principal
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-amber-50 text-stone-900 font-bold border border-ouro-500/30 shadow-card'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-ouro-500/20 text-ouro-700'
                        : 'bg-stone-100 text-stone-500 group-hover:text-stone-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-stone-400 font-normal">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Switcher & Reset */}
      <div className="p-3 border-t border-stone-200/80 bg-[#fbfaf6] space-y-3">
        
        {/* Active Profile Info */}
        <div className="p-3 rounded-2xl bg-white border border-stone-200/90 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
              Operando Como
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadge.badge}`}>
              {roleBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-lg shadow-inner">
              {currentUser?.avatar || '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-stone-900 truncate">{currentUser?.name || 'Usuário'}</div>
              <div className="text-[10px] text-stone-500 truncate">{currentUser?.roleLabel || 'Membro'}</div>
            </div>
          </div>

          {/* Edit Profile & Security button */}
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
            <button
              onClick={onOpenEditProfile}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold transition-colors shadow-xs"
            >
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span>Editar Perfil & PIN</span>
            </button>
          </div>
        </div>

        {/* Inactivity Security Badge & Logout Button */}
        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-stone-500 bg-stone-100/80 px-2.5 py-1.5 rounded-xl border border-stone-200">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Inativo em ~{minutesRemaining} min</span>
            </span>
            <span className="text-[9px] font-bold text-stone-400">15 min max</span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Deseja desconectar sua conta agora?')) {
                logout('user');
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-200 text-xs font-bold transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair / Desconectar</span>
          </button>
        </div>

        {/* System security status footer */}
        <div className="flex items-center justify-between text-[10px] text-stone-400 px-1 pt-1 font-mono">
          <span>🏛️ WestBaron OS</span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Protegido</span>
          </span>
        </div>

      </div>

    </aside>
  );
}
