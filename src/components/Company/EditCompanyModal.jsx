import React, { useState, useEffect } from 'react';
import { useFarm } from '../../context/FarmContext';
import { X, Building2, Sparkles, Tag, FileText, Check, Image as ImageIcon, RotateCcw } from 'lucide-react';

const SUGGESTED_ICONS = ['🌾', '🚂', '🍺', '⛏️', '🐎', '🥩', '🪵', '🏨', '🏭', '💰', '🔫', '🎣', '🍞', '🛡️', '📦'];

export function EditCompanyModal({ isOpen, onClose, company }) {
  const { updateCompany, currentCompany } = useFarm();
  const targetCompany = company || currentCompany;

  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [segment, setSegment] = useState('');
  const [icon, setIcon] = useState('🏢');
  const [unitLabel, setUnitLabel] = useState('Unidades');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (targetCompany) {
      setName(targetCompany.name || '');
      setSlogan(targetCompany.slogan || '');
      setLogoUrl(targetCompany.logoUrl || '');
      setSegment(targetCompany.segment || '');
      setIcon(targetCompany.icon || '🏢');
      setUnitLabel(targetCompany.unitLabel || 'Unidades');
      setCode(targetCompany.code || '');
      setDescription(targetCompany.description || '');
      setPreviewError(false);
    }
  }, [targetCompany, isOpen]);

  if (!isOpen || !targetCompany) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, digite o nome da empresa.');
      return;
    }

    const res = updateCompany(targetCompany.id, {
      name: name.trim(),
      slogan: slogan.trim(),
      logoUrl: logoUrl.trim(),
      segment: segment.trim() || 'Comércio & Serviços',
      icon,
      unitLabel: unitLabel.trim() || 'Unidades',
      code: code.trim() || targetCompany.code,
      description: description.trim(),
    });

    if (res && res.error) {
      alert(res.error);
      return;
    }

    onClose();
  };

  const effectiveLogo = !previewError && logoUrl.trim() ? logoUrl.trim() : '/logo_westbaron.svg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={effectiveLogo}
                alt="Logo Preview"
                onError={() => setPreviewError(true)}
                className="w-11 h-11 rounded-2xl object-cover ring-2 ring-ouro-500/30 shadow-md border border-stone-200 bg-stone-900"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 ring-2 ring-white flex items-center justify-center text-[10px]">
                {icon}
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>Editar Dados da Empresa</span>
              </h3>
              <p className="text-xs text-stone-500 truncate max-w-xs">
                {targetCompany.name} • {targetCompany.code}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
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
              placeholder="Ex: Ferrovia West Fox ou Fazenda Pantaneiros"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-medium focus:bg-white focus:border-amber-400 outline-none transition-colors"
            />
          </div>

          {/* Slogan / Lema da Empresa */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Slogan / Lema da Empresa:
            </label>
            <input
              type="text"
              placeholder="Ex: Tradição & Honra • Correio 82 ou Conectando a Fronteira"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none"
            />
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              Exibido no topo da barra lateral e em relatórios oficiais
            </span>
          </div>

          {/* Logo URL com Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700">
                Logo da Empresa (URL da Imagem):
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => { setLogoUrl(''); setPreviewError(false); }}
                  className="text-[10px] text-amber-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar Padrão WestBaron</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="Cole o link da imagem (Discord CDN, Imgur, ou deixe vazio para WestBaron)"
                value={logoUrl}
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  setPreviewError(false);
                }}
                className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none font-mono"
              />
            </div>
            <div className="flex items-center gap-2 mt-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200">
              <img
                src={effectiveLogo}
                alt="Logo Atual"
                onError={() => setPreviewError(true)}
                className="w-7 h-7 rounded-lg object-cover border border-stone-300 bg-stone-900 shrink-0"
              />
              <span className="text-[11px] text-stone-500">
                {!logoUrl.trim() 
                  ? '🏛️ Usando a logo oficial do WestBaron como padrão.' 
                  : previewError 
                  ? '⚠️ Link inválido ou imagem inacessível. Usando WestBaron como reserva.' 
                  : '✓ Logo personalizada configurada para esta empresa!'}
              </span>
            </div>
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
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all border cursor-pointer ${
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

          {/* Unidade de Produção */}
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
          <div className="flex gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
