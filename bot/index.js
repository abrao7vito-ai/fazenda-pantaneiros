import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  EmbedBuilder, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

// ==========================================
// CONFIGURAÇÕES & CREDENCIAIS
// ==========================================
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1551998171889143838';
const GUILD_ID = process.env.DISCORD_GUILD_ID || null;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://isqjusvluobjooknybdu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_4rVEwpMQgn9675svYG9Dzw_bl6iD5Zr';
const APP_URL = process.env.APP_URL || 'https://fazenda-pantaneiros.onrender.com';

if (!TOKEN || TOKEN === 'COLE_SEU_TOKEN_AQUI') {
  console.error('\n❌ ERRO: DISCORD_BOT_TOKEN não foi configurado no arquivo bot/.env!');
  process.exit(1);
}

// Inicializa Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Inicializa Cliente Discord com todas as intents necessárias
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Cache local em memória
let cachedRoutes = [];
let activeSelectedRouteId = null;
let panelInfo = null; // { channelId, messageId }

// ==========================================
// FUNÇÕES UTILITÁRIAS & FORMATAÇÃO
// ==========================================

function encodeCompanyTag(text = '', companyId = 'comp-fazenda') {
  if (!companyId || companyId === 'comp-fazenda') return text || '';
  const clean = (text || '').replace(/^\[EMP:[^\]]+\]\s*/, '');
  return `[EMP:${companyId}] ${clean}`.trim();
}

function renderProgressBar(current, total, length = 12) {
  if (total <= 0) return '`[░░░░░░░░░░░░] 0%`';
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * length);
  const empty = Math.max(0, length - filled);
  const percent = Math.round(ratio * 100);
  return '`[' + '█'.repeat(filled) + '░'.repeat(empty) + `] ${percent}%\``;
}

// Busca as rotas do Supabase
async function loadRoutesFromDb() {
  try {
    const { data, error } = await supabase
      .from('farm_settings')
      .select('value')
      .eq('key', 'routes')
      .maybeSingle();

    if (!error && data && Array.isArray(data.value)) {
      cachedRoutes = data.value;
    }
  } catch (err) {
    console.error('Erro ao carregar rotas do Supabase:', err);
  }
  return cachedRoutes;
}

