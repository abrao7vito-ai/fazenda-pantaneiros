import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols, generateOfficialPayrollDiscordReport } from '../../utils/formatters';
import { sendDiscordPayload } from '../../utils/discordWebhook';
import { 
  Crown, 
  PiggyBank, 
  Percent, 
  Users, 
  CheckCircle, 
  FileText, 
  Copy, 
  Check, 
  History,
  Send,
  Sparkles
} from 'lucide-react';

export function ProfitSplitView() {
  const { 
    currentRole, 
    totalIncome, 
    totalExpense, 
    netProfit, 
    splitSettings, 
    setSplitSettings,
    farmReserveAmount,
    managersPoolAmount,
    membersPoolAmount,
    memberPayouts,
    closeFinancialCycle,
    closedCycles,
    discordSettings
  } = useFarm();

  const [farmPercent, setFarmPercent] = useState(splitSettings.farmReservePercent);
  const [managersPercent, setManagersPercent] = useState(splitSettings.managersPercent);
  const [membersPercent, setMembersPercent] = useState(splitSettings.membersPercent);
  const [copiedPayroll, setCopiedPayroll] = useState(false);
  const [cycleTitle, setCycleTitle] = useState('');

  const isOwner = currentRole === 'owner';
  const totalPercentage = Number(farmPercent) + Number(managersPercent) + Number(membersPercent);
  const isValidSplit = totalPercentage === 100;

  const handleApplySplit = (e) => {
    e.preventDefault();
    if (!isValidSplit) {
      alert(`A soma das porcentagens deve totalizar 100%. Atualmente está em ${totalPercentage}%.`);
      return;
    }
    setSplitSettings({
      ...splitSettings,
      farmReservePercent: Number(farmPercent),
      managersPercent: Number(managersPercent),
      membersPercent: Number(membersPercent),
    });
  };

  const handleCloseCycle = () => {
    if (!window.confirm('Deseja realmente fechar o ciclo financeiro atual e registrar os pagamentos?')) {
      return;
    }
    const record = closeFinancialCycle({
      title: cycleTitle || `Fechamento Semanal ${new Date().toLocaleDateString('pt-BR')}`,
      periodNote: 'Ciclo fechado pela liderança',
    });
    alert(`Ciclo "${record.title}" registrado com sucesso no histórico!`);
    setCycleTitle('');
  };

  const [sentDiscordStatus, setSentDiscordStatus] = useState(null);

  // Generate official formatted payroll text for Discord
  const generatePayrollDiscordText = () => {
    return generateOfficialPayrollDiscordReport({
      totalIncome: totalIncome > 0 ? totalIncome : 26500,
      farmReservePercent: splitSettings.farmReservePercent || 30,
      farmReserveAmount: farmReserveAmount > 0 ? farmReserveAmount : 7950,
      payrollPercent: 70,
      payrollAmount: (totalIncome > 0 ? totalIncome : 26500) * 0.7,
      ownersText: '@Raquel Souza [70] @Vaticano',
      ownerBaseAmount: 3533.33,
      managersText: '@William Erick [69] @Abraão',
      managerBaseAmount: 2650.00,
      bonusText: '@William Erick [69] @Raquel Souza [70]',
      bonusAmount: 883.33,
      bonusPoolTotal: 2650.00,
      surplusRefund: 2650.02,
    });
  };

  const handleCopyDiscordPayroll = async () => {
    const text = generatePayrollDiscordText();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPayroll(true);
      setTimeout(() => setCopiedPayroll(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendDiscordPayroll = async () => {
    if (!discordSettings?.webhookUrl) {
      alert('Configure a URL do Webhook do Discord no botão "Logs no Discord" na barra lateral antes de enviar.');
      return;
    }
    setSentDiscordStatus('loading');
    const msg = generatePayrollDiscordText();
    const res = await sendDiscordPayload(discordSettings.webhookUrl, {
      content: msg,
    });
    if (res.success) {
      setSentDiscordStatus('success');
      setTimeout(() => setSentDiscordStatus(null), 3000);
    } else {
      setSentDiscordStatus('error');
      alert(res.error || 'Erro ao enviar para o Discord.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Clean Header for Leaders */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-700" />
              <span>Painel Exclusivo da Liderança</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Cálculo e Repartição de Lucros da Fazenda
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              O sistema calcula automaticamente o lucro líquido a partir de todas as entradas e despesas.
              Aqui os líderes definem a porcentagem retida para a empresa e a distribuição dos pagamentos da equipe.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleCopyDiscordPayroll}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all ${
                copiedPayroll
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200'
              }`}
            >
              {copiedPayroll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-stone-500" />}
              <span>{copiedPayroll ? 'Copiado para o Discord!' : 'Copiar Relatório Formatado'}</span>
            </button>

            {discordSettings?.webhookUrl && (
              <button
                onClick={handleSendDiscordPayroll}
                className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold px-4 py-3 rounded-2xl text-xs shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{sentDiscordStatus === 'success' ? 'Enviado pro Discord!' : 'Publicar no Discord'}</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={handleCloseCycle}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-3 rounded-2xl text-xs shadow-sm transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Fechar Ciclo & Pagamentos</span>
              </button>
            )}
          </div>
        </div>

        {/* Financial Net Profit Equation Card */}
        <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="bg-[#fcfbf7] p-4 rounded-2xl border border-stone-200">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider block">
              (+) Entradas Totais (Vendas)
            </span>
            <span className="text-xl font-mono font-bold text-emerald-800 mt-1 block">
              {formatDols(totalIncome)}
            </span>
            <span className="text-[10px] text-stone-400">Arrecadado pela equipe</span>
          </div>

          <div className="bg-[#fcfbf7] p-4 rounded-2xl border border-stone-200">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider block">
              (-) Despesas Operacionais
            </span>
            <span className="text-xl font-mono font-bold text-rose-800 mt-1 block">
              {formatDols(totalExpense)}
            </span>
            <span className="text-[10px] text-stone-400">Insumos e maquinário</span>
          </div>

          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-amber-900 uppercase tracking-wider font-bold">
                (=) Lucro Líquido Real da Fazenda
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                Base de Repartição
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-950 mt-1 block">
              {formatDols(netProfit)}
            </span>
            <span className="text-[10px] text-stone-500">
              Valor líquido que será dividido conforme as regras abaixo
            </span>
          </div>

        </div>
      </div>

      {/* Rules and Split Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Configuration Form */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-card space-y-5">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-600" />
              <span>Regras de Divisão de Lucro</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Ajuste as porcentagens para recalcular os repasses instantaneamente
            </p>
          </div>

          <form onSubmit={handleApplySplit} className="space-y-4">
            
            {/* Rule 1: Farm Reserve */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5 text-amber-600" />
                  <span>Caixa da Fazenda (Empresa)</span>
                </span>
                <span className="font-mono text-amber-800 font-bold">{farmPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                disabled={!isOwner}
                value={farmPercent}
                onChange={(e) => setFarmPercent(Number(e.target.value))}
                className="w-full accent-amber-600 bg-stone-100 cursor-pointer"
              />
              <div className="text-[11px] font-mono text-stone-500">
                Fica retido no cofre: <strong className="text-stone-900">{formatDols((netProfit * farmPercent) / 100)}</strong>
              </div>
            </div>

            {/* Rule 2: Managers Pool */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-blue-600" />
                  <span>Repasse p/ Gerentes</span>
                </span>
                <span className="font-mono text-blue-800 font-bold">{managersPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                disabled={!isOwner}
                value={managersPercent}
                onChange={(e) => setManagersPercent(Number(e.target.value))}
                className="w-full accent-blue-600 bg-stone-100 cursor-pointer"
              />
              <div className="text-[11px] font-mono text-stone-500">
                Pool da gerência: <strong className="text-stone-900">{formatDols((netProfit * managersPercent) / 100)}</strong>
              </div>
            </div>

            {/* Rule 3: Members Pool */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Repasse p/ Membros (Produção)</span>
                </span>
                <span className="font-mono text-emerald-800 font-bold">{membersPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                disabled={!isOwner}
                value={membersPercent}
                onChange={(e) => setMembersPercent(Number(e.target.value))}
                className="w-full accent-emerald-600 bg-stone-100 cursor-pointer"
              />
              <div className="text-[11px] font-mono text-stone-500">
                Pool dos membros: <strong className="text-stone-900">{formatDols((netProfit * membersPercent) / 100)}</strong>
              </div>
            </div>

            {/* Total check */}
            <div
              className={`p-3 rounded-2xl border text-xs font-mono flex items-center justify-between ${
                isValidSplit
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <span>Soma Total: {totalPercentage}%</span>
              <span className="font-bold">{isValidSplit ? '✓ 100% Válido' : 'Deve somar exatamente 100%'}</span>
            </div>

            {isOwner && (
              <button
                type="submit"
                disabled={!isValidSplit}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isValidSplit
                    ? 'bg-stone-900 hover:bg-stone-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                }`}
              >
                Salvar Configurações de Divisão
              </button>
            )}

          </form>
        </div>

        {/* Right: Summary Visual Split Cards */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Box 1: Empresa */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-4 shadow-card">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase">
                <PiggyBank className="w-4 h-4 text-amber-600" />
                <span>Caixa Fazenda ({splitSettings.farmReservePercent}%)</span>
              </div>
              <div className="mt-3 text-2xl font-mono font-extrabold text-stone-900">
                {formatDols(farmReserveAmount)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Fundo de reserva para sementes, compras de maquinário e expansão.
              </p>
            </div>

            {/* Box 2: Gerentes */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-4 shadow-card">
              <div className="flex items-center gap-2 text-blue-800 text-xs font-bold uppercase">
                <Crown className="w-4 h-4 text-blue-600" />
                <span>Gerência ({splitSettings.managersPercent}%)</span>
              </div>
              <div className="mt-3 text-2xl font-mono font-extrabold text-stone-900">
                {formatDols(managersPoolAmount)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Bônus de coordenação e cumprimento de metas da gerência.
              </p>
            </div>

            {/* Box 3: Membros */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-4 shadow-card">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Membros ({splitSettings.membersPercent}%)</span>
              </div>
              <div className="mt-3 text-2xl font-mono font-extrabold text-stone-900">
                {formatDols(membersPoolAmount)}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Repartição proporcional à produção entregue por cada vaqueiro/membro.
              </p>
            </div>

          </div>

          {/* Payroll Breakdown Table */}
          <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-card overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Demonstrativo de Pagamentos da Equipe</span>
                </h4>
                <p className="text-xs text-stone-500">
                  Calculado a partir do lucro e da participação de cada um
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Total Distribuído: {formatDols(netProfit)}
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-[10px] font-mono uppercase tracking-wider text-stone-400">
                    <th className="py-2.5 px-3">Integrante</th>
                    <th className="py-2.5 px-3">Cargo</th>
                    <th className="py-2.5 px-3 text-right">Adicionou ao Caixa</th>
                    <th className="py-2.5 px-3 text-center">Metas</th>
                    <th className="py-2.5 px-3 text-right">% do Lucro</th>
                    <th className="py-2.5 px-3 text-right">Pagamento a Receber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {memberPayouts.map((p) => {
                    const isMgr = p.member.role === 'manager';
                    const isO = p.member.role === 'owner';

                    return (
                      <tr key={p.member.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-stone-900 flex items-center gap-2">
                          <span className="text-base">{p.member.avatar}</span>
                          <span>{p.member.name}</span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isO
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : isMgr
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {p.member.roleLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-stone-700">
                          {formatDols(p.totalIncomeAdded)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                            {p.goalsCompleted} concluída(s)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-stone-500">
                          {p.sharePercentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-stone-900 text-sm">
                          {formatDols(p.estimatedPayout)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Official Discord Report Preview Card */}
          <div className="bg-[#1e1f22] text-stone-100 rounded-3xl p-6 shadow-xl border border-stone-800 font-mono text-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-700/80">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🌾</span>
                <div>
                  <h4 className="font-bold text-sm text-ouro-400 font-sans">Modelo Oficial do Relatório para o Discord</h4>
                  <p className="text-[11px] text-stone-400 font-sans">Texto formatado exatamente no padrão utilizado pela Fazenda Pantaneiros</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDiscordPayroll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ouro-500/20 hover:bg-ouro-500/30 text-ouro-300 border border-ouro-500/30 text-xs font-bold transition-all"
                >
                  {copiedPayroll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPayroll ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
                {discordSettings?.webhookUrl && (
                  <button
                    onClick={handleSendDiscordPayroll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sentDiscordStatus === 'success' ? 'Enviado!' : 'Publicar no Discord'}</span>
                  </button>
                )}
              </div>
            </div>

            <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-stone-300 overflow-x-auto p-4 bg-[#141517] rounded-2xl border border-stone-800 selection:bg-ouro-500/30">
              {generatePayrollDiscordText()}
            </pre>
          </div>

        </div>

      </div>

      {/* Closed Financial Cycles History */}
      {closedCycles.length > 0 && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-card">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-stone-400" />
            <span>Histórico de Ciclos Fechados ({closedCycles.length})</span>
          </h3>
          <div className="space-y-3">
            {closedCycles.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-stone-900 text-sm">{c.title}</div>
                  <div className="text-stone-500 text-[11px] mt-0.5">
                    Fechado por {c.closedBy} em {new Date(c.date).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-stone-500">Lucro Apurado:</span>{' '}
                    <strong className="text-emerald-700">{formatDols(c.netProfit)}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500">Caixa Fazenda:</span>{' '}
                    <strong className="text-amber-800">{formatDols(c.farmReserveAmount)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
