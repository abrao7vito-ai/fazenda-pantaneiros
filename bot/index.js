import { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder, 
  EmbedBuilder, 
  REST, 
  Routes, 
  SlashCommandBuilder 
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config(); // fallback

// Configurações
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://isqjusvluobjooknybdu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_4rVEwpMQgn9675svYG9Dzw_bl6iD5Zr';
const APP_URL = process.env.APP_URL || 'https://fazenda-pantaneiros.onrender.com';

if (!TOKEN || TOKEN === 'SEU_TOKEN_DO_BOT_AQUI') {
  console.error('\n❌ ERRO: DISCORD_BOT_TOKEN não foi configurado no arquivo .env!');
  console.log('👉 Siga o passo a passo no README.md para obter seu token no Discord Developer Portal.\n');
  process.exit(1);
}

// Inicializa Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Inicializa Cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// Funções utilitárias
function encodeCompanyTag(text = '', companyId = 'comp-fazenda') {
  if (!companyId || companyId === 'comp-fazenda') return text || '';
  const clean = (text || '').replace(/^\[EMP:[^\]]+\]\s*/, '');
  return `[EMP:${companyId}] ${clean}`.trim();
}

function renderProgressBar(current, total, length = 12) {
  if (total <= 0) return '░'.repeat(length) + ' 0%';
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  const percent = Math.round(ratio * 100);
  return '`[' + '█'.repeat(filled) + '░'.repeat(empty) + `] ${percent}%\``;
}

// Busca as rotas do Supabase
async function fetchRoutes() {
  const { data, error } = await supabase
    .from('farm_settings')
    .select('value')
    .eq('key', 'routes')
    .maybeSingle();

  if (error || !data || !Array.isArray(data.value)) {
    console.warn('Rotas não encontradas no Supabase, usando padrão.');
    return [];
  }
  return data.value;
}

