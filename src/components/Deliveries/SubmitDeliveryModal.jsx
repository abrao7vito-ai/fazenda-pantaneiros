import React, { useState, useEffect } from 'react';
import { useFarm } from '../../context/FarmContext';
import { generateDeliverySubmissionDiscordMessage } from '../../utils/formatters';
import { X, Wheat, Send, Copy, Check } from 'lucide-react';

export function SubmitDeliveryModal({ isOpen, onClose, preselectedGoalId = null }) {
  const { members, activeCompanyMembers, currentUser, goals, submitDelivery, currentCompany } = useFarm();

  const [goalId, setGoalId] = useState(preselectedGoalId || '');
  const [managerId, setManagerId] = useState('');
  const [quantity, setQuantity] = useState('20');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(null);

  const companyStaff = activeCompanyMembers || members;
  const managers = companyStaff.filter((m) => m.role === 'manager' || m.role === 'owner' || m.role === 'master');
  const memberGoals = goals.filter((g) => {
    if (g.unitType !== 'sacks' || g.status !== 'in_progress') return false;
    if (currentUser.role === 'member') {
      return g.targetMemberId === currentUser.id || g.targetMemberId === 'all';
    }
    return true;
  });

  useEffect(() => {
    if (preselectedGoalId) {
      setGoalId(preselectedGoalId);
    } else if (memberGoals.length > 0 && !goalId) {
      setGoalId(memberGoals[0].id);
    }

    if (managers.length > 0 && !managerId) {
      setManagerId(managers[0].id);
    }
  }, [preselectedGoalId, memberGoals, managers]);

  if (!isOpen) return null;

  const selectedGoal = goals.find((g) => g.id === goalId);
  const selectedManager = members.find((m) => m.id === managerId);
  const itemType = selectedGoal?.unitLabel || currentCompany?.unitLabel || 'Sacas de Milho';
  const numQty = parseFloat(quantity) || 0;

  const livePreview = generateDeliverySubmissionDiscordMessage({
    memberName: currentUser.name,
    managerName: selectedManager?.name || 'Gerente',
    quantity: numQty,
    itemType,
    notes,
    date: new Date(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (numQty <= 0) {
      alert('Informe uma quantidade válida de sacas maior que zero.');
      return;
    }

    const { discordMessage } = submitDelivery({
      goalId,
      quantity: numQty,
      managerId,
      notes,
    });

    setSubmittedMessage(discordMessage);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    setSubmittedMessage(null);
    setQuantity('20');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Informar Entrega de Sacas</h3>
              <p className="text-xs text-stone-500">
                O gerente receberá a notificação para confirmar e creditar na sua meta
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedMessage ? (
          /* Confirmation & Copy Screen */
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
                🌾
              </div>
              <h4 className="text-lg font-bold text-stone-900">Entrega Registrada no Sistema!</h4>
              <p className="text-xs text-stone-600 mt-1">
                Foi enviado para a lista do <strong>{selectedManager?.name}</strong>. Assim que ele confirmar, suas {quantity} sacas serão somadas na sua meta.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                <span>📋 Copiar mensagem para avisar no Discord / WhatsApp:</span>
                <span className="text-[11px] text-amber-800 font-mono font-bold">Padrão Fazenda</span>
              </label>
              <div className="bg-[#fcfbf7] p-4 rounded-2xl font-mono text-xs text-stone-800 whitespace-pre-wrap border border-stone-200 shadow-inner">
                {submittedMessage}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCopy(submittedMessage)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-pantanal-700 hover:bg-pantanal-800 text-white shadow-sm'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado para o Clipboard!' : 'Copiar para o Discord'}</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-3 px-5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          /* Form Input */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Quem está entregando - AUTOMÁTICO DO LOGIN */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Quem está Entregando (Sua Conta Conectada):
              </label>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-100 border border-stone-200">
                <span className="text-xl">{currentUser.avatar}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-900 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-stone-500 truncate">{currentUser.roleLabel} (identificado automaticamente pelo login)</div>
                </div>
              </div>
            </div>

            {/* Meta associada */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Meta de Produção Associada:
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
              >
                {memberGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.targetMemberId === 'all' ? '🌾 [Meta Coletiva Geral] ' : ''}{g.title} ({g.currentAmount} / {g.targetAmount} {g.unitLabel})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantidade de Sacas */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Quantidade de Sacas Entregues: *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="Ex: 20"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 focus:bg-white focus:border-amber-400 rounded-xl px-4 py-3 text-lg font-mono font-bold text-stone-900 outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-stone-500">
                  {itemType}
                </span>
              </div>
            </div>

            {/* Gerente que recebeu */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Para qual Gerente você entregou? *
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
              >
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.avatar} {m.name} ({m.roleLabel})
                  </option>
                ))}
              </select>
            </div>

            {/* Observações / Local da entrega */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Onde deixou as sacas / Detalhes:
              </label>
              <input
                type="text"
                placeholder="Ex: Descarregado no silo 2 ao lado do trator"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>

            {/* Live Preview */}
            <div className="bg-[#fcfbf7] border border-stone-200 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 flex items-center justify-between">
                <span>Pré-visualização do Comunicado</span>
                <span className="text-stone-800 font-bold">Entrega: {quantity} Sacas</span>
              </div>
              <div className="font-mono text-xs text-stone-700 whitespace-pre-line bg-white p-2.5 rounded-xl border border-stone-200">
                {livePreview}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Registrar Entrega p/ Validação</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
