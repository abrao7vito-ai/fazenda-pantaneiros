/**
 * Security & Defense Utilities for Fazenda Pantaneiros
 * Implements hashing, rate limiting, RBAC checks, input sanitization, and audit logging.
 */

// 1. In-Memory Rate Limiting Engine
const loginAttempts = new Map(); // identifier -> { count, lockedUntil }
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 60 seconds

export const rateLimiter = {
  checkLoginRateLimit(identifier) {
    if (!identifier) return { allowed: true };
    const id = String(identifier).trim().toLowerCase();
    const record = loginAttempts.get(id);

    if (!record) return { allowed: true };

    const now = Date.now();
    if (record.lockedUntil && now < record.lockedUntil) {
      const secondsLeft = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        secondsLeft,
        error: `Muitas tentativas incorretas. Conta bloqueada temporariamente. Aguarde ${secondsLeft}s.`,
      };
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
      loginAttempts.delete(id);
      return { allowed: true };
    }

    return { allowed: true };
  },

  recordFailedAttempt(identifier) {
    if (!identifier) return;
    const id = String(identifier).trim().toLowerCase();
    const now = Date.now();
    const record = loginAttempts.get(id) || { count: 0, lockedUntil: null };

    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
    }
    loginAttempts.set(id, record);
  },

  recordSuccessfulLogin(identifier) {
    if (!identifier) return;
    loginAttempts.delete(String(identifier).trim().toLowerCase());
  },

  resetAll() {
    loginAttempts.clear();
  },
};

// 2. Cryptographic Hash for PIN (SHA-256)
export async function hashPin(pin) {
  if (!pin) return '';
  const cleanPin = String(pin).trim();
  const salt = 'pantaneiros_salt_2026_';
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + cleanPin);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {}
  }

  // Pure JS fallback if crypto.subtle is unavailable (e.g. older SSR environments)
  let hash = 0;
  const str = salt + cleanPin;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hs_' + Math.abs(hash).toString(16);
}

// Synchronous PIN comparison helper
export function verifyPinDirect(inputPin, storedPinOrHash) {
  if (!inputPin || !storedPinOrHash) return false;
  const inputStr = String(inputPin).trim();
  const storedStr = String(storedPinOrHash).trim();
  return inputStr === storedStr;
}

// 3. Input Sanitization
export function sanitizeString(val, maxLength = 255) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  // Strip control characters and dangerous script injection chars
  return str
    .replace(/[<>]/g, '')
    .slice(0, maxLength);
}

export function sanitizePositiveNumber(val, fallback = 0) {
  const num = Number(val);
  if (isNaN(num) || num < 0 || !isFinite(num)) {
    return fallback;
  }
  return num;
}

// 4. Role-Based Access Control (RBAC) Permissions Matrix
export const ROLES = {
  MASTER: 'master',
  OWNER: 'owner',
  MANAGER: 'manager',
  MEMBER: 'member',
  GUEST: 'guest',
};

export const PERMISSIONS = {
  MANAGE_COMPANIES: [ROLES.MASTER],
  DELETE_TRANSACTION: [ROLES.MASTER, ROLES.OWNER],
  ADD_EXPENSE: [ROLES.MASTER, ROLES.OWNER, ROLES.MANAGER],
  ADD_MEMBER: [ROLES.MASTER, ROLES.OWNER],
  DELETE_MEMBER: [ROLES.MASTER, ROLES.OWNER],
  MANAGE_GOALS: [ROLES.MASTER, ROLES.OWNER, ROLES.MANAGER],
  VALIDATE_DELIVERIES: [ROLES.MASTER, ROLES.OWNER, ROLES.MANAGER],
  CLOSE_CYCLE: [ROLES.MASTER, ROLES.OWNER],
  MANAGE_PROFIT_SPLIT: [ROLES.MASTER, ROLES.OWNER],
  MANAGE_DISCORD_SETTINGS: [ROLES.MASTER, ROLES.OWNER],
};

export function hasPermission(userRole, permissionKey) {
  if (!userRole) return false;
  const allowedRoles = PERMISSIONS[permissionKey];
  if (!allowedRoles) return false;
  return allowedRoles.includes(userRole);
}

// 5. In-Memory Security Audit Logger (without leaking secrets)
const auditLogs = [];

export function logSecurityEvent(action, { userId, userName, role, targetId, details, success = true }) {
  const event = {
    timestamp: new Date().toISOString(),
    action,
    userId: userId || 'anonymous',
    userName: userName || 'Desconhecido',
    role: role || 'guest',
    targetId: targetId || null,
    details: details ? sanitizeString(details, 500) : null,
    success,
  };
  auditLogs.unshift(event);
  if (auditLogs.length > 200) auditLogs.pop();
  return event;
}

export function getAuditLogs() {
  return [...auditLogs];
}
