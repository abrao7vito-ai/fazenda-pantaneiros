import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatFullDateBR } from '../../utils/formatters';
import { 
  CheckCircle2, 
  Clock, 
  Wheat, 
  User, 
  Check, 
  PackageCheck
} from 'lucide-react';

export function DeliveryValidationList() {
  const { 
    deliveries, 
    confirmDelivery, 
    rejectDelivery, 
    currentRole, 
    currentUser 
  } = useFarm();

  const [copiedMsg, setCopiedMsg] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const canValidate = currentRole === 'owner' || currentRole === 'manager';

  const pendingList = deliveries.filter((d) => d.status === 'pending');
  const historyList = deliveries.filter((d) => d.status !== 'pending');

  const handleConfirm = async (deliveryId) => {
    const result = confirmDelivery(deliveryId);
    if (result?.discordConfirmation) {
      try {
        await navigator.clipboard.writeText(result.discordConfirmation);
        setCopiedMsg(result.discordConfirmation);
        setTimeout(() => setCopiedMsg(null), 3500);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRejectSubmit = (e, deliveryId) => {
    e.preventDefault();
    rejectDelivery(deliveryId, rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* Pending Validation Section */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Clock className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-stone-900">
                Entregas Aguardando Confirmação do Gerente
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {pendingList.length} pendente{pendingList.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              O membro informa a entrega de sacas e o Gerente confere para creditar na meta
            </p>
          </div>
        </div>

        {/* Copied notification toast */}
        {copiedMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3 animate-fadeIn shadow-sm">
            <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Recebimento confirmado! <strong>Mensagem copiada para a área de transferência.</strong></span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Copiado ✓</span>
          </div>
        )}

        {/* Pending Items List */}
        <div className="mt-4 space-y-3">
          {pendingList.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-xs">
              Nenhuma entrega de sacas aguardando confirmação no momento.
            </div>
          ) : (
            pendingList.map((delivery) => {
              return (
                <div
                  key={delivery.id}
                  className="bg-[#fcfbf7] border border-stone-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-amber-300 shadow-sm"
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#f5ecdd] border border-[#dfc3a3] flex items-center justify-center text-2xl shrink-0">
                      🌾
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-mono font-extrabold text-stone-900">
                          +{delivery.quantity} {delivery.itemType}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          ⏳ Aguardando Gerente
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-stone-600 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 font-semibold text-stone-900">
                          <User className="w-3.5 h-3.5 text-stone-400" />
                          <span>Entregue por: {delivery.memberName}</span>
                        </div>
                        <div className="text-stone-500">
                          <span>Para: </span>
                          <strong className="text-blue-700">{delivery.managerName}</strong>
                        </div>
                      </div>

                      {delivery.notes && (
                        <div className="mt-1.5 text-xs text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200 italic">
                          "{delivery.notes}"
                        </div>
                      )}

                      <div className="mt-1 text-[10px] text-stone-400 font-mono">
                        Enviado em: {formatFullDateBR(delivery.submittedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Validation Actions (Gerente ou Dono) */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {canValidate ? (
                      <>
                        {rejectingId === delivery.id ? (
                          <form onSubmit={(e) => handleRejectSubmit(e, delivery.id)} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              required
                              placeholder="Motivo da recusa..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-40 bg-white border border-rose-300 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 outline-none"
                            />
                            <button
                              type="submit"
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
                            >
                              Recusar
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingId(null)}
                              className="px-2 py-1.5 bg-stone-200 text-stone-700 rounded-xl text-xs"
                            >
                              X
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              onClick={() => setRejectingId(delivery.id)}
                              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 text-xs font-semibold transition-colors"
                            >
                              Recusar
                            </button>

                            <button
                              onClick={() => handleConfirm(delivery.id)}
                              className="px-4 py-2 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Confirmar Recebimento (✓)</span>
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-stone-500 italic">
                        Apenas o Gerente ou Dono pode confirmar
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* History of Confirmed / Processed Deliveries */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <span>Histórico de Entregas Validadas</span>
          </h4>
          <span className="text-xs font-mono text-stone-400">
            {historyList.length} registros
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          {historyList.length === 0 ? (
            <div className="text-center py-6 text-stone-400 text-xs">
              Nenhuma entrega concluída no histórico recente.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Membro Produtor</th>
                  <th className="py-2.5 px-3">Qtd / Produto</th>
                  <th className="py-2.5 px-3">Gerente que Conferiu</th>
                  <th className="py-2.5 px-3">Data da Validação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {historyList.map((d) => {
                  const isConfirmed = d.status === 'confirmed';
                  return (
                    <tr key={d.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isConfirmed ? '✓ Confirmada' : '✕ Recusada'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-stone-900">
                        {d.memberName}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-800">
                        {d.quantity} {d.itemType}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        {d.confirmedBy || d.managerName}
                      </td>
                      <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">
                        {formatFullDateBR(d.confirmedAt || d.submittedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
