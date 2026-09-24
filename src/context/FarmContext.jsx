import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  INITIAL_MEMBERS,
  INITIAL_TRANSACTIONS,
  INITIAL_GOALS,
  INITIAL_DELIVERIES,
  INITIAL_SPLIT_SETTINGS,
  INITIAL_COMPANIES,
  INITIAL_ROUTES,
} from '../utils/initialData';
import { 
  generateReportMessage, 
  generateDeliverySubmissionDiscordMessage, 
  generateDeliveryConfirmationDiscordMessage 
} from '../utils/formatters';
import {
  sendCashFlowDiscordLog,
  sendDeliverySubmittedDiscordLog,
  sendDeliveryConfirmedDiscordLog,
  sendPayrollDiscordLog,
  sendRouteStartedDiscordLog,
  sendRouteProgressDiscordLog,
  sendRouteCompletedDiscordLog,
  sendRouteDispatchedDiscordLog,
} from '../utils/discordWebhook';
import {
  supabase,
  isSupabaseConfigured,
  toLocalMember,
  toDbMember,
  toLocalTransaction,
  toDbTransaction,
  toLocalGoal,
  toDbGoal,
  toLocalDelivery,
  toDbDelivery,
  toDbCycle,
} from '../utils/supabaseClient';
import {
  rateLimiter,
  hashPin,
  verifyPinDirect,
  hasPermission,
  PERMISSIONS,
  ROLES,
  logSecurityEvent,
  sanitizeString,
  sanitizePositiveNumber,
  getAuditLogs,
} from '../utils/security';

const FarmContext = createContext();

const STORAGE_KEYS = {
  MEMBERS: 'pantaneiros_team_members_v1',
  TRANSACTIONS: 'pantaneiros_team_transactions_v2',
  GOALS: 'pantaneiros_team_goals_v1',
  DELIVERIES: 'pantaneiros_team_deliveries_v1',
  SETTINGS: 'pantaneiros_team_settings_v1',
  CURRENT_USER: 'pantaneiros_team_user_v1',
  CYCLES: 'pantaneiros_team_cycles_v1',
  DISCORD: 'pantaneiros_team_discord_v1',
  COMPANIES: 'pantaneiros_companies_v2',
  ACTIVE_COMPANY: 'pantaneiros_active_company_v2',
  ROUTES: 'pantaneiros_routes_v1',
};

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos em milissegundos

