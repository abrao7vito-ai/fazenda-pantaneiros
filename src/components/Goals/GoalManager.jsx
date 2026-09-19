import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { GoalCard } from './GoalCard';
import { GoalModal } from './GoalModal';
import { SubmitDeliveryModal } from '../Deliveries/SubmitDeliveryModal';
import { DeliveryValidationList } from '../Deliveries/DeliveryValidationList';
import { 
  Target, 
  PlusCircle, 
  Wheat, 
  PackageCheck 
} from 'lucide-react';

export function GoalManager({ onOpenSubmitDelivery }) {
  const { goals, currentRole, currentUser, pendingDeliveries } = useFarm();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [selectedGoalIdForDelivery, setSelectedGoalIdForDelivery] = useState(null);
  
  const [activeSection, setActiveSection] = useState('goals');
  const [activeFilter, setActiveFilter] = useState('all');

  const pendingCount = pendingDeliveries.length;

  const handleDeliverForGoal = (goalId) => {
    setSelectedGoalIdForDelivery(goalId);
    setIsDeliveryModalOpen(true);
  };

  const filteredGoals = goals.filter((g) => {
    if (activeFilter === 'owner_to_manager') return g.type === 'owner_to_manager';
    if (activeFilter === 'manager_to_member') return g.type === 'manager_to_member';
    if (activeFilter === 'sacks_only') return g.unitType === 'sacks';
    if (activeFilter === 'my_goals') return g.targetMemberId === currentUser.id;
    return true;
  });

  const canCreate = currentRole === 'owner' || currentRole === 'manager';

  return (
    <div className="space-y-6">
      
      {/* Top Clean Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <Wheat className="w-3.5 h-3.5 text-amber-600" />
              <span>Painel de Metas & Validação de Sacas</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Metas da Fazenda & Entrega ao Gerente
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              O Dono estipula as diretrizes, o Gerente define metas de <strong className="text-stone-900 font-semibold">100 sacas de milho</strong> para os membros, o membro informa quando entregou (ex: <strong className="text-stone-900 font-semibold">20 sacas</strong>) e o Gerente confere e confirma o recebimento no sistema!
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Inform delivery button */}
            <button
              onClick={() => {
                setSelectedGoalIdForDelivery(null);
                setIsDeliveryModalOpen(true);
              }}
              className="flex items-center gap-2 bg-[#6d3f23] hover:bg-[#54301b] text-white font-bold px-4 py-3 rounded-2xl text-xs shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <Wheat className="w-4 h-4 text-ouro-300" />
              <span>Informar Entrega de Sacas</span>
            </button>

            {/* Create Goal button */}
            {canCreate && (
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="flex items-center gap-2 bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold px-4 py-3 rounded-2xl text-xs shadow-sm transition-all transform hover:-translate-y-0.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Criar Nova Meta</span>
              </button>
            )}
          </div>
        </div>

        {/* Workflow Steps Indicator */}
        <div className="mt-6 pt-5 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#fcfbf7] p-3.5 rounded-2xl border border-stone-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <div className="font-bold text-stone-900">Meta Estabelecida</div>
              <div className="text-[11px] text-stone-500">Ex: 100 sacas de milho por membro</div>
            </div>
          </div>

          <div className="bg-[#fcfbf7] p-3.5 rounded-2xl border border-stone-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <div className="font-bold text-stone-900">Membro Entrega Sacas</div>
              <div className="text-[11px] text-stone-500">Informa 20 sacas entregues ao gerente</div>
            </div>
          </div>

          <div className="bg-[#fcfbf7] p-3.5 rounded-2xl border border-stone-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <div className="font-bold text-stone-900">Gerente Confirma</div>
              <div className="text-[11px] text-stone-500">Confere fisicamente & credita na meta</div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Section Navigation (Metas vs Confirmações) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Toggle between Goals View and Delivery Validation Queue */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-stone-200 shadow-card">
          <button
            onClick={() => setActiveSection('goals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSection === 'goals'
                ? 'bg-amber-100 text-amber-900 font-extrabold shadow-sm'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Quadro de Metas ({goals.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('deliveries')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSection === 'deliveries'
                ? 'bg-amber-100 text-amber-900 font-extrabold shadow-sm'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Validação de Entregas</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold animate-bounce">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter sub-tabs when in 'goals' section */}
        {activeSection === 'goals' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 bg-white border border-stone-200'
              }`}
            >
              Todas ({goals.length})
            </button>

            <button
              onClick={() => setActiveFilter('sacks_only')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1 ${
                activeFilter === 'sacks_only'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                  : 'text-stone-600 hover:text-stone-900 bg-white border border-stone-200'
              }`}
            >
              <Wheat className="w-3 h-3 text-amber-700" />
              <span>Sacas de Milho</span>
            </button>

            <button
              onClick={() => setActiveFilter('my_goals')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeFilter === 'my_goals'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                  : 'text-stone-600 hover:text-stone-900 bg-white border border-stone-200'
              }`}
            >
              Minhas Metas
            </button>
          </div>
        )}

      </div>

      {/* Content View */}
      {activeSection === 'deliveries' ? (
        <DeliveryValidationList />
      ) : (
        <div className="space-y-4">
          {filteredGoals.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-card">
              <Wheat className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-stone-700">Nenhuma meta cadastrada</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Crie uma meta de sacas de milho ou arrecadação em DOLS para começar o acompanhamento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDeliverSacks={(id) => handleDeliverForGoal(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
      />

      <SubmitDeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => {
          setIsDeliveryModalOpen(false);
          setSelectedGoalIdForDelivery(null);
        }}
        preselectedGoalId={selectedGoalIdForDelivery}
      />

    </div>
  );
}