// Salva rotas atualizadas no Supabase
async function saveRoutesToDb(routes) {
  cachedRoutes = routes;
  try {
    const { error } = await supabase
      .from('farm_settings')
      .upsert({
        key: 'routes',
        value: routes,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Erro ao salvar rotas no Supabase:', error);
    }
  } catch (err) {
    console.error('Erro na gravação das rotas:', err);
  }
}

// Carrega informações do painel fixo salvo no Supabase
async function loadPanelInfo() {
  try {
    const { data } = await supabase
      .from('farm_settings')
      .select('value')
      .eq('key', 'discord_panel')
      .maybeSingle();

    if (data && data.value && data.value.channelId && data.value.messageId) {
      panelInfo = data.value;
      if (data.value.selectedRouteId) {
        activeSelectedRouteId = data.value.selectedRouteId;
      }
    }
  } catch (err) {
    console.warn('Painel fixo não registrado previamente:', err.message);
  }
}

// Salva informações do painel fixo
async function savePanelInfo(channelId, messageId, selectedRouteId) {
  panelInfo = { channelId, messageId, selectedRouteId };
  try {
    await supabase.from('farm_settings').upsert({
      key: 'discord_panel',
      value: panelInfo,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Erro ao salvar info do painel fixo:', err);
  }
}

// ==========================================
// CONSTRUÇÃO DO PAINEL FIXO (EMBED + COMPONENTES)
// ==========================================

function buildRoutePanelPayload(routes, selectedRouteId = null) {
  if (!routes || routes.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor(0xd97706)
      .setTitle('🚂 Painel de Rotas & Missões • Pantaneiros')
      .setDescription('Nenhuma rota encontrada. Crie novas rotas pelo painel web!')
      .setFooter({ text: 'Fazenda Pantaneiros • West Fox' });
    return { embeds: [emptyEmbed], components: [] };
  }

  // Define rota em foco
  let route = routes.find((r) => r.id === selectedRouteId);
  if (!route) {
    route = routes.find((r) => r.id === activeSelectedRouteId) || routes[0];
  }
  activeSelectedRouteId = route.id;

  const items = route.items || [];
  const completedItemsCount = items.filter(
    (it) => it.completed || Number(it.currentAmount) >= Number(it.targetAmount)
  ).length;
  const totalItemsCount = items.length;
  const isAllItemsCompleted = totalItemsCount > 0 && completedItemsCount === totalItemsCount;

  // Status e Cores
  let embedColor = 0xd97706; // Amber (Aguardando)
  let statusBadge = '🟡 AGUARDANDO SAÍDA';
  if (route.status === 'in_progress') {
    embedColor = 0x2563eb; // Azul (Em Viagem)
    statusBadge = '🔵 EM VIAGEM / CARREGANDO';
  }
  if (route.status === 'completed') {
    embedColor = 0x16a34a; // Verde (Entregue)
    statusBadge = '🟢 MISSÃO ENTREGUE & SALDO CREDITADO';
  }

  // Lista dos Itens
  const itemsText = items.map((it) => {
    const isDone = it.completed || Number(it.currentAmount) >= Number(it.targetAmount);
    const checkEmoji = isDone ? '✅' : '⏳';
    const current = Number(it.currentAmount || 0);
    const target = Number(it.targetAmount || 1);
    const unit = it.unit || 'un';
    const pct = Math.min(100, Math.round((current / target) * 100));

    return `${checkEmoji} **${it.name}**: \`${current}/${target} ${unit}\` (${pct}%) ${isDone ? '*(Completo)*' : ''}`;
  }).join('\n');

  // Histórico de Carregamento
  const logs = (route.logs || []).slice(0, 4);
  const logsText = logs.length > 0
    ? logs.map((l) => `• **${l.userName}** carregou \`+${l.amount}\` de *${l.itemName}* (<t:${Math.floor(new Date(l.timestamp).getTime() / 1000)}:R>)`).join('\n')
    : '*Nenhum carregamento recente registrado ainda.*';

  // Embed Principal
  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`${route.icon || '🚂'} ${route.title.toUpperCase()}`)
    .setDescription(
      `**Status:** \`${statusBadge}\`\n` +
      `💰 **Recompensa da Rota:** \`$${Number(route.rewardAmount).toLocaleString('pt-BR')} DOLS\`\n` +
      `${route.startedBy ? `👤 **Responsável/Maquinista:** \`${route.startedBy}\`\n` : ''}` +
      `${route.completedBy ? `🏆 **Entregue por:** \`${route.completedBy}\`\n` : ''}` +
      `\n📊 **Progresso Geral da Carga:**\n${renderProgressBar(completedItemsCount, totalItemsCount, 14)}\n` +
      `**${completedItemsCount} de ${totalItemsCount} itens totalmente carregados**\n\n` +
      `📦 **Checklist de Itens Exigidos:**\n${itemsText || 'Nenhum item exigido.'}\n\n` +
      `📜 **Últimos Carregamentos Registrados:**\n${logsText}`
    )
    .setFooter({ text: 'Selecione abaixo o item para carregar ou use os botões de ação • Pantaneiros' })
    .setTimestamp();

  // ==========================================
  // COMPONENTES (MENUS & BOTÕES)
  // ==========================================

  // Linha 1: Seletor de Troca de Rota
  const routeSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('panel_select_route')
    .setPlaceholder('Trocar de Rota / Missão...')
    .addOptions(
      routes.slice(0, 25).map((r) => {
        const isCurrent = r.id === route.id;
        const icon = r.icon || '📦';
        const stText = r.status === 'completed' ? '✓ Entregue' : r.status === 'in_progress' ? '▶ Em Andamento' : '⏸ Aguardando';
        return new StringSelectMenuOptionBuilder()
          .setLabel(`${r.title} ($${r.rewardAmount})`)
          .setDescription(`${stText} • ${r.items?.length || 0} itens`)
          .setValue(r.id)
          .setDefault(isCurrent);
      })
    );

  const row1 = new ActionRowBuilder().addComponents(routeSelectMenu);

  // Linha 2: Seletor de Carregamento de Itens (Abre Modal ao escolher!)
  const itemOptions = items.slice(0, 25).map((it) => {
    const isDone = it.completed || Number(it.currentAmount) >= Number(it.targetAmount);
    const remaining = Math.max(0, it.targetAmount - (it.currentAmount || 0));
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${it.name} (${it.currentAmount || 0}/${it.targetAmount})`)
      .setDescription(isDone ? 'Item 100% completo' : `Faltam ${remaining} ${it.unit || 'un'}`)
      .setValue(`load_item:${route.id}:${it.id}`);
  });

  const row2 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('panel_select_load_item')
      .setPlaceholder('📦 Escolha o item que você acabou de colher/carregar...')
      .addOptions(itemOptions)
  );

  // Linha 3: Botões de Ação Principais
  const actionButtons = [];

  // Iniciar viagem
  if (route.status === 'template' || !route.status) {
    actionButtons.push(
      new ButtonBuilder()
        .setCustomId(`btn_start_route:${route.id}`)
        .setLabel('🚀 Iniciar Viagem')
        .setStyle(ButtonStyle.Success)
    );
  }

  // Entregar & Creditar Recompensa
  actionButtons.push(
    new ButtonBuilder()
      .setCustomId(`btn_complete_route:${route.id}`)
      .setLabel(isAllItemsCompleted ? `🏆 Entregar Missão ($${route.rewardAmount})` : `⚡ Entregar Rota ($${route.rewardAmount})`)
      .setStyle(isAllItemsCompleted ? ButtonStyle.Success : ButtonStyle.Primary)
      .setDisabled(route.status === 'completed')
  );

  // Reiniciar / Nova Viagem
  actionButtons.push(
    new ButtonBuilder()
      .setCustomId(`btn_reset_route:${route.id}`)
      .setLabel('🔄 Nova Viagem')
      .setStyle(ButtonStyle.Secondary)
  );

  // Botão de Link direto para o Painel Web
  actionButtons.push(
    new ButtonBuilder()
      .setLabel('🌐 Abrir no Painel Web')
      .setStyle(ButtonStyle.Link)
      .setURL(APP_URL)
  );

  const row3 = new ActionRowBuilder().addComponents(actionButtons);

  return { embeds: [embed], components: [row1, row2, row3] };
}

