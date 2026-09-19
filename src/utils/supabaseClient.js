import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://isqjusvluobjooknybdu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4rVEwpMQgn9675svYG9Dzw_bl6iD5Zr';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    })
  : null;

// ==========================================
// MAPPERS: Supabase (snake_case) <-> App (camelCase)
// ==========================================

export function toLocalMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    roleLabel: row.role_label,
    avatar: row.avatar,
    passport: row.passport || '',
    phone: row.phone || '',
    pin: row.pin || '1234',
    active: row.active ?? true,
    createdAt: row.created_at,
  };
}

export function toDbMember(m) {
  if (!m) return null;
  return {
    id: m.id,
    name: m.name,
    role: m.role,
    role_label: m.roleLabel,
    avatar: m.avatar,
    passport: m.passport || '',
    phone: m.phone || '',
    pin: m.pin || '1234',
    active: m.active ?? true,
  };
}

export function toLocalTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    memberId: row.member_id,
    memberName: row.member_name,
    category: row.category,
    description: row.description,
    date: row.date,
    boxBalanceAfter: row.box_balance_after != null ? Number(row.box_balance_after) : null,
    createdAt: row.created_at,
  };
}

export function toDbTransaction(tx) {
  if (!tx) return null;
  return {
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount),
    member_id: tx.memberId,
    member_name: tx.memberName,
    category: tx.category,
    description: tx.description,
    date: tx.date,
    box_balance_after: tx.boxBalanceAfter != null ? Number(tx.boxBalanceAfter) : null,
  };
}

export function toLocalGoal(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    unitType: row.unit_type,
    unitLabel: row.unit_label,
    creatorRole: row.creator_role,
    creatorName: row.creator_name,
    targetMemberId: row.target_member_id,
    targetMemberName: row.target_member_name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    deadline: row.deadline,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toDbGoal(g) {
  if (!g) return null;
  return {
    id: g.id,
    title: g.title,
    type: g.type,
    unit_type: g.unitType,
    unit_label: g.unitLabel,
    creator_role: g.creatorRole,
    creator_name: g.creatorName,
    target_member_id: g.targetMemberId,
    target_member_name: g.targetMemberName,
    target_amount: Number(g.targetAmount),
    current_amount: Number(g.currentAmount),
    deadline: g.deadline,
    status: g.status,
    notes: g.notes,
  };
}

export function toLocalDelivery(row) {
  if (!row) return null;
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    memberRole: row.member_role,
    managerId: row.manager_id,
    managerName: row.manager_name,
    goalId: row.goal_id,
    quantity: Number(row.quantity),
    itemType: row.item_type,
    notes: row.notes,
    proofUrl: row.proof_url,
    status: row.status,
    date: row.date,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    rejectionReason: row.rejection_reason,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
  };
}

export function toDbDelivery(d) {
  if (!d) return null;
  return {
    id: d.id,
    member_id: d.memberId,
    member_name: d.memberName,
    member_role: d.memberRole,
    manager_id: d.managerId,
    manager_name: d.managerName,
    goal_id: d.goalId,
    quantity: Number(d.quantity),
    item_type: d.itemType,
    notes: d.notes,
    proof_url: d.proofUrl,
    status: d.status,
    date: d.date,
    confirmed_at: d.confirmedAt,
    confirmed_by: d.confirmedBy,
    rejection_reason: d.rejectionReason,
    rejected_by: d.rejectedBy,
    rejected_at: d.rejectedAt,
  };
}

export function toLocalCycle(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    periodNote: row.period_note,
    closedBy: row.closed_by,
    totalIncome: Number(row.total_income),
    totalExpense: Number(row.total_expense),
    netProfit: Number(row.net_profit),
    splitSettings: row.split_settings,
    payouts: row.payouts,
    farmReserveAmount: Number(row.farm_reserve_amount),
    managersPoolAmount: Number(row.managers_pool_amount),
    membersPoolAmount: Number(row.members_pool_amount),
    createdAt: row.created_at,
  };
}

export function toDbCycle(c) {
  if (!c) return null;
  return {
    id: c.id,
    title: c.title,
    date: c.date,
    period_note: c.periodNote,
    closed_by: c.closedBy,
    total_income: Number(c.totalIncome),
    total_expense: Number(c.totalExpense),
    net_profit: Number(c.netProfit),
    split_settings: c.splitSettings,
    payouts: c.payouts,
    farm_reserve_amount: Number(c.farmReserveAmount),
    managers_pool_amount: Number(c.managersPoolAmount),
    members_pool_amount: Number(c.membersPoolAmount),
  };
}
