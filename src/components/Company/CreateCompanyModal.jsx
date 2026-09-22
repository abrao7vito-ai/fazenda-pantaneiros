import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { X, Building2, Sparkles, DollarSign, Tag, FileText, Check } from 'lucide-react';

const SUGGESTED_ICONS = ['🌾', '🚂', '🍺', '⛏️', '🐎', '🥩', '🪵', '🏨', '🏭', '💰', '🔫', '🎣', '🍞', '🛡️'];

export function CreateCompanyModal({ isOpen, onClose }) {
  const { addCompany } = useFarm();

  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [icon, setIcon] = useState('🚂');
  const [unitLabel, setUnitLabel] = useState('Cargas');
  const [code, setCode] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, digite o nome da empresa.');
      return;
    }

    addCompany({
      name,
      segment: segment || 'Comércio & Serviços',
      icon,
      unitLabel: unitLabel || 'Unidades',
      code: code || `CORR • ${Date.now().toString().slice(-3)}`,
      initialBalance: parseFloat(initialBalance) || 0,
      description,
    });

    // Reset fields
    setName('');
    setSegment('');
    setIcon('🚂');
    setUnitLabel('Cargas');
    setCode('');
    setInitialBalance('0');
    setDescription('');

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl shadow-inner">
              {icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Fundar Nova Empresa</h3>
              <p className="text-xs text-stone-500">
                Cadastre um novo empreendimento no Grupo Pantaneiros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Nome da Empresa */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nome da Empresa / Empreendimento: *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Ferrovia West Fox ou Taverna Central"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-medium focus:bg-white focus:border-amber-400 outline-none transition-colors"
            />
          </div>

          {/* Ícone Seletor */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Ícone / Símbolo da Empresa:
            </label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_ICONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all border ${
                    icon === emoji
                      ? 'bg-amber-100 border-amber-400 scale-110 shadow-sm'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Segmento & Código */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ramo de Atuação / Segmento:
              </label>
              <input
                type="text"
                placeholder="Ex: Transporte Ferroviário, Bar..."
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Código / Sigla de Correio:
              </label>
              <input
                type="text"
                placeholder="Ex: RAIL • 01 ou CORREIO • 82"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          {/* Unidade de Produção & Saldo Inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Unidade de Produção Padrão:
              </label>
              <input
                type="text"
                placeholder="Ex: Cargas, Barris, Minérios..."
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Usado para metas de entrega deste negócio
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Saldo Inicial em Caixa ($ DOLS):
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-2.5 text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-400 outline-none"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Será lançado como abertura de caixa
              </span>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Finalidade / Descrição:
            </label>
            <textarea
              rows="2"
              placeholder="Descreva as operações, armazém, rotas ou atividades..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Criar Empresa</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