// Atualiza a mensagem fixa do painel no canal oficial se ela existir
async function refreshFixedPanelMessage() {
  if (!panelInfo || !panelInfo.channelId || !panelInfo.messageId) return;

  try {
    const channel = await client.channels.fetch(panelInfo.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(panelInfo.messageId);
    if (!message) return;

    const payload = buildRoutePanelPayload(cachedRoutes, activeSelectedRouteId);
    await message.edit(payload);
  } catch (err) {
    console.warn('Aviso ao atualizar mensagem fixa do painel:', err.message);
  }
}

// ==========================================
// REGISTRO DE EVENTOS DO DISCORD
// ==========================================

client.once('ready', async () => {
  console.log(`\n======================================================`);
  console.log(`🤠 Bot Pantaneiros conectado como: ${client.user.tag}`);
  console.log(`🌐 Painel Web integrado: ${APP_URL}`);
  console.log(`======================================================\n`);

  await loadRoutesFromDb();
  await loadPanelInfo();

  // Registra Slash Commands
  const commands = [
    new SlashCommandBuilder()
      .setName('painel')
      .setDescription('Fixa ou abre o Painel Interativo Oficial de Rotas & Missões.')
      .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    new SlashCommandBuilder()
      .setName('rotas')
      .setDescription('Visualiza o painel de rotas e missões ativas.')
      .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('⏳ Registrando comandos Slash no Discord...');
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    }
    console.log('✅ Comandos Slash registrados com sucesso!');
  } catch (err) {
    console.warn('Aviso ao registrar comandos Slash:', err.message);
  }

  // Tenta atualizar o painel fixo existente ao ligar
  await refreshFixedPanelMessage();

  // Conecta ao Supabase Realtime para escutar alterações feitas no site web!
  try {
    supabase
      .channel('bot-routes-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_settings', filter: 'key=eq.routes' }, async (payload) => {
        if (payload.new && Array.isArray(payload.new.value)) {
          cachedRoutes = payload.new.value;
          await refreshFixedPanelMessage();
        }
      })
      .subscribe();
    console.log('⚡ Sincronização em tempo real com o site Web ativada!');
  } catch (err) {
    console.warn('Realtime Supabase indisponível:', err.message);
  }
});

