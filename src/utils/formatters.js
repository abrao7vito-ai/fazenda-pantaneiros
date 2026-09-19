/**
 * Utility functions for Fazenda Pantaneiros Cash Flow & Goals System
 */

export function formatDols(value, includeCurrency = true) {
  const num = Number(value) || 0;
  const formatted = num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return includeCurrency ? `${formatted} DOLS` : formatted;
}

export function formatQuantity(value, unitLabel = '') {
  const num = Number(value) || 0;
  const formatted = num.toLocaleString('pt-BR');
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

export function formatDateBR(dateInput) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function formatFullDateBR(dateInput) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export function generateReportMessage({
  type = 'income',
  amount,
  personName,
  totalBoxBalance,
  date,
  category = '',
  description = ''
}) {
  const formattedAmount = formatDols(amount);
  const formattedTotal = formatDols(totalBoxBalance);
  const day = formatDateBR(date || new Date());

  if (type === 'income') {
    let msg = `> **ADICIONADO:** ${formattedAmount} NO CAIXA DA FAZENDA\n`;
    msg += `> **QUEM ADICIONOU:** ${personName || 'Não informado'}\n`;
    if (category) msg += `> **CATEGORIA:** ${category}\n`;
    if (description) msg += `> **OBSERVAÇÃO:** ${description}\n`;
    msg += `> **TOTAL DO CAIXA DA FAZENDA:** ${formattedTotal}\n`;
    msg += `> **DIA:** ${day}`;
    return msg;
  } else {
    let msg = `> **RETIRADO:** ${formattedAmount} DO CAIXA DA FAZENDA\n`;
    msg += `> **QUEM RETIROU:** ${personName || 'Não informado'}\n`;
    if (category) msg += `> **MOTIVO/CATEGORIA:** ${category}\n`;
    if (description) msg += `> **OBSERVAÇÃO:** ${description}\n`;
    msg += `> **TOTAL DO CAIXA DA FAZENDA:** ${formattedTotal}\n`;
    msg += `> **DIA:** ${day}`;
    return msg;
  }
}

/**
 * Message generated when member informs a delivery of items/sacks to manager
 */
export function generateDeliverySubmissionDiscordMessage({
  memberName,
  managerName,
  quantity,
  itemType = 'Sacas de Milho',
  notes = '',
  date = new Date()
}) {
  let msg = `> 🌾 **FAZENDA PANTANEIROS - ENTREGA DE PRODUÇÃO** 🌾\n`;
  msg += `> 📦 **ENTREGUE:** ${quantity} ${itemType}\n`;
  msg += `> 👤 **MEMBRO PRODUTOR:** ${memberName}\n`;
  msg += `> 👔 **GERENTE DESTINATÁRIO:** ${managerName}\n`;
  if (notes) msg += `> 📝 **OBSERVAÇÕES:** ${notes}\n`;
  msg += `> ⏳ **STATUS:** Aguardando Confirmação do Gerente no Sistema\n`;
  msg += `> 📅 **DATA/HORA:** ${formatFullDateBR(date)}`;
  return msg;
}

/**
 * Message generated when manager confirms receiving the sacks
 */
export function generateDeliveryConfirmationDiscordMessage({
  memberName,
  managerName,
  quantity,
  itemType = 'Sacas de Milho',
  confirmedTotal,
  targetTotal,
  date = new Date()
}) {
  const percent = targetTotal > 0 ? Math.round((confirmedTotal / targetTotal) * 100) : 100;
  let msg = `> ✅ **FAZENDA PANTANEIROS - RECEBIMENTO CONFIRMADO** ✅\n`;
  msg += `> 📦 **CONFIRMADO:** ${quantity} ${itemType} recebidas com sucesso!\n`;
  msg += `> 👔 **GERENTE QUE CONFERIU:** ${managerName}\n`;
  msg += `> 🌾 **MEMBRO CREDITADO:** ${memberName}\n`;
  if (targetTotal) {
    msg += `> 🎯 **PROGRESSO DA META:** ${confirmedTotal} / ${targetTotal} ${itemType} (${percent}%)\n`;
  }
  msg += `> 📅 **DATA DA CONFIRMAÇÃO:** ${formatFullDateBR(date)}`;
  return msg;
}

/**
 * Generates the official Fazenda Pantaneiros Discord Payroll Report matching the farm template
 */
export function generateOfficialPayrollDiscordReport({
  totalIncome = 26500,
  farmReservePercent = 30,
  farmReserveAmount = 7950,
  payrollPercent = 70,
  payrollAmount = 18550,
  ownersText = '@Raquel Souza [70] @Vaticano',
  ownerBaseAmount = 3533.33,
  managersText = '@William Erick [69] @Abraão',
  managerBaseAmount = 2650.00,
  bonusText = '@William Erick [69] @Raquel Souza [70]',
  bonusAmount = 883.33,
  bonusPoolTotal = 2650.00,
  surplusRefund = 2650.02,
} = {}) {
  let report = `🌾 RELATÓRIO DE PAGAMENTO DA FAZENDA 🌾\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `📊 RESUMO DA PRODUÇÃO\n`;
  report += `• Faturamento Total: $ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
  report += `• Caixa da Fazenda (${farmReservePercent}%): $ ${farmReserveAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Destinado a sementes, insumos e manutenção)\n`;
  report += `• Folha de Pagamento (${payrollPercent}%): $ ${payrollAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `💰 PAGAMENTOS BASE POR CARGO\n\n`;
  report += `👑 Donos ( ${ownersText} )\n`;
  report += `└ Valor: $ ${ownerBaseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cada\n\n`;

  report += `⭐ Gerentes ( ${managersText} )\n`;
  report += `└ Valor: $ ${managerBaseAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cada + bonus\n\n`;

  report += `🌾 Bonus ( ${bonusText} )\n`;
  report += `└ Valor: $ ${bonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cada\n\n`;

  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `🏅 BONIFICAÇÃO DE PRODUÇÃO\n`;
  report += `(Fundo extra de $ ${bonusPoolTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} dividido entre os destaques do turno)\n\n`;
  report += `• 👤 William Erick [69] ➔ +$ ${bonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Destaque da Semana)\n`;
  report += `• 👤 Raquel Souza [70] ➔ +$ ${bonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Gestão e Apoio)\n\n`;

  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `💵 TOTAL A RECEBER (BASE + BÔNUS)\n\n`;
  report += `• Raquel Souza: $ 4.416,66 (Base $3.533,33 + Bônus $883,33)\n`;
  report += `• Vaticano: $ 3.533,33\n`;
  report += `• William Erick: $ 3.533,33 (Base $2.650,00 + Bônus $883,33)\n`;
  report += `• Abraão: $ 2.650,00\n\n`;

  report += `📌 Procurem a gerência no baú da fazenda para realizar o saque do seu pagamento!\n\n`;
  report += `OBS: O restante do valor ( ${surplusRefund.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ) será devolvido ao caixa da Fazenda.`;

  return report;
}
