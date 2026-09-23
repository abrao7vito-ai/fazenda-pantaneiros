import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { 
  Lock, 
  Key, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function FirstAccessScreen({ inviteToken, memberTarget, forcedResetUser, onCompleted, onCancel }) {
  const { 
    completeFirstAccess, 
    validateInviteToken, 
    currentCompany, 
    companies, 
    currentUser, 
    mustChangePasswordUser, 
    logout 
  } = useFarm();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If passed an invite token via URL, find matching member. Otherwise use target/current member.
  const member = memberTarget 
    || forcedResetUser 
    || mustChangePasswordUser 
    || currentUser 
    || (inviteToken ? validateInviteToken(inviteToken)?.member : null);

  const memberCompany = companies?.find(c => c.id === member?.companyId) || currentCompany;
  const isForcedReset = Boolean(forcedResetUser || mustChangePasswordUser || (!inviteToken && (memberTarget || currentUser)));

  if (inviteToken && (!member || validateInviteToken(inviteToken)?.valid === false)) {
    const errorDetails = validateInviteToken(inviteToken)?.error || 'Convite expirado ou inválido.';
    return (
      <div className="min-h-screen bg-[#fcfbf7] flex items-center justify-center p-4 sm:p-6 text-stone-800 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="relative w-full max-w-md bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-card text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-2xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Convite Indisponível</h2>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            {errorDetails} Por segurança, os convites de acesso possuem validade limitada de 24 horas.
          </p>
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 text-left mb-6">
            <strong>O que fazer?</strong>
            <p className="mt-1 text-[11px] text-stone-500">
              Entre em contato com o Dono ou Gerente da sua empresa para que ele gere um novo link de acesso para você.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
              window.location.reload();
            }}
            className="w-full py-3 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Voltar para a Tela de Login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const targetMemberId = member?.id || mustChangePasswordUser?.id || currentUser?.id;
    if (!targetMemberId && !inviteToken) {
      setErrorMsg('Não foi possível identificar o usuário para redefinição. Faça login novamente.');
      return;
    }

    const cleanPin = pin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8) {
      setErrorMsg('O seu PIN pessoal deve conter entre 4 e 8 dígitos ou caracteres.');
      return;
    }

    if (cleanPin === '1234') {
      setErrorMsg('Por segurança, você não pode usar o PIN padrão "1234". Escolha uma senha pessoal única.');
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setErrorMsg('A confirmação do PIN não confere com o PIN digitado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await completeFirstAccess({
        memberId: targetMemberId,
        newPin: cleanPin,
        inviteToken,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Erro ao definir senha pessoal.');
      } else {
        if (onCompleted) onCompleted(res.member);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro de comunicação ao salvar senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex items-center justify-center p-4 sm:p-6 text-stone-800 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-card">
        
        {/* Brand / Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-800 font-extrabold text-2xl shadow-inner mb-3">
            {memberCompany?.icon || '🌾'}
          </div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">
            {isForcedReset ? 'Redefinição Obrigatória de Senha' : 'Primeiro Acesso • Ativação de Conta'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {isForcedReset
              ? 'Para a segurança da sua conta, defina sua nova senha pessoal antes de acessar'
              : 'Defina seu PIN pessoal confidencial para acessar o sistema'}
          </p>
        </div>

        {/* Member Profile Badge */}
        {member && (
          <div className="mb-6 p-3.5 bg-stone-50 border border-stone-200/80 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl shrink-0">
              {member.avatar || '🌾'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900 truncate">
                  {member.name}
                </span>
                {member.passport && (
                  <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] font-mono font-bold">
                    ID #{member.passport}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 truncate">
                {memberCompany?.name} • {member.role === 'owner' ? 'Líder / Dono' : member.role === 'manager' ? 'Gerente' : 'Membro'}
              </p>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* New PIN */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Crie seu PIN / Senha Pessoal (mínimo 4 dígitos): *
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                required
                maxLength={16}
                autoComplete="new-password"
                placeholder="Ex: 8492"
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Confirme seu PIN Pessoal: *
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                required
                maxLength={16}
                autoComplete="new-password"
                placeholder="Repita exatamente o mesmo PIN"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-10 py-2.5 text-sm font-mono font-bold text-stone-900 focus:bg-white focus:border-amber-400 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Dica de Segurança:</span>
            </div>
            <p>Guarde este PIN com você. Ele é sua chave pessoal para registrar produções, cargas e acessar o painel.</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all mt-2 ${
              isSubmitting
                ? 'bg-pantanal-600/70 cursor-not-allowed'
                : 'bg-pantanal-700 hover:bg-pantanal-800 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
            }`}
          >
            <span>{isSubmitting ? 'Salvando Senha...' : 'Salvar Senha e Entrar no Painel'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                if (onCancel) {
                  onCancel();
                } else if (logout) {
                  logout('user');
                }
              }}
              className="text-stone-400 hover:text-stone-700 text-xs font-semibold underline transition-colors cursor-pointer"
            >
              Sair da conta / Entrar como outro usuário
            </button>
          </div>

        </form>

        {/* Security Inactivity Badge Footer */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-center gap-2 text-center text-[11px] text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Conexão criptografada • Seu PIN não é compartilhado com ninguém</span>
        </div>

      </div>
    </div>
  );
}