// Comandos de texto de prefixo (!painel, !rotas)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();
  if (content === '!painel' || content === '!rotas' || content === '!checklist') {
    try {
      await loadRoutesFromDb();
      const payload = buildRoutePanelPayload(cachedRoutes, activeSelectedRouteId);
      const sentMsg = await message.channel.send(payload);

      // Salva esta nova mensagem como o painel fixo oficial do canal!
      await savePanelInfo(sentMsg.channel.id, sentMsg.id, activeSelectedRouteId);

      // Tenta apagar a mensagem do comando do usuário para manter o canal 100% limpo
      try {
        await message.delete();
      } catch (_) {}

    } catch (err) {
      console.error('Erro ao postar !painel:', err);
      if (err.code === 50013) {
        message.reply('❌ **Erro de Permissão:** O bot precisa da permissão de **Enviar Mensagens** e **Inserir Links (Embeds)** neste canal!').catch(() => {});
      } else {
        message.reply('❌ Erro ao enviar painel. Verifique as permissões do bot.').catch(() => {});
      }
    }
  }
});

// ==========================================
// INTERAÇÕES: SLASH, MENUS, BOTÕES E MODALS
// ==========================================

client.on('interactionCreate', async (interaction) => {
  try {
    // ----------------------------------------------------
    // 1. Slash Commands (/painel ou /rotas)
    // ----------------------------------------------------
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'painel' || interaction.commandName === 'rotas') {
        await interaction.deferReply();
        await loadRoutesFromDb();
        const payload = buildRoutePanelPayload(cachedRoutes, activeSelectedRouteId);
        const replyMsg = await interaction.editReply(payload);

        // Se for o comando /painel, salva como mensagem fixa oficial
        await savePanelInfo(interaction.channelId, replyMsg.id, activeSelectedRouteId);
      }
      return;
    }

    // ----------------------------------------------------
    // 2. Troca de Rota no Seletor Principal
    // ----------------------------------------------------
    if (interaction.isStringSelectMenu() && interaction.customId === 'panel_select_route') {
      const selectedRouteId = interaction.values[0];
      activeSelectedRouteId = selectedRouteId;
      await loadRoutesFromDb();
      const payload = buildRoutePanelPayload(cachedRoutes, selectedRouteId);
      await interaction.update(payload);
      if (panelInfo && panelInfo.channelId) {
        await savePanelInfo(panelInfo.channelId, panelInfo.messageId, selectedRouteId);
      }
      return;
    }

    // ----------------------------------------------------
    // 3. Escolha de Item para Carregamento -> Abre Janela Modal!
    // ----------------------------------------------------
    if (interaction.isStringSelectMenu() && interaction.customId === 'panel_select_load_item') {
      const selectedValue = interaction.values[0];
      const [, routeId, itemId] = selectedValue.split(':');

      const route = cachedRoutes.find((r) => r.id === routeId);
      const item = route?.items?.find((it) => it.id === itemId);

      if (!route || !item) {
        await interaction.reply({ content: '❌ Rota ou item não encontrado.', ephemeral: true });
        return;
      }

      const current = Number(item.currentAmount || 0);
      const remaining = Math.max(0, item.targetAmount - current);

      // Constrói o Modal Interativo do Discord
      const modal = new ModalBuilder()
        .setCustomId(`modal_load_item:${route.id}:${item.id}`)
        .setTitle(`Carregar: ${item.name.slice(0, 30)}`);

      const amountInput = new TextInputBuilder()
        .setCustomId('input_load_amount')
        .setLabel(`Quantidade a carregar (Faltam ${remaining} ${item.unit || 'un'}):`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Ex: ${remaining > 0 ? remaining : 10}`)
        .setValue(remaining > 0 ? String(remaining) : '10')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(6);

      const firstActionRow = new ActionRowBuilder().addComponents(amountInput);
      modal.addComponents(firstActionRow);

      // Abre a janela modal na tela do usuário!
      await interaction.showModal(modal);
      return;
    }

    // ----------------------------------------------------
    // 4. Recebimento da Quantidade Digitada no Modal
    // ----------------------------------------------------
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_load_item:')) {
        const [, routeId, itemId] = interaction.customId.split(':');
        const typedValue = interaction.fields.getTextInputValue('input_load_amount').trim();
        const quantityAdded = parseFloat(typedValue.replace(',', '.'));

        if (isNaN(quantityAdded) || quantityAdded <= 0) {
          await interaction.reply({ content: '❌ Por favor, digite um número válido maior que zero.', ephemeral: true });
          return;
        }

        const userName = interaction.member?.displayName || interaction.user.username;
        let modifiedItemName = '';
        let newTotal = 0;
        let targetTotal = 0;

        await loadRoutesFromDb();

        const updatedRoutes = cachedRoutes.map((r) => {
          if (r.id !== routeId) return r;

          const updatedItems = (r.items || []).map((it) => {
            if (it.id !== itemId) return it;

            modifiedItemName = it.name;
            const current = Number(it.currentAmount || 0);
            newTotal = Math.min(it.targetAmount, current + quantityAdded);
            targetTotal = it.targetAmount;
            const isCompleted = newTotal >= targetTotal;

            return {
              ...it,
              currentAmount: newTotal,
              completed: isCompleted,
              updatedBy: userName,
              updatedAt: new Date().toISOString(),
            };
          });

          // Registra no histórico de logs
          const newLog = {
            id: `log-${Date.now()}`,
            userName,
            itemName: modifiedItemName,
            amount: quantityAdded,
            timestamp: new Date().toISOString(),
          };

          const existingLogs = r.logs || [];
          const updatedLogs = [newLog, ...existingLogs].slice(0, 10);

          return {
            ...r,
            status: 'in_progress',
            items: updatedItems,
            logs: updatedLogs,
          };
        });

        await saveRoutesToDb(updatedRoutes);

        // Fecha a janela modal silenciosamente sem notificação/mensagem na tela
        await interaction.deferUpdate().catch(() => {});

        // Atualiza o painel fixo no canal instantaneamente
        await refreshFixedPanelMessage();

        return;
      }
    }

    // ----------------------------------------------------
    // 5. Botões de Ação da Viagem
    // ----------------------------------------------------
    if (interaction.isButton()) {
      const customId = interaction.customId;
      const userName = interaction.member?.displayName || interaction.user.username;

      // Iniciar Viagem
      if (customId.startsWith('btn_start_route:')) {
        const [, routeId] = customId.split(':');
        await loadRoutesFromDb();

        const updatedRoutes = cachedRoutes.map((r) => {
          if (r.id !== routeId) return r;
          return {
            ...r,
            status: 'in_progress',
            startedBy: userName,
            startedAt: new Date().toISOString(),
            completedAt: null,
            completedBy: null,
          };
        });

        await saveRoutesToDb(updatedRoutes);
        const payload = buildRoutePanelPayload(updatedRoutes, routeId);
        await interaction.update(payload);
        return;
      }

      // Concluir Rota & Creditar Recompensa
      if (customId.startsWith('btn_complete_route:')) {
        const [, routeId] = customId.split(':');
        await loadRoutesFromDb();

        let finishedRoute = null;

        const updatedRoutes = cachedRoutes.map((r) => {
          if (r.id !== routeId) return r;

          const completedItems = (r.items || []).map((it) => ({
            ...it,
            currentAmount: it.targetAmount,
            completed: true,
          }));

          finishedRoute = {
            ...r,
            status: 'completed',
            completedAt: new Date().toISOString(),
            completedBy: userName,
            items: completedItems,
          };
          return finishedRoute;
        });

        await saveRoutesToDb(updatedRoutes);

        // Insere receita no caixa da empresa no Supabase
        if (finishedRoute && finishedRoute.rewardAmount > 0) {
          try {
            await supabase.from('transactions').insert({
              id: `tx-route-${Date.now()}`,
              type: 'income',
              amount: finishedRoute.rewardAmount,
              category: 'Recompensa de Rota',
              description: encodeCompanyTag(
                `Missão "${finishedRoute.title}" concluída no Discord por ${userName}`,
                finishedRoute.companyId
              ),
              member_name: userName,
              date: new Date().toISOString(),
            });
            console.log(`💰 $${finishedRoute.rewardAmount} creditados no caixa da empresa no Supabase!`);
          } catch (err) {
            console.error('Erro ao creditar receita no Supabase:', err);
          }
        }

        const payload = buildRoutePanelPayload(updatedRoutes, routeId);
        await interaction.update(payload);

        // Envia mensagem festiva no canal
        await interaction.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x16a34a)
              .setTitle(`🎉 MISSÃO ENTREGUE COM SUCESSO!`)
              .setDescription(
                `A rota **${finishedRoute.title}** foi concluída com êxito por **${userName}**!\n\n` +
                `💰 **Recompensa Creditada:** \`$${Number(finishedRoute.rewardAmount).toLocaleString('pt-BR')} DOLS\` adicionados ao caixa da empresa no site!`
              )
              .setFooter({ text: 'Fazenda Pantaneiros • Parabéns à equipe!' })
              .setTimestamp()
          ]
        }).catch(() => {});

        return;
      }

      // Reiniciar Nova Viagem
      if (customId.startsWith('btn_reset_route:')) {
        const [, routeId] = customId.split(':');
        await loadRoutesFromDb();

        const updatedRoutes = cachedRoutes.map((r) => {
          if (r.id !== routeId) return r;

          const resetItems = (r.items || []).map((it) => ({
            ...it,
            currentAmount: 0,
            completed: false,
          }));

          return {
            ...r,
            status: 'in_progress',
            startedBy: userName,
            startedAt: new Date().toISOString(),
            completedAt: null,
            completedBy: null,
            items: resetItems,
            logs: [],
          };
        });

        await saveRoutesToDb(updatedRoutes);
        const payload = buildRoutePanelPayload(updatedRoutes, routeId);
        await interaction.update(payload);
        return;
      }
    }
  } catch (err) {
    console.error('Erro geral ao processar interação:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocorreu um erro ao processar. Tente novamente.', ephemeral: true }).catch(() => {});
    }
  }
});

// Inicialização
client.login(TOKEN).catch((err) => {
  console.error('\n❌ Erro de login no Discord:', err.message);
});