// Salva rotas atualizadas no Supabase
async function saveRoutes(routes) {
  const { error } = await supabase
    .from('farm_settings')
    .upsert({
      key: 'routes',
      value: routes,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Erro ao salvar rotas no Supabase:', error);
    throw error;
  }
}

// Constrói o Embed e os Componentes do Painel de Rotas
function buildRoutePanel(routes, selectedRouteId = null) {
  if (!routes || routes.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor(0xeab308)
      .setTitle('🚂 Painel de Rotas & Missões • Pantaneiros')
      .setDescription('Nenhuma rota encontrada. Crie novas rotas pelo painel web!')
      .setFooter({ text: 'Fazenda Pantaneiros • West Fox' });
    return { embeds: [emptyEmbed], components: [] };
  }

  // Se nenhuma rota estiver selecionada, pega a primeira em andamento ou a primeira da lista
  let route = routes.find((r) => r.id === selectedRouteId);
  if (!route) {
    route = routes.find((r) => r.status === 'in_progress') || routes[0];
  }

  const items = route.items || [];
  const completedItemsCount = items.filter(
    (it) => it.completed || Number(it.currentAmount) >= Number(it.targetAmount)
  ).length;
  const totalItemsCount = items.length;
  const isAllItemsCompleted = totalItemsCount > 0 && completedItemsCount === totalItemsCount;

  // Cor do Embed conforme status
  let embedColor = 0xd97706; // Amber
  let statusText = '🟡 **Aguardando Início**';
  if (route.status === 'in_progress') {
    embedColor = 0x2563eb; // Azul
    statusText = '🔵 **Em Andamento**';
  }
  if (route.status === 'completed') {
    embedColor = 0x16a34a; // Verde
    statusText = '🟢 **Missão Concluída & Entregue**';
  }

  // Formata a lista de itens
  const itemsDescription = items.map((it) => {
    const isDone = it.completed || Number(it.currentAmount) >= Number(it.targetAmount);
    const checkEmoji = isDone ? '✅' : '⏳';
    const current = it.currentAmount || 0;
    const target = it.targetAmount;
    const unit = it.unit || 'un';
    return `${checkEmoji} **${it.name}**: \`${current}/${target} ${unit}\` ${isDone ? '*(Pronto)*' : ''}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`${route.icon || '📦'} ${route.title.toUpperCase()}`)
    .setDescription(
      `${route.description ? `*${route.description}*\n\n` : ''}` +
      `💰 **Recompensa:** \`$${route.rewardAmount} DOLS\`\n` +
      `📊 **Status:** ${statusText}\n` +
      `${route.startedBy ? `👤 **Iniciado por:** \`${route.startedBy}\`\n` : ''}` +
      `${route.completedBy ? `🏆 **Entregue por:** \`${route.completedBy}\`\n` : ''}` +
      `\n**Progresso da Carga:**\n${renderProgressBar(completedItemsCount, totalItemsCount)}\n` +
      `*${completedItemsCount} de ${totalItemsCount} itens prontos*\n\n` +
      `📋 **Checklist de Materiais Exigidos:**\n${itemsDescription || 'Nenhum item cadastrado.'}`
    )
    .setFooter({ text: 'Use os botões abaixo para marcar os itens • Pantaneiros West Fox' })
    .setTimestamp();

  // --- Linha 1: Menu de Seleção de Rota ---
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_route')
    .setPlaceholder('Escolha a Rota para gerenciar...')
    .addOptions(
      routes.slice(0, 25).map((r) => {
        const isCurrent = r.id === route.id;
        const icon = r.icon || '📦';
        const statusBadge = r.status === 'completed' ? '✓ Entregue' : r.status === 'in_progress' ? '▶ Em Andamento' : '⏸ Aguardando';
        return new StringSelectMenuOptionBuilder()
          .setLabel(`${r.title} ($${r.rewardAmount})`)
          .setDescription(`${statusBadge} • ${r.items?.length || 0} itens`)
          .setValue(r.id)
          .setDefault(isCurrent);
      })
    );

  const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

  // --- Linha 2: Botões Rápidos dos Itens da Rota ---
  // Cria botões rápidos para os primeiros itens da rota
  const itemButtons = [];
  items.slice(0, 5).forEach((item) => {
    const isDone = item.completed || Number(item.currentAmount) >= Number(item.targetAmount);
    const step = item.targetAmount >= 50 ? 50 : (item.targetAmount >= 15 ? 15 : 5);
    
    itemButtons.push(
      new ButtonBuilder()
        .setCustomId(`add_item:${route.id}:${item.id}:${step}`)
        .setLabel(isDone ? `✓ ${item.name.slice(0, 14)}` : `+${step} ${item.name.slice(0, 14)}`)
        .setStyle(isDone ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(route.status === 'completed' || isDone)
    );
  });

  const rows = [rowSelect];

  if (itemButtons.length > 0) {
    const rowItems = new ActionRowBuilder().addComponents(itemButtons);
    rows.push(rowItems);
  }

  // --- Linha 3: Ações Principais da Rota ---
  const actionButtons = [];

  if (route.status === 'template' || !route.status) {
    actionButtons.push(
      new ButtonBuilder()
        .setCustomId(`start_route:${route.id}`)
        .setLabel('🚀 Iniciar Rota')
        .setStyle(ButtonStyle.Success)
    );
  }

  if (route.status === 'in_progress') {
    actionButtons.push(
      new ButtonBuilder()
        .setCustomId(`complete_route:${route.id}`)
        .setLabel(isAllItemsCompleted ? `✅ Entregar & Creditar $${route.rewardAmount}` : '⚡ Concluir Rota')
        .setStyle(isAllItemsCompleted ? ButtonStyle.Success : ButtonStyle.Primary)
    );
  }

  actionButtons.push(
    new ButtonBuilder()
      .setCustomId(`reset_route:${route.id}`)
      .setLabel('🔄 Reiniciar Viagem')
      .setStyle(ButtonStyle.Secondary)
  );

  actionButtons.push(
    new ButtonBuilder()
      .setLabel('🌐 Abrir no Painel Web')
      .setStyle(ButtonStyle.Link)
      .setURL(APP_URL)
  );

  const rowActions = new ActionRowBuilder().addComponents(actionButtons);
  rows.push(rowActions);

  return { embeds: [embed], components: rows };
}

// Evento: Bot Conectado
client.once('ready', async () => {
  console.log(`\n======================================================`);
  console.log(`🤠 Bot Pantaneiros conectado como: ${client.user.tag}`);
  console.log(`🌐 Painel Web integrado: ${APP_URL}`);
  console.log(`======================================================\n`);

  // Registra Slash Commands
  const commands = [
    new SlashCommandBuilder()
      .setName('rotas')
      .setDescription('Abre o painel interativo de rotas, cargas e checklist da Pantaneiros.'),
    new SlashCommandBuilder()
      .setName('checklist')
      .setDescription('Visualiza o checklist da rota ativa com botões de marcação.'),
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('⏳ Registrando comandos slash no Discord...');
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('✅ Comandos registrados com sucesso no servidor!');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Comandos globais registrados com sucesso!');
    }
  } catch (err) {
    console.warn('⚠️ Aviso ao registrar comandos slash:', err.message);
  }
});

// Evento: Mensagens de texto normais (ex: !rotas)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();
  if (content === '!rotas' || content === '!checklist' || content === '!painel') {
    try {
      const routes = await fetchRoutes();
      const panel = buildRoutePanel(routes);
      await message.reply(panel);
    } catch (err) {
      console.error('Erro ao processar !rotas:', err);
      message.reply('❌ Erro ao buscar rotas no banco de dados. Tente novamente em instantes.');
    }
  }
});

// Evento: Interações (Slash Commands, Menus e Botões)
client.on('interactionCreate', async (interaction) => {
  try {
    // 1. Slash Command /rotas
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'rotas' || interaction.commandName === 'checklist') {
        await interaction.deferReply();
        const routes = await fetchRoutes();
        const panel = buildRoutePanel(routes);
        await interaction.editReply(panel);
      }
      return;
    }

    // 2. Seleção de Rota no Menu Suspenso
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_route') {
      const selectedRouteId = interaction.values[0];
      const routes = await fetchRoutes();
      const panel = buildRoutePanel(routes, selectedRouteId);
      await interaction.update(panel);
      return;
    }

    // 3. Cliques em Botões
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // Botão: Adicionar quantidade a um item (+step)
      if (customId.startsWith('add_item:')) {
        const [, routeId, itemId, stepStr] = customId.split(':');
        const step = Number(stepStr) || 1;
        const userName = interaction.member?.displayName || interaction.user.username;

        const routes = await fetchRoutes();
        let targetRoute = null;

        const updatedRoutes = routes.map((r) => {
          if (r.id !== routeId) return r;

          const updatedItems = (r.items || []).map((it) => {
            if (it.id !== itemId) return it;
            const newAmount = Math.min(it.targetAmount, Number(it.currentAmount || 0) + step);
            const isCompleted = newAmount >= it.targetAmount;
            return {
              ...it,
              currentAmount: newAmount,
              completed: isCompleted,
              updatedBy: userName,
              updatedAt: new Date().toISOString(),
            };
          });

          targetRoute = {
            ...r,
            status: 'in_progress',
            items: updatedItems,
          };
          return targetRoute;
        });

        await saveRoutes(updatedRoutes);
        const panel = buildRoutePanel(updatedRoutes, routeId);
        await interaction.update(panel);
        return;
      }

      // Botão: Iniciar Rota
      if (customId.startsWith('start_route:')) {
        const [, routeId] = customId.split(':');
        const userName = interaction.member?.displayName || interaction.user.username;

        const routes = await fetchRoutes();
        const updatedRoutes = routes.map((r) => {
          if (r.id !== routeId) return r;
          return {
            ...r,
            status: 'in_progress',
            startedBy: userName,
            startedAt: new Date().toISOString(),
          };
        });

        await saveRoutes(updatedRoutes);
        const panel = buildRoutePanel(updatedRoutes, routeId);
        await interaction.update(panel);
        return;
      }

      // Botão: Concluir Rota & Creditar no Caixa
      if (customId.startsWith('complete_route:')) {
        const [, routeId] = customId.split(':');
        const userName = interaction.member?.displayName || interaction.user.username;

        const routes = await fetchRoutes();
        let completedRoute = null;

        const updatedRoutes = routes.map((r) => {
          if (r.id !== routeId) return r;
          const completedItems = (r.items || []).map((it) => ({
            ...it,
            currentAmount: it.targetAmount,
            completed: true,
          }));
          completedRoute = {
            ...r,
            status: 'completed',
            completedAt: new Date().toISOString(),
            completedBy: userName,
            items: completedItems,
          };
          return completedRoute;
        });

        await saveRoutes(updatedRoutes);

        // Se houver recompensa, insere receita no caixa da empresa no Supabase
        if (completedRoute && completedRoute.rewardAmount > 0) {
          try {
            await supabase.from('transactions').insert({
              id: `tx-route-${Date.now()}`,
              type: 'income',
              amount: completedRoute.rewardAmount,
              category: 'Recompensa de Rota',
              description: encodeCompanyTag(
                `Missão "${completedRoute.title}" concluída no Discord por ${userName}`,
                completedRoute.companyId
              ),
              member_name: userName,
              date: new Date().toISOString(),
            });
            console.log(`💰 Recompensa de $${completedRoute.rewardAmount} creditada com sucesso no Supabase!`);
          } catch (txErr) {
            console.error('Erro ao creditar recompensa no Supabase:', txErr);
          }
        }

        const panel = buildRoutePanel(updatedRoutes, routeId);
        await interaction.update(panel);
        return;
      }

      // Botão: Reiniciar Viagem
      if (customId.startsWith('reset_route:')) {
        const [, routeId] = customId.split(':');
        const userName = interaction.member?.displayName || interaction.user.username;

        const routes = await fetchRoutes();
        const updatedRoutes = routes.map((r) => {
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
          };
        });

        await saveRoutes(updatedRoutes);
        const panel = buildRoutePanel(updatedRoutes, routeId);
        await interaction.update(panel);
        return;
      }
    }
  } catch (err) {
    console.error('Erro ao manipular interação no Discord:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocorreu um erro ao processar sua ação.', ephemeral: true });
    }
  }
});

// Inicialização
client.login(TOKEN).catch((err) => {
  console.error('\n❌ Erro ao fazer login no Discord com o token fornecido:', err.message);
  console.log('👉 Verifique se o DISCORD_BOT_TOKEN no arquivo bot/.env está correto.\n');
});
