/**
 * Discord Webhook Integration for Fazenda Pantaneiros - West Fox
 * Sends automated embed logs directly to Discord channels via standard Discord Webhooks.
 * Features automated deletion of previous logs so only the latest log remains in the channel!
 */

import { formatDols, formatFullDateBR } from './formatters';
import { supabase } from './supabaseClient';

const BOT_NAME = 'Fazenda Pantaneiros • West Fox';
const BOT_AVATAR_URL = 'https://i.imgur.com/vHqVwX2.png'; // Fallback or public avatar icon

// Cache local em memória para os IDs das últimas mensagens enviadas por webhook/empresa
const lastMessageMap = new Map();

function getStorageKey(webhookUrl, companyId) {
  if (companyId) return `company_${companyId}`;
  try {
    const cleanUrl = webhookUrl.split('?')[0].replace(/\/+$/, '');
    return cleanUrl;
  } catch (_) {
    return webhookUrl;
  }
}

/**
 * Busca o ID da última mensagem enviada por esse webhook
 */
async function getLastMessageId(webhookUrl, companyId) {
  const key = getStorageKey(webhookUrl, companyId);
  const cleanUrl = webhookUrl.split('?')[0].replace(/\/+$/, '');

  // 1. Memória RAM local
  if (lastMessageMap.has(key)) {
    return lastMessageMap.get(key);
  }

  // 2. LocalStorage do navegador
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(`discord_last_log_${key}`) || localStorage.getItem(`discord_last_log_${cleanUrl}`);
      if (saved) {
        lastMessageMap.set(key, saved);
        return saved;
      }
    } catch (_) {}
  }

  // 3. Supabase Cloud Sync
  if (supabase) {
    try {
      const { data } = await supabase
        .from('farm_settings')
        .select('value')
        .eq('key', 'discord_last_logs')
        .maybeSingle();

      if (data?.value && typeof data.value === 'object') {
        const msgId = data.value[key] || data.value[cleanUrl];
        if (msgId) {
          lastMessageMap.set(key, msgId);
          return msgId;
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Salva o ID da nova mensagem para que ela possa ser apagada assim que a próxima surgir
 */
async function saveLastMessageId(webhookUrl, companyId, messageId) {
  const key = getStorageKey(webhookUrl, companyId);
  const cleanUrl = webhookUrl.split('?')[0].replace(/\/+$/, '');

  lastMessageMap.set(key, messageId);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`discord_last_log_${key}`, messageId);
      localStorage.setItem(`discord_last_log_${cleanUrl}`, messageId);
    } catch (_) {}
  }

  if (supabase) {
    try {
      const { data } = await supabase
        .from('farm_settings')
        .select('value')
        .eq('key', 'discord_last_logs')
        .maybeSingle();

      const existing = (data && data.value && typeof data.value === 'object') ? data.value : {};
      const updated = {
        ...existing,
        [key]: messageId,
        [cleanUrl]: messageId,
      };

      await supabase.from('farm_settings').upsert({
        key: 'discord_last_logs',
        value: updated,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Aviso ao sincronizar ID da última mensagem no Supabase:', e.message);
    }
  }
}

/**
 * Send raw payload to Discord Webhook with auto-delete of previous message
 */
export async function sendDiscordPayload(webhookUrl, payload, options = {}) {
  if (!webhookUrl || !webhookUrl.trim().startsWith('https://discord.com/api/webhooks/')) {
    return { success: false, error: 'URL de Webhook inválida.' };
  }

  const cleanBaseUrl = webhookUrl.trim().split('?')[0].replace(/\/+$/, '');
  const { companyId, deletePrevious = true } = options;

  // 1. Apaga a mensagem anterior para que ela suma assim que a nova surgir!
  if (deletePrevious) {
    try {
      const prevMessageId = await getLastMessageId(cleanBaseUrl, companyId);
      if (prevMessageId) {
        const deleteUrl = `${cleanBaseUrl}/messages/${prevMessageId}`;
        await fetch(deleteUrl, { method: 'DELETE' }).catch(() => {});
      }
    } catch (err) {
      console.warn('Aviso ao apagar log anterior do Discord:', err);
    }
  }

  // 2. Envia a nova mensagem com ?wait=true para registrar o ID gerado
  try {
    const postUrl = `${cleanBaseUrl}?wait=true`;
    const response = await fetch(postUrl, {
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
      try {
        const msgData = await response.json();
        if (msgData?.id) {
          await saveLastMessageId(cleanBaseUrl, companyId, msgData.id);
        }
      } catch (_) {}

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
export async function testDiscordWebhook(
  webhookUrl, 
  senderName = 'Líder', 
  companyName = 'Fazenda Pantaneiros',
  options = {}
) {
  const payload = {
    content: `🔔 **TESTE DE CONEXÃO • ${companyName.toUpperCase()}**`,
    embeds: [
      {
        title: `🌾 Integração Discord Ativada com Sucesso!`,
        description: `O canal de logs exclusivo da empresa **${companyName}** foi conectado ao sistema pelo integrante **${senderName}**.\n\nA partir de agora, lançamentos de caixa, entregas de produção e missões desta empresa serão enviadas automaticamente para este canal!\n*(Auto-limpeza ativa: ao surgir nova log, a última suma)*`,
        color: 0xc59b4c, // Cor Ouro Pantaneiros (#c59b4c)
        fields: [
          { name: 'Empresa', value: companyName, inline: true },
          { name: 'Status', value: '✅ Conectado', inline: true },
          { name: 'Data', value: formatFullDateBR(new Date()), inline: true },
        ],
        footer: {
          text: `${companyName} • Canal Oficial de Logs`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendDiscordPayload(webhookUrl, payload, options);
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
  companyName = 'Fazenda Pantaneiros',
  companyId,
  deletePrevious = true,
}) {
  const isIncome = type === 'income';
  const formattedAmount = formatDols(amount);
  const formattedTotal = formatDols(totalBoxBalance);

  let rawText = '';
  if (isIncome) {
    rawText += `> **ADICIONADO:** ${formattedAmount} NO CAIXA • ${companyName.toUpperCase()}\n`;
    rawText += `> **QUEM ADICIONOU:** ${personName}\n`;
    if (category) rawText += `> **CATEGORIA:** ${category}\n`;
    if (description) rawText += `> **OBSERVAÇÃO:** ${description}\n`;
    rawText += `> **TOTAL DO CAIXA:** ${formattedTotal}\n`;
    rawText += `> **DIA:** ${new Date(date).toLocaleDateString('pt-BR')}`;
  } else {
    rawText += `> **RETIRADO:** ${formattedAmount} DO CAIXA • ${companyName.toUpperCase()}\n`;
    rawText += `> **QUEM RETIROU:** ${personName}\n`;
    if (category) rawText += `> **MOTIVO/CATEGORIA:** ${category}\n`;
    if (description) rawText += `> **OBSERVAÇÃO:** ${description}\n`;
    rawText += `> **TOTAL DO CAIXA:** ${formattedTotal}\n`;
    rawText += `> **DIA:** ${new Date(date).toLocaleDateString('pt-BR')}`;
  }

  const embed = {
    title: isIncome ? `🟢 ADIÇÃO AO CAIXA • ${companyName.toUpperCase()}` : `🔴 RETIRADA DO CAIXA • ${companyName.toUpperCase()}`,
    description: rawText,
    color: isIncome ? 0x22c55e : 0xef4444, // Green or Red
    fields: [
      { name: 'Valor', value: formattedAmount, inline: true },
      { name: 'Responsável', value: personName, inline: true },
      { name: 'Saldo Total em Cofre', value: formattedTotal, inline: true },
    ],
    footer: {
      text: `${companyName} • Fluxo de Caixa`,
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `💰 **LOG FINANCEIRO • ${companyName.toUpperCase()}**`,
    embeds: [embed],
  }, { companyId, deletePrevious });
}

/**
 * Send Delivery Log (Quando o membro informa a entrega de sacas/cargas)
 */
export async function sendDeliverySubmittedDiscordLog(webhookUrl, {
  memberName,
  managerName,
  quantity,
  itemType = 'Sacas de Milho',
  notes = '',
  goalTitle = '',
  companyName = 'Fazenda Pantaneiros',
  companyId,
  deletePrevious = true,
}) {
  const embed = {
    title: `📦 ENTREGA DE PRODUÇÃO • ${companyName.toUpperCase()}`,
    description: `O integrante **${memberName}** informou a entrega de **${quantity} ${itemType}** destinadas ao gerente **${managerName}**.`,
    color: 0xdfb56c, // Gold
    fields: [
      { name: '📦 Quantidade', value: `${quantity} ${itemType}`, inline: true },
      { name: '👤 Integrante', value: memberName, inline: true },
      { name: '👔 Gerente Destinatário', value: managerName, inline: true },
      { name: '🏢 Empresa', value: companyName, inline: true },
      { name: '⏳ Status', value: 'Aguardando Confirmação do Gerente', inline: false },
      ...(notes ? [{ name: '📝 Local/Observações', value: notes, inline: false }] : []),
    ],
    footer: {
      text: `${companyName} • Validação de Produção`,
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `📦 **NOVA REMESSA • ${companyName.toUpperCase()}**`,
    embeds: [embed],
  }, { companyId, deletePrevious });
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
  companyName = 'Fazenda Pantaneiros',
  companyId,
  deletePrevious = true,
}) {
  const percent = targetTotal > 0 ? Math.round((confirmedTotal / targetTotal) * 100) : 100;

  const embed = {
    title: `✅ RECEBIMENTO CONFIRMADO • ${companyName.toUpperCase()}`,
    description: `O Gerente **${managerName}** conferiu e creditou **${quantity} ${itemType}** entregues por **${memberName}**!`,
    color: 0x16a34a, // Green
    fields: [
      { name: '📦 Confirmado', value: `+${quantity} ${itemType}`, inline: true },
      { name: '👤 Integrante Creditado', value: memberName, inline: true },
      { name: '👔 Gerente que Conferiu', value: managerName, inline: true },
      { name: '🏢 Empresa', value: companyName, inline: true },
      {
        name: '🎯 Progresso da Meta',
        value: targetTotal ? `${confirmedTotal} / ${targetTotal} ${itemType} (${percent}%)` : `${confirmedTotal} ${itemType}`,
        inline: false,
      },
    ],
    footer: {
      text: `${companyName} • Confirmação Oficial`,
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `✅ **ENTREGA VALIDADA • ${companyName.toUpperCase()}**`,
    embeds: [embed],
  }, { companyId, deletePrevious });
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
  companyName = 'Fazenda Pantaneiros',
  companyId,
  deletePrevious = true,
}) {
  let payoutsText = '';
  payouts.slice(0, 15).forEach((p) => {
    const roleEmoji = p.role === 'owner' ? '👑' : p.role === 'manager' ? '👔' : '🌾';
    payoutsText += `• **${p.name}** (${roleEmoji}): **${formatDols(p.payoutAmount)}**\n`;
  });

  const embed = {
    title: `🌾 FECHAMENTO DE LUCROS & REPASSES • ${companyName.toUpperCase()}`,
    description: `Fechamento financeiro oficial da **${companyName}** realizado por **${closedBy}**.`,
    color: 0xc59b4c,
    fields: [
      { name: '💰 Faturamento Bruto', value: formatDols(totalIncome), inline: true },
      { name: '📉 Despesas', value: formatDols(totalExpense), inline: true },
      { name: '💵 Lucro Líquido Real', value: formatDols(netProfit), inline: true },
      { name: `🏛️ Caixa Reserva (${splitSettings.farmReservePercent}%)`, value: formatDols(farmReserveAmount), inline: true },
      { name: `👔 Gerência (${splitSettings.managersPercent}%)`, value: formatDols(managersPoolAmount), inline: true },
      { name: `🌾 Membros (${splitSettings.membersPercent}%)`, value: formatDols(membersPoolAmount), inline: true },
      { name: '📋 Folha de Pagamentos', value: payoutsText || 'Nenhum pagamento registrado', inline: false },
    ],
    footer: {
      text: `${companyName} • Divisão Oficial de Lucro`,
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `🌾 **FECHAMENTO OFICIAL DE LUCROS • ${companyName.toUpperCase()}**`,
    embeds: [embed],
  }, { companyId, deletePrevious });
}

/**
 * Send Route Started Notification
 */
export async function sendRouteStartedDiscordLog(webhookUrl, { 
  route, 
  startedBy, 
  companyName,
  companyId,
  deletePrevious = true 
}) {
  const itemsText = (route.items || [])
    .map((it) => `• \`[0/${it.targetAmount}]\` **${it.name}**`)
    .join('\n');

  const embed = {
    title: `${route.icon || '🚂'} ROTA INICIADA: ${route.title.toUpperCase()}`,
    description: `A rota foi aceita por **${startedBy}** para a empresa **${companyName || 'Fazenda Pantaneiros'}**!\n\n**Lista de Cargas Necessárias:**\n${itemsText}`,
    color: 0xeab308, // amber-500
    fields: [
      { name: '💰 Recompensa da Rota', value: formatDols(route.rewardAmount), inline: true },
      { name: '📦 Total de Itens', value: `${route.items?.length || 0} cargas`, inline: true },
      { name: '👤 Responsável', value: startedBy, inline: true },
    ],
    footer: {
      text: `${companyName || 'Fazenda Pantaneiros'} • Checklist de Rotas & Missões`,
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `🚂 **NOVA ROTA INICIADA: ${route.title} • RECOMPENSA ${formatDols(route.rewardAmount)}**`,
    embeds: [embed],
  }, { companyId: companyId || route.companyId, deletePrevious });
}

/**
 * Send Route Progress Update
 */
export async function sendRouteProgressDiscordLog(webhookUrl, { 
  route, 
  item, 
  updatedBy, 
  companyName,
  companyId,
  deletePrevious = true 
}) {
  const completedCount = (route.items || []).filter((i) => i.completed || (Number(i.currentAmount) >= Number(i.targetAmount))).length;
  const totalCount = route.items?.length || 1;
  const percent = Math.round((completedCount / totalCount) * 100);

  const filledBlocks = Math.max(0, Math.min(10, Math.round(percent / 10)));
  const emptyBlocks = 10 - filledBlocks;
  const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  const itemsList = (route.items || []).map((it) => {
    const isDone = it.completed || (Number(it.currentAmount) >= Number(it.targetAmount));
    const icon = isDone ? '✅' : '⏳';
    return `${icon} \`[${it.currentAmount}/${it.targetAmount}]\` **${it.name}** ${isDone ? '*(Pronto)*' : ''}`;
  }).join('\n');

  const embed = {
    title: `${route.icon || '📦'} PROGRESSO DA ROTA: ${route.title}`,
    description: `Atualização de carga feita por **${updatedBy}**:\n` +
      (item ? `> **Item Atualizado:** **${item.name}** → \`${item.currentAmount}/${item.targetAmount}\`\n\n` : '\n') +
      `**Status do Checklist (${percent}%):**\n\`[${progressBar}]\` ${completedCount}/${totalCount} cargas prontas\n\n` +
      `**Cargas:**\n${itemsList}`,
    color: percent === 100 ? 0x22c55e : 0x3b82f6,
    fields: [
      { name: '💰 Recompensa', value: formatDols(route.rewardAmount), inline: true },
      { name: '🏢 Empresa', value: companyName || 'Fazenda Pantaneiros', inline: true },
      { name: '📊 Conclusão', value: `${percent}%`, inline: true },
    ],
    footer: {
      text: `${companyName || 'Fazenda Pantaneiros'} • Sistema de Rotas & Cargas`,
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `📦 **ATUALIZAÇÃO DE ROTA: ${route.title} (${percent}% Concluído)**`,
    embeds: [embed],
  }, { companyId: companyId || route.companyId, deletePrevious });
}

/**
 * Send Route Completed Notification
 */
export async function sendRouteCompletedDiscordLog(webhookUrl, { 
  route, 
  completedBy, 
  companyName, 
  creditedToBox,
  companyId,
  deletePrevious = true 
}) {
  const itemsList = (route.items || [])
    .map((it) => `✅ \`[${it.targetAmount}/${it.targetAmount}]\` **${it.name}** (100% Entregue)`)
    .join('\n');

  const embed = {
    title: `🎉 ROTA CONCLUÍDA: ${route.title.toUpperCase()}`,
    description: `A entrega de todas as cargas foi finalizada com sucesso por **${completedBy}**!\n\n` +
      `**Cargas Entregues:**\n${itemsList}\n\n` +
      (creditedToBox ? `💵 **O valor de ${formatDols(route.rewardAmount)} foi creditado no caixa da empresa!**` : ''),
    color: 0x22c55e, // emerald-500
    fields: [
      { name: '💰 Recompensa Recebida', value: formatDols(route.rewardAmount), inline: true },
      { name: '🏢 Empresa Beneficiada', value: companyName || 'Fazenda Pantaneiros', inline: true },
      { name: '🏆 Finalizado Por', value: completedBy, inline: true },
    ],
    footer: {
      text: `${companyName || 'Fazenda Pantaneiros'} • Missão Cumprida!`,
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `🎉 **ROTA FINALIZADA COM SUCESSO: ${route.title} • RECOMPENSA DE ${formatDols(route.rewardAmount)} RECEBIDA!**`,
    embeds: [embed],
  }, { companyId: companyId || route.companyId, deletePrevious });
}

/**
 * Send Animal Route Dispatched Notification
 */
export async function sendRouteDispatchedDiscordLog(webhookUrl, {
  route,
  batchCount = 1,
  rewardEarned,
  dispatchedBy,
  companyName,
  companyId,
  deletePrevious = true,
}) {
  const routesRemaining = Math.min(
    ...(route.items || []).map((it) => {
      const perRoute = Number(it.perRoute || (it.targetAmount >= 2000 ? 100 : 20));
      return Math.floor(Number(it.currentAmount || 0) / perRoute);
    })
  );

  const itemsList = (route.items || []).map((it) => {
    const perRoute = Number(it.perRoute || (it.targetAmount >= 2000 ? 100 : 20));
    const curr = Number(it.currentAmount || 0);
    const itemRoutes = Math.floor(curr / perRoute);
    const icon = it.icon || '📦';
    return `${icon} **${it.name}**: \`${curr}/${it.targetAmount}\` (Cobre **${itemRoutes} rotas**)`;
  }).join('\n');

  const embed = {
    title: `🚀 VIAGEM DESPACHADA: ${route.title.toUpperCase()}`,
    description: `**${dispatchedBy}** despachou **${batchCount} Rota(s) de Animais**!\n` +
      `📦 O kit de materiais foi debitado do estoque da empresa.\n\n` +
      `💵 **Crédito no Caixa:** \`+${formatDols(rewardEarned)}\`\n` +
      `🚂 **Rotas Prontas no Estoque:** **${routesRemaining} rota(s) pronta(s)**\n\n` +
      `📊 **Situação Atual do Estoque:**\n${itemsList}`,
    color: 0x10b981, // emerald-500
    fields: [
      { name: '💰 Recompensa', value: formatDols(rewardEarned), inline: true },
      { name: '📦 Despachado Por', value: dispatchedBy, inline: true },
      { name: '🎯 Rotas Restantes', value: `${routesRemaining} prontas`, inline: true },
    ],
    footer: {
      text: `${companyName || 'Ferrovia West Fox'} • Gestão de Rotas & Estoque`,
    },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordPayload(webhookUrl, {
    content: `🚀 **${batchCount}x ROTA DE ANIMAIS DESPACHADA: +${formatDols(rewardEarned)} CREDITADO NO CAIXA!**`,
    embeds: [embed],
  }, { companyId: companyId || route.companyId, deletePrevious });
}

