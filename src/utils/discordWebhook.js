/**
 * Discord Webhook Integration for Fazenda Pantaneiros - West Fox
 * Sends automated embed logs directly to Discord channels via standard Discord Webhooks.
 */

import { formatDols, formatFullDateBR } from './formatters';

const BOT_NAME = 'Fazenda Pantaneiros • West Fox';
const BOT_AVATAR_URL = 'https://i.imgur.com/vHqVwX2.png'; // Fallback or public avatar icon

/**
 * Send raw payload to Discord Webhook
 */
export async function sendDiscordPayload(webhookUrl, payload) {
  if (!webhookUrl || !webhookUrl.trim().startsWith('https://discord.com/api/webhooks/')) {
    return { success: false, error: 'URL de Webhook inválida.' };
  }

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: payload.username || BOT_NAME,
        avatar_url: payload.avatar_url || BOT_AVATAR_URL,
        content: payload.content || null,
        embeds: payload.embeds || [],
      }),
    });

    if (response.ok || response.status === 204) {
      return { success: true };
    } else {
      const errText = await response.text();
      return { success: false, error: `Discord HTTP ${response.status}: ${errText}` };
    }
  } catch (error) {
    console.error('Erro ao enviar webhook do Discord:', error);
    return { success: false, error: error.message || 'Falha de conexão ao enviar para o Discord.' };
  }
}

/**
 * Test Webhook with a test message
 */
