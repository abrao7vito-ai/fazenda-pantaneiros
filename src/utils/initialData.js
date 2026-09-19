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

// Faturamento Total Inicial: $ 26.500,00 | Saldo Atual no Caixa: $ 14.344,03 DOLS
export const INITIAL_TRANSACTIONS = [
  {
    id: 'tx-pantanal-02',
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
    type: 'income',
    amount: 26500,
    memberId: 'mem-raquel',
    memberName: 'Raquel Souza [70]',
    category: 'Produção da Fazenda',
    description: 'Faturamento Total da Produção do Turno',
    date: '2026-09-19T18:00:00.000Z',
    boxBalanceAfter: 26500,
  },
];

export const INITIAL_GOALS = [
  {
    id: 'goal-milho-1',
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
];

export const INITIAL_DELIVERIES = [];

// Split Oficial: 30% Caixa da Fazenda ($ 7.950,00) | 70% Folha de Pagamentos ($ 18.550,00)
export const INITIAL_SPLIT_SETTINGS = {
  farmReservePercent: 30, // 30% para sementes, insumos e manutenção
  managersPercent: 35,    // Base e Bônus dos Gerentes
  membersPercent: 35,     // Base dos Donos e Produtores
  bonusForGoalAchieved: 883.33,
};
