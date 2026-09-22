import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { X, UserPlus, Shield, Wheat, Briefcase, Sparkles, Key } from 'lucide-react';

export function CreateAccountModal({ isOpen, onClose }) {
  const { addMember, companies, currentCompanyId, currentCompany, currentRole } = useFarm();
  const isMaster = currentRole === 'master';

  const [companyId, setCompanyId] = useState(currentCompanyId || 'comp-fazenda');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member'); // 'member' | 'manager' | 'owner'
  const [passport, setPassport] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState('🌾');

  if (!isOpen) return null;

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'owner') {
      setAvatar('👑');
    } else if (newRole === 'manager') {
      setAvatar('👔');
    } else {
      setAvatar('🌾');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome do integrante.');
      return;
    }

    addMember({
      name: name.trim(),
      role,
      avatar,
      passport: passport.trim(),
      phone: phone.trim(),
      pin: pin.trim(),
      companyId: isMaster ? companyId : (currentCompany?.id || currentCompanyId || 'comp-fazenda'),
    });

    // Reset and close
    setName('');
    setPassport('');
    setPhone('');
    setPin('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Criar Nova Conta na Fazenda</h3>
              <p className="text-xs text-stone-500">Cadastre uma nova conta de Gerente ou Membro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Company Target Selector */}
          {isMaster ? (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Empresa / Negócio do Funcionário: *
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:border-amber-400 outline-none transition-colors cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name} ({c.segment})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-stone-500 mt-1">
                Como Administrador Master, você pode vincular este funcionário a qualquer empresa.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#fcfbf7] border border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-xl shadow-xs">
                  {currentCompany?.icon || '🏢'}
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">{currentCompany?.name}</div>
                  <div className="text-[10px] text-stone-500">Contratação vinculada exclusivamente à sua empresa</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                Sua Empresa
              </span>
            </div>
          )}

          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Tipo da Conta / Nível de Acesso: *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Owner Option */}
              <button
                type="button"
                onClick={() => handleRoleChange('owner')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  role === 'owner'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm ring-1 ring-amber-400'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>👑 Conta de Dono</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                  Acesso total ao painel da empresa, caixas e lucros
                </div>
              </button>

              {/* Manager Option */}
              <button
                type="button"
                onClick={() => handleRoleChange('manager')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  role === 'manager'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm ring-1 ring-blue-400'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Briefcase className="w-4 h-4 text-blue-700" />
                  <span>👔 Conta de Gerente</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                  Pode criar metas para os membros e validar entregas
                </div>
              </button>

              {/* Member Option */}
              <button
                type="button"
                onClick={() => handleRoleChange('member')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  role === 'member'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm ring-1 ring-emerald-400'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Wheat className="w-4 h-4 text-emerald-700" />
                  <span>🌾 Conta de Membro</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                  Executa metas de produção e informa entregas
                </div>
              </button>

            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nome do Integrante: *
            </label>
            <input
              type="text"
              required
              placeholder={role === 'manager' ? 'Ex: Carlos Silva (Gerente)' : 'Ex: Tonho Vaqueiro'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none transition-colors"
            />
          </div>

          {/* Passport / ID & Phone / Radio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Passaporte / ID RP (opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: #1082"
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Telefone / Rádio da Fazenda:
              </label>
              <input
                type="text"
                placeholder="Ex: Rádio 82.5"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none transition-colors"
              />
            </div>
          </div>

          {/* PIN / Senha de Acesso */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Senha / PIN de Acesso (4 dígitos):
            </label>
            <input
              type="password"
              maxLength={8}
              placeholder="Padrão: 1234"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-amber-400 outline-none transition-colors font-mono"
            />
            <p className="text-[10px] text-stone-500 mt-1">
              Se deixar vazio, o PIN padrão será <strong>1234</strong>.
            </p>
          </div>

          {/* Avatar Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Escolha o Avatar / Símbolo:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {['🌾', '🚜', '🤠', '🐎', '🌱', '👔', '💼', '🐂', '🌽'].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setAvatar(icon)}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-xl transition-all ${
                    avatar === icon
                      ? 'border-ouro-500 bg-amber-50 shadow-sm ring-2 ring-ouro-400/40'
                      : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Confirmar Criação da Conta</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