export function FarmProvider({ children }) {
  // No navegador real do usuário, limpa caches legados para funcionar 100% via Nuvem Supabase
  if (typeof window !== 'undefined' && window.location) {
    try {
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.MEMBERS);
      localStorage.removeItem(STORAGE_KEYS.GOALS);
      localStorage.removeItem(STORAGE_KEYS.DELIVERIES);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.CYCLES);
      localStorage.removeItem(STORAGE_KEYS.ROUTES);
      localStorage.removeItem(STORAGE_KEYS.COMPANIES);
      localStorage.removeItem(STORAGE_KEYS.DISCORD);
    } catch (_) {}
  }

  // --- Estados 100% Sincronizados com a Nuvem Supabase ---
  const [members, setMembers] = useState(() => {
    // Em ambiente de teste automatizado (SSR/Node), permite injeção do test-suite
    if (typeof window === 'undefined' || !window.location) {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.MEMBERS) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return INITIAL_MEMBERS;
  });
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [deliveries, setDeliveries] = useState(() => {
    if (typeof window === 'undefined' || !window.location) {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.DELIVERIES) : null;
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });
  const [splitSettings, setSplitSettings] = useState(INITIAL_SPLIT_SETTINGS);

  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      const isSessionAuth = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pantaneiros_auth_v1') === 'true';
      const isLocalAuth = typeof localStorage !== 'undefined' && localStorage.getItem('pantaneiros_auth_v1') === 'true';
      const lastActive = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('pantaneiros_last_active') || 0) : 0;
      const isWithinTimeout = (Date.now() - lastActive) < INACTIVITY_TIMEOUT_MS;
      if (!isSessionAuth && !(isLocalAuth && isWithinTimeout)) return null;
      const sessionUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pantaneiros_user_id') : null;
      return sessionUser || (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CURRENT_USER) : null) || null;
    } catch (e) {
      return null;
    }
  });

  const [closedCycles, setClosedCycles] = useState([]);
  const [companies, setCompanies] = useState(INITIAL_COMPANIES);

  const [currentCompanyId, setCurrentCompanyId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY);
      return saved || 'comp-fazenda';
    } catch (e) {
      return 'comp-fazenda';
    }
  });

  const [discordSettings, setDiscordSettings] = useState({
    webhookUrl: '',
    enabled: true,
    autoCashflow: true,
    autoDeliveries: true,
    autoPayroll: true,
    byCompany: {},
  });

  const [routes, setRoutes] = useState(INITIAL_ROUTES);

  // --- Authentication & 15-Minute Inactivity States ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const isSessionAuth = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pantaneiros_auth_v1') === 'true';
      const isLocalAuth = typeof localStorage !== 'undefined' && localStorage.getItem('pantaneiros_auth_v1') === 'true';
      const lastActive = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('pantaneiros_last_active') || 0) : 0;
      const isWithinTimeout = (Date.now() - lastActive) < INACTIVITY_TIMEOUT_MS;
      return isSessionAuth || (isLocalAuth && isWithinTimeout);
    } catch (_) {
      return false;
    }
  });

  const [logoutReason, setLogoutReason] = useState(null); // 'inactivity' | 'user' | null
  const lastActivityRef = useRef(Date.now());
  const [minutesRemaining, setMinutesRemaining] = useState(15);
  const [mustChangePasswordUser, setMustChangePasswordUser] = useState(null);

  // Monitor firstAccessDone for currently active user
  useEffect(() => {
    if (isAuthenticated && currentUserId && members.length > 0) {
      const activeMem = members.find((m) => m.id === currentUserId);
      if (activeMem && activeMem.role !== 'master' && !activeMem.firstAccessDone) {
        setMustChangePasswordUser(activeMem);
      } else if (activeMem && (activeMem.role === 'master' || activeMem.firstAccessDone)) {
        setMustChangePasswordUser(null);
      }
    }
  }, [isAuthenticated, currentUserId, members]);

  // --- Sync with LocalStorage (Apenas Sessão e Empresa Ativa) ---
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, currentCompanyId);
    } catch (_) {}
  }, [currentCompanyId]);

  useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUserId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (_) {}
  }, [currentUserId]);

  // --- Supabase Cloud Sync & Realtime Status ---
  const [dbStatus, setDbStatus] = useState('connecting'); // 'connecting' | 'connected' | 'tables_missing' | 'offline' | 'error'
  const [dbError, setDbError] = useState(null);
  const realtimeChannelRef = useRef(null);

  const fetchSupabaseData = async () => {
    if (!supabase) {
      setDbStatus('offline');
      return;
    }

    try {
      setDbStatus('connecting');
      const { data: membersData, error: memErr } = await supabase.from('members').select('*');

      if (memErr) {
        if (
          memErr.code === 'PGRST205' ||
          memErr.message?.includes('schema cache') ||
          memErr.message?.includes('not find the table')
        ) {
          setDbStatus('tables_missing');
          setDbError('Tabelas ainda não criadas no Supabase.');
          return;
        }
        throw memErr;
      }

      if (membersData && membersData.length > 0) {
        const localMembers = membersData.map(toLocalMember);
        // Guarantee master admin account is always kept even if remote supabase DB lacks it
        if (!localMembers.some((m) => m.id === 'mem-master' || m.role === 'master')) {
          const masterAcc = INITIAL_MEMBERS.find((m) => m.id === 'mem-master');
          if (masterAcc) localMembers.unshift(masterAcc);
        }
        setMembers(localMembers);
      }

      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (!txErr && txData) {
        setTransactions(txData.map(toLocalTransaction));
      }

      const { data: goalsData, error: goalsErr } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (!goalsErr && goalsData) {
        setGoals(goalsData.map(toLocalGoal));
      }

      const { data: delivData, error: delivErr } = await supabase
        .from('deliveries')
        .select('*')
        .order('date', { ascending: false });
      if (!delivErr && delivData) {
        setDeliveries(delivData.map(toLocalDelivery));
      }

      const { data: cyclesData, error: cyclesErr } = await supabase
        .from('closed_cycles')
        .select('*')
        .order('date', { ascending: false });
      if (!cyclesErr && cyclesData) {
        setClosedCycles(cyclesData.map(toLocalCycle));
      }

      const { data: settingsData } = await supabase.from('farm_settings').select('*');
      if (settingsData) {
        settingsData.forEach((row) => {
          if (row.key === 'split' && row.value) setSplitSettings(row.value);
          if (row.key === 'routes' && Array.isArray(row.value) && row.value.length > 0) {
            setRoutes(row.value);
          }
          if (row.key === 'companies' && Array.isArray(row.value) && row.value.length > 0) {
            setCompanies(row.value);
          }
          if (row.key === 'discord' && row.value) {
            setDiscordSettings((prev) => {
              const cloudVal = row.value;
              const hasCloud = cloudVal?.webhookUrl || (cloudVal?.byCompany && Object.keys(cloudVal.byCompany).length > 0);
              const hasLocal = prev?.webhookUrl || (prev?.byCompany && Object.keys(prev.byCompany).length > 0);
              if (hasCloud) {
                return {
                  ...cloudVal,
                  byCompany: cloudVal.byCompany || {},
                };
              }
              if (hasLocal) {
                // If local has a webhook URL or company webhooks, persist it up to Supabase
                supabase.from('farm_settings').upsert({
                  key: 'discord',
                  value: prev,
                  updated_at: new Date().toISOString(),
                }).then();
                return prev;
              }
              return {
                ...cloudVal,
                byCompany: cloudVal?.byCompany || {},
              };
            });
          }
        });
      }

      setDbStatus('connected');
      setDbError(null);
    } catch (err) {
      console.warn('Erro ao carregar dados do Supabase:', err);
      setDbStatus('error');
      setDbError(err.message || 'Erro de conexão com o banco');
    }
  };

  useEffect(() => {
    fetchSupabaseData();

    if (!supabase) return;

    const channel = supabase
      .channel('farm_realtime_changes', {
        config: {
          broadcast: { self: false },
        },
      })
      .on('broadcast', { event: 'routes_updated' }, ({ payload }) => {
        if (payload && Array.isArray(payload) && payload.length > 0) {
          setRoutes(payload);
        }
      })
      .on('broadcast', { event: 'companies_updated' }, ({ payload }) => {
        if (payload && Array.isArray(payload) && payload.length > 0) {
          setCompanies(payload);
        }
      })
      .on('broadcast', { event: 'transactions_updated' }, ({ payload }) => {
        if (payload && Array.isArray(payload)) {
          setTransactions(payload);
        }
      })
      .on('broadcast', { event: 'members_updated' }, ({ payload }) => {
        if (payload && Array.isArray(payload)) {
          setMembers(payload);
        }
      })
      .on('broadcast', { event: 'deliveries_updated' }, ({ payload }) => {
        if (payload && Array.isArray(payload)) {
          setDeliveries(payload);
        }
      })
      .on('broadcast', { event: 'discord_updated' }, ({ payload }) => {
        if (payload && typeof payload === 'object') {
          setDiscordSettings(payload);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = toLocalTransaction(payload.new);
          setTransactions((prev) => (prev.some((tx) => tx.id === item.id) ? prev : [item, ...prev]));
        } else if (payload.eventType === 'UPDATE') {
          const item = toLocalTransaction(payload.new);
          setTransactions((prev) => prev.map((tx) => (tx.id === item.id ? item : tx)));
        } else if (payload.eventType === 'DELETE') {
          setTransactions((prev) => prev.filter((tx) => tx.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = toLocalMember(payload.new);
          setMembers((prev) => (prev.some((m) => m.id === item.id) ? prev : [...prev, item]));
        } else if (payload.eventType === 'UPDATE') {
          const item = toLocalMember(payload.new);
          setMembers((prev) => prev.map((m) => (m.id === item.id ? item : m)));
        } else if (payload.eventType === 'DELETE') {
          setMembers((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = toLocalGoal(payload.new);
          setGoals((prev) => (prev.some((g) => g.id === item.id) ? prev : [item, ...prev]));
        } else if (payload.eventType === 'UPDATE') {
          const item = toLocalGoal(payload.new);
          setGoals((prev) => prev.map((g) => (g.id === item.id ? item : g)));
        } else if (payload.eventType === 'DELETE') {
          setGoals((prev) => prev.filter((g) => g.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = toLocalDelivery(payload.new);
          setDeliveries((prev) => (prev.some((d) => d.id === item.id) ? prev : [item, ...prev]));
        } else if (payload.eventType === 'UPDATE') {
          const item = toLocalDelivery(payload.new);
          setDeliveries((prev) => prev.map((d) => (d.id === item.id ? item : d)));
        } else if (payload.eventType === 'DELETE') {
          setDeliveries((prev) => prev.filter((d) => d.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'closed_cycles' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = toLocalCycle(payload.new);
          setClosedCycles((prev) => (prev.some((c) => c.id === item.id) ? prev : [item, ...prev]));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_settings' }, (payload) => {
        if (payload.new) {
          let val = payload.new.value;
          if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch (_) {}
          }
          if (payload.new.key === 'split' && val) setSplitSettings(val);
          if (payload.new.key === 'discord' && val) {
            setDiscordSettings({
              ...val,
              byCompany: val?.byCompany || {},
            });
          }
          if (payload.new.key === 'companies' && Array.isArray(val) && val.length > 0) {
            setCompanies(val);
          }
          if (payload.new.key === 'routes' && Array.isArray(val) && val.length > 0) {
            setRoutes(val);
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setDbStatus('connected');
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, []);

  // --- Sincronização Automática em Segundo Plano (Multi-Usuários & Multi-Dispositivos) ---
  // Garante que todas as telas (PC e Celular) fiquem 100% sincronizadas diretamente com a nuvem Supabase.
  useEffect(() => {
    if (!supabase) return;

    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        // 1. Sincroniza Configurações (Rotas, Empresas, Discord, Divisão)
        const { data: settingsData, error: sErr } = await supabase
          .from('farm_settings')
          .select('key, value, updated_at');

        if (!sErr && Array.isArray(settingsData)) {
          settingsData.forEach((row) => {
            let val = row.value;
            if (typeof val === 'string') {
              try { val = JSON.parse(val); } catch (_) {}
            }
            if (row.key === 'routes' && Array.isArray(val) && val.length > 0) {
              setRoutes((current) => (JSON.stringify(current) !== JSON.stringify(val) ? val : current));
            }
            if (row.key === 'companies' && Array.isArray(val) && val.length > 0) {
              setCompanies((current) => (JSON.stringify(current) !== JSON.stringify(val) ? val : current));
            }
            if (row.key === 'split' && val) {
              setSplitSettings((current) => (JSON.stringify(current) !== JSON.stringify(val) ? val : current));
            }
            if (row.key === 'discord' && val && typeof val === 'object') {
              setDiscordSettings((current) => (JSON.stringify(current) !== JSON.stringify(val) ? val : current));
            }
          });
        }

        // 2. Sincroniza Transações / Caixa da Nuvem
        const { data: txData, error: txErr } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (!txErr && Array.isArray(txData)) {
          const mappedTx = txData.map(toLocalTransaction);
          setTransactions((current) => (JSON.stringify(current) !== JSON.stringify(mappedTx) ? mappedTx : current));
        }

        // 3. Sincroniza Membros da Nuvem
        const { data: memData, error: memErr } = await supabase
          .from('members')
          .select('*');

        if (!memErr && Array.isArray(memData) && memData.length > 0) {
          const mappedMem = memData.map(toLocalMember);
          if (!mappedMem.some((m) => m.id === 'mem-master' || m.role === 'master')) {
            const masterAcc = INITIAL_MEMBERS.find((m) => m.id === 'mem-master');
            if (masterAcc) mappedMem.unshift(masterAcc);
          }
          setMembers((current) => (JSON.stringify(current) !== JSON.stringify(mappedMem) ? mappedMem : current));
        }

        // 4. Sincroniza Entregas da Nuvem
        const { data: delivData, error: delivErr } = await supabase
          .from('deliveries')
          .select('*')
          .order('date', { ascending: false });

        if (!delivErr && Array.isArray(delivData)) {
          const mappedDeliv = delivData.map(toLocalDelivery);
          setDeliveries((current) => (JSON.stringify(current) !== JSON.stringify(mappedDeliv) ? mappedDeliv : current));
        }
      } catch (_) {}
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Auto-sync whenever user returns to tab or focuses window (e.g. edited on mobile, returned to PC)
  useEffect(() => {
    let lastSync = 0;
    const handleFocusSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && Date.now() - lastSync > 2500) {
        lastSync = Date.now();
        fetchSupabaseData();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleFocusSync);
      window.addEventListener('focus', handleFocusSync);
      return () => {
        window.removeEventListener('visibilitychange', handleFocusSync);
        window.removeEventListener('focus', handleFocusSync);
      };
    }
  }, []);

  // Current active user object - Strictly gated by authentication
  const currentUser = isAuthenticated && currentUserId
    ? (members && members.find((m) => m && m.id === currentUserId)) || null
    : null;

  const currentRole = currentUser?.role || ROLES.GUEST;

  // --- Auth Handlers & 15-Minute Inactivity Engine ---
  const login = ({ identifier, memberId, pin }) => {
    const rawId = (identifier !== undefined ? identifier : memberId || '').toString().trim();
    if (!rawId) {
      const errRes = { success: false, error: 'Por favor, informe seu ID, Passaporte ou Nome.' };
      return { ...errRes, then(resolve) { return Promise.resolve(errRes).then(resolve); } };
    }

    // 1. Rate Limiting Protection (Brute Force Defense)
    const rateCheck = rateLimiter.checkLoginRateLimit(rawId);
    if (!rateCheck.allowed) {
      const blockedRes = { success: false, error: rateCheck.error };
      return { ...blockedRes, then(resolve) { return Promise.resolve(blockedRes).then(resolve); } };
    }

    const query = rawId.toLowerCase();

    const doLoginWithMember = (member) => {
      const expectedPin = member.pin || '1234';
      if (!pin || !verifyPinDirect(pin, expectedPin)) {
        rateLimiter.recordFailedAttempt(rawId);
        logSecurityEvent('LOGIN_FAILED', { userId: member.id, userName: member.name, role: member.role, details: 'PIN incorreto', success: false });
        return { success: false, error: 'Senha / PIN incorreto para esta conta.' };
      }

      // Login Successful
      rateLimiter.recordSuccessfulLogin(rawId);
      logSecurityEvent('LOGIN_SUCCESS', { userId: member.id, userName: member.name, role: member.role });

      setCurrentUserId(member.id);
      setIsAuthenticated(true);
      setLogoutReason(null);
      lastActivityRef.current = Date.now();
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pantaneiros_auth_v1', 'true');
        sessionStorage.setItem('pantaneiros_user_id', member.id);
      }
      try {
        localStorage.setItem('pantaneiros_auth_v1', 'true');
        localStorage.setItem('pantaneiros_last_active', String(Date.now()));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, member.id);
      } catch (_) {}

      // Strict SaaS Multi-Tenant Isolation:
      if (member.role !== 'master') {
        const userCompany = member.companyId && member.companyId !== 'all' ? member.companyId : 'comp-fazenda';
        setCurrentCompanyId(userCompany);
        try {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, userCompany);
        } catch (_) {}
      }

      // First Access & Password Definition Enforcement (All non-master users without firstAccessDone)
      if (member.role !== 'master' && !member.firstAccessDone) {
        setMustChangePasswordUser(member);
      } else {
        setMustChangePasswordUser(null);
      }

      if (typeof fetchSupabaseData === 'function') {
        try { fetchSupabaseData().catch?.(() => {}); } catch (_) {}
      }

      return { success: true, member };
    };

    // 1. First check in-memory members
    const member = members.find((m) => {
      if (m.id && m.id.toLowerCase() === query) return true;
      if (m.passport && String(m.passport).trim().toLowerCase() === query) return true;
      if (m.name && m.name.toLowerCase() === query) return true;
      if (m.name && m.name.toLowerCase().includes(query)) return true;
      return false;
    });

    if (member) {
      const res = doLoginWithMember(member);
      return { ...res, then(resolve) { return Promise.resolve(res).then(resolve); } };
    }

    // In test / SSR environment, record failed attempt immediately
    if (typeof window === 'undefined' || !window.location) {
      rateLimiter.recordFailedAttempt(rawId);
      logSecurityEvent('LOGIN_FAILED', { userId: rawId, details: 'Conta não encontrada', success: false });
      const notFoundRes = { success: false, error: 'Conta não encontrada com este Passaporte / ID ou Nome.' };
      return { ...notFoundRes, then(resolve) { return Promise.resolve(notFoundRes).then(resolve); } };
    }

    // 2. If member not in local memory, try Supabase async lookup
    if (supabase) {
      const asyncLogin = (async () => {
        try {
          const { data: remoteMems } = await supabase.from('members').select('*');
          if (remoteMems && remoteMems.length > 0) {
            const mapped = remoteMems.map(toLocalMember);
            if (!mapped.some((m) => m.id === 'mem-master' || m.role === 'master')) {
              const masterAcc = INITIAL_MEMBERS.find((m) => m.id === 'mem-master');
              if (masterAcc) mapped.unshift(masterAcc);
            }
            setMembers(mapped);
            const remoteMem = mapped.find((m) => {
              if (m.id && m.id.toLowerCase() === query) return true;
              if (m.passport && String(m.passport).trim().toLowerCase() === query) return true;
              if (m.name && m.name.toLowerCase() === query) return true;
              if (m.name && m.name.toLowerCase().includes(query)) return true;
              return false;
            });
            if (remoteMem) {
              return doLoginWithMember(remoteMem);
            }
          }
        } catch (_) {}

        rateLimiter.recordFailedAttempt(rawId);
        logSecurityEvent('LOGIN_FAILED', { userId: rawId, details: 'Conta não encontrada', success: false });
        return { success: false, error: 'Conta não encontrada com este Passaporte / ID ou Nome.' };
      })();

      const syncFallback = {
        success: false,
        error: 'Conta não encontrada com este Passaporte / ID ou Nome.',
        then(resolve, reject) {
          return asyncLogin.then(resolve, reject);
        },
      };
      return syncFallback;
    }

    rateLimiter.recordFailedAttempt(rawId);
    logSecurityEvent('LOGIN_FAILED', { userId: rawId, details: 'Conta não encontrada', success: false });
    const notFoundRes = { success: false, error: 'Conta não encontrada com este Passaporte / ID ou Nome.' };
    return { ...notFoundRes, then(resolve) { return Promise.resolve(notFoundRes).then(resolve); } };
  };

  const logout = (reason = 'user') => {
    logSecurityEvent('LOGOUT', { userId: currentUser?.id, userName: currentUser?.name, role: currentRole, details: `Motivo: ${reason}` });
    setIsAuthenticated(false);
    setLogoutReason(reason);
    setCurrentUserId(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('pantaneiros_auth_v1');
      sessionStorage.removeItem('pantaneiros_user_id');
    }
    try {
      localStorage.removeItem('pantaneiros_auth_v1');
      localStorage.removeItem('pantaneiros_last_active');
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (_) {}
  };

  // 15-Minute Inactivity Watcher
  useEffect(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = Date.now();

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      try {
        localStorage.setItem('pantaneiros_last_active', String(Date.now()));
      } catch (_) {}
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed);
      const mins = Math.ceil(remainingMs / (60 * 1000));
      setMinutesRemaining(mins);

      // Auto logout after 15 minutes of no activity
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        logout('inactivity');
      }
    }, 4000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      clearInterval(checkInterval);
    };
  }, [isAuthenticated]);

  // --- Multi-Company Engine (Fazenda, Ferrovia, Taverna & Custom) ---
  const fallbackCompany = (INITIAL_COMPANIES && INITIAL_COMPANIES[0]) || {
    id: 'comp-fazenda',
    name: 'Fazenda Pantaneiros',
    type: 'farm',
    code: 'FZ • 01',
    segment: 'Agropecuária & Café',
    icon: '🌾',
    unitLabel: 'Sacos de Café',
    themeColor: 'emerald',
  };

  const currentCompany =
    (companies && companies.find((c) => c && c.id === currentCompanyId)) ||
    (companies && companies[0]) ||
    fallbackCompany;

  // Multi-Company Discord Webhook Settings Resolver:
  // Resolves the specific webhook configuration for the specified company.
  // STRICT SAAS ISOLATION: Each company maintains its own dedicated webhook.
  // Never falls back to a global webhook URL to prevent cross-company leakage.
  const getCompanyDiscordSettings = (companyId) => {
    const cId = companyId || currentCompanyId || 'comp-fazenda';
    const compSettings = discordSettings?.byCompany?.[cId];
    return {
      webhookUrl: compSettings?.webhookUrl || '',
      enabled: compSettings?.enabled ?? (discordSettings?.enabled ?? true),
      autoCashflow: compSettings?.autoCashflow ?? (discordSettings?.autoCashflow ?? true),
      autoDeliveries: compSettings?.autoDeliveries ?? (discordSettings?.autoDeliveries ?? true),
      autoPayroll: compSettings?.autoPayroll ?? (discordSettings?.autoPayroll ?? true),
      autoDeletePrevious: compSettings?.autoDeletePrevious ?? (discordSettings?.autoDeletePrevious ?? true),
    };
  };

  // Strict SaaS Multi-Tenant Isolation:
  // Non-master users are strictly locked to their own assigned company at all times.
  useEffect(() => {
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all') {
      if (currentCompanyId !== currentUser.companyId) {
        setCurrentCompanyId(currentUser.companyId);
        try {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, currentUser.companyId);
        } catch (_) {}
      }
    }
  }, [currentRole, currentUser?.companyId, currentCompanyId]);

  const selectCompany = (companyId) => {
    // Only master account can switch companies
    if (currentRole !== 'master') {
      console.warn('Acesso negado: apenas o Administrador Master pode alternar entre empresas.');
      return;
    }
    if (companies.some((c) => c.id === companyId)) {
      setCurrentCompanyId(companyId);
    }
  };

  const addCompany = ({ name, segment, icon, unitLabel, code, initialBalance = 0, description = '' }) => {
    if (currentRole !== 'master') {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: 'Tentativa não autorizada de fundar nova empresa',
        success: false,
      });
      return { success: false, error: 'Acesso restrito: apenas o Administrador Master pode fundar novas empresas.' };
    }

    const newId = `comp-${Date.now()}`;
    const newComp = {
      id: newId,
      name: sanitizeString(name, 80),
      type: 'general',
      code: code ? sanitizeString(code, 20).toUpperCase() : `EMP • ${companies.length + 1}`,
      segment: segment ? sanitizeString(segment, 80) : 'Atividade Comercial',
      icon: icon || '🏢',
      unitLabel: unitLabel ? sanitizeString(unitLabel, 40) : 'Unidades',
      themeColor: 'amber',
      description: description ? sanitizeString(description, 500) : '',
      createdAt: new Date().toISOString(),
    };

    const updated = [...companies, newComp];
    setCompanies(updated);

    const initNum = parseFloat(initialBalance);
    if (initNum && initNum > 0) {
      const initialTx = {
        id: `tx-init-${Date.now()}`,
        companyId: newId,
        type: 'income',
        amount: initNum,
        memberId: currentUser?.id || 'mem-raquel',
        memberName: currentUser?.name || 'Dono',
        category: 'Abertura de Caixa',
        description: `Saldo inicial de abertura da empresa ${newComp.name}`,
        date: new Date().toISOString(),
        boxBalanceAfter: initNum,
      };
      setTransactions((prev) => [initialTx, ...prev]);
      if (supabase) {
        supabase.from('transactions').insert(toDbTransaction(initialTx)).then();
      }
    }

    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'companies',
        value: updated,
        updated_at: new Date().toISOString(),
      }).then();
    }

    logSecurityEvent('COMPANY_CREATED', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: newId,
      details: newComp.name,
    });

    setCurrentCompanyId(newId);
    return { success: true, company: newComp };
  };

  const updateCompany = (companyId, updates) => {
    if (currentRole !== 'master') {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de alterar empresa ${companyId}`,
        success: false,
      });
      return { success: false, error: 'Acesso restrito: apenas o Administrador Master pode alterar dados estruturais de empresas.' };
    }
    const updated = companies.map((c) => (c.id === companyId ? { ...c, ...updates } : c));
    setCompanies(updated);
    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'companies',
        value: updated,
        updated_at: new Date().toISOString(),
      }).then();
    }
    return { success: true };
  };

  const deleteCompany = (companyId) => {
    if (currentRole !== 'master') {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de excluir empresa ${companyId}`,
        success: false,
      });
      return { success: false, error: 'Acesso restrito: apenas o Administrador Master pode excluir empresas.' };
    }
    if (companyId === 'comp-fazenda') {
      return { success: false, error: 'A Fazenda Pantaneiros é a matriz principal e não pode ser excluída.' };
    }
    const updated = companies.filter((c) => c.id !== companyId);
    setCompanies(updated);
    if (currentCompanyId === companyId) {
      setCurrentCompanyId('comp-fazenda');
    }
    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'companies',
        value: updated,
        updated_at: new Date().toISOString(),
      }).then();
    }
    return { success: true };
  };

  // Scoped Data by Active Company
  const activeTransactions = transactions.filter(
    (tx) => (tx.companyId || 'comp-fazenda') === currentCompanyId
  );

  const activeGoals = goals.filter(
    (g) => (g.companyId || 'comp-fazenda') === currentCompanyId
  );

  const activeDeliveries = deliveries.filter(
    (d) => (d.companyId || 'comp-fazenda') === currentCompanyId
  );

  const activeRoutes = routes.filter(
    (r) => (r.companyId || 'comp-fazenda') === currentCompanyId
  );

  // Financial Calculations for Active Company
  const totalIncome = activeTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalExpense = activeTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalBalance = totalIncome - totalExpense;

  // Despesas operacionais puras da empresa ativa
  const operationalExpense = activeTransactions
    .filter((tx) => tx.type === 'expense' && tx.category !== 'Folha de Pagamento' && tx.category !== 'Retirada de Lucro')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const netProfit = Math.max(0, totalIncome - operationalExpense);

  // Profit Split Calculation (Empresa ativa)
  const farmReserveAmount = (netProfit * (splitSettings?.farmReservePercent || 0)) / 100;
  const managersPoolAmount = (netProfit * (splitSettings?.managersPercent || 0)) / 100;
  const membersPoolAmount = (netProfit * (splitSettings?.membersPercent || 0)) / 100;

  // Consolidated Multi-Company Metrics (Holding Master)
  const consolidatedBalance = transactions.reduce((acc, tx) => {
    return tx.type === 'income' ? acc + Number(tx.amount) : acc - Number(tx.amount);
  }, 0);

  const consolidatedIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const companyBalances = {};
  companies.forEach((c) => {
    const compTxs = transactions.filter((tx) => (tx.companyId || 'comp-fazenda') === c.id);
    const inc = compTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const exp = compTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    companyBalances[c.id] = inc - exp;
  });

  // Scoped Members by Active Company (excludes Master holding account, which is purely administrative)
  const activeCompanyMembers = members.filter((m) => {
    if (!m) return false;
    if (m.role === 'master') return false;
    if (m.companyId === 'all') return true;
    return (m.companyId || 'comp-fazenda') === currentCompanyId;
  });

  // Member stats for Active Company
  const memberContributions = {};
  activeCompanyMembers.forEach((m) => {
    if (!m || !m.id) return;
    memberContributions[m.id] = {
      member: m,
      totalIncomeAdded: 0,
      totalExpenseTaken: 0,
      sacksDelivered: 0,
      goalsAssigned: [],
      goalsCompleted: 0,
    };
  });

  activeTransactions.forEach((tx) => {
    if (tx && tx.memberId && memberContributions[tx.memberId]) {
      if (tx.type === 'income') {
        memberContributions[tx.memberId].totalIncomeAdded += Number(tx.amount) || 0;
      } else {
        memberContributions[tx.memberId].totalExpenseTaken += Number(tx.amount) || 0;
      }
    }
  });

  activeDeliveries
    .filter((d) => d && d.status === 'confirmed')
    .forEach((d) => {
      if (d && d.memberId && memberContributions[d.memberId]) {
        memberContributions[d.memberId].sacksDelivered += Number(d.quantity) || 0;
      }
    });

  activeGoals.forEach((g) => {
    if (g && g.targetMemberId && memberContributions[g.targetMemberId]) {
      memberContributions[g.targetMemberId].goalsAssigned.push(g);
      if (g.status === 'completed' || (Number(g.currentAmount) >= Number(g.targetAmount) && Number(g.targetAmount) > 0)) {
        memberContributions[g.targetMemberId].goalsCompleted += 1;
      }
    }
  });

  const totalMemberIncomeOnly = Object.values(memberContributions)
    .filter((entry) => entry.member?.role === 'member')
    .reduce((sum, entry) => sum + (Number(entry.totalIncomeAdded) || 0), 0);

  const managersList = activeCompanyMembers.filter((m) => m?.role === 'manager');
  const managerSharePerPerson = managersList.length > 0 ? (Number(managersPoolAmount) || 0) / managersList.length : 0;

  const memberPayouts = Object.values(memberContributions).map((entry) => {
    const isOwner = entry.member?.role === 'owner';
    const isManager = entry.member?.role === 'manager';
    const isMember = entry.member?.role === 'member';

    let estimatedPayout = 0;
    let sharePercentage = 0;

    if (isOwner) {
      estimatedPayout = farmReserveAmount;
      sharePercentage = splitSettings?.farmReservePercent || 30;
    } else if (isManager) {
      estimatedPayout = managerSharePerPerson;
      sharePercentage = managersList.length > 0 ? (splitSettings?.managersPercent || 20) / managersList.length : 0;
    } else if (isMember) {
      if (totalMemberIncomeOnly > 0) {
        sharePercentage = (entry.totalIncomeAdded / totalMemberIncomeOnly) * (splitSettings?.membersPercent || 50);
        estimatedPayout = (entry.totalIncomeAdded / totalMemberIncomeOnly) * (Number(membersPoolAmount) || 0);
      } else {
        const membersList = activeCompanyMembers.filter((m) => m?.role === 'member');
        estimatedPayout = membersList.length > 0 ? (Number(membersPoolAmount) || 0) / membersList.length : 0;
        sharePercentage = membersList.length > 0 ? (splitSettings?.membersPercent || 50) / membersList.length : 0;
      }
    }

    return {
      ...entry,
      sharePercentage: Number(sharePercentage) || 0,
      estimatedPayout: Number(estimatedPayout) || 0,
    };
  });

  // Pending deliveries count for managers and owner
  const pendingDeliveries = activeDeliveries.filter((d) => d && d.status === 'pending');
  const myPendingDeliveries = activeDeliveries.filter((d) => {
    if (!d || d.status !== 'pending') return false;
    if (currentRole === 'owner' || currentRole === 'master') return true; // Owner/Master can validate all
    return d.managerId === currentUser?.id;
  });

  // --- Actions ---

  const addTransaction = ({ type, amount, memberId, category, description, date, companyId }) => {
    if (!isAuthenticated || !currentUser) {
      return { success: false, error: 'Acesso negado: faça login para realizar transações.' };
    }

    const numAmount = sanitizePositiveNumber(amount, 0);
    if (numAmount <= 0) {
      return { success: false, error: 'Valor da transação deve ser um número positivo maior que zero.' };
    }

    // RBAC: Only manager, owner, master can record expenses
    if (type === 'expense' && !hasPermission(currentRole, 'ADD_EXPENSE')) {
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem registrar despesas.' };
    }

    // Regular members can only record income for themselves
    const canAssignToOthers = hasPermission(currentRole, 'ADD_EXPENSE');
    const member = canAssignToOthers
      ? (members.find((m) => m.id === memberId) || currentUser)
      : currentUser;

    const txDate = date || new Date().toISOString();
    const activeCompId = companyId || (currentCompanyId && currentCompanyId !== 'all' ? currentCompanyId : 'comp-fazenda');

    const compCurrentBalance = companyBalances[activeCompId] != null ? companyBalances[activeCompId] : totalBalance;
    const newBalance = type === 'income' ? compCurrentBalance + numAmount : compCurrentBalance - numAmount;

    const newTx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      companyId: activeCompId,
      type,
      amount: numAmount,
      memberId: member.id,
      memberName: member.name,
      category: sanitizeString(category, 80) || (type === 'income' ? 'Adição ao Caixa' : 'Despesa'),
      description: sanitizeString(description, 500) || '',
      date: txDate,
      boxBalanceAfter: newBalance,
    };

    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'transactions_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });

    if (supabase) {
      supabase.from('transactions').insert(toDbTransaction(newTx)).then(({ error }) => {
        if (error) {
          console.warn('Aviso ao sincronizar transação com Supabase:', error.message);
          // If foreign key constraint violation, retry with member_id = null
          if (error.code === '23503' || String(error.message).includes('foreign key')) {
            const fallbackDbTx = { ...toDbTransaction(newTx), member_id: null };
            supabase.from('transactions').insert(fallbackDbTx).then(({ error: retryErr }) => {
              if (retryErr) console.warn('Erro ao inserir com fallback no Supabase:', retryErr.message);
            });
          }
        }
      });
    }

    // If income, check financial goals
    if (type === 'income') {
      setGoals((prevGoals) =>
        prevGoals.map((goal) => {
          if (goal.unitType === 'dols') {
            let updatedCurrent = goal.currentAmount;
            const matchesMember = goal.targetMemberId === member.id || goal.targetMemberId === 'all';
            if (matchesMember && goal.status === 'in_progress') {
              updatedCurrent += numAmount;
            } else if (goal.type === 'owner_to_manager' && matchesMember) {
              updatedCurrent += numAmount;
            }
            const isFinished = updatedCurrent >= goal.targetAmount;
            if (supabase) {
              supabase.from('goals').update({ current_amount: updatedCurrent, status: isFinished ? 'completed' : goal.status }).eq('id', goal.id).then();
            }
            return {
              ...goal,
              currentAmount: updatedCurrent,
              status: isFinished ? 'completed' : goal.status,
            };
          }
          return goal;
        })
      );
    }

    const formattedReport = generateReportMessage({
      type,
      amount: numAmount,
      personName: member.name,
      totalBoxBalance: newBalance,
      date: txDate,
      category: newTx.category,
      description: newTx.description,
    });

    // Automatic Discord Webhook Log for Cash Flow
    const txCompany = companies.find((c) => c.id === activeCompId) || currentCompany;
    const txDiscord = getCompanyDiscordSettings(activeCompId);
    if (txDiscord?.enabled && txDiscord?.autoCashflow && txDiscord?.webhookUrl) {
      sendCashFlowDiscordLog(txDiscord.webhookUrl, {
        type,
        amount: numAmount,
        personName: member.name,
        totalBoxBalance: newBalance,
        category: newTx.category,
        description: newTx.description,
        date: txDate,
        companyName: txCompany?.name,
        companyId: activeCompId,
        deletePrevious: txDiscord.autoDeletePrevious ?? true,
      }).catch((err) => console.error('Erro ao enviar log para o Discord:', err));
    }

    return { success: true, newTx, formattedReport };
  };

  const deleteTransaction = (id) => {
    if (!hasPermission(currentRole, 'DELETE_TRANSACTION')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de excluir transação ${id}`,
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Donos, Gerentes ou Administrador Master podem excluir lançamentos.' };
    }

    logSecurityEvent('TRANSACTION_DELETE', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: id,
    });

    setTransactions((prev) => {
      const updated = prev.filter((tx) => tx.id !== id);
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'transactions_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });
    if (supabase) {
      supabase.from('transactions').delete().eq('id', id).then();
    }
    return { success: true };
  };

  // Deliveries Workflow (Member informs, Manager confirms)
  const submitDelivery = ({ goalId, quantity, managerId, notes, companyId }) => {
    if (!isAuthenticated || !currentUser) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        role: currentRole,
        details: 'Tentativa não autenticada de submeter entrega',
        success: false,
      });
      return { success: false, error: 'Acesso negado: faça login para registrar entregas.' };
    }

    const qty = sanitizePositiveNumber(quantity, 0);
    if (qty <= 0) {
      return { success: false, error: 'A quantidade de entrega deve ser maior que zero.' };
    }

    const activeCompId = companyId || currentCompanyId || 'comp-fazenda';
    const goal = goals.find((g) => g.id === goalId);
    const manager = members.find((m) => m.id === managerId) || members.find((m) => m.role === 'manager');

    // Force member identity to authenticated currentUser to avoid IDOR spoofing
    const memberId = currentUser.id;
    const memberName = currentUser.name || 'Membro';

    const newDelivery = {
      id: `deliv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      companyId: activeCompId,
      goalId: goal?.id || null,
      goalTitle: goal?.title || `Entrega Avulsa de ${currentCompany?.unitLabel || 'Produção'}`,
      memberId,
      memberName,
      managerId: manager?.id || '',
      managerName: manager?.name || 'Gerente',
      itemType: goal?.unitLabel || currentCompany?.unitLabel || 'Unidades',
      quantity: qty,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      confirmedAt: null,
      notes: notes ? sanitizeString(notes, 500) : '',
    };

    if (typeof window === 'undefined' || !window.location) {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.DELIVERIES) : null;
        const cur = saved ? JSON.parse(saved) : deliveries;
        const updated = [newDelivery, ...(Array.isArray(cur) ? cur : [])];
        localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated));
      } catch (_) {}
    }

    setDeliveries((prev) => {
      const updated = [newDelivery, ...prev];
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'deliveries_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });

    if (supabase) {
      supabase.from('deliveries').insert(toDbDelivery(newDelivery)).then(({ error }) => {
        if (error) console.warn('Aviso ao sincronizar entrega com Supabase:', error.message);
      });
    }

    logSecurityEvent('DELIVERY_SUBMITTED', {
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentRole,
      targetId: newDelivery.id,
      details: `${qty}x ${newDelivery.itemType}`,
    });

    const discordMessage = generateDeliverySubmissionDiscordMessage({
      memberName: currentUser?.name || 'Membro',
      managerName: manager?.name || 'Gerente',
      quantity: qty,
      itemType: newDelivery.itemType,
      notes,
      date: new Date(),
    });

    // Automatic Discord Webhook Log for Delivery Submission
    const delivCompany = companies.find((c) => c.id === activeCompId) || currentCompany;
    const delivDiscord = getCompanyDiscordSettings(activeCompId);
    if (delivDiscord?.enabled && delivDiscord?.autoDeliveries && delivDiscord?.webhookUrl) {
      sendDeliverySubmittedDiscordLog(delivDiscord.webhookUrl, {
        memberName: currentUser?.name || 'Membro',
        managerName: manager?.name || 'Gerente',
        quantity: qty,
        itemType: newDelivery.itemType,
        notes,
        goalTitle: newDelivery.goalTitle,
        companyName: delivCompany?.name,
        companyId: activeCompId,
        deletePrevious: delivDiscord.autoDeletePrevious ?? true,
      }).catch((err) => console.error('Erro ao enviar log para o Discord:', err));
    }

    return { success: true, newDelivery, discordMessage };
  };

  const confirmDelivery = (deliveryId) => {
    if (!hasPermission(currentRole, 'VALIDATE_DELIVERIES')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de confirmar entrega ${deliveryId}`,
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem validar entregas.' };
    }

    let currentList = deliveries;
    if (typeof window === 'undefined' || !window.location) {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.DELIVERIES) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) currentList = parsed;
        }
      } catch (_) {}
    }

    const delivery = currentList.find((d) => d.id === deliveryId) || deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Entrega não encontrada.' };

    // Prevent double-counting / replay attacks
    if (delivery.status === 'confirmed') {
      return { success: false, error: 'Esta entrega já foi confirmada anteriormente.' };
    }
    if (delivery.status === 'rejected') {
      return { success: false, error: 'Esta entrega foi rejeitada e não pode ser confirmada.' };
    }

    const confirmedAt = new Date().toISOString();
    const qty = Number(delivery.quantity);

    if (typeof window === 'undefined' || !window.location) {
      try {
        const updated = currentList.map((d) =>
          d.id === deliveryId
            ? { ...d, status: 'confirmed', confirmedAt, confirmedBy: currentUser?.name || 'Gerência' }
            : d
        );
        localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated));
      } catch (_) {}
    }

    // 1. Update delivery status
    setDeliveries((prev) => {
      const updated = prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'confirmed',
              confirmedAt,
              confirmedBy: currentUser?.name || 'Gerência',
            }
          : d
      );
      if (typeof window === 'undefined' || !window.location) {
        try { localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated)); } catch (_) {}
      }
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'deliveries_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });

    // 2. Automatically update connected goal progress if exists
    let updatedGoal = null;
    if (delivery.goalId) {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === delivery.goalId) {
            const newCurrent = Number(g.currentAmount || 0) + qty;
            const isCompleted = newCurrent >= Number(g.targetAmount);
            updatedGoal = {
              ...g,
              currentAmount: newCurrent,
              status: isCompleted ? 'completed' : g.status,
            };
            return updatedGoal;
          }
          return g;
        })
      );
    }

    if (supabase) {
      supabase.from('deliveries').update({
        status: 'confirmed',
        confirmed_at: confirmedAt,
        confirmed_by: currentUser?.name || 'Gerência',
      }).eq('id', deliveryId).then();

      if (updatedGoal) {
        supabase.from('goals').update({
          current_amount: updatedGoal.currentAmount,
          status: updatedGoal.status,
        }).eq('id', updatedGoal.id).then();
      }
    }

    logSecurityEvent('DELIVERY_CONFIRMED', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: deliveryId,
      details: `${qty}x ${delivery.itemType} de ${delivery.memberName}`,
    });

    const discordConfirmation = generateDeliveryConfirmationDiscordMessage({
      memberName: delivery.memberName,
      managerName: currentUser?.name || 'Gerência',
      quantity: qty,
      itemType: delivery.itemType,
      confirmedTotal: updatedGoal ? updatedGoal.currentAmount : qty,
      targetTotal: updatedGoal ? updatedGoal.targetAmount : null,
      date: new Date(),
    });

    // Automatic Discord Webhook Log for Delivery Confirmation
    const confCompId = delivery.companyId || currentCompanyId;
    const confCompany = companies.find((c) => c.id === confCompId) || currentCompany;
    const confDiscord = getCompanyDiscordSettings(confCompId);
    if (confDiscord?.enabled && confDiscord?.autoDeliveries && confDiscord?.webhookUrl) {
      sendDeliveryConfirmedDiscordLog(confDiscord.webhookUrl, {
        memberName: delivery.memberName,
        managerName: currentUser?.name || 'Gerência',
        quantity: qty,
        itemType: delivery.itemType,
        confirmedTotal: updatedGoal ? updatedGoal.currentAmount : qty,
        targetTotal: updatedGoal ? updatedGoal.targetAmount : null,
        goalTitle: delivery.goalTitle,
        unitLabel: delivery.itemType,
        companyName: confCompany?.name,
        companyId: confCompId,
        deletePrevious: confDiscord.autoDeletePrevious ?? true,
      }).catch((err) => console.error('Erro ao enviar confirmação para o Discord:', err));
    }

    return { success: true, updatedDelivery: delivery, discordConfirmation };
  };

  const rejectDelivery = ({ deliveryId, reason }) => {
    if (!hasPermission(currentRole, 'VALIDATE_DELIVERIES')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de rejeitar entrega ${deliveryId}`,
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem rejeitar entregas.' };
    }

    let currentList = deliveries;
    if (typeof window === 'undefined' || !window.location) {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.DELIVERIES) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) currentList = parsed;
        }
      } catch (_) {}
    }

    const delivery = currentList.find((d) => d.id === deliveryId) || deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, error: 'Entrega não encontrada.' };

    if (delivery.status === 'confirmed') {
      return { success: false, error: 'Esta entrega já foi confirmada e não pode ser rejeitada.' };
    }
    if (delivery.status === 'rejected') {
      return { success: false, error: 'Esta entrega já se encontra rejeitada.' };
    }

    const rejectedAt = new Date().toISOString();

    if (typeof window === 'undefined' || !window.location) {
      try {
        const updated = currentList.map((d) =>
          d.id === deliveryId
            ? {
                ...d,
                status: 'rejected',
                rejectionReason: sanitizeString(reason, 255) || 'Não conferido ou incorreto',
                rejectedBy: currentUser?.name || 'Gerência',
                rejectedAt,
              }
            : d
        );
        localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated));
      } catch (_) {}
    }

    setDeliveries((prev) => {
      const updated = prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'rejected',
              rejectionReason: sanitizeString(reason, 255) || 'Não conferido ou incorreto',
              rejectedBy: currentUser?.name || 'Gerência',
              rejectedAt,
            }
          : d
      );
      if (typeof window === 'undefined' || !window.location) {
        try { localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated)); } catch (_) {}
      }
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'deliveries_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });

    if (supabase) {
      supabase.from('deliveries').update({
        status: 'rejected',
        rejection_reason: sanitizeString(reason, 255) || 'Não conferido ou incorreto',
        rejected_by: currentUser?.name || 'Gerência',
        rejected_at: rejectedAt,
      }).eq('id', deliveryId).then();
    }

    logSecurityEvent('DELIVERY_REJECTED', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: deliveryId,
      details: reason,
    });

    return { success: true };
  };

  const addGoal = ({ title, type, unitType, unitLabel, targetMemberId, targetAmount, deadline, notes, companyId }) => {
    if (!hasPermission(currentRole, 'MANAGE_GOALS')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: 'Tentativa não autorizada de criar meta',
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem criar metas.' };
    }

    const isAll = targetMemberId === 'all';
    const activeCompId = companyId || currentCompanyId || 'comp-fazenda';
    const targetMember = isAll ? null : members.find((m) => m.id === targetMemberId);
    const newGoal = {
      id: `goal-${Date.now()}`,
      companyId: activeCompId,
      title: sanitizeString(title, 120),
      type: type || (currentRole === 'owner' ? 'owner_to_manager' : 'manager_to_member'),
      unitType: unitType || 'sacks', // 'sacks' | 'dols'
      unitLabel: sanitizeString(unitLabel, 40) || (unitType === 'dols' ? 'DOLS' : currentCompany?.unitLabel || 'Unidades'),
      creatorRole: currentRole,
      creatorName: currentUser?.name || 'Liderança',
      targetMemberId: targetMemberId || 'all',
      targetMemberName: isAll ? 'Toda a Equipe (Geral)' : (targetMember?.name || 'Não atribuído'),
      targetAmount: sanitizePositiveNumber(targetAmount, 0),
      currentAmount: 0,
      deadline: sanitizeString(deadline, 50),
      status: 'in_progress',
      notes: sanitizeString(notes, 500) || '',
    };
    setGoals((prev) => [newGoal, ...prev]);

    if (supabase) {
      supabase.from('goals').insert(toDbGoal(newGoal)).then(({ error }) => {
        if (error) console.warn('Aviso ao salvar meta no Supabase:', error.message);
      });
    }

    logSecurityEvent('GOAL_CREATED', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: newGoal.id,
      details: newGoal.title,
    });

    return newGoal;
  };

  const updateGoal = (id, updates) => {
    if (!hasPermission(currentRole, 'MANAGE_GOALS')) {
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem alterar metas.' };
    }
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const merged = { ...g, ...updates };
        if (merged.currentAmount >= merged.targetAmount && merged.status === 'in_progress') {
          merged.status = 'completed';
        }
        if (supabase) {
          supabase.from('goals').update(toDbGoal(merged)).eq('id', id).then();
        }
        return merged;
      })
    );
    return { success: true };
  };

  const deleteGoal = (id) => {
    if (!hasPermission(currentRole, 'MANAGE_GOALS')) {
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem excluir metas.' };
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (supabase) {
      supabase.from('goals').delete().eq('id', id).then();
    }
    return { success: true };
  };

  const addMember = ({ name, role, avatar, passport, phone, pin, companyId }) => {
    if (!hasPermission(currentRole, 'ADD_MEMBER')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: 'Tentativa não autorizada de criar nova conta de membro',
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Donos ou Administrador Master podem cadastrar novos membros.' };
    }

    const targetCompId = companyId || currentCompanyId || 'comp-fazenda';
    const targetRole = role || 'member';
    if ((targetRole === 'owner' || targetRole === 'master') && currentRole !== ROLES.MASTER) {
      return { success: false, error: 'Acesso negado: apenas o Administrador Master pode criar contas de Dono ou Master.' };
    }

    const targetCompanyObj = companies.find((c) => c.id === targetCompId);
    const compName = targetCompanyObj?.name || 'Fazenda';

    const getRoleLabel = () => {
      if (targetRole === 'master') return 'Administrador Master Holding';
      if (targetRole === 'owner') return `Dono • ${compName}`;
      if (targetRole === 'manager') return `Gerente • ${compName}`;
      return `Membro • ${compName}`;
    };

    const inviteToken = (targetRole !== 'master')
      ? ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '') : (Math.random().toString(36).substring(2) + Date.now().toString(36)))
      : null;
    const inviteExpiresAt = inviteToken ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null;

    const newMember = {
      id: `mem-${Date.now()}`,
      name: sanitizeString(name, 80),
      role: targetRole,
      roleLabel: getRoleLabel(),
      companyId: targetRole === 'master' ? 'all' : targetCompId,
      avatar: avatar || (targetRole === 'master' ? '⚡' : targetRole === 'owner' ? '👑' : targetRole === 'manager' ? '👔' : '🌾'),
      passport: passport ? sanitizeString(String(passport), 40) : '',
      phone: phone ? sanitizeString(String(phone), 40) : '',
      pin: pin ? sanitizeString(String(pin), 20) : '1234',
      firstAccessDone: targetRole === 'master',
      inviteToken,
      inviteExpiresAt,
      createdAt: new Date().toISOString(),
      active: true,
    };

    logSecurityEvent('MEMBER_CREATE', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: newMember.id,
      details: `Novo membro cadastrado: ${newMember.name} (${newMember.role})`,
    });

    setMembers((prev) => {
      const updated = [...prev, newMember];
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'members_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });

    if (supabase) {
      supabase.from('members').insert(toDbMember(newMember)).then(({ error }) => {
        if (error) console.warn('Aviso ao salvar membro no Supabase:', error.message);
      });
    }

    return { ...newMember, inviteToken, inviteExpiresAt };
  };

  const deleteMember = (id) => {
    if (!hasPermission(currentRole, 'DELETE_MEMBER')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de excluir membro ${id}`,
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Donos ou Administrador Master podem excluir membros.' };
    }

    const memberToDelete = members.find((m) => m.id === id);
    if (!memberToDelete) return { success: false, error: 'Membro não encontrado.' };
    
    // Safety check: Cannot delete Master account
    if (memberToDelete.role === 'master' || memberToDelete.id === 'mem-master') {
      return { success: false, error: 'Não é possível excluir a conta Administrador Master da Holding.' };
    }

    // Only Master can delete Owner accounts
    if (memberToDelete.role === 'owner' && currentRole !== ROLES.MASTER) {
      return { success: false, error: 'Apenas o Administrador Master pode excluir contas de Donos.' };
    }

    logSecurityEvent('MEMBER_DELETE', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: id,
      details: `Conta excluída: ${memberToDelete.name} (${memberToDelete.role})`,
    });

    setMembers((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'members_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });

    if (supabase) {
      supabase.from('members').delete().eq('id', id).then();
    }

    // If currently logged in as this user, logout immediately
    if (currentUserId === id) {
      logout('user');
    }
    return { success: true };
  };

  const updateMember = (id, updates = {}) => {
    const target = members.find((m) => m.id === id);
    if (!target) return { success: false, error: 'Membro não encontrado.' };

    const isSelf = currentUser && currentUser.id === id;
    const isMaster = currentRole === ROLES.MASTER;
    const isOwner = currentRole === ROLES.OWNER;

    if (!isSelf && !isOwner && !isMaster) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de editar membro ${id}`,
        success: false,
      });
      return { success: false, error: 'Acesso negado: você não tem permissão para alterar outros usuários.' };
    }

    // Privilege Escalation Prevention:
    // Non-master users CANNOT elevate roles or change assignments arbitrarily
    const safeUpdates = { ...updates };
    if (!isMaster) {
      delete safeUpdates.role;
      if (!isOwner) {
        delete safeUpdates.companyId;
      }
    }

    if (isOwner && !isMaster) {
      if (safeUpdates.role === 'owner' || safeUpdates.role === 'master') {
        delete safeUpdates.role;
      }
    }

    // Sanitize string inputs
    if (safeUpdates.name) safeUpdates.name = sanitizeString(safeUpdates.name, 80);
    if (safeUpdates.passport) safeUpdates.passport = sanitizeString(String(safeUpdates.passport), 40);
    if (safeUpdates.phone) safeUpdates.phone = sanitizeString(String(safeUpdates.phone), 40);
    if (safeUpdates.pin) safeUpdates.pin = sanitizeString(String(safeUpdates.pin), 20);

    logSecurityEvent('MEMBER_UPDATE', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: id,
      details: `Campos atualizados: ${Object.keys(safeUpdates).join(', ')}`,
    });

    setMembers((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== id) return m;
        return { ...m, ...safeUpdates };
      });
      if (supabase) {
        const merged = updated.find((m) => m.id === id);
        if (merged) supabase.from('members').update(toDbMember(merged)).eq('id', id).then();
      }
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'members_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });
    return { success: true };
  };

  // --- Primeiro Acesso e Gestão de Convites Criptográficos ---
  const validateInviteToken = (token) => {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token de convite inválido ou ausente.' };
    }
    const cleanToken = token.trim();
    const foundMember = members.find((m) => m.inviteToken === cleanToken);
    if (!foundMember) {
      return { valid: false, error: 'Convite não encontrado ou já utilizado.' };
    }
    if (foundMember.inviteExpiresAt) {
      const expires = new Date(foundMember.inviteExpiresAt).getTime();
      if (!isNaN(expires) && Date.now() > expires) {
        return { valid: false, error: 'Este link de convite expirou (validade máxima de 24 horas). Solicite um novo link ao seu líder.' };
      }
    }
    return { valid: true, member: foundMember };
  };

  const completeFirstAccess = async ({ memberId, newPin, inviteToken }) => {
    const cleanPin = String(newPin || '').trim();
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8) {
      return { success: false, error: 'O novo PIN deve conter entre 4 e 8 dígitos.' };
    }

    const targetMember = members.find((m) => m.id === memberId || (inviteToken && m.inviteToken === inviteToken));
    if (!targetMember) {
      return { success: false, error: 'Conta de membro não encontrada.' };
    }

    if (inviteToken && targetMember.inviteExpiresAt) {
      const expires = new Date(targetMember.inviteExpiresAt).getTime();
      if (!isNaN(expires) && Date.now() > expires) {
        return { success: false, error: 'Este link de convite expirou. Solicite um novo ao seu líder.' };
      }
    }

    const updatedMember = {
      ...targetMember,
      pin: cleanPin,
      firstAccessDone: true,
      inviteToken: null,
      inviteExpiresAt: null,
    };

    setMembers((prev) => {
      const updated = prev.map((m) => (m.id === targetMember.id ? updatedMember : m));
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'members_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });

    if (supabase) {
      try {
        await supabase.from('members').update(toDbMember(updatedMember)).eq('id', targetMember.id);
      } catch (err) {
        console.error('Erro ao atualizar primeiro acesso no Supabase:', err);
      }
    }

    // Automatically authenticate the user if they were in the first-access / forced-reset flow
    setCurrentUserId(updatedMember.id);
    setIsAuthenticated(true);
    setMustChangePasswordUser(null);
    setLogoutReason(null);
    lastActivityRef.current = Date.now();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pantaneiros_auth_v1', 'true');
      sessionStorage.setItem('pantaneiros_user_id', updatedMember.id);
    }
    try {
      localStorage.setItem('pantaneiros_auth_v1', 'true');
      localStorage.setItem('pantaneiros_last_active', String(Date.now()));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, updatedMember.id);
    } catch (_) {}

    if (updatedMember.role !== 'master') {
      const userCompany = updatedMember.companyId && updatedMember.companyId !== 'all' ? updatedMember.companyId : 'comp-fazenda';
      setCurrentCompanyId(userCompany);
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, userCompany);
      } catch (_) {}
    }

    logSecurityEvent('FIRST_ACCESS_COMPLETED', {
      userId: updatedMember.id,
      userName: updatedMember.name,
      role: updatedMember.role,
      details: 'Primeiro acesso e definição de PIN pessoal concluídos com sucesso',
    });

    return { success: true, member: updatedMember };
  };

  const regenerateInviteToken = async (memberId) => {
    if (!hasPermission(currentRole, 'ADD_MEMBER')) {
      return { success: false, error: 'Acesso negado: apenas líderes podem gerar novos links de convite.' };
    }

    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) {
      return { success: false, error: 'Membro não encontrado.' };
    }

    const newToken = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, '')
      : (Math.random().toString(36).substring(2) + Date.now().toString(36));
    const newExpires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const updatedMember = {
      ...targetMember,
      inviteToken: newToken,
      inviteExpiresAt: newExpires,
      firstAccessDone: false,
    };

    setMembers((prev) => {
      const updated = prev.map((m) => (m.id === targetMember.id ? updatedMember : m));
      if (realtimeChannelRef.current) {
        try {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'members_updated',
            payload: updated,
          });
        } catch (_) {}
      }
      return updated;
    });

    if (supabase) {
      try {
        await supabase.from('members').update(toDbMember(updatedMember)).eq('id', targetMember.id);
      } catch (err) {
        console.error('Erro ao atualizar convite no Supabase:', err);
      }
    }

    logSecurityEvent('INVITE_REGENERATED', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: targetMember.id,
      details: `Novo link de convite de 24h gerado para: ${targetMember.name}`,
    });

    return { success: true, inviteToken: newToken, inviteExpiresAt: newExpires };
  };

  const closeFinancialCycle = ({ title, periodNote, companyId } = {}) => {
    if (!hasPermission(currentRole, 'CLOSE_CYCLE')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: 'Tentativa não autorizada de fechar ciclo financeiro',
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Donos ou Administrador Master podem fechar ciclos financeiros.' };
    }

    const cycleCompId = companyId || currentCompanyId || 'comp-fazenda';
    const cycleCompany = companies.find((c) => c.id === cycleCompId) || currentCompany;

    const cycleRecord = {
      id: `cycle-${Date.now()}`,
      companyId: cycleCompId,
      title: sanitizeString(title, 100) || `Fechamento ${new Date().toLocaleDateString('pt-BR')}`,
      date: new Date().toISOString(),
      periodNote: sanitizeString(periodNote, 500) || '',
      closedBy: currentUser?.name || 'Liderança',
      totalIncome,
      totalExpense,
      netProfit,
      splitSettings: { ...splitSettings },
      payouts: memberPayouts.map((p) => ({
        memberId: p.member?.id || '',
        name: p.member?.name || 'Membro',
        role: p.member?.role || 'member',
        amountAdded: Number(p.totalIncomeAdded) || 0,
        payoutAmount: Number(p.estimatedPayout) || 0,
        sharePercentage: Number(p.sharePercentage) || 0,
      })),
      farmReserveAmount,
      managersPoolAmount,
      membersPoolAmount,
    };

    logSecurityEvent('CYCLE_CLOSED', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      targetId: cycleRecord.id,
      details: cycleRecord.title,
    });

    setClosedCycles((prev) => [cycleRecord, ...prev]);

    if (supabase) {
      supabase.from('closed_cycles').insert(toDbCycle(cycleRecord)).then(({ error }) => {
        if (error) console.warn('Aviso ao salvar ciclo no Supabase:', error.message);
      });
    }

    // Automatic Discord Webhook Log for Payroll / Financial Cycle Closure
    const cycleDiscord = getCompanyDiscordSettings(cycleCompId);
    if (cycleDiscord?.enabled && cycleDiscord?.autoPayroll && cycleDiscord?.webhookUrl) {
      sendPayrollDiscordLog(cycleDiscord.webhookUrl, {
        totalIncome,
        totalExpense,
        netProfit,
        farmReserveAmount,
        managersPoolAmount,
        membersPoolAmount,
        splitSettings,
        payouts: cycleRecord.payouts,
        closedBy: currentUser?.name || 'Liderança',
        companyName: cycleCompany?.name,
        companyId: cycleCompId,
        deletePrevious: cycleDiscord.autoDeletePrevious ?? true,
      }).catch((err) => console.error('Erro ao enviar log de repasses para o Discord:', err));
    }

    return cycleRecord;
  };

  const updateDiscordSettings = async (newSettings, targetCompanyId) => {
    if (!hasPermission(currentRole, 'MANAGE_DISCORD_SETTINGS')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: 'Tentativa não autorizada de alterar webhook do Discord',
        success: false,
      });
      throw new Error('Acesso negado: apenas Donos ou Administrador Master podem alterar configurações de Discord.');
    }

    const cId = targetCompanyId || currentCompanyId || 'comp-fazenda';

    // Strict SaaS Multi-Tenant Isolation: non-master cannot modify another company's integrations
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all' && currentUser.companyId !== cId) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de alterar webhook de outra empresa (${cId})`,
        success: false,
      });
      throw new Error('Acesso negado: você só pode gerenciar as integrações da sua própria empresa.');
    }

    const existingComp = discordSettings?.byCompany?.[cId] || {};
    const updatedComp = {
      ...existingComp,
      ...newSettings,
    };

    const updatedByCompany = {
      ...(discordSettings?.byCompany || {}),
      [cId]: updatedComp,
    };

    const merged = {
      ...discordSettings,
      byCompany: updatedByCompany,
    };

    logSecurityEvent('DISCORD_SETTINGS_UPDATED', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      details: `Configuração atualizada para empresa: ${cId}`,
    });

    setDiscordSettings(merged);

    // Instant Realtime Broadcast across all connected devices
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'discord_updated',
          payload: merged,
        });
      } catch (_) {}
    }

    if (supabase) {
      const { error } = await supabase.from('farm_settings').upsert({
        key: 'discord',
        value: merged,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error('Erro ao salvar discordSettings no Supabase:', error);
        throw error;
      }
    }
    return merged;
  };

  const updateSplitSettings = (newSettings) => {
    if (!hasPermission(currentRole, 'MANAGE_PROFIT_SPLIT')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: 'Tentativa não autorizada de alterar divisão de lucros',
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Donos ou Administrador Master podem alterar divisão de lucros.' };
    }

    logSecurityEvent('SPLIT_SETTINGS_UPDATED', {
      userId: currentUser?.id,
      userName: currentUser?.name,
      role: currentRole,
      details: `Novas regras: ${JSON.stringify(newSettings)}`,
    });

    setSplitSettings(newSettings);
    if (supabase) {
      supabase.from('farm_settings').upsert({ key: 'split', value: newSettings, updated_at: new Date().toISOString() }).then();
    }
    return { success: true };
  };

  // --- Rotas & Missões com Checklist (Fazenda, Ferrovia, Taverna) ---

  const syncRoutesState = (updatedList) => {
    setRoutes(updatedList);

    // Broadcast instantâneo para todos os outros aparelhos/navegadores conectados (latência < 50ms)
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'routes_updated',
          payload: updatedList,
        });
      } catch (bcErr) {
        console.warn('Erro ao emitir broadcast de rotas:', bcErr);
      }
    }

    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'routes',
        value: updatedList,
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('Erro ao sincronizar rotas no Supabase:', error);
      }).catch((e) => console.error('Falha de rede ao sincronizar rotas:', e));
    }
  };

  const startRoute = (routeId) => {
    if (!isAuthenticated || !currentUser) {
      return { success: false, error: 'Acesso negado: faça login para iniciar rotas.' };
    }
    const route = routes.find((r) => r.id === routeId);
    if (!route) return { success: false, error: 'Rota não encontrada.' };
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all') {
      const rComp = route.companyId || 'comp-fazenda';
      if (rComp !== currentUser.companyId) {
        return { success: false, error: 'Acesso negado: você não tem permissão para iniciar rotas de outra empresa.' };
      }
    }
    if (route.status === 'in_progress') {
      return { success: false, error: 'Esta rota já está em andamento.' };
    }

    const startedAt = new Date().toISOString();
    const startedBy = currentUser?.name || 'Membro';

    const updated = routes.map((r) =>
      r.id === routeId
        ? {
            ...r,
            status: 'in_progress',
            startedBy,
            startedAt,
            completedAt: null,
          }
        : r
    );

    syncRoutesState(updated);

    const startRouteCompId = route.companyId || currentCompanyId;
    const startRouteCompany = companies.find((c) => c.id === startRouteCompId) || currentCompany;
    const startRouteDiscord = getCompanyDiscordSettings(startRouteCompId);
    if (startRouteDiscord?.enabled && startRouteDiscord?.webhookUrl) {
      sendRouteStartedDiscordLog(startRouteDiscord.webhookUrl, {
        route,
        startedBy,
        companyName: startRouteCompany?.name,
        companyId: startRouteCompId,
        deletePrevious: startRouteDiscord.autoDeletePrevious ?? true,
      }).catch((e) => console.error('Erro ao enviar log de rota para Discord:', e));
    }
    return { success: true };
  };

  const updateRouteItem = (routeId, itemId, { addQuantity, setQuantity, markCompleted } = {}) => {
    if (!isAuthenticated || !currentUser) {
      return { success: false, error: 'Acesso negado: faça login para atualizar itens de rotas.' };
    }
    const targetRouteCheck = routes.find((r) => r.id === routeId);
    if (!targetRouteCheck) return { success: false, error: 'Rota não encontrada.' };
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all') {
      const rComp = targetRouteCheck.companyId || 'comp-fazenda';
      if (rComp !== currentUser.companyId) {
        return { success: false, error: 'Acesso negado: você não tem permissão para alterar o estoque de outra empresa.' };
      }
    }

    let updatedItem = null;
    let targetRoute = null;

    const updated = routes.map((r) => {
      if (r.id !== routeId) return r;

      const newItems = (r.items || []).map((it) => {
        if (it.id !== itemId) return it;

        let newCurrent = Number(it.currentAmount || 0);
        if (addQuantity != null) {
          newCurrent = Math.max(0, newCurrent + Number(addQuantity));
        } else if (setQuantity != null) {
          newCurrent = Math.max(0, Number(setQuantity));
        }

        let isCompleted = markCompleted != null ? Boolean(markCompleted) : (newCurrent >= it.targetAmount);
        if (markCompleted === true) {
          newCurrent = Math.max(newCurrent, it.targetAmount);
          isCompleted = true;
        }

        updatedItem = {
          ...it,
          currentAmount: newCurrent,
          completed: isCompleted,
          updatedBy: currentUser?.name || 'Membro',
          updatedAt: new Date().toISOString(),
        };
        return updatedItem;
      });

      // Registra no histórico de logs da rota
      const diffAmount = addQuantity != null ? Number(addQuantity) : (updatedItem?.currentAmount - (r.items.find(x => x.id === itemId)?.currentAmount || 0));
      const newLog = {
        id: `log-${Date.now()}`,
        userName: currentUser?.name || 'Membro',
        itemName: updatedItem?.name || 'Item',
        amount: diffAmount > 0 ? diffAmount : 1,
        timestamp: new Date().toISOString(),
      };
      const updatedLogs = [newLog, ...(r.logs || [])].slice(0, 10);

      targetRoute = {
        ...r,
        status: 'in_progress',
        items: newItems,
        logs: updatedLogs,
      };
      return targetRoute;
    });

    syncRoutesState(updated);

    if (targetRoute) {
      const progRouteCompId = targetRoute.companyId || currentCompanyId;
      const progRouteCompany = companies.find((c) => c.id === progRouteCompId) || currentCompany;
      const progRouteDiscord = getCompanyDiscordSettings(progRouteCompId);
      if (progRouteDiscord?.enabled && progRouteDiscord?.webhookUrl) {
        sendRouteProgressDiscordLog(progRouteDiscord.webhookUrl, {
          route: targetRoute,
          item: updatedItem,
          updatedBy: currentUser?.name || 'Membro',
          companyName: progRouteCompany?.name,
          companyId: progRouteCompId,
          deletePrevious: progRouteDiscord.autoDeletePrevious ?? true,
        }).catch((e) => console.error('Erro ao enviar progresso da rota para Discord:', e));
      }
    }
    return { success: true };
  };

  const completeRoute = (routeId, { creditToBox = true } = {}) => {
    if (!isAuthenticated || !currentUser) {
      return { success: false, error: 'Acesso negado: faça login para concluir rotas.' };
    }
    const route = routes.find((r) => r.id === routeId);
    if (!route) return { success: false, error: 'Rota não encontrada.' };
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all') {
      const rComp = route.companyId || 'comp-fazenda';
      if (rComp !== currentUser.companyId) {
        return { success: false, error: 'Acesso negado: você não tem permissão para concluir rotas de outra empresa.' };
      }
    }
    if (route.status === 'completed') {
      return { success: false, error: 'Esta rota já foi concluída anteriormente.' };
    }

    const completedAt = new Date().toISOString();
    const completedBy = currentUser?.name || 'Membro';

    const completedItems = (route.items || []).map((it) => ({
      ...it,
      currentAmount: it.targetAmount,
      completed: true,
    }));

    const updatedRoute = {
      ...route,
      status: 'completed',
      completedAt,
      completedBy,
      items: completedItems,
    };

    const updated = routes.map((r) => (r.id === routeId ? updatedRoute : r));
    syncRoutesState(updated);

    // Credita recompensa no caixa da empresa
    if (creditToBox && route.rewardAmount > 0) {
      addTransaction({
        type: 'income',
        amount: route.rewardAmount,
        category: 'Recompensa de Rota',
        description: `Missão "${route.title}" concluída por ${completedBy}`,
        companyId: route.companyId || currentCompanyId,
      });
    }

    const compRouteCompId = route.companyId || currentCompanyId;
    const compRouteCompany = companies.find((c) => c.id === compRouteCompId) || currentCompany;
    const compRouteDiscord = getCompanyDiscordSettings(compRouteCompId);
    if (compRouteDiscord?.enabled && compRouteDiscord?.webhookUrl) {
      sendRouteCompletedDiscordLog(compRouteDiscord.webhookUrl, {
        route: updatedRoute,
        completedBy,
        companyName: compRouteCompany?.name,
        creditedToBox: creditToBox && route.rewardAmount > 0,
        companyId: compRouteCompId,
        deletePrevious: compRouteDiscord.autoDeletePrevious ?? true,
      }).catch((e) => console.error('Erro ao enviar conclusão da rota para Discord:', e));
    }
    return { success: true };
  };

  const resetRoute = (routeId) => {
    if (!isAuthenticated || !currentUser) {
      return { success: false, error: 'Acesso negado: faça login para reiniciar rotas.' };
    }
    if (!hasPermission(currentRole, 'VALIDATE_DELIVERIES')) {
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem reiniciar o estoque de rotas.' };
    }
    const route = routes.find((r) => r.id === routeId);
    if (!route) return { success: false, error: 'Rota não encontrada.' };
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all') {
      const rComp = route.companyId || 'comp-fazenda';
      if (rComp !== currentUser.companyId) {
        return { success: false, error: 'Acesso negado: você não tem permissão para reiniciar rotas de outra empresa.' };
      }
    }

    const resetItems = (route.items || []).map((it) => ({
      ...it,
      currentAmount: 0,
      completed: false,
    }));

    const updated = routes.map((r) =>
      r.id === routeId
        ? {
            ...r,
            status: 'in_progress',
            startedBy: currentUser?.name || 'Membro',
            startedAt: new Date().toISOString(),
            completedAt: null,
            completedBy: null,
            items: resetItems,
          }
        : r
    );

    syncRoutesState(updated);
    return { success: true };
  };

  const addCustomRoute = (newRoute) => {
    if (!hasPermission(currentRole, 'MANAGE_GOALS')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: 'Tentativa não autorizada de criar nova rota',
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem criar rotas customizadas.' };
    }

    const id = `route-${Date.now()}`;
    const targetCompId = (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all')
      ? currentUser.companyId
      : (newRoute.companyId || currentCompanyId || 'comp-fazenda');

    const routeObj = {
      id,
      companyId: targetCompId,
      title: sanitizeString(newRoute.title, 100) || 'Nova Rota',
      rewardAmount: sanitizePositiveNumber(newRoute.rewardAmount, 0),
      icon: newRoute.icon || '📦',
      description: sanitizeString(newRoute.description, 500) || '',
      status: 'in_progress',
      startedBy: currentUser?.name || 'Membro',
      startedAt: new Date().toISOString(),
      completedAt: null,
      items: newRoute.items || [],
    };

    const updated = [routeObj, ...routes];
    syncRoutesState(updated);

    const addRouteCompId = routeObj.companyId || currentCompanyId;
    const addRouteCompany = companies.find((c) => c.id === addRouteCompId) || currentCompany;
    const addRouteDiscord = getCompanyDiscordSettings(addRouteCompId);
    if (addRouteDiscord?.enabled && addRouteDiscord?.webhookUrl) {
      sendRouteStartedDiscordLog(addRouteDiscord.webhookUrl, {
        route: routeObj,
        startedBy: currentUser?.name || 'Membro',
        companyName: addRouteCompany?.name,
        companyId: addRouteCompId,
        deletePrevious: addRouteDiscord.autoDeletePrevious ?? true,
      }).catch((e) => console.error(e));
    }

    return { success: true, route: routeObj };
  };

  const updateCustomRoute = (routeId, updatedData) => {
    if (!hasPermission(currentRole, 'MANAGE_GOALS')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de atualizar rota ${routeId}`,
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem editar rotas.' };
    }

    const targetR = routes.find((r) => r.id === routeId);
    if (!targetR) return { success: false, error: 'Rota não encontrada.' };
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all') {
      const rComp = targetR.companyId || 'comp-fazenda';
      if (rComp !== currentUser.companyId) {
        return { success: false, error: 'Acesso negado: você não tem permissão para editar rotas de outra empresa.' };
      }
    }

    const updated = routes.map((r) => {
      if (r.id !== routeId) return r;
      return {
        ...r,
        title: updatedData.title !== undefined ? sanitizeString(updatedData.title, 100) : r.title,
        rewardAmount: updatedData.rewardAmount !== undefined ? sanitizePositiveNumber(updatedData.rewardAmount, 0) : r.rewardAmount,
        icon: updatedData.icon !== undefined ? updatedData.icon : r.icon,
        description: updatedData.description !== undefined ? sanitizeString(updatedData.description, 500) : r.description,
        companyId: currentRole === 'master' ? (updatedData.companyId !== undefined ? updatedData.companyId : r.companyId) : r.companyId,
        items: updatedData.items !== undefined ? updatedData.items : r.items,
        updatedAt: new Date().toISOString(),
      };
    });

    syncRoutesState(updated);
    return { success: true };
  };

  const deleteCustomRoute = (routeId) => {
    if (!hasPermission(currentRole, 'MANAGE_GOALS')) {
      logSecurityEvent('UNAUTHORIZED_ACTION', {
        userId: currentUser?.id,
        userName: currentUser?.name,
        role: currentRole,
        details: `Tentativa não autorizada de excluir rota ${routeId}`,
        success: false,
      });
      return { success: false, error: 'Acesso negado: apenas Gerentes ou Donos podem excluir rotas.' };
    }

    const targetR = routes.find((r) => r.id === routeId);
    if (!targetR) return { success: false, error: 'Rota não encontrada.' };
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all') {
      const rComp = targetR.companyId || 'comp-fazenda';
      if (rComp !== currentUser.companyId) {
        return { success: false, error: 'Acesso negado: você não tem permissão para excluir rotas de outra empresa.' };
      }
    }

    const updated = routes.filter((r) => r.id !== routeId);
    syncRoutesState(updated);
    return { success: true };
  };


  const dispatchRouteBatch = (routeId, batchCount = 1) => {
    if (!isAuthenticated || !currentUser) {
      return { success: false, message: 'Acesso negado: faça login para despachar rotas.' };
    }
    const route = routes.find((r) => r.id === routeId);
    if (!route) return { success: false, message: 'Rota não encontrada.' };
    if (currentRole !== 'master' && currentUser?.companyId && currentUser.companyId !== 'all') {
      const rComp = route.companyId || 'comp-fazenda';
      if (rComp !== currentUser.companyId) {
        return { success: false, message: 'Acesso negado: você não tem permissão para despachar rotas de outra empresa.' };
      }
    }

    const items = route.items || [];
    const count = Math.max(1, parseInt(batchCount, 10) || 1);

    // Calcula quantas rotas completas o estoque atual permite
    const maxPossible = items.length === 0 ? 0 : Math.min(
      ...items.map((it) => {
        const perRoute = Number(it.perRoute || (it.targetAmount >= 2000 ? 100 : it.targetAmount >= 400 ? 20 : 20));
        return Math.floor(Number(it.currentAmount || 0) / perRoute);
      })
    );

    if (maxPossible < count) {
      return {
        success: false,
        message: `Estoque insuficiente para despachar ${count} viagem(ns). Disponível agora: ${maxPossible} viagem(ns).`,
        routesAvailable: maxPossible,
      };
    }

    const userName = currentUser?.name || 'Membro';
    const rewardEarned = (Number(route.rewardAmount) || 4600) * count;

    // Debita o estoque exato de 1 rota multiplicado pelo número de viagens
    const updatedItems = items.map((it) => {
      const perRoute = Number(it.perRoute || (it.targetAmount >= 2000 ? 100 : it.targetAmount >= 400 ? 20 : 20));
      const needed = perRoute * count;
      const newStock = Math.max(0, Number(it.currentAmount || 0) - needed);
      return {
        ...it,
        currentAmount: newStock,
        completed: newStock >= it.targetAmount,
        updatedAt: new Date().toISOString(),
        updatedBy: userName,
      };
    });

    const newLog = {
      id: `log-${Date.now()}`,
      userName,
      itemName: `${count}x ${route.title}`,
      amount: rewardEarned,
      timestamp: new Date().toISOString(),
      action: 'dispatch',
    };

    const targetRoute = {
      ...route,
      items: updatedItems,
      logs: [newLog, ...(route.logs || [])].slice(0, 15),
    };

    const updatedRoutes = routes.map((r) => (r.id === routeId ? targetRoute : r));
    syncRoutesState(updatedRoutes);

    // Credita o valor ganho na tesouraria / caixa da empresa
    addTransaction({
      type: 'income',
      amount: rewardEarned,
      category: 'Despacho de Rota',
      description: `${count}x Viagem "${route.title}" despachada por ${userName} (Estoque debitado)`,
      companyId: route.companyId || currentCompanyId,
    });

    // Envia aviso com estoque restante para o Discord Webhook
    const dispRouteCompId = route.companyId || currentCompanyId;
    const dispRouteCompany = companies.find((c) => c.id === dispRouteCompId) || currentCompany;
    const dispRouteDiscord = getCompanyDiscordSettings(dispRouteCompId);
    if (dispRouteDiscord?.enabled && dispRouteDiscord?.webhookUrl) {
      sendRouteDispatchedDiscordLog(dispRouteDiscord.webhookUrl, {
        route: targetRoute,
        batchCount: count,
        rewardEarned,
        dispatchedBy: userName,
        companyName: dispRouteCompany?.name,
        companyId: dispRouteCompId,
        deletePrevious: dispRouteDiscord.autoDeletePrevious ?? true,
      }).catch((e) => console.error('Erro ao enviar log de despacho para Discord:', e));
    }

    return { 
      success: true, 
      rewardEarned, 
      remainingRoutes: maxPossible - count 
    };
  };


  const resetToDefaultData = () => {
    setMembers(INITIAL_MEMBERS);
    setTransactions(INITIAL_TRANSACTIONS);
    setGoals(INITIAL_GOALS);
    setDeliveries(INITIAL_DELIVERIES);
    setSplitSettings(INITIAL_SPLIT_SETTINGS);
    setCompanies(INITIAL_COMPANIES);
    setCurrentCompanyId('comp-fazenda');
    setCurrentUserId('mem-raquel');
    setClosedCycles([]);
  };

  const isMaster = currentRole === 'master';

  // Strict SaaS Multi-Tenant Isolation:
  // Master sees all companies in the holding.
  // Owners, Managers, and Members ONLY see their own company and cannot access others!
  const userCompanyId = currentUser?.companyId && currentUser.companyId !== 'all' 
    ? currentUser.companyId 
    : 'comp-fazenda';

  const visibleCompanies = isMaster
    ? companies
    : companies.filter((c) => c.id === userCompanyId);

  const safeVisibleCompanies = visibleCompanies.length > 0 ? visibleCompanies : [currentCompany];

  const exposedConsolidatedBalance = isMaster ? consolidatedBalance : totalBalance;
  const exposedConsolidatedIncome = isMaster ? consolidatedIncome : totalIncome;
  const exposedCompanyBalances = isMaster ? companyBalances : { [currentCompanyId]: totalBalance };

  return (
    <FarmContext.Provider
      value={{
        // Multi-Company (Holding & Segmentos: Fazenda, Ferrovia, Taverna)
        companies: safeVisibleCompanies,
        allCompanies: companies,
        currentCompanyId,
        currentCompany,
        selectCompany,
        addCompany,
        updateCompany,
        deleteCompany,
        consolidatedBalance: exposedConsolidatedBalance,
        consolidatedIncome: exposedConsolidatedIncome,
        companyBalances: exposedCompanyBalances,
        // Members & Users
        members,
        activeCompanyMembers,
        currentUserId,
        setCurrentUserId,
        currentUser,
        currentRole,
        // Scoped and Global Data
        allTransactions: transactions,
        transactions: activeTransactions,
        totalIncome,
        totalExpense,
        totalBalance,
        operationalExpense,
        netProfit,
        allGoals: goals,
        goals: activeGoals,
        allDeliveries: deliveries,
        deliveries: activeDeliveries,
        pendingDeliveries,
        myPendingDeliveries,
        splitSettings,
        setSplitSettings: updateSplitSettings,
        farmReserveAmount,
        managersPoolAmount,
        membersPoolAmount,
        memberPayouts,
        closedCycles,
        addTransaction,
        deleteTransaction,
        submitDelivery,
        confirmDelivery,
        rejectDelivery,
        addGoal,
        updateGoal,
        deleteGoal,
        addMember,
        deleteMember,
        updateMember,
        closeFinancialCycle,
        resetToDefaultData,
        // Rotas & Missões com Checklist
        routes: activeRoutes,
        allRoutes: routes,
        startRoute,
        updateRouteItem,
        completeRoute,
        resetRoute,
        addCustomRoute,
        updateCustomRoute,
        deleteCustomRoute,
        dispatchRouteBatch,
        // Discord Webhook Integration
        discordSettings: getCompanyDiscordSettings(currentCompanyId),
        allDiscordSettings: discordSettings,
        getCompanyDiscordSettings,
        updateDiscordSettings,
        // Authentication & Security
        isAuthenticated,
        logoutReason,
        mustChangePasswordUser,
        validateInviteToken,
        completeFirstAccess,
        regenerateInviteToken,
        login,
        logout,
        minutesRemaining,
        getAuditLogs,
        // Database & Realtime Status
        dbStatus,
        dbError,
        refreshDbConnection: fetchSupabaseData,
        isSupabaseConfigured,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
}
