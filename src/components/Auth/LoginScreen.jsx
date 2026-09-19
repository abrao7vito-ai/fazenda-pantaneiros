import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { 
  Lock, 
  Key, 
  LogIn, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Wheat, 
  Eye, 
  EyeOff, 
  Sparkles 
} from 'lucide-react';

export function LoginScreen() {
  const { members, login, logoutReason } = useFarm();

  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const res = login({
      memberId: selectedMemberId,
      pin,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Falha ao autenticar.');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'manager':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex items-center justify-center p-4 sm:p-6 text-stone-800 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Background ambient elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-clean">
        
        {/* Farm Logo & Title */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <img
              src="/logo_pantaneiros.jpg"
              alt="Logo Fazenda Pantaneiros"
              className="w-20 h-20 rounded-3xl mx-auto object-cover ring-4 ring-ouro-500/30 shadow-md border border-stone-200"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pantanal-700 ring-2 ring-white flex items-center justify-center text-white text-xs">
              🌾
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-pantanal-800 uppercase tracking-widest px-2 py-0.5 rounded-full bg-pantanal-100 border border-pantanal-200">
              WEST FOX • CORREIO 82
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 uppercase tracking-wide mt-1.5">
              Fazenda Pantaneiros
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Autenticação & Controle de Acesso
            </p>
          </div>
        </div>

        {/* Inactivity Alert Notification */}
        {logoutReason === 'inactivity' && (
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5 animate-fadeIn">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Sessão Expirada por Inatividade:</strong> Você ficou mais de 15 minutos sem interagir no sistema. Por segurança da fazenda, faça login novamente.
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-5 p-3 rounded-2xl bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Selecione sua Conta / Integrante:
            </label>
            <div className="relative">
              <select
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-medium focus:bg-white focus:border-amber-400 outline-none transition-colors cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.avatar} {m.name} ({m.roleLabel})
                  </option>
                ))}
              </select>
            </div>

            {/* Member preview card */}
            {selectedMember && (
              <div className="mt-2 p-2.5 rounded-xl bg-[#fcfbf7] border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedMember.avatar}</span>
                  <div>
                    <div className="text-xs font-bold text-stone-900">{selectedMember.name}</div>
                    <div className="text-[10px] text-stone-500">{selectedMember.roleLabel}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadge(selectedMember.role)}`}>
                  {selectedMember.role === 'owner' ? '👑 Dono' : selectedMember.role === 'manager' ? '👔 Gerente' : '🌾 Membro'}
                </span>
              </div>
            )}
          </div>

          {/* PIN / Password */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
              <label>Senha / PIN de Acesso:</label>
              <span className="text-[10px] text-stone-600 font-mono">PIN padrão: 1234</span>
            </div>

            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                required
                maxLength={8}
                placeholder="Digite o PIN (ex: 1234)"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-10 py-2.5 text-sm font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-400 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Entrar no Sistema</span>
          </button>

        </form>

        {/* Security Inactivity Badge Footer */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-center gap-2 text-center text-[11px] text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sessão segura • <strong>Desconecta após 15 min inativo</strong></span>
        </div>

      </div>

    </div>
  );
}
