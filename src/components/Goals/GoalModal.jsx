import React, { useState, useEffect } from 'react';
import { useFarm } from '../../context/FarmContext';
import { X, Target, Wheat, Sparkles, DollarSign } from 'lucide-react';

export function GoalModal({ isOpen, onClose }) {
  const { members, currentRole, addGoal } = useFarm();

  const isOwner = currentRole === 'owner';
  const defaultType = isOwner ? 'owner_to_manager' : 'manager_to_member';

  const [type, setType] = useState(defaultType);
  const [unitType, setUnitType] = useState('sacks');
  const [unitLabel, setUnitLabel] = useState('Sacas de Milho');
  const [title, setTitle] = useState('Meta de 100 Sacas de Milho');
  const [targetAmount, setTargetAmount] = useState('100');
  const [targetMemberId, setTargetMemberId] = useState('');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('Entregar sacas ensacadas para o gerente no armazém central.');

  const eligibleMembers = members.filter((m) => {
    if (type === 'owner_to_manager') {
      return m.role === 'manager';
    } else {
      return m.role === 'member';
    }
  });

  useEffect(() => {
    if (eligibleMembers.length > 0 && !targetMemberId) {
      setTargetMemberId(eligibleMembers[0].id);
    }
  }, [eligibleMembers, targetMemberId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(targetAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Informe uma quantidade de meta válida maior que zero.');
      return;
    }

    if (!targetMemberId) {
      alert('Selecione para quem é a meta.');
      return;
    }

    addGoal({
      title: title || `Meta de ${unitLabel}`,
      type,
      unitType,
      unitLabel,
      targetMemberId,
      targetAmount: amountNum,
      deadline,
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Criar Nova Meta de Produção</h3>
              <p className="text-xs text-stone-500">
                {isOwner ? '👑 Dono &rarr; Definir meta para Gerente' : '👔 Gerente &rarr; Definir meta para Membro'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Unit selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Tipo de Produção / Meta:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUnitType('sacks');
                  setUnitLabel('Sacas de Milho');
                  setTitle('Meta de 100 Sacas de Milho');
                  setTargetAmount('100');
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  unitType === 'sacks'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Wheat className="w-4 h-4 text-amber-700" />
                  <span>Sacas de Milho (Safra)</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  Membro entrega sacas & Gerente confirma
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUnitType('dols');
                  setUnitLabel('DOLS');
                  setTitle('Meta Financeira em DOLS');
                  setTargetAmount('50000');
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  unitType === 'dols'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span>DOLS no Caixa</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  Arrecadação direta em moeda no caixa
                </div>
              </button>
            </div>
          </div>

          {/* Goal Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Título da Meta:
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 100 Sacas de Milho da Safra"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Quantidade Alvo ({unitLabel}): *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                placeholder="Ex: 100"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-400 outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-stone-500">
                {unitLabel}
              </span>
            </div>
          </div>

          {/* Target Member & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Atribuir para ({type === 'owner_to_manager' ? 'Gerente' : 'Membro Produtor'}):
              </label>
              <select
                value={targetMemberId}
                onChange={(e) => setTargetMemberId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
              >
                {eligibleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.avatar} {m.name} ({m.roleLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Data Limite (Prazo):
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Orientações de Entrega:
            </label>
            <textarea
              rows="2"
              placeholder="Onde o membro deve descarregar as sacas e quem deve procurar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Criar Meta</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
