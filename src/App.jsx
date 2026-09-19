import React, { useState, useEffect } from 'react';
import { FarmProvider, useFarm } from './context/FarmContext';
import { Sidebar } from './components/Sidebar/Sidebar';
import { CashFlowDashboard } from './components/CashFlow/CashFlowDashboard';
import { GoalManager } from './components/Goals/GoalManager';
import { ProfitSplitView } from './components/OwnerProfitSplit/ProfitSplitView';
import { MemberManager } from './components/Members/MemberManager';
import { TransactionFormModal } from './components/CashFlow/TransactionFormModal';
import { SubmitDeliveryModal } from './components/Deliveries/SubmitDeliveryModal';
import { DiscordSettingsModal } from './components/Discord/DiscordSettingsModal';
import { LoginScreen } from './components/Auth/LoginScreen';
import { formatDols } from './utils/formatters';
import { 
  Bell, 
  PlusCircle, 
  Wheat, 
  Menu,
  X,
  Lock
} from 'lucide-react';

function AppLayout() {
  const [activeTab, setActiveTab] = useState('goals');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { 
    totalBalance, 
    myPendingDeliveries, 
    currentUser, 
    currentRole,
    discordSettings
  } = useFarm();

  const isLeader = currentRole === 'owner';
  const pendingCount = myPendingDeliveries.length;

  // Se o usuário não for líder e tentar acessar a repartição de lucros, redireciona
  useEffect(() => {
    if (activeTab === 'profit' && !isLeader) {
      setActiveTab('goals');
    }
  }, [activeTab, isLeader]);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'cashflow':
        return {
          title: 'Fluxo de Caixa & Lançamentos',
          subtitle: 'Histórico de Entradas, Saídas e Saldo Oficial em DOLS',
        };
      case 'goals':
        return {
          title: 'Painel de Metas & Entrega de Sacas',
          subtitle: 'Metas de 100 Sacas de Milho e Validação com o Gerente',
        };
      case 'profit':
        return {
          title: 'Repartição de Lucros da Fazenda',
          subtitle: 'Exclusivo para Líderes • Divisão de Lucro Líquido Real',
        };
      case 'members':
        return {
          title: 'Gestão de Contas: Gerentes & Membros',
          subtitle: 'Cadastre novas contas e gerencie os integrantes da Fazenda Pantaneiros',
        };
      default:
        return {
          title: 'Fazenda Pantaneiros',
          subtitle: 'Painel Integrado de Gestão',
        };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <div className="min-h-screen bg-[#fbfaf6] flex flex-col md:flex-row text-stone-800 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="/logo_pantaneiros.jpg"
            alt="Logo"
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-ouro-500/30"
          />
          <div>
            <div className="text-sm font-extrabold uppercase text-stone-900 tracking-wider">
              Pantaneiros
            </div>
            <div className="text-[10px] text-ouro-600 font-semibold">WEST FOX</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-bold text-stone-900 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200">
            {formatDols(totalBalance)}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-stone-100 text-stone-700"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/40 backdrop-blur-sm">
          <div className="w-72 h-full bg-white">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsMobileMenuOpen(false);
              }}
              onOpenNewTransaction={() => {
                setIsTxModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onOpenSubmitDelivery={() => {
                setIsDeliveryModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onOpenDiscordSettings={() => {
                setIsDiscordModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Menu na Lateral Esquerda Estilo UI/UX Clean) */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenNewTransaction={() => setIsTxModalOpen(true)}
          onOpenSubmitDelivery={() => setIsDeliveryModalOpen(true)}
          onOpenDiscordSettings={() => setIsDiscordModalOpen(true)}
        />
      </div>

      {/* Main Right Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-stone-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
              <span>{pageInfo.title}</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">{pageInfo.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Pending validation notification pill */}
            {pendingCount > 0 && (
              <button
                onClick={() => setActiveTab('goals')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold animate-pulse shadow-sm"
              >
                <Bell className="w-3.5 h-3.5 text-amber-700" />
                <span>{pendingCount} entrega{pendingCount > 1 ? 's' : ''} p/ validar!</span>
              </button>
            )}

            {/* Quick Inform Delivery */}
            <button
              onClick={() => setIsDeliveryModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6d3f23] hover:bg-[#54301b] text-white font-bold text-xs shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <Wheat className="w-3.5 h-3.5 text-ouro-300" />
              <span>Entregar Sacas</span>
            </button>

            {/* Quick Add DOLS */}
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Lançar DOLS</span>
            </button>

            {/* Discord Webhook Config (Leader Only) */}
            {isLeader && (
              <button
                onClick={() => setIsDiscordModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] font-bold text-xs border border-[#5865F2]/25 shadow-sm transition-all transform hover:-translate-y-0.5"
                title="Configurar Logs Automáticos no Discord"
              >
                <span>🎮</span>
                <span className="hidden xl:inline">Discord</span>
                <span className={`w-2 h-2 rounded-full ${discordSettings?.webhookUrl ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
              </button>
            )}

            {/* Current user mini badge */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-stone-200">
              <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-base shadow-inner">
                {currentUser.avatar}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-stone-900 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-ouro-700 font-semibold">{currentUser.roleLabel}</div>
              </div>
            </div>

          </div>
        </header>

        {/* Tab Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'cashflow' && (
            <CashFlowDashboard onOpenNewTransaction={() => setIsTxModalOpen(true)} />
          )}

          {activeTab === 'goals' && (
            <GoalManager onOpenSubmitDelivery={() => setIsDeliveryModalOpen(true)} />
          )}

          {activeTab === 'profit' && (
            isLeader ? (
              <ProfitSplitView />
            ) : (
              <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-sm">
                <Lock className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-stone-800">Acesso Exclusivo para Líderes</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  A repartição de lucros da Fazenda Pantaneiros é reservada exclusivamente para o Dono e liderança.
                </p>
              </div>
            )
          )}

          {activeTab === 'members' && <MemberManager />}
        </main>

        {/* Clean Footer */}
        <footer className="border-t border-stone-200 bg-white py-4 px-8 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800">🌾 Fazenda Pantaneiros</span>
            <span>•</span>
            <span>West Fox • Correio 82 • Tradição do Campo</span>
          </div>
          <div className="font-mono text-[11px] text-stone-400">
            Valores em DOLS & Sacas de Milho
          </div>
        </footer>

      </div>

      {/* Global Modals */}
      <TransactionFormModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
      />

      <SubmitDeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      <DiscordSettingsModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
      />

    </div>
  );
}

function MainApp() {
  const { isAuthenticated } = useFarm();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <FarmProvider>
      <MainApp />
    </FarmProvider>
  );
}
