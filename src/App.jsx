import React, { useState, useEffect } from 'react';
import { FarmProvider, useFarm } from './context/FarmContext';
import { Sidebar } from './components/Sidebar/Sidebar';
import { CashFlowDashboard } from './components/CashFlow/CashFlowDashboard';
import { GoalManager } from './components/Goals/GoalManager';
import { ProfitSplitView } from './components/OwnerProfitSplit/ProfitSplitView';
import { MemberManager } from './components/Members/MemberManager';
import { CompanyPanel } from './components/Company/CompanyPanel';
import { CreateCompanyModal } from './components/Company/CreateCompanyModal';
import { TransactionFormModal } from './components/CashFlow/TransactionFormModal';
import { SubmitDeliveryModal } from './components/Deliveries/SubmitDeliveryModal';
import { DiscordSettingsModal } from './components/Discord/DiscordSettingsModal';
import { EditProfileModal } from './components/Accounts/EditProfileModal';
import { DatabaseStatusModal } from './components/Database/DatabaseStatusModal';
import { LoginScreen } from './components/Auth/LoginScreen';
import { formatDols } from './utils/formatters';
import { 
  Bell, 
  PlusCircle, 
  Wheat, 
  Menu, 
  X, 
  Lock,
  Database
} from 'lucide-react';

function AppLayout() {
  const [activeTab, setActiveTab] = useState('goals');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { 
    totalBalance, 
    myPendingDeliveries, 
    currentUser, 
    currentRole,
    currentCompany,
    discordSettings,
    dbStatus
  } = useFarm();

  const isMaster = currentRole === 'master';
  const isLeader = currentRole === 'owner' || isMaster;
  const pendingCount = myPendingDeliveries.length;

  // Se o usuário for master, garante que sua visão inicial/padrão seja o Painel de Empresas
  useEffect(() => {
    if (isMaster && activeTab !== 'company') {
      setActiveTab('company');
    }
  }, [isMaster]);

  // Se o usuário não for líder/master e tentar acessar o Painel da Empresa, redireciona para metas
  useEffect(() => {
    if (activeTab === 'company' && !isLeader) {
      setActiveTab('goals');
    }
    // Backward compatibility if someone had old tabs saved
    if ((activeTab === 'profit' || activeTab === 'members')) {
      setActiveTab(isLeader ? 'company' : 'goals');
    }
  }, [activeTab, isLeader]);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'cashflow':
        return {
          title: `Fluxo de Caixa • ${currentCompany?.name}`,
          subtitle: `Histórico de Entradas, Saídas e Saldo em DOLS de ${currentCompany?.name}`,
        };
      case 'goals':
        return {
          title: `Metas & Entregas • ${currentCompany?.name}`,
          subtitle: `Metas de ${currentCompany?.unitLabel} e Validação Operacional`,
        };
      case 'company':
        return {
          title: 'Painel Master de Empresas',
          subtitle: 'Holding Pantaneiros • Controle de todos os negócios, lucros e conexões',
        };
      default:
        return {
          title: currentCompany?.name || 'Fazenda Pantaneiros',
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
              onOpenEditProfile={() => {
                setIsEditProfileOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onOpenDatabaseSettings={() => {
                setIsDbModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onOpenCreateCompany={() => {
                setIsCreateCompanyOpen(true);
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
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
          onOpenDatabaseSettings={() => setIsDbModalOpen(true)}
          onOpenCreateCompany={() => setIsCreateCompanyOpen(true)}
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold animate-pulse shadow-sm cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-amber-700" />
                <span>{pendingCount} entrega{pendingCount > 1 ? 's' : ''} p/ validar!</span>
              </button>
            )}

            {/* Quick Inform Delivery */}
            <button
              onClick={() => setIsDeliveryModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6d3f23] hover:bg-[#54301b] text-white font-bold text-xs shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{currentCompany?.icon || '🌾'}</span>
              <span>Entregar {currentCompany?.unitLabel?.split(' ')[0] || 'Produção'}</span>
            </button>

            {/* Quick Add DOLS */}
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Lançar DOLS</span>
            </button>

            {/* Current user mini badge (Click to edit profile & PIN) */}
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="flex items-center gap-2.5 pl-3 border-l border-stone-200 hover:opacity-85 transition-opacity text-left cursor-pointer group"
              title="Clique para editar seu Perfil e PIN"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-base shadow-inner group-hover:scale-105 transition-transform">
                {currentUser.avatar}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-stone-900 leading-tight flex items-center gap-1">
                  <span>{currentUser.name}</span>
                </div>
                <div className="text-[10px] text-ouro-700 font-semibold">{currentUser.roleLabel}</div>
              </div>
            </button>

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

          {activeTab === 'company' && (
            isLeader ? (
              <CompanyPanel
                onOpenDiscordSettings={() => setIsDiscordModalOpen(true)}
                onOpenDatabaseSettings={() => setIsDbModalOpen(true)}
                onOpenCreateCompany={() => setIsCreateCompanyOpen(true)}
              />
            ) : (
              <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-sm">
                <Lock className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-stone-800">Acesso Exclusivo para o Dono</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  O Painel da Empresa é reservado exclusivamente para os proprietários da Fazenda Pantaneiros.
                </p>
              </div>
            )
          )}
        </main>

        {/* Clean Footer */}
        <footer className="border-t border-stone-200 bg-white py-4 px-8 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800">{currentCompany?.icon} {currentCompany?.name}</span>
            <span>•</span>
            <span>{currentCompany?.code} • Holding Pantaneiros</span>
          </div>
          <div className="font-mono text-[11px] text-stone-400">
            Valores em DOLS & {currentCompany?.unitLabel}
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

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      <DatabaseStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
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
