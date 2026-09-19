import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols, formatDateBR, generateReportMessage } from '../../utils/formatters';
import { sendCashFlowDiscordLog } from '../../utils/discordWebhook';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Calendar,
  User
} from 'lucide-react';

export function TransactionList() {
  const { transactions, deleteTransaction, currentRole, members, discordSettings } = useFarm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [sentDiscordId, setSentDiscordId] = useState(null);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.category && tx.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'all' ? true : tx.type === filterType;
    const matchesMember = filterMember === 'all' ? true : tx.memberId === filterMember;

    return matchesSearch && matchesType && matchesMember;
  });

  const handleCopyFormatted = async (tx) => {
    const text = generateReportMessage({
      type: tx.type,
      amount: tx.amount,
      personName: tx.memberName,
      totalBoxBalance: tx.boxBalanceAfter,
      date: tx.date,
      category: tx.category,
      description: tx.description,
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(tx.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendDiscord = async (tx) => {
    if (!discordSettings?.webhookUrl) {
      alert('Configure a URL do Webhook do Discord na opção "Logs no Discord" na barra lateral.');
      return;
    }
    const res = await sendCashFlowDiscordLog(discordSettings.webhookUrl, {
      type: tx.type,
      amount: tx.amount,
      personName: tx.memberName,
      totalBoxBalance: tx.boxBalanceAfter,
      date: tx.date,
      category: tx.category,
      description: tx.description,
    });
    if (res.success) {
      setSentDiscordId(tx.id);
      setTimeout(() => setSentDiscordId(null), 2500);
    } else {
      alert(res.error || 'Erro ao enviar para o Discord.');
    }
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-card">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>📜 Histórico de Movimentações do Caixa</span>
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {filteredTransactions.length} registros
            </span>
          </h3>
          <p className="text-xs text-stone-500">
            Registro oficial de entradas e saídas de DOLS no caixa da fazenda
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-400 outline-none"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700 focus:bg-white focus:border-amber-400 outline-none"
          >
            <option value="all">Todos os Tipos</option>
            <option value="income">🟢 Entradas (Adicionado)</option>
            <option value="expense">🔴 Saídas (Retirado)</option>
          </select>

          {/* Member Filter */}
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700 focus:bg-white focus:border-amber-400 outline-none"
          >
            <option value="all">Todos os Integrantes</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="mt-4 overflow-x-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-sm">
            Nenhuma movimentação encontrada com os filtros selecionados.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-[11px] font-mono uppercase tracking-wider text-stone-400">
                <th className="py-3 px-3">Tipo & Data</th>
                <th className="py-3 px-3">Quem Lançou</th>
                <th className="py-3 px-3">Categoria / Detalhe</th>
                <th className="py-3 px-3 text-right">Valor em DOLS</th>
                <th className="py-3 px-3 text-right">Saldo Caixa Pós</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors group">
                    
                    {/* Type & Date */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">
                            {isIncome ? 'Adicionado ao Caixa' : 'Retirado do Caixa'}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            {formatDateBR(tx.date)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Member */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-stone-700">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>{tx.memberName}</span>
                      </div>
                    </td>

                    {/* Category & Description */}
                    <td className="py-3 px-3">
                      <div>
                        <span className="inline-block font-medium px-2 py-0.5 rounded text-[11px] bg-stone-100 text-stone-700 border border-stone-200">
                          {tx.category || (isIncome ? 'Receita' : 'Despesa')}
                        </span>
                        {tx.description && (
                          <div className="text-[11px] text-stone-500 truncate max-w-xs mt-0.5">
                            {tx.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isIncome ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatDols(tx.amount)}
                      </span>
                    </td>

                    {/* Balance After */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-xs font-semibold text-stone-800">
                      {formatDols(tx.boxBalanceAfter || 0)}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Copy Format button */}
                        <button
                          onClick={() => handleCopyFormatted(tx)}
                          title="Copiar formato Discord/WhatsApp"
                          className={`p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 ${
                            copiedId === tx.id
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                          }`}
                        >
                          {copiedId === tx.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[10px] font-bold">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-500" />
                              <span className="text-[10px] hidden lg:inline">Copiar Relatório</span>
                            </>
                          )}
                        </button>

                        {/* Discord Webhook Button */}
                        {discordSettings?.webhookUrl && (
                          <button
                            onClick={() => handleSendDiscord(tx)}
                            title="Enviar este lançamento para o Discord"
                            className={`p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 ${
                              sentDiscordId === tx.id
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]/25'
                            }`}
                          >
                            {sentDiscordId === tx.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[10px] font-bold">Enviado!</span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs leading-none">🎮</span>
                                <span className="text-[10px] hidden xl:inline font-semibold">Discord</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Delete button (only for owners or managers) */}
                        {(currentRole === 'owner' || currentRole === 'manager') && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir este lançamento de ${formatDols(tx.amount)}?`)) {
                                deleteTransaction(tx.id);
                              }
                            }}
                            title="Remover lançamento"
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 border border-stone-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
