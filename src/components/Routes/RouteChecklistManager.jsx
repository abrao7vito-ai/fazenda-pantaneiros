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
  Truck
} from 'lucide-react';

export function RouteChecklistManager() {
  const { 
    routes, 
    startRoute, 
    updateRouteItem, 
    completeRoute, 
    resetRoute, 
    addCustomRoute,
    currentCompany,
    currentRole,
    currentUser,
    discordSettings
  } = useFarm();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'all'
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [itemInputs, setItemInputs] = useState({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New route state
  const [newTitle, setNewTitle] = useState('');
  const [newReward, setNewReward] = useState('2500');
  const [newIcon, setNewIcon] = useState('🚂');
  const [newDesc, setNewDesc] = useState('');
  const [newItemsText, setNewItemsText] = useState('15x Saco de café\n15x Saco de Amora\n15x Saco de algodão\n15x Saco de Milho\n400x Garrafas de Leite');

  const isLeader = currentRole === 'owner' || currentRole === 'manager' || currentRole === 'master';

  const filteredRoutes = (routes || []).filter((r) => {
    if (!r) return false;
    if (activeTab === 'active') return r.status === 'in_progress' || r.status === 'template';
    if (activeTab === 'completed') return r.status === 'completed';
    return true;
  });

  const handleQuickAdd = (routeId, itemId, amount) => {
    updateRouteItem(routeId, itemId, { addQuantity: amount });
  };

  const handleToggleComplete = (routeId, itemId, currentStatus) => {
    updateRouteItem(routeId, itemId, { markCompleted: !currentStatus });
  };

  const handleSetQuantity = (routeId, itemId, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    updateRouteItem(routeId, itemId, { setQuantity: num });
    setItemInputs((prev) => ({ ...prev, [`${routeId}-${itemId}`]: num }));
  };

  const handleCustomAdd = (routeId, itemId) => {
    const val = parseFloat(itemInputs[`${routeId}-${itemId}`]);
    if (isNaN(val) || val <= 0) return;
    updateRouteItem(routeId, itemId, { addQuantity: val });
    setItemInputs((prev) => ({ ...prev, [`${routeId}-${itemId}`]: '' }));
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

    addCustomRoute({
      title: newTitle,
      rewardAmount: parseFloat(newReward) || 0,
      icon: newIcon,
      description: newDesc,
      items: parsedItems,
    });

    setNewTitle('');
    setNewReward('2500');
    setNewDesc('');
    setIsCreateOpen(false);
    alert('Nova rota criada com sucesso e sincronizada com o Discord!');
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

        {/* Quick Filter Bar */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-stone-800 text-xs">
          <span className="text-stone-400 text-[11px] font-bold uppercase tracking-wider mr-1">Filtrar:</span>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-stone-300'
            }`}
          >
            Rotas em Andamento ({routes.filter((r) => r.status === 'in_progress').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-stone-300'
            }`}
          >
            Concluídas ({routes.filter((r) => r.status === 'completed').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-stone-300'
            }`}
          >
            Todas ({routes.length})
          </button>
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

                    {/* Reward Amount in Game Style Red/Gold Tag */}
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-base sm:text-xl text-[#e8533c] tracking-tight bg-stone-900/90 border border-stone-800 px-3 py-1.5 rounded-xl shadow-inner inline-block">
                        ${route.rewardAmount}
                      </span>
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
                                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                  <span className={`font-mono font-black text-[11px] ${itemDone ? 'text-emerald-400' : 'text-[#e8533c]'}`}>
                                    {item.targetAmount}x
                                  </span>
                                  <span className="truncate">{item.name}</span>
                                </div>

                                {/* Campo Editável Manual: Digite qualquer quantidade diretamente */}
                                <div className="flex items-center gap-1.5 mt-1">
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
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Histórico de Carregamento (Discord & Web):</span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-[11px]">
                        {route.logs.slice(0, 4).map((log) => (
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

    </div>
  );
}
