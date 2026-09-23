import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols } from '../../utils/formatters';
import { CreateAccountModal } from '../Accounts/CreateAccountModal';
import { DeleteAccountModal } from '../Accounts/DeleteAccountModal';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Briefcase, 
  Wheat, 
  Crown, 
  Phone, 
  IdCard, 
  CheckCircle2, 
  Search,
  Filter,
  Key,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  Link2,
  X
} from 'lucide-react';

export function MemberManager() {
  const { 
    members, 
    activeCompanyMembers,
    currentCompany,
    companies,
    memberPayouts, 
    currentRole, 
    currentUser, 
    updateMember,
    regenerateInviteToken
  } = useFarm();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [inviteModalData, setInviteModalData] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'manager' | 'member' | 'owner'
  const [companyFilter, setCompanyFilter] = useState('current'); // 'current' | 'all' | companyId
  const [searchQuery, setSearchQuery] = useState('');

  const isMaster = currentRole === 'master';
  const canManage = currentRole === 'owner' || currentRole === 'manager' || isMaster;

  // Se for master e selecionar 'all', mostra tudo; caso contrário, foca na empresa ativa
  const baseMembersList = isMaster && companyFilter === 'all'
    ? members
    : isMaster && companyFilter !== 'current'
    ? members.filter((m) => m.role === 'master' || m.companyId === 'all' || m.companyId === companyFilter)
    : activeCompanyMembers;

  // Count stats
  const totalCount = baseMembersList.length;
  const managersCount = baseMembersList.filter((m) => m.role === 'manager').length;
  const membersCount = baseMembersList.filter((m) => m.role === 'member').length;

  const filteredMembers = (baseMembersList || []).filter((m) => {
    if (!m) return false;
    const matchesFilter = activeFilter === 'all' ? true : m.role === activeFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesFilter;

    const matchesSearch = 
      (m.name || '').toLowerCase().includes(q) ||
      String(m.passport || '').toLowerCase().includes(q) ||
      String(m.phone || '').toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const handleRegenerateInvite = async (targetMember) => {
    const res = await regenerateInviteToken(targetMember.id);
    if (res && res.success) {
      setInviteModalData({
        member: targetMember,
        inviteToken: res.inviteToken,
        inviteExpiresAt: res.inviteExpiresAt,
      });
      setInviteCopied(false);
    } else {
      alert(`⚠️ ${res?.error || 'Não foi possível gerar o link de convite.'}`);
    }
  };

  const handleCopyInviteModal = () => {
    if (!inviteModalData?.inviteToken) return;
    const url = `${window.location.origin}/?convite=${inviteModalData.inviteToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3000);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-amber-700" />
              <span>Quadro de Funcionários • {currentCompany?.name}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Equipe de {currentCompany?.name}
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Cada empresa opera com seu quadro de funcionários separado. Crie novas contas de Dono, Gerente ou Membros vinculadas diretamente a <strong>{currentCompany?.name}</strong>.
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Contratar p/ {currentCompany?.name}</span>
            </button>
          )}
        </div>

        {/* Quick summary strip */}
        <div className="mt-6 pt-5 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#fcfbf7] p-3.5 rounded-2xl border border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                👔
              </div>
              <div>
                <div className="font-bold text-stone-900">Gerentes Cadastrados</div>
                <div className="text-[11px] text-stone-500">Coordenam metas da empresa</div>
              </div>
            </div>
            <span className="text-base font-mono font-bold text-stone-900">{managersCount}</span>
          </div>

          <div className="bg-[#fcfbf7] p-3.5 rounded-2xl border border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                🌾
              </div>
              <div>
                <div className="font-bold text-stone-900">Membros Produtores</div>
                <div className="text-[11px] text-stone-500">Executam tarefas de {currentCompany?.unitLabel}</div>
              </div>
            </div>
            <span className="text-base font-mono font-bold text-stone-900">{membersCount}</span>
          </div>

          <div className="bg-[#fcfbf7] p-3.5 rounded-2xl border border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                👥
              </div>
              <div>
                <div className="font-bold text-stone-900">Total na Empresa</div>
                <div className="text-[11px] text-stone-500">Quadro ativo exclusivo</div>
              </div>
            </div>
            <span className="text-base font-mono font-bold text-stone-900">{totalCount}</span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Role Filters */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-stone-200 shadow-card flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-stone-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Todos ({totalCount})
          </button>

          <button
            onClick={() => setActiveFilter('manager')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'manager'
                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>👔 Gerentes ({managersCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('member')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'member'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>🌾 Membros ({membersCount})</span>
          </button>

          {/* Master Holding Switcher for viewing any company's staff */}
          {isMaster && (
            <div className="pl-2 border-l border-stone-200 flex items-center gap-1">
              <span className="text-[10px] text-stone-400 font-bold uppercase">Holding:</span>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-stone-100 border border-stone-200 rounded-lg px-2 py-1 text-xs font-semibold text-stone-700 outline-none"
              >
                <option value="current">Empresa Ativa ({currentCompany?.name})</option>
                <option value="all">⚡ Todos os Negócios (Global)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por nome, passaporte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-400 outline-none shadow-card"
          />
        </div>

      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const isCurrent = currentUser.id === member.id;
          const isMemberMaster = member.role === 'master';
          const isOwner = member.role === 'owner';
          const isManager = member.role === 'manager';
          const stats = (memberPayouts || []).find((p) => p?.member?.id === member.id);

          return (
            <div
              key={member.id}
              className={`bg-white border rounded-3xl p-5 shadow-card flex flex-col justify-between transition-all hover:shadow-clean ${
                isCurrent
                  ? 'border-amber-400 ring-2 ring-amber-300/40'
                  : 'border-stone-200/90'
              }`}
            >
              <div>
                
                {/* Header: Role Badge + Current indicator */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isMemberMaster
                        ? 'bg-purple-50 text-purple-900 border-purple-300 font-extrabold'
                        : isOwner
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : isManager
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isMemberMaster
                      ? '⚡ Administrador Master'
                      : isOwner
                      ? '👑 Líder da Fazenda'
                      : isManager
                      ? '👔 Gerente'
                      : '🌾 Membro Produtor'}
                  </span>

                  {isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-700" />
                      <span>Sua Conta Ativa</span>
                    </span>
                  )}
                </div>

                {/* Avatar & Name */}
                <div className="mt-4 flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-2xl shadow-inner shrink-0">
                    {member.avatar}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-stone-900 truncate">
                      {member.name}
                    </h4>
                    <p className="text-xs text-stone-500 truncate">{member.roleLabel}</p>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-stone-500 font-mono">
                      {member.companyId && member.companyId !== 'all' && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold">
                          {companies.find((c) => c.id === member.companyId)?.icon || '🏢'} {companies.find((c) => c.id === member.companyId)?.name || 'Empresa'}
                        </span>
                      )}
                      {member.companyId === 'all' && (
                        <span className="bg-purple-50 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold">
                          ⚡ Todas as Empresas
                        </span>
                      )}
                      {member.passport && (
                        <span className="bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                          ID: {member.passport}
                        </span>
                      )}
                      {member.phone && (
                        <span className="bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Production and Cash Flow Stats */}
                <div className="mt-4 p-3 bg-[#fcfbf7] rounded-2xl border border-stone-200/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 font-semibold block uppercase">Sacas Entregues</span>
                    <span className="font-mono font-bold text-stone-900">
                      {stats?.sacksDelivered || 0} sacas
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-semibold block uppercase">DOLS no Caixa</span>
                    <span className="font-mono font-bold text-stone-900">
                      {formatDols(stats?.totalIncomeAdded || 0)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Card Footer: Protected Account Status & Admin Actions */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
                
                {isCurrent ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 text-amber-900 font-bold border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Sua Conta Conectada</span>
                  </div>
                ) : member.firstAccessDone ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PIN Ativo</span>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Aguardando 1º Acesso</span>
                  </div>
                )}

                {/* Leader Actions for other members */}
                {canManage && !isCurrent && (
                  <div className="flex items-center gap-1">
                    {/* Regenerate / Send Invite Link button */}
                    <button
                      onClick={() => handleRegenerateInvite(member)}
                      title={`Gerar Link de Convite / Redefinir Senha de ${member.name}`}
                      className="p-2 rounded-xl text-stone-400 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>

                    {/* Delete Account button (Master can delete ANY owner, manager or member. Owners cannot delete other owners) */}
                    {!isMemberMaster && (isMaster || !isOwner) && (
                      <button
                        onClick={() => setMemberToDelete(member)}
                        title={`Excluir conta de ${member.name}`}
                        className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

              </div>

            </div>
          );
        })}
      </div>

      {/* Modals */}
      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <DeleteAccountModal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        memberToDelete={memberToDelete}
      />

      {/* Invite & First Access Link Modal */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Link de Convite & 1º Acesso</h3>
                  <p className="text-xs text-stone-500">{inviteModalData.member.name}</p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalData(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Link Exclusivo (Válido por 24 Horas):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?convite=${inviteModalData.inviteToken}`}
                  className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 font-mono select-all outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyInviteModal}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                    inviteCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{inviteCopied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Como funciona:</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Envie este link para <strong>{inviteModalData.member.name}</strong>. Ao abrir o link, ele definirá seu PIN pessoal e terá o acesso liberado automaticamente. O link expira em 24h e é de uso único.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setInviteModalData(null)}
              className="w-full py-2.5 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs transition-colors shadow-sm"
            >
              Concluir e Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