export async function testDiscordWebhook(webhookUrl, senderName = 'Líder da Fazenda') {
  const payload = {
    content: `🔔 **TESTE DE CONEXÃO • FAZENDA PANTANEIROS**`,
    embeds: [
      {
        title: '🌾 Integração Discord Ativada com Sucesso!',
        description: `O canal de logs da **Fazenda Pantaneiros (West Fox)** foi conectado ao sistema web pelo integrante **${senderName}**.\n\nA partir de agora, lançamentos no caixa, entregas de sacas e confirmações serão enviadas automaticamente para este canal!`,
        color: 0xc59b4c, // Cor Ouro Pantaneiros (#c59b4c)
        fields: [
          { name: 'Status', value: '✅ Conectado', inline: true },
          { name: 'Segurança', value: '🔒 Canal Oficial', inline: true },
          { name: 'Data', value: formatFullDateBR(new Date()), inline: true },
        ],
        footer: {
          text: 'Fazenda Pantaneiros • Correio 82 • Tradição do Campo',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendDiscordPayload(webhookUrl, payload);
}

/**
 * Send Cash Flow Log (Adição ou Retirada em DOLS)
 */
export async function sendCashFlowDiscordLog(webhookUrl, {
  type = 'income',
  amount,
  personName,
  totalBoxBalance,
  category = '',
  description = '',
  date = new Date(),
}) {
  const isIncome = type === 'income';
  const formattedAmount = formatDols(amount);
  const formattedTotal = formatDols(totalBoxBalance);

  // Exact text format that the user requested:
  let rawText = '';
  if (isIncome) {
    rawText += `> **ADICIONADO:** ${formattedAmount} NO CAIXA DA FAZENDA\n`;
    rawText += `> **QUEM ADICIONOU:** ${personName}\n`;
    if (category) rawText += `> **CATEGORIA:** ${category}\n`;
    if (description) rawText += `> **OBSERVAÇÃO:** ${description}\n`;
    rawText += `> **TOTAL DO CAIXA DA FAZENDA:** ${formattedTotal}\n`;
    rawText += `> **DIA:** ${new Date(date).toLocaleDateString('pt-BR')}`;
  } else {
    rawText += `> **RETIRADO:** ${formattedAmount} DO CAIXA DA FAZENDA\n`;
    rawText += `> **QUEM RETIROU:** ${personName}\n`;
    if (category) rawText += `> **MOTIVO/CATEGORIA:** ${category}\n`;
    if (description) rawText += `> **OBSERVAÇÃO:** ${description}\n`;
    rawText += `> **TOTAL DO CAIXA DA FAZENDA:** ${formattedTotal}\n`;
    rawText += `> **DIA:** ${new Date(date).toLocaleDateString('pt-BR')}`;
  }

  const embed = {
    title: isIncome ? '🟢 ADIÇÃO AO CAIXA DA FAZENDA' : '🔴 RETIRADA DO CAIXA DA FAZENDA',
    description: rawText,
    color: isIncome ? 0x22c55e : 0xef4444, // Green or Red
    fields: [
      { name: 'Valor', value: formattedAmount, inline: true },
      { name: 'Responsável', value: personName, inline: true },
      { name: 'Saldo Total em Cofre', value: formattedTotal, inline: true },
    ],
    footer: {
      text: 'Fazenda Pantaneiros • Fluxo de Caixa',
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `💰 **LOG FINANCEIRO • FAZENDA PANTANEIROS**`,
    embeds: [embed],
  });
}

/**
 * Send Delivery Log (Quando o membro informa a entrega de sacas)
 */
export async function sendDeliverySubmittedDiscordLog(webhookUrl, {
  memberName,
  managerName,
  quantity,
  itemType = 'Sacas de Milho',
  notes = '',
  goalTitle = '',
}) {
  const embed = {
    title: '🌾 ENTREGA DE PRODUÇÃO REGISTRADA',
    description: `O produtor **${memberName}** informou a entrega de **${quantity} ${itemType}** destinadas ao gerente **${managerName}**.`,
    color: 0xdfb56c, // Gold
    fields: [
      { name: '📦 Quantidade', value: `${quantity} ${itemType}`, inline: true },
      { name: '👤 Produtor', value: memberName, inline: true },
      { name: '👔 Gerente Destinatário', value: managerName, inline: true },
      { name: '⏳ Status', value: 'Aguardando Confirmação do Gerente', inline: false },
      ...(notes ? [{ name: '📝 Local/Observações', value: notes, inline: false }] : []),
    ],
    footer: {
      text: 'Fazenda Pantaneiros • Validação de Sacas',
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `📦 **NOVA REMESSA • FAZENDA PANTANEIROS**`,
    embeds: [embed],
  });
}

/**
 * Send Delivery Confirmation Log (Quando o gerente confirma o recebimento no sistema)
 */
export async function sendDeliveryConfirmedDiscordLog(webhookUrl, {
  memberName,
  managerName,
  quantity,
  itemType = 'Sacas de Milho',
  confirmedTotal,
  targetTotal,
}) {
  const percent = targetTotal > 0 ? Math.round((confirmedTotal / targetTotal) * 100) : 100;

  const embed = {
    title: '✅ RECEBIMENTO CONFIRMADO PELO GERENTE',
    description: `O Gerente **${managerName}** conferiu e creditou **${quantity} ${itemType}** entregues por **${memberName}**!`,
    color: 0x16a34a, // Green
    fields: [
      { name: '📦 Confirmado', value: `+${quantity} ${itemType}`, inline: true },
      { name: '🌾 Membro Creditado', value: memberName, inline: true },
      { name: '👔 Gerente que Conferiu', value: managerName, inline: true },
      {
        name: '🎯 Progresso da Meta',
        value: targetTotal ? `${confirmedTotal} / ${targetTotal} ${itemType} (${percent}%)` : `${confirmedTotal} ${itemType}`,
        inline: false,
      },
    ],
    footer: {
      text: 'Fazenda Pantaneiros • Confirmação Oficial',
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `✅ **ENTREGA VALIDADA • FAZENDA PANTANEIROS**`,
    embeds: [embed],
  });
}

/**
 * Send Profit Split / Payroll Report to Discord
 */
export async function sendPayrollDiscordLog(webhookUrl, {
  totalIncome,
  totalExpense,
  netProfit,
  farmReserveAmount,
  managersPoolAmount,
  membersPoolAmount,
  splitSettings,
  payouts,
  closedBy,
}) {
  let payoutsText = '';
  payouts.slice(0, 15).forEach((p) => {
    const roleEmoji = p.role === 'owner' ? '👑' : p.role === 'manager' ? '👔' : '🌾';
    payoutsText += `• **${p.name}** (${roleEmoji}): **${formatDols(p.payoutAmount)}**\n`;
  });

  const embed = {
    title: '🌾 FECHAMENTO DE LUCROS & REPASSES DA FAZENDA',
    description: `Fechamento financeiro oficial realizado por **${closedBy}**.`,
    color: 0xc59b4c,
    fields: [
      { name: '💰 Faturamento Bruto', value: formatDols(totalIncome), inline: true },
      { name: '📉 Despesas', value: formatDols(totalExpense), inline: true },
      { name: '💵 Lucro Líquido Real', value: formatDols(netProfit), inline: true },
      { name: `🏛️ Caixa Fazenda (${splitSettings.farmReservePercent}%)`, value: formatDols(farmReserveAmount), inline: true },
      { name: `👔 Gerência (${splitSettings.managersPercent}%)`, value: formatDols(managersPoolAmount), inline: true },
      { name: `🌾 Membros (${splitSettings.membersPercent}%)`, value: formatDols(membersPoolAmount), inline: true },
      { name: '📋 Folha de Pagamentos', value: payoutsText || 'Nenhum pagamento registrado', inline: false },
    ],
    footer: {
      text: 'Fazenda Pantaneiros • Divisão Oficial de Lucro',
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `🌾 **FECHAMENTO OFICIAL DE LUCROS • FAZENDA PANTANEIROS**`,
    embeds: [embed],
  });
}
