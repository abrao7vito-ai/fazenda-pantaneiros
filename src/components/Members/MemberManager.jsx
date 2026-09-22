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
  ShieldCheck
} from 'lucide-react';

export function MemberManager() {
  const { 
    members, 
    memberPayouts, 
    currentRole, 
    currentUser, 
    updateMember
  } = useFarm();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'manager' | 'member' | 'owner'
  const [searchQuery, setSearchQuery] = useState('');

  const isMaster = currentRole === 'master';
  const canManage = currentRole === 'owner' || currentRole === 'manager' || isMaster;

  // Count stats
  const totalCount = members.length;
  const managersCount = members.filter((m) => m.role === 'manager').length;
  const membersCount = members.filter((m) => m.role === 'member').length;

  const filteredMembers = members.filter((m) => {
    const matchesFilter = activeFilter === 'all' ? true : m.role === activeFilter;
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.passport && m.passport.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.phone && m.phone.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-amber-700" />
              <span>Controle de Acesso da Fazenda</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Gestão de Contas: Gerentes & Membros
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Crie novas contas de acesso para gerentes e membros da Fazenda Pantaneiros, acompanhe o desempenho individual e gerencie ou exclua contas quando necessário.
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Nova Conta</span>
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
                <div className="text-[11px] text-stone-500">Coordenam equipes e validam sacas</div>
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
                <div className="text-[11px] text-stone-500">Executam metas e entregam sacas</div>
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
                <div className="font-bold text-stone-900">Total de Integrantes</div>
                <div className="text-[11px] text-stone-500">Equipe Fazenda Pantaneiros</div>
              </div>
            </div>
            <span className="text-base font-mono font-bold text-stone-900">{totalCount}</span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Role Filters */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-stone-200 shadow-card">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-stone-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Todas as Contas ({totalCount})
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
          const stats = memberPayouts.find((p) => p.member.id === member.id);

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
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500 font-mono">
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
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-50 text-stone-600 font-semibold border border-stone-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PIN Protegido</span>
                  </div>
                )}

                {/* Leader Actions for other members */}
                {canManage && !isCurrent && (
                  <div className="flex items-center gap-1">
                    {/* Reset PIN button (only leaders can reset forgotten PIN to default 1234) */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Deseja redefinir o PIN de "${member.name}" para o padrão "1234"?`)) {
                          updateMember(member.id, { pin: '1234' });
                          alert(`O PIN de ${member.name} foi redefinido para 1234 com sucesso!`);
                        }
                      }}
                      title={`Redefinir PIN de ${member.name} para 1234`}
                      className="p-2 rounded-xl text-stone-400 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                    >
                      <Key className="w-4 h-4" />
                    </button>

                    {/* Delete Account button (canManage, not primary owner or master) */}
                    {!isOwner && !isMemberMaster && (
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

    </div>
  );
}
