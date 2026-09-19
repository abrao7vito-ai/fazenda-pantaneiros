import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols, formatDateBR } from '../../utils/formatters';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Trash2, 
  Plus, 
  Wheat, 
  AlertCircle,
  PackagePlus
} from 'lucide-react';

export function GoalCard({ goal, onDeliverSacks }) {
  const { currentRole, updateGoal, deleteGoal, deliveries } = useFarm();
  const [showAddProgModal, setShowAddProgModal] = useState(false);
  const [manualProgAmount, setManualProgAmount] = useState('');

  const percent = Math.min(
    100,
    goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0
  );

  const isCompleted = goal.status === 'completed' || goal.currentAmount >= goal.targetAmount;
  const isOwnerGoal = goal.type === 'owner_to_manager';
  const isSacksGoal = goal.unitType === 'sacks';

  // Pending deliveries
  const pendingForThisGoal = deliveries
    .filter((d) => d.goalId === goal.id && d.status === 'pending')
    .reduce((sum, d) => sum + Number(d.quantity), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(goal.deadline + 'T00:00:00');
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const canManage = currentRole === 'owner' || (currentRole === 'manager' && !isOwnerGoal);
  const canDeliver = isSacksGoal && (currentRole === 'member' || currentRole === 'manager' || currentRole === 'owner');

  const handleAddProgress = (e) => {
    e.preventDefault();
    const val = parseFloat(manualProgAmount);
    if (!val || val <= 0) return;

    updateGoal(goal.id, {
      currentAmount: Number(goal.currentAmount) + val,
    });

    setManualProgAmount('');
    setShowAddProgModal(false);
  };

  return (
    <div
      className={`relative bg-white border rounded-3xl p-5 shadow-card transition-all hover:shadow-clean ${
        isCompleted
          ? 'border-emerald-300 bg-gradient-to-br from-white via-white to-emerald-50/40'
          : isOwnerGoal
          ? 'border-amber-200 bg-gradient-to-br from-white via-white to-amber-50/30'
          : 'border-stone-200/80 hover:border-stone-300'
      }`}
    >
      {/* Top Tag & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isOwnerGoal
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              {isOwnerGoal ? '👑 Dono &rarr; Gerente' : '👔 Gerente &rarr; Membro'}
            </span>

            {isSacksGoal && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fbf5ed] text-[#78431e] border border-[#e6d0bf] flex items-center gap-1">
                <Wheat className="w-3 h-3 text-[#b5893a]" />
                <span>Sacas de Produção</span>
              </span>
            )}

            {isCompleted ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Meta Atingida!</span>
              </span>
            ) : diffDays < 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                <span>Prazo Vencido</span>
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                <span>{diffDays === 0 ? 'Vence hoje' : `${diffDays} dias restantes`}</span>
              </span>
            )}
          </div>

          <h4 className="text-base font-bold text-stone-900 leading-snug pt-1">{goal.title}</h4>
        </div>

        {canManage && (
          <button
            onClick={() => {
              if (window.confirm(`Excluir a meta "${goal.title}"?`)) {
                deleteGoal(goal.id);
              }
            }}
            title="Excluir meta"
            className="text-stone-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Target Member Info */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-600">
        <div className="flex items-center gap-1.5">
          <span className="text-stone-400">Atribuído para:</span>
          <span className="font-semibold text-stone-900 px-2 py-0.5 rounded-lg bg-stone-100 border border-stone-200">
            {goal.targetMemberName}
          </span>
        </div>
        <div className="flex items-center gap-1 text-stone-500">
          <span>Criada por:</span>
          <span className="font-medium text-stone-700">{goal.creatorName}</span>
        </div>
      </div>

      {goal.notes && (
        <p className="mt-2.5 text-xs text-stone-600 italic bg-[#f8f6f0] p-2.5 rounded-xl border border-stone-200/70">
          "{goal.notes}"
        </p>
      )}

      {/* Numbers & Progress Bar */}
      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-mono font-extrabold text-lg text-stone-900">
              {isSacksGoal ? `${goal.currentAmount} ${goal.unitLabel}` : formatDols(goal.currentAmount)}
            </span>
            <span className="text-stone-400 font-mono">
              / {isSacksGoal ? `${goal.targetAmount} ${goal.unitLabel}` : formatDols(goal.targetAmount)}
            </span>

            {/* Pending Sacks Alert */}
            {pendingForThisGoal > 0 && (
              <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                +{pendingForThisGoal} aguardando gerente ⏳
              </span>
            )}
          </div>
          
          <span
            className={`font-mono font-extrabold text-sm ${
              isCompleted ? 'text-emerald-700' : 'text-ouro-700'
            }`}
          >
            {percent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/80 flex shadow-inner">
          <div
            style={{ width: `${percent}%` }}
            className={`h-full rounded-full transition-all duration-700 ${
              isCompleted
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                : 'bg-gradient-to-r from-ouro-500 to-amber-600'
            }`}
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span>Prazo: {formatDateBR(goal.deadline)}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Member Delivery Button (e.g. 20 sacas de milho) */}
          {canDeliver && (
            <button
              onClick={() => onDeliverSacks && onDeliverSacks(goal.id)}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#6d3f23] hover:bg-[#54301b] px-3.5 py-1.5 rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <PackagePlus className="w-3.5 h-3.5 text-ouro-300" />
              <span>Entregar Sacas</span>
            </button>
          )}

          {canManage && (
            <>
              {showAddProgModal ? (
                <form onSubmit={handleAddProgress} className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="+ Qtd"
                    value={manualProgAmount}
                    onChange={(e) => setManualProgAmount(e.target.value)}
                    className="w-16 bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-900 outline-none focus:border-ouro-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-ouro-500 hover:bg-ouro-600 text-white font-bold rounded-lg text-xs"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddProgModal(false)}
                    className="px-2 py-1 bg-stone-200 text-stone-600 rounded-lg text-xs hover:bg-stone-300"
                  >
                    X
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddProgModal(true)}
                  title="Ajuste manual"
                  className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-stone-800 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Ajuste</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
