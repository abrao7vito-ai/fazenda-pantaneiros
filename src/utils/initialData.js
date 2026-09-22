/**
 * Official team & production data for Fazenda Pantaneiros - West Fox
 * Real leadership: Raquel Souza, Vaticano, William Erick, Abraão
 */

export const INITIAL_MEMBERS = [
  {
    id: 'mem-raquel',
    name: 'Raquel Souza',
    role: 'owner',
    roleLabel: 'Dona da Fazenda',
    avatar: '👑',
    passport: '70',
    phone: '',
    pin: '1234',
    active: true,
  },
  {
    id: 'mem-vaticano',
    name: 'Vaticano',
    role: 'owner',
    roleLabel: 'Dono da Fazenda',
    avatar: '👑',
    passport: '',
    phone: '',
    pin: '1234',
    active: true,
  },
  {
    id: 'mem-william',
    name: 'William Erick',
    role: 'manager',
    roleLabel: 'Gerente Geral',
    avatar: '⭐',
    passport: '69',
    phone: '',
    pin: '1234',
    active: true,
  },
  {
    id: 'mem-abraao',
    name: 'Abraão',
    role: 'manager',
    roleLabel: 'Gerente de Operações',
    avatar: '👔',
    passport: '',
    phone: '',
    pin: '1234',
    active: true,
  },
];

export const INITIAL_COMPANIES = [
  {
    id: 'comp-fazenda',
    name: 'Fazenda Pantaneiros',
    type: 'farm',
    code: 'WEST FOX • 82',
    segment: 'Agricultura & Grãos',
    icon: '🌾',
    unitLabel: 'Sacas de Milho',
    themeColor: 'amber',
    description: 'Produção agrícola de milho, sementes e insumos em West Fox.',
    createdAt: '2026-09-15T00:00:00.000Z',
  },
  {
    id: 'comp-ferrovia',
    name: 'Ferrovia West Fox',
    type: 'railroad',
    code: 'RAIL • 01',
    segment: 'Logística & Transporte Ferroviário',
    icon: '🚂',
    unitLabel: 'Cargas de Carvão',
    themeColor: 'slate',
    description: 'Transporte de cargas pesadas, carvão, minérios e passageiros na ferrovia regional.',
    createdAt: '2026-09-18T00:00:00.000Z',
  },
  {
    id: 'comp-taverna',
    name: 'Taverna dos Pantaneiros',
    type: 'tavern',
    code: 'TAV • 82',
    segment: 'Taberna, Comidas & Bebidas',
    icon: '🍺',
    unitLabel: 'Barris de Bebida',
    themeColor: 'orange',
    description: 'Ponto de encontro, bar e fornecimento de refeições e bebidas aos colonos e viajantes.',
    createdAt: '2026-09-20T00:00:00.000Z',
  },
];

// Faturamento Total Inicial Fazenda: $ 26.500,00 | Saldo Atual no Caixa: $ 14.344,03 DOLS
export const INITIAL_TRANSACTIONS = [
  {
    id: 'tx-pantanal-02',
    companyId: 'comp-fazenda',
    type: 'expense',
    amount: 12155.97,
    memberId: 'mem-william',
    memberName: 'William Erick [69]',
    category: 'Folha de Pagamento',
    description: 'Saques parciais de pagamento da equipe no baú da fazenda',
    date: new Date().toISOString(),
    boxBalanceAfter: 14344.03,
  },
  {
    id: 'tx-pantanal-01',
    companyId: 'comp-fazenda',
    type: 'income',
    amount: 26500,
    memberId: 'mem-raquel',
    memberName: 'Raquel Souza [70]',
    category: 'Produção da Fazenda',
    description: 'Faturamento Total da Produção do Turno',
    date: '2026-09-19T18:00:00.000Z',
    boxBalanceAfter: 26500,
  },
  // Ferrovia initial fund
  {
    id: 'tx-ferrovia-01',
    companyId: 'comp-ferrovia',
    type: 'income',
    amount: 18000,
    memberId: 'mem-raquel',
    memberName: 'Raquel Souza [70]',
    category: 'Transporte de Cargas',
    description: 'Faturamento de frete e transporte de carvão no trem cargueiro',
    date: new Date().toISOString(),
    boxBalanceAfter: 18000,
  },
  // Taverna initial fund
  {
    id: 'tx-taverna-01',
    companyId: 'comp-taverna',
    type: 'income',
    amount: 9500,
    memberId: 'mem-raquel',
    memberName: 'Raquel Souza [70]',
    category: 'Venda de Bebidas & Refeições',
    description: 'Caixa arrecadado no balcão da Taverna dos Pantaneiros',
    date: new Date().toISOString(),
    boxBalanceAfter: 9500,
  },
];

export const INITIAL_GOALS = [
  {
    id: 'goal-milho-1',
    companyId: 'comp-fazenda',
    title: 'Meta de 100 Sacas de Milho - Turno Oficial',
    type: 'owner_to_manager',
    unitType: 'sacks',
    unitLabel: 'Sacas de Milho',
    creatorRole: 'owner',
    creatorName: 'Raquel Souza',
    targetMemberId: 'mem-william',
    targetMemberName: 'William Erick [69]',
    targetAmount: 100,
    currentAmount: 0,
    deadline: '2026-09-30',
    status: 'in_progress',
    notes: 'Entregar para os gerentes William Erick ou Abraão no silo central.',
  },
  {
    id: 'goal-ferrovia-1',
    companyId: 'comp-ferrovia',
    title: 'Meta de 50 Cargas de Carvão na Estação',
    type: 'owner_to_manager',
    unitType: 'sacks',
    unitLabel: 'Cargas de Carvão',
    creatorRole: 'owner',
    creatorName: 'Raquel Souza',
    targetMemberId: 'all',
    targetMemberName: 'Toda a Equipe (Geral)',
    targetAmount: 50,
    currentAmount: 12,
    deadline: '2026-10-05',
    status: 'in_progress',
    notes: 'Descarregar no pátio ferroviário de West Fox.',
  },
  {
    id: 'goal-taverna-1',
    companyId: 'comp-taverna',
    title: 'Meta de 80 Barris de Bebida para o Final de Semana',
    type: 'owner_to_manager',
    unitType: 'sacks',
    unitLabel: 'Barris de Bebida',
    creatorRole: 'owner',
    creatorName: 'Raquel Souza',
    targetMemberId: 'all',
    targetMemberName: 'Toda a Equipe (Geral)',
    targetAmount: 80,
    currentAmount: 25,
    deadline: '2026-10-02',
    status: 'in_progress',
    notes: 'Armazenar na adega dos fundos da Taverna.',
  },
];

export const INITIAL_DELIVERIES = [];

// Split Oficial: 30% Caixa da Fazenda ($ 7.950,00) | 70% Folha de Pagamentos ($ 18.550,00)
export const INITIAL_SPLIT_SETTINGS = {
  farmReservePercent: 30, // 30% para sementes, insumos e manutenção
  managersPercent: 35,    // Base e Bônus dos Gerentes
  membersPercent: 35,     // Base dos Donos e Produtores
  bonusForGoalAchieved: 883.33,
};
