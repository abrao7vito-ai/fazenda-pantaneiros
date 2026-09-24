import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) || 
  '';

const SUPABASE_ANON_KEY = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) || 
  '';

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
// Safely maps metadata to avoid nonexistent column errors (e.g. company_id)
// ==========================================

export function encodeCompanyTag(text = '', companyId = 'comp-fazenda') {
  if (!companyId || companyId === 'comp-fazenda') return text || '';
  const clean = (text || '').replace(/^\[EMP:[^\]]+\]\s*/, '');
  return `[EMP:${companyId}] ${clean}`.trim();
}

export function extractCompanyTag(text = '', fallback = 'comp-fazenda') {
  if (!text) return { companyId: fallback, cleanText: '' };
  const match = String(text).match(/^\[EMP:([^\]]+)\]\s*/);
  if (match) {
    return {
      companyId: match[1],
      cleanText: String(text).replace(match[0], ''),
    };
  }
  return { companyId: fallback, cleanText: text };
}

export function extractMemberTags(rawLabel = '') {
  let text = String(rawLabel || '');
  let companyId = 'comp-fazenda';
  let firstAccessDone = false;
  let inviteToken = null;
  let inviteExpiresAt = null;

  const empMatch = text.match(/\[EMP:([^\]]+)\]/);
  if (empMatch) {
    companyId = empMatch[1];
    text = text.replace(empMatch[0], '').trim();
  }

  const fadMatch = text.match(/\[FAD:([01])\]/);
  if (fadMatch) {
    firstAccessDone = fadMatch[1] === '1';
    text = text.replace(fadMatch[0], '').trim();
  }

  const invMatch = text.match(/\[INV:([^:\]]+):([^\]]+)\]/);
  if (invMatch) {
    inviteToken = invMatch[1];
    inviteExpiresAt = invMatch[2];
    text = text.replace(invMatch[0], '').trim();
  }

  return { companyId, firstAccessDone, inviteToken, inviteExpiresAt, cleanRoleLabel: text };
}

export function encodeMemberTags(roleLabel = '', { companyId, firstAccessDone, inviteToken, inviteExpiresAt } = {}) {
  let clean = String(roleLabel || '')
    .replace(/(\[EMP:[^\]]+\]|\[FAD:[01]\]|\[INV:[^\]]+\])/g, '')
    .trim();

  let tags = '';
  if (companyId && companyId !== 'comp-fazenda' && companyId !== 'all') {
    tags += `[EMP:${companyId}]`;
  }
  if (firstAccessDone) {
    tags += `[FAD:1]`;
  } else {
    tags += `[FAD:0]`;
  }
  if (inviteToken && inviteExpiresAt) {
    tags += `[INV:${inviteToken}:${inviteExpiresAt}]`;
  }

  return tags ? `${tags} ${clean}`.trim() : clean;
}

export function toLocalMember(row) {
  if (!row) return null;
  const { 
    companyId: taggedCompanyId, 
    firstAccessDone: taggedFirstAccess, 
    inviteToken, 
    inviteExpiresAt, 
    cleanRoleLabel 
  } = extractMemberTags(row.role_label || '');

  let detectedCompanyId = row.company_id || taggedCompanyId;
  if (!detectedCompanyId || detectedCompanyId === 'comp-fazenda') {
    const textToCheck = ((row.role_label || '') + ' ' + (row.name || '')).toLowerCase();
    if (textToCheck.includes('ferrovia')) {
      detectedCompanyId = 'comp-ferrovia';
    } else if (textToCheck.includes('taberna') || textToCheck.includes('taverna')) {
      detectedCompanyId = 'comp-taverna';
    } else if (row.role === 'master' || row.id === 'mem-master') {
      detectedCompanyId = 'all';
    } else {
      detectedCompanyId = 'comp-fazenda';
    }
  }

  const isMaster = row.role === 'master' || row.id === 'mem-master';

  return {
    id: row.id,
    name: row.name || 'Sem nome',
    role: row.role || 'member',
    roleLabel: cleanRoleLabel || row.role_label || (row.role === 'owner' ? 'Líder / Dono' : row.role === 'manager' ? 'Gerente' : 'Membro'),
    companyId: isMaster ? 'all' : detectedCompanyId,
    avatar: row.avatar || (row.role === 'owner' ? '👑' : row.role === 'manager' ? '👔' : '🌾'),
    passport: row.passport ? String(row.passport) : '',
    phone: row.phone || '',
    pin: row.pin || '1234',
    active: row.active ?? true,
    firstAccessDone: isMaster ? true : taggedFirstAccess,
    inviteToken,
    inviteExpiresAt,
    createdAt: row.created_at,
  };
}

export function toDbMember(m) {
  if (!m) return null;
  const rawLabel = m.roleLabel || (m.role === 'owner' ? 'Líder / Dono' : m.role === 'manager' ? 'Gerente' : 'Membro');
  const roleLabelWithTags = encodeMemberTags(rawLabel, {
    companyId: m.companyId,
    firstAccessDone: m.firstAccessDone ?? (m.role === 'master'),
    inviteToken: m.inviteToken,
    inviteExpiresAt: m.inviteExpiresAt,
  });

  return {
    id: m.id,
    name: m.name,
    role: m.role,
    role_label: roleLabelWithTags,
    avatar: m.avatar,
    passport: m.passport || '',
    phone: m.phone || '',
    pin: m.pin || '1234',
    active: m.active ?? true,
  };
}

export function toLocalTransaction(row) {
  if (!row) return null;
  const { companyId, cleanText } = extractCompanyTag(row.description, row.company_id || 'comp-fazenda');
  return {
    id: row.id,
    companyId,
    type: row.type || 'income',
    amount: Number(row.amount) || 0,
    memberId: row.member_id || '',
    memberName: row.member_name || 'Sem responsável',
    category: row.category || 'Geral',
    description: cleanText || '',
    date: row.date || new Date().toISOString(),
    boxBalanceAfter: row.box_balance_after != null ? Number(row.box_balance_after) : null,
    createdAt: row.created_at,
  };
}

export function toDbTransaction(tx) {
  if (!tx) return null;
  // If memberId is mem-master or unset, setting member_id to null avoids foreign key violations in Supabase while preserving member_name
  const safeMemberId = (tx.memberId && tx.memberId !== 'mem-master') ? tx.memberId : null;
  return {
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount),
    member_id: safeMemberId,
    member_name: tx.memberName,
    category: tx.category,
    description: encodeCompanyTag(tx.description, tx.companyId),
    date: tx.date,
    box_balance_after: tx.boxBalanceAfter != null ? Number(tx.boxBalanceAfter) : null,
  };
}

export function toLocalGoal(row) {
  if (!row) return null;
  const { companyId, cleanText } = extractCompanyTag(row.notes, row.company_id || 'comp-fazenda');
  return {
    id: row.id,
    companyId,
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
    notes: cleanText,
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
    notes: encodeCompanyTag(g.notes, g.companyId),
  };
}

export function toLocalDelivery(row) {
  if (!row) return null;
  const { companyId, cleanText } = extractCompanyTag(row.notes, row.company_id || 'comp-fazenda');
  return {
    id: row.id,
    companyId,
    memberId: row.member_id,
    memberName: row.member_name,
    memberRole: row.member_role,
    managerId: row.manager_id,
    managerName: row.manager_name,
    goalId: row.goal_id,
    quantity: Number(row.quantity),
    itemType: row.item_type,
    notes: cleanText,
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
    notes: encodeCompanyTag(d.notes, d.companyId),
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
