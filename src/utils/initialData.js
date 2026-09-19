/**
 * Production initial data for Fazenda Pantaneiros - West Fox
 * Clean state ready for the owner/proprietor and team
 */

export const INITIAL_MEMBERS = [
  {
    id: 'mem-1',
    name: 'Proprietário',
    role: 'owner',
    roleLabel: 'Dono da Fazenda',
    avatar: '👑',
    passport: '01',
    phone: '',
    pin: '1234',
    active: true,
  },
  {
    id: 'mem-2',
    name: 'Gerente Geral',
    role: 'manager',
    roleLabel: 'Gerente da Fazenda',
    avatar: '👔',
    passport: '02',
    phone: '',
    pin: '1234',
    active: true,
  },
  {
    id: 'mem-3',
    name: 'Membro Produtor',
    role: 'member',
    roleLabel: 'Membro Produtor',
    avatar: '🌾',
    passport: '03',
    phone: '',
    pin: '1234',
    active: true,
  },
];

// Production starts with clean cash flow history (0 DOLS)
export const INITIAL_TRANSACTIONS = [];

// Production starts with clean goals ready to be assigned
export const INITIAL_GOALS = [];

// Production starts with clean deliveries list
export const INITIAL_DELIVERIES = [];

export const INITIAL_SPLIT_SETTINGS = {
  farmReservePercent: 40,
  managersPercent: 20,
  membersPercent: 40,
  bonusForGoalAchieved: 5,
};
