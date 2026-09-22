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
  toLocalCycle,
  toDbCycle,
} from '../utils/supabaseClient';

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
  // --- Persistent States ---
  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      let list = saved ? JSON.parse(saved) : INITIAL_MEMBERS;
      if (!Array.isArray(list) || list.length === 0) {
        list = INITIAL_MEMBERS;
      }
      // Ensure mem-master is always present in list
      if (!list.some((m) => m && (m.id === 'mem-master' || m.role === 'master'))) {
        const masterAcc = INITIAL_MEMBERS.find((m) => m.id === 'mem-master');
        if (masterAcc) {
          list = [masterAcc, ...list];
        }
      }
      return list;
    } catch (e) {
      console.warn('Erro ao restaurar membros do cache local, usando padrão:', e);
      return INITIAL_MEMBERS;
    }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const list = saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
      return Array.isArray(list) ? list : INITIAL_TRANSACTIONS;
    } catch (e) {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
      const list = saved ? JSON.parse(saved) : INITIAL_GOALS;
      return Array.isArray(list) ? list : INITIAL_GOALS;
    } catch (e) {
      return INITIAL_GOALS;
    }
  });

  const [deliveries, setDeliveries] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
      const list = saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
      return Array.isArray(list) ? list : INITIAL_DELIVERIES;
    } catch (e) {
      return INITIAL_DELIVERIES;
    }
  });

  const [splitSettings, setSplitSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_SPLIT_SETTINGS;
    } catch (e) {
      return INITIAL_SPLIT_SETTINGS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return saved || 'mem-raquel'; // default is Dona (Raquel Souza)
    } catch (e) {
      return 'mem-raquel';
    }
  });

  const [closedCycles, setClosedCycles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CYCLES);
      const list = saved ? JSON.parse(saved) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  });

  const [companies, setCompanies] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPANIES);
      const list = saved ? JSON.parse(saved) : INITIAL_COMPANIES;
      return (Array.isArray(list) && list.length > 0) ? list : INITIAL_COMPANIES;
    } catch (e) {
      return INITIAL_COMPANIES;
    }
  });

  const [currentCompanyId, setCurrentCompanyId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY);
      return saved || 'comp-fazenda';
    } catch (e) {
      return 'comp-fazenda';
    }
  });

  const [discordSettings, setDiscordSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISCORD);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            webhookUrl: parsed.webhookUrl || '',
            enabled: parsed.enabled ?? true,
            autoCashflow: parsed.autoCashflow ?? true,
            autoDeliveries: parsed.autoDeliveries ?? true,
            autoPayroll: parsed.autoPayroll ?? true,
            byCompany: parsed.byCompany || {},
          };
        }
      }
    } catch (_) {}
    return {
      webhookUrl: '',
      enabled: true,
      autoCashflow: true,
      autoDeliveries: true,
      autoPayroll: true,
      byCompany: {},
    };
  });

  const [routes, setRoutes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROUTES);
      const list = saved ? JSON.parse(saved) : INITIAL_ROUTES;
      return Array.isArray(list) && list.length > 0 ? list : INITIAL_ROUTES;
    } catch (e) {
      return INITIAL_ROUTES;
    }
  });

  // --- Authentication & 15-Minute Inactivity States ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Requires login explicitly - check active session
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem('pantaneiros_auth_v1') === 'true';
  });

  const [logoutReason, setLogoutReason] = useState(null); // 'inactivity' | 'user' | null
  const lastActivityRef = useRef(Date.now());
  const [minutesRemaining, setMinutesRemaining] = useState(15);

  // --- Sync with LocalStorage ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, currentCompanyId);
  }, [currentCompanyId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(splitSettings));
  }, [splitSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(closedCycles));
  }, [closedCycles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DISCORD, JSON.stringify(discordSettings));
  }, [discordSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routes));
  }, [routes]);

  // --- Supabase Cloud Sync & Realtime Status ---
  const [dbStatus, setDbStatus] = useState('connecting'); // 'connecting' | 'connected' | 'tables_missing' | 'offline' | 'error'
  const [dbError, setDbError] = useState(null);

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
      if (!txErr && txData && txData.length > 0) {
        const localTx = txData.map(toLocalTransaction);
        setTransactions(localTx);
      }

      const { data: goalsData, error: goalsErr } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (!goalsErr && goalsData && goalsData.length > 0) {
        const localGoals = goalsData.map(toLocalGoal);
        setGoals(localGoals);
      }

      const { data: delivData, error: delivErr } = await supabase
        .from('deliveries')
        .select('*')
        .order('date', { ascending: false });
      if (!delivErr && delivData && delivData.length > 0) {
        const localDeliveries = delivData.map(toLocalDelivery);
        setDeliveries(localDeliveries);
      }

      const { data: cyclesData, error: cyclesErr } = await supabase
        .from('closed_cycles')
        .select('*')
        .order('date', { ascending: false });
      if (!cyclesErr && cyclesData && cyclesData.length > 0) {
        const localCycles = cyclesData.map(toLocalCycle);
        setClosedCycles(localCycles);
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
      .channel('farm_realtime_changes')
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
          if (payload.new.key === 'split' && payload.new.value) setSplitSettings(payload.new.value);
          if (payload.new.key === 'discord' && payload.new.value) {
            const val = payload.new.value;
            setDiscordSettings({
              ...val,
              byCompany: val?.byCompany || {},
            });
          }
          if (payload.new.key === 'companies' && Array.isArray(payload.new.value)) setCompanies(payload.new.value);
          if (payload.new.key === 'routes' && Array.isArray(payload.new.value)) setRoutes(payload.new.value);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Guaranteed Fallback User to prevent undefined crashes under any circumstance
  const fallbackUser = (INITIAL_MEMBERS && INITIAL_MEMBERS[0]) || {
    id: 'mem-raquel',
    name: 'Raquel Souza',
    role: 'owner',
    roleLabel: 'Dona da Fazenda',
    companyId: 'comp-fazenda',
    avatar: '👑',
    passport: '70',
    phone: '',
    pin: '1234',
    active: true,
  };

  // Current active user object
  const currentUser =
    (members && members.find((m) => m && m.id === currentUserId)) ||
    (members && members.find((m) => m && m.role === 'owner')) ||
    (members && members[0]) ||
    fallbackUser;

  const currentRole = currentUser?.role || 'owner';

  // --- Auth Handlers & 15-Minute Inactivity Engine ---
  const login = ({ identifier, memberId, pin }) => {
    const rawId = (identifier !== undefined ? identifier : memberId || '').toString().trim();
    if (!rawId) {
      return { success: false, error: 'Por favor, informe seu ID, Passaporte ou Nome.' };
    }

    const query = rawId.toLowerCase();

    const member = members.find((m) => {
      if (m.id && m.id.toLowerCase() === query) return true;
      if (m.passport && String(m.passport).trim().toLowerCase() === query) return true;
      if (m.name && m.name.toLowerCase() === query) return true;
      if (m.name && m.name.toLowerCase().includes(query)) return true;
      return false;
    });

    if (!member) {
      return { success: false, error: 'Conta não encontrada com este Passaporte / ID ou Nome.' };
    }

    const expectedPin = member.pin || '1234';
    if (!pin || String(pin).trim() !== String(expectedPin).trim()) {
      return { success: false, error: 'Senha / PIN incorreto para esta conta.' };
    }

    setCurrentUserId(member.id);
    setIsAuthenticated(true);
    setLogoutReason(null);
    lastActivityRef.current = Date.now();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pantaneiros_auth_v1', 'true');
      sessionStorage.setItem('pantaneiros_user_id', member.id);
    }

    // Strict SaaS Multi-Tenant Isolation:
    // When a non-master user logs in, instantly lock to their assigned company
    if (member.role !== 'master') {
      const userCompany = member.companyId && member.companyId !== 'all' ? member.companyId : 'comp-fazenda';
      setCurrentCompanyId(userCompany);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY, userCompany);
    }

    return { success: true, member };
  };

  const logout = (reason = 'user') => {
    setIsAuthenticated(false);
    setLogoutReason(reason);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('pantaneiros_auth_v1');
    }
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
  // Resolves the specific webhook configuration for the specified company,
  // falling back gracefully to global settings if not yet customized.
  const getCompanyDiscordSettings = (companyId) => {
    const cId = companyId || currentCompanyId || 'comp-fazenda';
    const compSettings = discordSettings?.byCompany?.[cId];
    if (compSettings && typeof compSettings === 'object' && compSettings.webhookUrl) {
      return {
        webhookUrl: compSettings.webhookUrl || '',
        enabled: compSettings.enabled ?? (discordSettings?.enabled ?? true),
        autoCashflow: compSettings.autoCashflow ?? (discordSettings?.autoCashflow ?? true),
        autoDeliveries: compSettings.autoDeliveries ?? (discordSettings?.autoDeliveries ?? true),
        autoPayroll: compSettings.autoPayroll ?? (discordSettings?.autoPayroll ?? true),
      };
    }
    return {
      webhookUrl: compSettings?.webhookUrl || discordSettings?.webhookUrl || '',
      enabled: compSettings?.enabled ?? (discordSettings?.enabled ?? true),
      autoCashflow: compSettings?.autoCashflow ?? (discordSettings?.autoCashflow ?? true),
      autoDeliveries: compSettings?.autoDeliveries ?? (discordSettings?.autoDeliveries ?? true),
      autoPayroll: compSettings?.autoPayroll ?? (discordSettings?.autoPayroll ?? true),
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
      alert('Acesso restrito: apenas o Administrador Master pode fundar novas empresas.');
      return null;
    }

    const newId = `comp-${Date.now()}`;
    const newComp = {
      id: newId,
      name: name.trim(),
      type: 'general',
      code: code ? code.trim().toUpperCase() : `EMP • ${companies.length + 1}`,
      segment: segment ? segment.trim() : 'Atividade Comercial',
      icon: icon || '🏢',
      unitLabel: unitLabel ? unitLabel.trim() : 'Unidades',
      themeColor: 'amber',
      description: description ? description.trim() : '',
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

    setCurrentCompanyId(newId);
    return newComp;
  };

  const updateCompany = (companyId, updates) => {
    if (currentRole !== 'master') {
      alert('Acesso restrito: apenas o Administrador Master pode alterar dados estruturais de empresas.');
      return;
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
  };

  const deleteCompany = (companyId) => {
    if (currentRole !== 'master') {
      alert('Acesso restrito: apenas o Administrador Master pode excluir empresas.');
      return false;
    }
    if (companyId === 'comp-fazenda') {
      alert('A Fazenda Pantaneiros é a matriz principal e não pode ser excluída.');
      return false;
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
    return true;
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
    const numAmount = Number(amount);
    const member = members.find((m) => m.id === memberId) || currentUser;
    const txDate = date || new Date().toISOString();
    const activeCompId = companyId || currentCompanyId || 'comp-fazenda';

    const compCurrentBalance = companyBalances[activeCompId] != null ? companyBalances[activeCompId] : totalBalance;
    const newBalance = type === 'income' ? compCurrentBalance + numAmount : compCurrentBalance - numAmount;

    const newTx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      companyId: activeCompId,
      type,
      amount: numAmount,
      memberId: member.id,
      memberName: member.name,
      category: category || (type === 'income' ? 'Adição ao Caixa' : 'Despesa'),
      description: description || '',
      date: txDate,
      boxBalanceAfter: newBalance,
    };

    setTransactions((prev) => [newTx, ...prev]);

    if (supabase) {
      supabase.from('transactions').insert(toDbTransaction(newTx)).then(({ error }) => {
        if (error) console.warn('Aviso ao sincronizar transação com Supabase:', error.message);
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

    return { newTx, formattedReport };
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    if (supabase) {
      supabase.from('transactions').delete().eq('id', id).then();
    }
  };

  // Deliveries Workflow (Member informs, Manager confirms)
  const submitDelivery = ({ goalId, quantity, managerId, notes, companyId }) => {
    const qty = Number(quantity);
    const activeCompId = companyId || currentCompanyId || 'comp-fazenda';
    const goal = goals.find((g) => g.id === goalId);
    const manager = members.find((m) => m.id === managerId) || members.find((m) => m.role === 'manager');

    const newDelivery = {
      id: `deliv-${Date.now()}`,
      companyId: activeCompId,
      goalId: goal?.id || null,
      goalTitle: goal?.title || `Entrega Avulsa de ${currentCompany?.unitLabel || 'Produção'}`,
      memberId: currentUser?.id || 'mem-raquel',
      memberName: currentUser?.name || 'Membro',
      managerId: manager?.id || '',
      managerName: manager?.name || 'Gerente',
      itemType: goal?.unitLabel || currentCompany?.unitLabel || 'Unidades',
      quantity: qty,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      confirmedAt: null,
      notes: notes || '',
    };

    setDeliveries((prev) => [newDelivery, ...prev]);

    if (supabase) {
      supabase.from('deliveries').insert(toDbDelivery(newDelivery)).then(({ error }) => {
        if (error) console.warn('Aviso ao sincronizar entrega com Supabase:', error.message);
      });
    }

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

    return { newDelivery, discordMessage };
  };

  const confirmDelivery = (deliveryId) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return null;

    const confirmedAt = new Date().toISOString();
    const qty = Number(delivery.quantity);

    // 1. Update delivery status
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'confirmed',
              confirmedAt,
              confirmedBy: currentUser?.name || 'Gerência',
            }
          : d
      )
    );

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

    return { updatedDelivery: delivery, discordConfirmation };
  };

  const rejectDelivery = ({ deliveryId, reason }) => {
    const rejectedAt = new Date().toISOString();
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'rejected',
              rejectionReason: reason || 'Não conferido ou incorreto',
              rejectedBy: currentUser?.name || 'Gerência',
              rejectedAt,
            }
          : d
      )
    );

    if (supabase) {
      supabase.from('deliveries').update({
        status: 'rejected',
        rejection_reason: reason || 'Não conferido ou incorreto',
        rejected_by: currentUser?.name || 'Gerência',
        rejected_at: rejectedAt,
      }).eq('id', deliveryId).then();
    }
  };

  const addGoal = ({ title, type, unitType, unitLabel, targetMemberId, targetAmount, deadline, notes, companyId }) => {
    const isAll = targetMemberId === 'all';
    const activeCompId = companyId || currentCompanyId || 'comp-fazenda';
    const targetMember = isAll ? null : members.find((m) => m.id === targetMemberId);
    const newGoal = {
      id: `goal-${Date.now()}`,
      companyId: activeCompId,
      title,
      type: type || (currentRole === 'owner' ? 'owner_to_manager' : 'manager_to_member'),
      unitType: unitType || 'sacks', // 'sacks' | 'dols'
      unitLabel: unitLabel || (unitType === 'dols' ? 'DOLS' : currentCompany?.unitLabel || 'Unidades'),
      creatorRole: currentRole,
      creatorName: currentUser?.name || 'Liderança',
      targetMemberId: targetMemberId || 'all',
      targetMemberName: isAll ? 'Toda a Equipe (Geral)' : (targetMember?.name || 'Não atribuído'),
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      deadline,
      status: 'in_progress',
      notes: notes || '',
    };
    setGoals((prev) => [newGoal, ...prev]);

    if (supabase) {
      supabase.from('goals').insert(toDbGoal(newGoal)).then(({ error }) => {
        if (error) console.warn('Aviso ao salvar meta no Supabase:', error.message);
      });
    }

    return newGoal;
  };

  const updateGoal = (id, updates) => {
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
  };

  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (supabase) {
      supabase.from('goals').delete().eq('id', id).then();
    }
  };

  const addMember = ({ name, role, avatar, passport, phone, pin, companyId }) => {
    const targetCompId = companyId || currentCompanyId || 'comp-fazenda';
    const targetRole = role || 'member';
    const targetCompanyObj = companies.find((c) => c.id === targetCompId);
    const compName = targetCompanyObj?.name || 'Fazenda';

    const getRoleLabel = () => {
      if (targetRole === 'master') return 'Administrador Master Holding';
      if (targetRole === 'owner') return `Dono • ${compName}`;
      if (targetRole === 'manager') return `Gerente • ${compName}`;
      return `Membro • ${compName}`;
    };

    const newMember = {
      id: `mem-${Date.now()}`,
      name: name.trim(),
      role: targetRole,
      roleLabel: getRoleLabel(),
      companyId: targetRole === 'master' ? 'all' : targetCompId,
      avatar: avatar || (targetRole === 'master' ? '⚡' : targetRole === 'owner' ? '👑' : targetRole === 'manager' ? '👔' : '🌾'),
      passport: passport ? String(passport).trim() : '',
      phone: phone ? String(phone).trim() : '',
      pin: pin ? String(pin).trim() : '',
      createdAt: new Date().toISOString(),
      active: true,
    };
    setMembers((prev) => [...prev, newMember]);

    if (supabase) {
      supabase.from('members').insert(toDbMember(newMember)).then(({ error }) => {
        if (error) console.warn('Aviso ao salvar membro no Supabase:', error.message);
      });
    }

    return newMember;
  };

  const deleteMember = (id) => {
    const memberToDelete = members.find((m) => m.id === id);
    if (!memberToDelete) return false;
    
    // Safety check: Cannot delete Master account
    if (memberToDelete.role === 'master' || memberToDelete.id === 'mem-master') {
      alert('Não é possível excluir a conta Administrador Master da Holding.');
      return false;
    }

    // Only Master can delete Owner accounts
    if (memberToDelete.role === 'owner' && currentRole !== 'master') {
      alert('Apenas o Administrador Master pode excluir contas de Donos.');
      return false;
    }

    setMembers((prev) => prev.filter((m) => m.id !== id));

    if (supabase) {
      supabase.from('members').delete().eq('id', id).then();
    }

    // If currently logged in as this user, fallback to the owner or first member
    if (currentUserId === id) {
      const remaining = members.filter((m) => m.id !== id);
      if (remaining.length > 0) {
        setCurrentUserId(remaining[0].id);
      }
    }
    return true;
  };

  const updateMember = (id, updates) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const merged = { ...m, ...updates };
        if (supabase) {
          supabase.from('members').update(toDbMember(merged)).eq('id', id).then();
        }
        return merged;
      })
    );
  };

  const closeFinancialCycle = ({ title, periodNote, companyId } = {}) => {
    const cycleCompId = companyId || currentCompanyId || 'comp-fazenda';
    const cycleCompany = companies.find((c) => c.id === cycleCompId) || currentCompany;

    const cycleRecord = {
      id: `cycle-${Date.now()}`,
      companyId: cycleCompId,
      title: title || `Fechamento ${new Date().toLocaleDateString('pt-BR')}`,
      date: new Date().toISOString(),
      periodNote: periodNote || '',
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
    const cId = targetCompanyId || currentCompanyId || 'comp-fazenda';
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

    // If updating Fazenda or if root webhookUrl is empty, sync top-level
    if (cId === 'comp-fazenda' || !merged.webhookUrl) {
      merged.webhookUrl = updatedComp.webhookUrl || merged.webhookUrl;
      merged.enabled = updatedComp.enabled ?? merged.enabled;
      merged.autoCashflow = updatedComp.autoCashflow ?? merged.autoCashflow;
      merged.autoDeliveries = updatedComp.autoDeliveries ?? merged.autoDeliveries;
      merged.autoPayroll = updatedComp.autoPayroll ?? merged.autoPayroll;
    }

    setDiscordSettings(merged);
    localStorage.setItem(STORAGE_KEYS.DISCORD, JSON.stringify(merged));
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
    setSplitSettings(newSettings);
    if (supabase) {
      supabase.from('farm_settings').upsert({ key: 'split', value: newSettings, updated_at: new Date().toISOString() }).then();
    }
  };

  // --- Rotas & Missões com Checklist (Fazenda, Ferrovia, Taverna) ---

  const startRoute = (routeId) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

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

    setRoutes(updated);

    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'routes',
        value: updated,
        updated_at: new Date().toISOString(),
      }).then();
    }

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
  };

  const updateRouteItem = (routeId, itemId, { addQuantity, setQuantity, markCompleted } = {}) => {
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

    setRoutes(updated);

    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'routes',
        value: updated,
        updated_at: new Date().toISOString(),
      }).then();
    }

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
  };

  const completeRoute = (routeId, { creditToBox = true } = {}) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

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
    setRoutes(updated);

    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'routes',
        value: updated,
        updated_at: new Date().toISOString(),
      }).then();
    }

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
  };

  const resetRoute = (routeId) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

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

    setRoutes(updated);

    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'routes',
        value: updated,
        updated_at: new Date().toISOString(),
      }).then();
    }
  };

  const addCustomRoute = (newRoute) => {
    const id = `route-${Date.now()}`;
    const routeObj = {
      id,
      companyId: newRoute.companyId || currentCompanyId || 'comp-fazenda',
      title: newRoute.title || 'Nova Rota',
      rewardAmount: Number(newRoute.rewardAmount) || 0,
      icon: newRoute.icon || '📦',
      description: newRoute.description || '',
      status: 'in_progress',
      startedBy: currentUser?.name || 'Membro',
      startedAt: new Date().toISOString(),
      completedAt: null,
      items: newRoute.items || [],
    };

    const updated = [routeObj, ...routes];
    setRoutes(updated);

    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'routes',
        value: updated,
        updated_at: new Date().toISOString(),
      }).then();
    }

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

    return routeObj;
  };

  const dispatchRouteBatch = (routeId, batchCount = 1) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return { success: false, message: 'Rota não encontrada.' };

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
    setRoutes(updatedRoutes);

    if (supabase) {
      supabase.from('farm_settings').upsert({
        key: 'routes',
        value: updatedRoutes,
        updated_at: new Date().toISOString(),
      }).then();
    }

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
        dispatchRouteBatch,
        // Discord Webhook Integration
        discordSettings: getCompanyDiscordSettings(currentCompanyId),
        allDiscordSettings: discordSettings,
        getCompanyDiscordSettings,
        updateDiscordSettings,
        // Authentication & Security
        isAuthenticated,
        logoutReason,
        login,
        logout,
        minutesRemaining,
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
