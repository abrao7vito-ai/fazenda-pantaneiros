import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { X, User, Key, ShieldCheck, Check, AlertCircle } from 'lucide-react';

export function EditProfileModal({ isOpen, onClose }) {
  const { currentUser, updateMember, companies, currentRole } = useFarm();

  const [name, setName] = useState(currentUser?.name || '');
  const [passport, setPassport] = useState(currentUser?.passport || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '👑');
  const [companyId, setCompanyId] = useState(currentUser?.companyId || 'comp-fazenda');

  // PIN change fields
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const isMaster = currentRole === 'master';
  const avatars = ['⚡', '👑', '👔', '🌾', '🤠', '🚜', '🌱', '🐴', '⭐'];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('O nome do titular é obrigatório.');
      return;
    }

    const updates = {
      name: name.trim(),
      passport: passport.trim(),
      phone: phone.trim(),
      avatar,
    };

    if (currentUser?.role !== 'master' && companyId) {
      updates.companyId = companyId;
    }

    // If attempting to change PIN
    if (newPin || confirmNewPin || currentPinInput) {
      if (currentUser?.pin && currentPinInput !== currentUser.pin) {
        setErrorMsg('O PIN atual informado está incorreto.');
        return;
      }

      if (!newPin || newPin.length < 4) {
        setErrorMsg('O novo PIN deve conter no mínimo 4 dígitos.');
        return;
      }

      if (newPin !== confirmNewPin) {
        setErrorMsg('A confirmação do novo PIN não confere.');
        return;
      }

      updates.pin = newPin.trim();
    }

    if (currentUser?.id) {
      updateMember(currentUser.id, updates);
    }
    setSuccessMsg('Perfil e credenciais atualizados com sucesso!');

    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
              {avatar}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Meu Perfil & Segurança</h3>
              <p className="text-xs text-stone-500">Altere seu nome, passaporte e PIN de acesso</p>
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
          
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Avatar selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Ícone / Avatar:
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {avatars.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setAvatar(av)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                    avatar === av
                      ? 'bg-amber-100 border-amber-400 scale-110 shadow-sm'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nome de Exibição: *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Seu Nome Real / Dono"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Passport */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Passaporte / ID:
              </label>
              <input
                type="text"
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                placeholder="Ex: 01"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Telefone / Rádio:
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (67) 9999-9999"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          {/* Company selector (if Master or editing non-master profile) */}
          {isMaster && currentUser?.role !== 'master' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Empresa de Lotação:
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:bg-white focus:border-amber-400 outline-none cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Change PIN Accordion / Section */}
          <div className="pt-3 border-t border-stone-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span>Alterar Meu PIN de Acesso (Opcional)</span>
            </div>
            
            <p className="text-[11px] text-stone-500">
              Deixe em branco caso não queira alterar seu PIN atual.
            </p>

            {currentUser?.pin && (
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  PIN Atual:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  placeholder="Digite seu PIN atual"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Novo PIN:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Ex: 5821"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Confirmar Novo PIN:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value)}
                  placeholder="Repita o novo PIN"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-amber-400 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm transition-all"
            >
              Salvar Alterações
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
