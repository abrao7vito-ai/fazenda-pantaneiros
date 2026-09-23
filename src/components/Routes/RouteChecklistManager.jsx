import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols } from '../../utils/formatters';
import { 
  Compass, 
  Package, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Sparkles, 
  Send, 
  RotateCcw, 
  DollarSign, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Play, 
  Check, 
  AlertCircle,
  Truck,
  TrendingUp,
  Zap,
  AlertTriangle,
  Warehouse,
  Edit3,
  Trash2,
  X,
  Save,
  Settings
} from 'lucide-react';

function getAnimalRouteMetrics(route) {
  const items = route.items || [];
  if (items.length === 0) return { totalRoutesReady: 0, itemMetrics: [], bottleneckItem: null, neededForNext: 0 };

  const itemMetrics = items.map((it) => {
    const perRoute = Number(it.perRoute || (it.targetAmount >= 2000 ? 100 : it.targetAmount >= 400 ? 20 : 20));
    const current = Number(it.currentAmount || 0);
    const routesPossible = Math.floor(current / perRoute);
    return {
      ...it,
      perRoute,
      routesPossible,
    };
  });

  const totalRoutesReady = Math.min(...itemMetrics.map((i) => i.routesPossible));

  let bottleneckItem = null;
  let neededForNext = 0;

  const notReadyItems = itemMetrics
    .map((i) => ({
      ...i,
      needed: ((totalRoutesReady + 1) * i.perRoute) - Number(i.currentAmount || 0),
    }))
    .filter((i) => i.needed > 0);

  if (notReadyItems.length > 0) {
    notReadyItems.sort((a, b) => a.needed - b.needed);
    bottleneckItem = notReadyItems[0];
    neededForNext = bottleneckItem.needed;
  }

  return { totalRoutesReady, itemMetrics, bottleneckItem, neededForNext };
}

