import React from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols } from '../../utils/formatters';
import { X, Trash2, AlertTriangle, UserX } from 'lucide-react';

export function DeleteAccountModal({ isOpen, onClose, memberToDelete }) {
  const { deleteMember, memberPayouts } = useFarm();

  if (!isOpen || !memberToDelete) return null;

  const stats = memberPayouts.find((p) => p.member.id === memberToDelete.id);

  const handleConfirmDelete = () => {
    deleteMember(memberToDelete.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-rose-50/50">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Excluir Conta • {memberToDelete?.name}</h3>
              <p className="text-xs text-rose-700/80">Esta ação não poderá ser desfeita</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          <div className="p-4 rounded-2xl bg-[#fcfbf7] border border-stone-200 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-2xl shadow-inner">
              {memberToDelete.avatar}
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900">{memberToDelete.name}</div>
              <div className="text-xs text-stone-500">{memberToDelete.roleLabel}</div>
              {memberToDelete.passport && (
                <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                  ID: {memberToDelete.passport}
                </div>
              )}
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Aviso de Segurança:</span> Ao excluir esta conta, o integrante não poderá mais acessar o sistema ou receber novas metas.
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block font-bold">DOLS Arrecadados</span>
                <span className="font-mono font-bold text-stone-900">{formatDols(stats.totalIncomeAdded)}</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase block font-bold">Sacas Entregues</span>
                <span className="font-mono font-bold text-stone-900">{stats.sacksDelivered || 0} sacas</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sim, Excluir Conta</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
