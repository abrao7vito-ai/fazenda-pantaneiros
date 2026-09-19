import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols, generateReportMessage } from '../../utils/formatters';
import { X, Plus, Minus, Copy, Check, Sparkles, Send } from 'lucide-react';

export function TransactionFormModal({ isOpen, onClose }) {
  const { members, currentUser, totalBalance, addTransaction } = useFarm();

  const [type, setType] = useState('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Arrecadação de Venda');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);
  const [lastGeneratedMsg, setLastGeneratedMsg] = useState(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const simulatedTotal = type === 'income' ? totalBalance + numAmount : totalBalance - numAmount;

  const livePreview = generateReportMessage({
    type,
    amount: numAmount,
    personName: currentUser?.name || 'Responsável',
    totalBoxBalance: simulatedTotal,
    date: date ? new Date(date + 'T12:00:00') : new Date(),
    category,
    description,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (numAmount <= 0) {
      alert('Por favor, informe um valor válido em DOLS maior que zero.');
      return;
    }

    const { formattedReport } = addTransaction({
      type,
      amount: numAmount,
      memberId: currentUser.id,
      category,
      description,
      date: new Date(date + 'T12:00:00').toISOString(),
    });

    setLastGeneratedMsg(formattedReport);
  };

  const handleCopy = async (textToCopy) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinishAndClose = () => {
    setLastGeneratedMsg(null);
    setAmount('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Lançar no Caixa da Fazenda</h3>
              <p className="text-xs text-stone-500">Gera o relatório padrão pronto para copiar</p>
            </div>
          </div>
          <button
            onClick={handleFinishAndClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {lastGeneratedMsg ? (
          /* Success Screen with Copy to Clipboard */
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
                ✓
              </div>
              <h4 className="text-lg font-bold text-stone-900">Lançamento Efetuado com Sucesso!</h4>
              <p className="text-xs text-stone-600 mt-1">
                O caixa da fazenda foi atualizado para <strong className="text-emerald-700 font-bold">{formatDols(simulatedTotal)}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                <span>📋 Formato para colar no Discord / WhatsApp:</span>
                <span className="text-[11px] text-emerald-700 font-bold">Padrão Pantaneiros</span>
              </label>
              <div className="bg-[#fcfbf7] p-4 rounded-2xl font-mono text-xs text-stone-800 whitespace-pre-wrap border border-stone-200 shadow-inner">
                {lastGeneratedMsg}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCopy(lastGeneratedMsg)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-pantanal-700 hover:bg-pantanal-800 text-white shadow-sm'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado para o Clipboard!' : 'Copiar Relatório'}</span>
              </button>
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="py-3 px-5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory('Arrecadação de Venda');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                  type === 'income'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>ADICIONAR AO CAIXA (+)</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory('Insumos & Despesas');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                  type === 'expense'
                    ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-sm'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Minus className="w-4 h-4 text-rose-600" />
                <span>RETIRAR DO CAIXA (-)</span>
              </button>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Valor em DOLS *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="Ex: 18900"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-stone-50 border border-stone-300 focus:bg-white focus:border-amber-400 rounded-xl px-4 py-3 text-lg font-mono font-bold text-stone-900 outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-stone-500">
                  DOLS
                </span>
              </div>
            </div>

            {/* Who added / withdrew - AUTOMATIC FROM LOGIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  {type === 'income' ? 'Adicionado por (Sua Conta):' : 'Retirado por (Sua Conta):'}
                </label>
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-100 border border-stone-200">
                  <span className="text-xl">{currentUser.avatar}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-stone-900 truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-stone-500 truncate">{currentUser.roleLabel}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Data:
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            {/* Category & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Categoria:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entrega de Gado, Grãos, Insumos"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Observação / Lote:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carga do caminhão 2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-[#fcfbf7] border border-stone-200 rounded-2xl p-3 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 flex items-center justify-between">
                <span>Pré-visualização do Relatório</span>
                <span className="text-stone-800 font-bold">Total previsto: {formatDols(simulatedTotal)}</span>
              </div>
              <div className="font-mono text-xs text-stone-800 whitespace-pre-line bg-white p-2.5 rounded-xl border border-stone-200">
                {livePreview}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleFinishAndClose}
                className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirmar & Gerar Relatório</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