export function RouteChecklistManager() {
  const { 
    routes, 
    allRoutes,
    startRoute, 
    updateRouteItem, 
    completeRoute, 
    resetRoute, 
    addCustomRoute,
    updateCustomRoute,
    deleteCustomRoute,
    dispatchRouteBatch,
    currentCompany,
    currentRole,
    currentUser,
    discordSettings,
    refreshDbConnection,
    dbStatus
  } = useFarm();

  const isMaster = currentRole === 'master';
  const userCompanyId = currentCompany?.id || currentUser?.companyId || 'comp-fazenda';

  const [companyFilter, setCompanyFilter] = useState(isMaster ? 'all' : userCompanyId);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'all'
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [itemInputs, setItemInputs] = useState({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Sync companyFilter if not master
  React.useEffect(() => {
    if (!isMaster) {
      setCompanyFilter(userCompanyId);
    }
  }, [isMaster, userCompanyId]);

  // New route state
  const [newTitle, setNewTitle] = useState('');
  const [newReward, setNewReward] = useState('2500');
  const [newIcon, setNewIcon] = useState('🚂');
  const [newDesc, setNewDesc] = useState('');
  const [newItemsText, setNewItemsText] = useState('15x Saco de café\n15x Saco de Amora\n15x Saco de algodão\n15x Saco de Milho\n400x Garrafas de Leite');

  // Edit route state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editReward, setEditReward] = useState('2500');
  const [editIcon, setEditIcon] = useState('📦');
  const [editDesc, setEditDesc] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [editItems, setEditItems] = useState([]);

  const isLeader = currentRole === 'owner' || currentRole === 'manager' || currentRole === 'master';

  const availableRoutes = isMaster
    ? ((allRoutes && allRoutes.length > 0) ? allRoutes : (routes || []))
    : (routes || []);

  const filteredRoutes = availableRoutes.filter((r) => {
    if (!r) return false;
    if (companyFilter !== 'all') {
      const rComp = r.companyId || 'comp-fazenda';
      if (rComp !== companyFilter) return false;
    }
    if (activeTab === 'active') return r.status === 'in_progress' || r.status === 'template';
    if (activeTab === 'completed') return r.status === 'completed';
    return true;
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      if (refreshDbConnection) await refreshDbConnection();
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Erro na sincronização manual:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleQuickAdd = (routeId, itemId, amount) => {
    setItemInputs((prev) => {
      const next = { ...prev };
      delete next[`${routeId}-${itemId}`];
      return next;
    });
    const res = updateRouteItem(routeId, itemId, { addQuantity: amount });
    if (res && res.success === false) {
      alert(`⚠️ ${res.error || 'Não foi possível atualizar o estoque.'}`);
    }
  };

  const handleToggleComplete = (routeId, itemId, currentStatus) => {
    setItemInputs((prev) => {
      const next = { ...prev };
      delete next[`${routeId}-${itemId}`];
      return next;
    });
    const res = updateRouteItem(routeId, itemId, { markCompleted: !currentStatus });
    if (res && res.success === false) {
      alert(`⚠️ ${res.error || 'Não foi possível alterar o status.'}`);
    }
  };

  const handleSetQuantity = (routeId, itemId, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    // Limpa rascunho local para que exiba imediatamente o estado do servidor/contexto
    setItemInputs((prev) => {
      const next = { ...prev };
      delete next[`${routeId}-${itemId}`];
      return next;
    });
    const res = updateRouteItem(routeId, itemId, { setQuantity: num });
    if (res && res.success === false) {
      alert(`⚠️ ${res.error || 'Não foi possível atualizar o estoque.'}`);
      return;
    }
  };

  const handleCustomAdd = (routeId, itemId) => {
    const val = parseFloat(itemInputs[`${routeId}-${itemId}`]);
    if (isNaN(val) || val <= 0) return;
    const res = updateRouteItem(routeId, itemId, { addQuantity: val });
    if (res && res.success === false) {
      alert(`⚠️ ${res.error || 'Não foi possível adicionar quantidade.'}`);
      return;
    }
    setItemInputs((prev) => {
      const next = { ...prev };
      delete next[`${routeId}-${itemId}`];
      return next;
    });
  };

  const handleDispatchBatch = (routeId, batchCount = 1) => {
    const route = availableRoutes.find((r) => r.id === routeId);
    if (!route) return;

    const reward = (Number(route.rewardAmount) || 4600) * batchCount;
    if (!window.confirm(`Confirmar despacho de ${batchCount} Rota(s) de Animais?\n\n• Debita materiais do estoque (-${20 * batchCount}x queijos/manteiga, -${100 * batchCount}x leites/ovos/chá)\n• Credita +$ ${reward.toLocaleString('pt-BR')} DOLS no caixa da ${currentCompany?.name}!`)) {
      return;
    }

    const res = dispatchRouteBatch(routeId, batchCount);
    if (!res.success) {
      alert(res.message);
    } else {
      alert(`🎉 Viagem despachada com sucesso!\n\n+$ ${res.rewardEarned.toLocaleString('pt-BR')} creditados no caixa.\nRestam estoque para mais ${res.remainingRoutes} rota(s) pronta(s).`);
    }
  };

  // Edit Route Handlers
  const handleOpenEdit = (route) => {
    setEditingRoute(route);
    setEditTitle(route.title || '');
    setEditReward(String(route.rewardAmount || 0));
    setEditIcon(route.icon || '📦');
    setEditDesc(route.description || '');
    setEditCompanyId(route.companyId || currentCompany?.id || 'comp-fazenda');
    setEditItems((route.items || []).map((it, idx) => ({
      id: it.id || `item-${Date.now()}-${idx}`,
      name: it.name || '',
      icon: it.icon || '📦',
      perRoute: Number(it.perRoute || (it.targetAmount >= 2000 ? 100 : it.targetAmount >= 400 ? 20 : 20)),
      targetAmount: Number(it.targetAmount || 10),
      currentAmount: Number(it.currentAmount || 0),
      unit: it.unit || 'un',
    })));
    setIsEditOpen(true);
  };

  const handleEditItemChange = (index, field, value) => {
    setEditItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddEditItem = () => {
    setEditItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        name: 'Novo Item',
        icon: '📦',
        perRoute: 20,
        targetAmount: 400,
        currentAmount: 0,
        unit: 'un',
      },
    ]);
  };

  const handleRemoveEditItem = (index) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditSubmit = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      alert('Informe o título da rota.');
      return;
    }
    if (editItems.length === 0) {
      alert('A rota precisa ter pelo menos 1 item exigido.');
      return;
    }

    const res = updateCustomRoute(editingRoute.id, {
      title: editTitle.trim(),
      rewardAmount: parseFloat(editReward) || 0,
      icon: editIcon || '📦',
      description: editDesc.trim(),
      companyId: editCompanyId || editingRoute.companyId,
      items: editItems.map((it) => {
        const targetAmount = Math.max(1, parseFloat(it.targetAmount) || 1);
        const perRoute = Math.max(1, parseFloat(it.perRoute) || 1);
        const currentAmount = Math.max(0, parseFloat(it.currentAmount) || 0);
        return {
          ...it,
          name: it.name.trim() || 'Item',
          targetAmount,
          perRoute,
          currentAmount,
          completed: currentAmount >= targetAmount,
        };
      }),
    });

    if (res && res.success === false) {
      alert(`⚠️ ${res.error || 'Não foi possível atualizar a rota.'}`);
      return;
    }

    setIsEditOpen(false);
    setEditingRoute(null);
    alert('Rota atualizada com sucesso e sincronizada com a nuvem!');
  };

  const handleDeleteRoute = (routeId, title) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR permanentemente a rota "${title}"?\n\nEsta ação não poderá ser revertida.`)) {
      const res = deleteCustomRoute(routeId);
      if (res && res.success === false) {
        alert(`⚠️ ${res.error || 'Não foi possível excluir a rota.'}`);
        return;
      }
      setIsEditOpen(false);
      setEditingRoute(null);
      alert('Rota excluída com sucesso.');
    }
  };


  const handleCreateRouteSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Informe o nome da rota/missão.');
      return;
    }

    // Parse items from multiline text
    const lines = newItemsText.split('\n').filter((l) => l.trim().length > 0);
    const parsedItems = lines.map((line, idx) => {
      // Look for format like "15x Saco de café" or "400 Leite"
      const match = line.match(/^(\d+)\s*[xX]?\s*(.+)$/);
      if (match) {
        return {
          id: `item-${Date.now()}-${idx}`,
          name: match[2].trim(),
          targetAmount: Number(match[1]),
          currentAmount: 0,
          completed: false,
          unit: 'un',
        };
      }
      return {
        id: `item-${Date.now()}-${idx}`,
        name: line.trim(),
        targetAmount: 10,
        currentAmount: 0,
        completed: false,
        unit: 'un',
      };
    });

    if (parsedItems.length === 0) {
      alert('Informe pelo menos 1 item para a rota.');
      return;
    }

    const res = addCustomRoute({
      title: newTitle,
      rewardAmount: parseFloat(newReward) || 0,
      icon: newIcon,
      description: newDesc,
      companyId: currentCompany?.id || 'comp-fazenda',
      items: parsedItems,
    });

    if (res && res.success === false) {
      alert(`⚠️ ${res.error || 'Não foi possível criar a rota.'}`);
      return;
    }

    setNewTitle('');
    setNewReward('2500');
    setNewDesc('');
    setIsCreateOpen(false);
    alert('Nova rota criada com sucesso e sincronizada com a nuvem!');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 text-white p-6 sm:p-8 shadow-xl border border-stone-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>ROTAS & CHECKLIST • {currentCompany?.name?.toUpperCase()}</span>
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {routes.length} Missões
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>{currentCompany?.icon || '🚂'}</span>
              <span>Checklist de Cargas & Entregas</span>
            </h2>

            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Aceite missões de entrega, confira a lista de itens exigidos e marque o progresso em tempo real.
              Cada atualização é sincronizada automaticamente no canal do Discord via Webhook!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Tempo Real Ativo</span>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="py-2 px-3 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700/70 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Forçar atualização manual imediata com o banco Supabase"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-stone-400'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Atualizar'}</span>
              {lastSyncTime && (
                <span className="text-[10px] text-stone-400 font-mono">({lastSyncTime})</span>
              )}
            </button>

            {isLeader && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Criar Nova Rota</span>
              </button>
            )}
          </div>
        </div>

        {/* Company & Status Filter Bars */}
        <div className="mt-6 pt-5 border-t border-stone-800 space-y-3">
          {/* 1. Empresa / Empreendimento Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-400 text-[11px] font-bold uppercase tracking-wider mr-1">Empresa:</span>
            {isMaster ? (
              <>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    companyFilter === 'all'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-stone-300'
                  }`}
                >
                  🌐 Todas as Empresas ({availableRoutes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('comp-fazenda')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    companyFilter === 'comp-fazenda'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-stone-300'
                  }`}
                >
                  🌾 Fazenda Pantaneiros ({availableRoutes.filter((r) => (r.companyId || 'comp-fazenda') === 'comp-fazenda').length})
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('comp-ferrovia')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    companyFilter === 'comp-ferrovia'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-stone-300'
                  }`}
                >
                  🚂 Ferrovia West Fox ({availableRoutes.filter((r) => r.companyId === 'comp-ferrovia').length})
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('comp-taverna')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    companyFilter === 'comp-taverna'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-stone-300'
                  }`}
                >
                  🍺 Taverna ({availableRoutes.filter((r) => r.companyId === 'comp-taverna').length})
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
                <span>{currentCompany?.icon || '🏢'}</span>
                <span>{currentCompany?.name || 'Sua Empresa'}</span>
                <span className="text-[10px] text-amber-400/80 font-normal ml-1">(Isolamento Exclusivo Ativo)</span>
              </div>
            )}
          </div>

          {/* 2. Status Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-400 text-[11px] font-bold uppercase tracking-wider mr-1">Status:</span>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-stone-400'
              }`}
            >
              Rotas Ativas ({availableRoutes.filter((r) => (companyFilter === 'all' || (r.companyId || 'comp-fazenda') === companyFilter) && (r.status === 'in_progress' || r.status === 'template')).length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-stone-400'
              }`}
            >
              Concluídas ({availableRoutes.filter((r) => (companyFilter === 'all' || (r.companyId || 'comp-fazenda') === companyFilter) && r.status === 'completed').length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-stone-400'
              }`}
            >
              Todas ({availableRoutes.filter((r) => companyFilter === 'all' || (r.companyId || 'comp-fazenda') === companyFilter).length})
            </button>
          </div>
        </div>
      </div>

      {/* Routes Grid: Cards with Exact In-Game Style */}
      {filteredRoutes.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-card max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Nenhuma rota ativa encontrada</h3>
          <p className="text-xs text-stone-500 mt-1">
            Clique no botão "+ Criar Nova Rota" acima para cadastrar a primeira rota ou selecione o filtro "Todas".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRoutes.map((route) => {
            const isAnimalRoute = (route.title || '').toLowerCase().includes('animal') || (route.id && route.id.includes('animal')) || (route.items || []).some((it) => it.perRoute);

            // ---------------------------------------------------------------
            // SE FOR A ROTA DE ANIMAIS: GESTÃO DE ESTOQUE & PRODUÇÃO (COCKPIT)
            // ---------------------------------------------------------------
            if (isAnimalRoute) {
              const metrics = getAnimalRouteMetrics(route);
              const { totalRoutesReady, bottleneckItem, neededForNext } = metrics;
              const isGoalReached = totalRoutesReady >= 20;

              return (
                <div
                  key={route.id}
                  className="bg-[#151312] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white flex flex-col justify-between transition-all hover:border-amber-400/70 relative overflow-hidden lg:col-span-2"
                >
                  {/* Background Ambient Glow */}
                  <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
                    isGoalReached ? 'bg-emerald-500/15' : totalRoutesReady >= 1 ? 'bg-amber-500/10' : 'bg-red-500/5'
                  }`} />

                  <div>
                    {/* Top Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-stone-800/80">
                      <div className="flex items-start gap-3.5">
                        <span className="text-3xl sm:text-4xl p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                          {route.icon || '🐄'}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                              <span>{route.companyId === 'comp-ferrovia' ? '🚂 Ferrovia West Fox' : route.companyId === 'comp-taverna' ? '🍺 Taverna' : '🌾 Fazenda Pantaneiros'}</span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Warehouse className="w-3 h-3 text-amber-400" />
                              <span>GESTÃO DE ESTOQUE • ROTA DE ANIMAIS</span>
                            </span>
                            {isGoalReached ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                🟢 Meta de 20 Rotas Completa
                              </span>
                            ) : totalRoutesReady >= 1 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                🟢 {totalRoutesReady} Viagens Disponíveis
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                                ⚠️ Estoque Insuficiente
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-stone-100 flex items-center gap-2">
                            <span>{route.title}</span>
                          </h3>
                          <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-2xl leading-relaxed">
                            {route.description || '1 Rota = 20x de cada queijo/manteiga e 100x de leites/ovos/chá. Produza estoque para 20 rotas ($ 4.600 por rota).'}
                          </p>
                        </div>
                      </div>

                      {/* Reward Tag & Actions */}
                      <div className="flex flex-col sm:items-end gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Recompensa / Rota</div>
                          <span className="font-mono font-black text-xl sm:text-2xl text-[#22c55e] tracking-tight bg-stone-900/90 border border-stone-800 px-4 py-2 rounded-2xl shadow-inner inline-block">
                            ${route.rewardAmount || 4600}
                          </span>
                          <div className="text-[10px] text-stone-500 mt-1 font-mono">Meta 20x = $ 92.000</div>
                        </div>
                        {isLeader && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(route)}
                            className="py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-stone-700/60"
                            title="Editar Parâmetros da Rota"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Editar Rota</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cockpit KPIs & Production Diagnosis */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                      
                      {/* KPI 1: Rotas Prontas no Estoque */}
                      <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs font-bold text-stone-400 mb-2">
                          <span className="flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-amber-400" />
                            <span>Rotas Prontas no Estoque:</span>
                          </span>
                          <span className="font-mono text-amber-400 font-extrabold text-sm">
                            {totalRoutesReady} de 20
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="text-2xl sm:text-3xl font-black font-mono text-stone-100 flex items-baseline gap-1.5">
                            <span className={totalRoutesReady >= 20 ? 'text-emerald-400' : totalRoutesReady >= 1 ? 'text-amber-400' : 'text-stone-400'}>
                              {totalRoutesReady}
                            </span>
                            <span className="text-xs font-bold text-stone-400 uppercase">rotas disponíveis</span>
                          </div>

                          <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                totalRoutesReady >= 20 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.round((totalRoutesReady / 20) * 100))}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-stone-400 flex justify-between font-mono">
                            <span>0</span>
                            <span>{Math.min(100, Math.round((totalRoutesReady / 20) * 100))}% da meta de 20 rotas</span>
                            <span>20</span>
                          </div>
                        </div>
                      </div>

                      {/* KPI 2: Diagnóstico de Gargalo & Próxima Rota */}
                      <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 flex flex-col justify-between">
                        <div className="text-xs font-bold text-stone-400 mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>Diagnóstico da Próxima Viagem:</span>
                        </div>

                        <div className="text-xs leading-relaxed">
                          {isGoalReached ? (
                            <div className="text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
                              🎉 <strong>Capacidade Máxima Atingida!</strong> O estoque possui material suficiente para 20 saídas de trem seguidas.
                            </div>
                          ) : bottleneckItem ? (
                            <div className="text-stone-300 bg-stone-950/80 p-2.5 rounded-xl border border-stone-800">
                              <span className="text-stone-400">Gargalo para liberar a rota </span>
                              <strong className="text-amber-400 font-mono font-black">#{totalRoutesReady + 1}</strong>:
                              <div className="mt-1 font-bold text-amber-300 flex items-center gap-1.5">
                                <span className="text-base">{bottleneckItem.icon || '📦'}</span>
                                <span>Faltam {neededForNext}x {bottleneckItem.name}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-stone-400">Calculando estoque...</div>
                          )}
                        </div>
                      </div>

                      {/* KPI 3: Painel de Despacho Rápido */}
                      <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 flex flex-col justify-between">
                        <div className="text-xs font-bold text-stone-400 mb-2 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          <span>Ação de Despacho Ferroviário:</span>
                        </div>

                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled={totalRoutesReady < 1}
                            onClick={() => handleDispatchBatch(route.id, 1)}
                            className={`w-full py-3 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                              totalRoutesReady >= 1
                                ? 'bg-[#2e6e3c] hover:bg-[#255a31] text-white cursor-pointer transform hover:-translate-y-0.5'
                                : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>🚀 DESPACHAR 1 ROTA (+${route.rewardAmount || 4600})</span>
                          </button>

                          <div className="flex items-center justify-between text-[10px] text-stone-400">
                            <span>Debita 1 kit do estoque</span>
                            <span>Credita no caixa</span>
                          </div>

                          {totalRoutesReady >= 5 && (
                            <button
                              type="button"
                              onClick={() => handleDispatchBatch(route.id, 5)}
                              className="w-full py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Zap className="w-3 h-3 fill-current" />
                              <span>⚡ Despachar 5 Rotas (+ ${(Number(route.rewardAmount) || 4600) * 5})</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Grid dos 9 Itens de Estoque */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-400">
                        <span>Estoque dos 9 Itens Exigidos (Meta de 20 Rotas):</span>
                        <span className="text-[10px] text-stone-500 lowercase">
                          digite o valor exato no campo de estoque ou use os botões rápidos
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {(route.items || []).map((item) => {
                          const perRoute = Number(item.perRoute || (item.targetAmount >= 2000 ? 100 : item.targetAmount >= 400 ? 20 : 20));
                          const curr = Number(item.currentAmount || 0);
                          const routesCovered = Math.floor(curr / perRoute);
                          const isItemGoalReached = curr >= item.targetAmount;
                          const hasEnoughForOne = curr >= perRoute;
                          const missingForGoal = Math.max(0, Number(item.targetAmount || 0) - curr);

                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                isItemGoalReached
                                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                                  : hasEnoughForOne
                                  ? 'bg-[#1e1c1a] border-stone-800 text-stone-200'
                                  : 'bg-red-950/20 border-red-900/40 text-stone-200'
                              }`}
                            >
                              {/* Item Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl shrink-0">{item.icon || '📦'}</span>
                                  <div>
                                    <div className="text-sm font-extrabold text-stone-100 flex items-center gap-1.5">
                                      <span>{item.name}</span>
                                    </div>
                                    <div className="text-[10px] font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                                      <span className="text-stone-400">
                                        Custo: <strong className="text-amber-400">{perRoute}x</strong>/rota
                                      </span>
                                      <span className="text-stone-600">•</span>
                                      {missingForGoal > 0 ? (
                                        <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                          Falta: <strong className="text-amber-300">{missingForGoal}x</strong>
                                        </span>
                                      ) : (
                                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                          ✓ Meta 20x OK
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Routes Covered Badge */}
                                <div className="text-right shrink-0">
                                  <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${
                                    routesCovered >= 20
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : routesCovered >= 1
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                                  }`}>
                                    {routesCovered >= 20 ? '✓ 20x Prontas' : `${routesCovered} rotas`}
                                  </span>
                                </div>
                              </div>

                              {/* Direct Numeric Input Row */}
                              <div className="bg-stone-950/80 p-2.5 rounded-xl border border-stone-800/80 flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-stone-400 font-mono">Estoque:</span>
                                  {missingForGoal > 0 ? (
                                    <span className="text-[10px] font-mono font-bold text-amber-400">
                                      Falta: <span className="text-amber-300 font-black">{missingForGoal}x</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                                      ✓ Meta 100%
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      itemInputs[`${route.id}-${item.id}`] !== undefined
                                        ? itemInputs[`${route.id}-${item.id}`]
                                        : (item.currentAmount || 0)
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setItemInputs((prev) => ({ ...prev, [`${route.id}-${item.id}`]: val }));
                                    }}
                                    onBlur={(e) => {
                                      const raw = e.target.value.trim();
                                      setItemInputs((prev) => {
                                        const next = { ...prev };
                                        delete next[`${route.id}-${item.id}`];
                                        return next;
                                      });
                                      if (raw !== '') {
                                        const parsed = parseFloat(raw);
                                        if (!isNaN(parsed)) {
                                          handleSetQuantity(route.id, item.id, Math.max(0, parsed));
                                        }
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') e.target.blur();
                                    }}
                                    className="w-20 px-2 py-1 rounded-lg bg-stone-900 border border-stone-700 hover:border-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-amber-300 font-mono font-black text-sm text-center outline-none shadow-inner"
                                    title="Digite qualquer quantidade e pressione Enter"
                                  />
                                  <span className="text-[11px] font-mono text-stone-400">/ {item.targetAmount}</span>
                                </div>
                              </div>

                              {/* Progress bar towards 20 routes */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                                  <span>{Math.min(100, Math.round((curr / item.targetAmount) * 100))}% da meta</span>
                                  {missingForGoal > 0 ? (
                                    <span className="text-amber-400 font-bold">Faltam {missingForGoal} un</span>
                                  ) : (
                                    <span className="text-emerald-400 font-bold">Meta atingida</span>
                                  )}
                                </div>
                                <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                                  <div
                                    className={`h-full transition-all duration-300 rounded-full ${
                                      isItemGoalReached ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.round((curr / item.targetAmount) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              {/* Adaptive Quick Buttons */}
                              <div className="flex items-center gap-1 justify-between pt-1 border-t border-stone-800/60">
                                {perRoute <= 20 ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdd(route.id, item.id, 20)}
                                      className="flex-1 py-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-black text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                      title="Adicionar +20 (+1 rota)"
                                    >
                                      +20
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdd(route.id, item.id, 100)}
                                      className="flex-1 py-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-black text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                      title="Adicionar +100 (+5 rotas)"
                                    >
                                      +100
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdd(route.id, item.id, 1)}
                                      className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[10px] font-mono font-bold text-stone-400 border border-stone-700 transition-colors cursor-pointer"
                                      title="Adicionar +1"
                                    >
                                      +1
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetQuantity(route.id, item.id, item.targetAmount)}
                                      className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-600 hover:text-white text-emerald-400 text-[10px] font-mono font-bold border border-emerald-600/40 transition-colors cursor-pointer"
                                      title="Preencher Meta de 400 (20 rotas)"
                                    >
                                      Meta
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdd(route.id, item.id, 100)}
                                      className="flex-1 py-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-black text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                      title="Adicionar +100 (+1 rota)"
                                    >
                                      +100
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdd(route.id, item.id, 500)}
                                      className="flex-1 py-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-black text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                      title="Adicionar +500 (+5 rotas)"
                                    >
                                      +500
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdd(route.id, item.id, 10)}
                                      className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[10px] font-mono font-bold text-stone-400 border border-stone-700 transition-colors cursor-pointer"
                                      title="Adicionar +10"
                                    >
                                      +10
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetQuantity(route.id, item.id, item.targetAmount)}
                                      className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-600 hover:text-white text-emerald-400 text-[10px] font-mono font-bold border border-emerald-600/40 transition-colors cursor-pointer"
                                      title="Preencher Meta de 2.000 (20 rotas)"
                                    >
                                      Meta
                                    </button>
                                  </>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Histórico Recente de Carregamentos e Despachos */}
                    {route.logs && route.logs.length > 0 && (
                      <div className="mt-4 p-3.5 rounded-2xl bg-stone-900/80 border border-stone-800 text-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Última Movimentação Registrada:</span>
                          </div>
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                            Sincronizado c/ Discord
                          </span>
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          {route.logs.slice(0, 1).map((log) => (
                            <div key={log.id} className="text-stone-300 flex items-center justify-between">
                              <span>
                                <strong className="text-amber-300">{log.userName}</strong> {log.action === 'dispatch' ? 'despachou' : 'carregou'} <strong className="text-emerald-400">+{log.amount}</strong> de {log.itemName}
                              </span>
                              <span className="text-[9px] text-stone-500">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-6 pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-[11px] text-stone-400">
                      <span>Ferrovia West Fox • Gestão de Estoque & Rotas de Animais</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isLeader && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(route)}
                          className="py-2.5 px-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-stone-700"
                          title="Editar Itens e Metas da Rota"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Editar Rota</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Deseja zerar todo o estoque da rota "${route.title}" para iniciar um novo ciclo do zero?`)) {
                            resetRoute(route.id);
                          }
                        }}
                        className="py-2.5 px-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Zerar Estoque para Novo Ciclo"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Zerar Ciclo</span>
                      </button>

                      <button
                        type="button"
                        disabled={totalRoutesReady < 1}
                        onClick={() => handleDispatchBatch(route.id, 1)}
                        className={`py-2.5 px-5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-md ${
                          totalRoutesReady >= 1
                            ? 'bg-[#2e6e3c] hover:bg-[#255a31] text-white cursor-pointer'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Despachar 1 Rota (+${route.rewardAmount || 4600})</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            }

            // ---------------------------------------------------------------
            // ROTAS NORMAIS (EX: ENTREGA DE FAZENDEIROS, TAVERNA, ETC.)
            // ---------------------------------------------------------------
            const completedItems = (route.items || []).filter(
              (it) => it.completed || Number(it.currentAmount) >= Number(it.targetAmount)
            ).length;
            const totalItems = route.items?.length || 1;
            const progressPercent = Math.round((completedItems / totalItems) * 100);
            const isAllCompleted = completedItems === totalItems;
            const isInProgress = route.status === 'in_progress';
            const isCompleted = route.status === 'completed';

            return (
              <div
                key={route.id}
                className="bg-[#181615] border border-stone-800/90 rounded-3xl p-6 shadow-2xl text-white flex flex-col justify-between transition-all hover:border-stone-700 relative overflow-hidden"
              >
                {/* Background Ambient Glow */}
                <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
                  isCompleted ? 'bg-emerald-500/10' : 'bg-amber-500/5'
                }`} />

                <div>
                  
                  {/* Card Header (Identical to In-Game RP Mission Card) */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl shrink-0">{route.icon || '📦'}</span>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                            {route.companyId === 'comp-ferrovia' ? '🚂 Ferrovia West Fox' : route.companyId === 'comp-taverna' ? '🍺 Taverna' : '🌾 Fazenda Pantaneiros'}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-stone-100 flex items-center gap-2">
                          <span>{route.title}</span>
                          {isCompleted && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ Entregue
                            </span>
                          )}
                        </h3>
                        {route.description && (
                          <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">
                            {route.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reward Amount & Leader Edit Button */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-mono font-black text-base sm:text-xl text-[#e8533c] tracking-tight bg-stone-900/90 border border-stone-800 px-3 py-1.5 rounded-xl shadow-inner inline-block">
                        ${route.rewardAmount}
                      </span>
                      {isLeader && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(route)}
                          className="py-1 px-2.5 rounded-lg bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 border border-stone-700/60"
                          title="Editar Rota"
                        >
                          <Edit3 className="w-3 h-3 text-amber-400" />
                          <span>Editar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-400">
                      <span>Progresso do Carregamento:</span>
                      <span className={`font-mono ${progressPercent === 100 ? 'text-emerald-400 font-extrabold' : 'text-amber-400'}`}>
                        {completedItems}/{totalItems} itens ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          progressPercent === 100
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-amber-600 to-amber-400'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Items List (Buttons / Tags in Exact In-Game Style) */}
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                      <span>Lista de Itens Exigidos:</span>
                      <span className="text-[10px] text-stone-500 font-normal">
                        Clique em <Check className="w-3 h-3 inline text-emerald-400" /> para marcar pronto
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(route.items || []).map((item) => {
                        const itemDone = item.completed || Number(item.currentAmount) >= Number(item.targetAmount);
                        const currentVal = Number(item.currentAmount || 0);
                        const targetVal = Number(item.targetAmount || 1);
                        const missingVal = Math.max(0, targetVal - currentVal);

                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 select-none ${
                              itemDone
                                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                                : 'bg-[#22201e] hover:bg-[#2a2825] border-stone-800 text-stone-200'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              {/* Checkbox button */}
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(route.id, item.id, itemDone)}
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                  itemDone
                                    ? 'bg-emerald-500 border-emerald-400 text-stone-950'
                                    : 'bg-stone-800/80 border-stone-700 hover:border-amber-400 text-transparent'
                                }`}
                                title={itemDone ? 'Desmarcar item' : 'Marcar como 100% pronto'}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate flex items-center gap-1.5 flex-wrap">
                                  <span className={`font-mono font-black text-[11px] ${itemDone ? 'text-emerald-400' : 'text-[#e8533c]'}`}>
                                    {item.targetAmount}x
                                  </span>
                                  <span className="truncate">{item.name}</span>
                                  {missingVal > 0 ? (
                                    <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/20">
                                      Falta {missingVal}x
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                      ✓ Completo
                                    </span>
                                  )}
                                </div>

                                {/* Campo Editável Manual: Digite qualquer quantidade diretamente */}
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-[10px] text-stone-400 font-mono">Coletado:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.targetAmount}
                                    value={itemInputs[`${route.id}-${item.id}`] !== undefined ? itemInputs[`${route.id}-${item.id}`] : (item.currentAmount || 0)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setItemInputs((prev) => ({ ...prev, [`${route.id}-${item.id}`]: val }));
                                    }}
                                    onBlur={(e) => {
                                      const raw = e.target.value.trim();
                                      setItemInputs((prev) => {
                                        const next = { ...prev };
                                        delete next[`${route.id}-${item.id}`];
                                        return next;
                                      });
                                      if (raw !== '') {
                                        const parsed = parseFloat(raw);
                                        if (!isNaN(parsed)) {
                                          handleSetQuantity(route.id, item.id, Math.min(item.targetAmount, Math.max(0, parsed)));
                                        }
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.target.blur();
                                      }
                                    }}
                                    className={`w-16 sm:w-20 px-2 py-0.5 rounded-lg border font-mono font-extrabold text-xs text-center transition-all outline-none ${
                                      itemDone
                                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                                        : 'bg-stone-950 border-stone-700 hover:border-amber-400 text-amber-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 shadow-inner'
                                    }`}
                                    title="Clique para digitar qualquer quantidade e pressione Enter"
                                  />
                                  <span className="text-[10px] text-stone-400 font-mono">/ {item.targetAmount}</span>
                                  {missingVal > 0 ? (
                                    <span className="text-[10px] font-mono font-bold text-amber-300">
                                      (-{missingVal})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                                      (OK)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick Add / 100% Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Botão de Preencher 100% */}
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(route.id, item.id, itemDone)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black border transition-all cursor-pointer ${
                                  itemDone
                                    ? 'bg-emerald-600 text-stone-950 border-emerald-400'
                                    : 'bg-stone-800 hover:bg-emerald-600 hover:text-white text-stone-300 border-stone-700'
                                }`}
                                title={itemDone ? 'Desmarcar' : 'Preencher 100%'}
                              >
                                {itemDone ? '✓' : '100%'}
                              </button>

                              {/* Botão adaptativo rápido */}
                              {item.targetAmount >= 1000 ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdd(route.id, item.id, 500)}
                                    className="px-1.5 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-bold text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                    title="Adicionar +500"
                                  >
                                    +500
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdd(route.id, item.id, 100)}
                                    className="px-1.5 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-bold text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                    title="Adicionar +100"
                                  >
                                    +100
                                  </button>
                                </>
                              ) : item.targetAmount >= 100 ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdd(route.id, item.id, 50)}
                                    className="px-1.5 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-bold text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                    title="Adicionar +50"
                                  >
                                    +50
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdd(route.id, item.id, 10)}
                                    className="px-1.5 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-bold text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                    title="Adicionar +10"
                                  >
                                    +10
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdd(route.id, item.id, 5)}
                                    className="px-1.5 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-bold text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                    title="Adicionar +5"
                                  >
                                    +5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdd(route.id, item.id, 1)}
                                    className="px-1.5 py-1 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[10px] font-mono font-bold text-stone-300 border border-stone-700 transition-colors cursor-pointer"
                                    title="Adicionar +1"
                                  >
                                    +1
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Histórico Recente de Carregamentos */}
                  {route.logs && route.logs.length > 0 && (
                    <div className="mt-4 p-3 rounded-2xl bg-stone-900/80 border border-stone-800/90 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Último Carregamento Registrado:</span>
                        </div>
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                          Mais Recente
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        {route.logs.slice(0, 1).map((log) => (
                          <div key={log.id} className="text-stone-300 flex items-center justify-between">
                            <span>
                              <strong className="text-amber-300">{log.userName}</strong> carregou <strong className="text-emerald-400">+{log.amount}</strong> de {log.itemName}
                            </span>
                            <span className="text-[9px] text-stone-500">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-stone-400 flex items-center gap-2">
                    {route.startedBy && (
                      <span>Iniciado por: <strong className="text-stone-200">{route.startedBy}</strong></span>
                    )}
                    {isCompleted && route.completedBy && (
                      <span>• Finalizado por: <strong className="text-emerald-400">{route.completedBy}</strong></span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isLeader && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(route)}
                        className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-stone-700/60"
                        title="Editar Rota"
                      >
                        <Edit3 className="w-4 h-4 text-amber-400" />
                      </button>
                    )}

                    {/* Reset button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Reiniciar o checklist da rota "${route.title}" para nova viagem?`)) {
                          resetRoute(route.id);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                      title="Reiniciar Checklist"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Main Action Button (In-Game Style Green / Amber) */}
                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={() => resetRoute(route.id)}
                        className="flex-1 sm:flex-none py-3 px-6 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reiniciar Nova Viagem</span>
                      </button>
                    ) : isAllCompleted ? (
                      <button
                        type="button"
                        onClick={() => completeRoute(route.id, { creditToBox: true })}
                        className="flex-1 sm:flex-none py-3 px-6 rounded-xl bg-[#2e6e3c] hover:bg-[#255a31] text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 animate-pulse"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ENTREGAR & CREDITAR ${route.rewardAmount}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isInProgress) startRoute(route.id);
                        }}
                        className={`flex-1 sm:flex-none py-3 px-6 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
                          isInProgress
                            ? 'bg-[#2e6e3c] text-white'
                            : 'bg-[#2e6e3c] hover:bg-[#255a31] text-white shadow-md cursor-pointer'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>{isInProgress ? 'ROTA EM ANDAMENTO' : 'ACEITAR MISSÃO'}</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar Nova Rota / Missão */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl shadow-inner">
                  {newIcon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Cadastrar Nova Rota de Entrega</h3>
                  <p className="text-xs text-stone-500">
                    Defina o título, valor da recompensa e lista de itens exigidos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateRouteSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome da Rota / Missão: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entrega de Fazendeiros ou Rota Ferrovia 01"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-medium focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Recompensa em DOLS ($):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="2300"
                    value={newReward}
                    onChange={(e) => setNewReward(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-mono font-bold focus:bg-white focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ícone:
                  </label>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-bold focus:bg-white focus:border-amber-400 outline-none"
                  >
                    <option value="📦">📦 Caixa / Entrega</option>
                    <option value="🚂">🚂 Ferrovia / Trem</option>
                    <option value="🌾">🌾 Fazenda / Grãos</option>
                    <option value="🍺">🍺 Taverna / Bebidas</option>
                    <option value="🥩">🥩 Carnes & Alimentos</option>
                    <option value="⛏️">⛏️ Minério & Carvão</option>
                    <option value="🪵">🪵 Madeira & Toras</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Lista de Itens (1 por linha no formato: "Quantidade x Nome"):
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Ex:&#10;15x Saco de café&#10;15x Saco de Amora&#10;15x Saco de algodão&#10;15x Saco de Milho&#10;400x Garrafas de Leite"
                  value={newItemsText}
                  onChange={(e) => setNewItemsText(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs font-mono text-stone-900 focus:bg-white focus:border-amber-400 outline-none leading-relaxed"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Digite a quantidade e o nome de cada item (ex: 15x Saco de café ou 400x Leite).
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar Rota</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal: Editar Rota Existente */}
      {isEditOpen && editingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-[#181615] border border-stone-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 text-stone-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-[#1e1b19] shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  {editIcon || '📦'}
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Editar Rota & Missão</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Líder
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Altere o nome, valor, ícone e itens exigidos da rota
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditOpen(false); setEditingRoute(null); }}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                
                {/* Title & Icon Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                      Nome da Rota / Missão *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Ex: Rota de Animais, Entrega Fazendeiros..."
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                      Ícone
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-center text-lg focus:border-amber-400 outline-none"
                      placeholder="🐄"
                    />
                  </div>
                </div>

                {/* Quick Icon Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400 font-bold uppercase">Ícones rápidos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['🐄', '🚂', '📦', '🍺', '🌾', '🚜', '⛏️', '🍞', '🐎', '🍖'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditIcon(emoji)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                          editIcon === emoji ? 'bg-amber-500 scale-110' : 'bg-stone-800 hover:bg-stone-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reward & Description Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                      Recompensa ($ DOLS)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-stone-500 font-mono font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        required
                        value={editReward}
                        onChange={(e) => setEditReward(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-bold text-emerald-400 focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                      Descrição / Instruções
                    </label>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Ex: 1 Rota = 20x queijos e 100x leites..."
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-300 focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                {/* Items Management List */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                        Itens Exigidos da Rota ({editItems.length})
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Defina o nome do item, custo por rota e a meta total acumulada.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEditItem}
                      className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-stone-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-amber-500/40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Item</span>
                    </button>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {editItems.map((it, idx) => (
                      <div
                        key={it.id || idx}
                        className="p-3 rounded-2xl bg-stone-900/90 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-stone-700 transition-colors"
                      >
                        {/* Item Icon + Name */}
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            maxLength={2}
                            value={it.icon || '📦'}
                            onChange={(e) => handleEditItemChange(idx, 'icon', e.target.value)}
                            className="w-9 h-9 rounded-xl bg-stone-950 border border-stone-700 text-center text-base focus:border-amber-400 outline-none shrink-0"
                            title="Ícone do Item"
                          />
                          <input
                            type="text"
                            required
                            value={it.name}
                            onChange={(e) => handleEditItemChange(idx, 'name', e.target.value)}
                            placeholder="Nome do Item"
                            className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:border-amber-400 outline-none"
                          />
                        </div>

                        {/* Quantities: perRoute, targetAmount, currentAmount */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div title="Custo para fazer 1 viagem (unidades gastas por rota)">
                            <span className="block text-[9px] font-bold text-stone-500 uppercase">P/ Rota</span>
                            <input
                              type="number"
                              min="1"
                              required
                              value={it.perRoute || 1}
                              onChange={(e) => handleEditItemChange(idx, 'perRoute', Math.max(1, parseFloat(e.target.value) || 1))}
                              className="w-16 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-400 text-center focus:border-amber-400 outline-none"
                            />
                          </div>

                          <div title="Meta total de estoque acumulado no ciclo">
                            <span className="block text-[9px] font-bold text-stone-500 uppercase">Meta Total</span>
                            <input
                              type="number"
                              min="1"
                              required
                              value={it.targetAmount || 1}
                              onChange={(e) => handleEditItemChange(idx, 'targetAmount', Math.max(1, parseFloat(e.target.value) || 1))}
                              className="w-18 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-400 text-center focus:border-amber-400 outline-none"
                            />
                          </div>

                          <div title="Estoque atual carregado">
                            <span className="block text-[9px] font-bold text-stone-500 uppercase">Estoque</span>
                            <input
                              type="number"
                              min="0"
                              value={it.currentAmount || 0}
                              onChange={(e) => handleEditItemChange(idx, 'currentAmount', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-18 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-stone-200 text-center focus:border-amber-400 outline-none"
                            />
                          </div>

                          {/* Remove item button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveEditItem(idx)}
                            disabled={editItems.length <= 1}
                            className={`p-2 rounded-xl mt-3 transition-colors ${
                              editItems.length <= 1
                                ? 'text-stone-700 cursor-not-allowed'
                                : 'text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer'
                            }`}
                            title={editItems.length <= 1 ? 'A rota deve ter pelo menos 1 item' : 'Remover item da rota'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer Actions */}
              <div className="px-6 py-4 border-t border-stone-800 bg-[#1e1b19] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                {/* Delete entire route */}
                <button
                  type="button"
                  onClick={() => handleDeleteRoute(editingRoute.id, editingRoute.title)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 font-bold text-xs border border-red-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Rota</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => { setIsEditOpen(false); setEditingRoute(null); }}
                    className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-bold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
