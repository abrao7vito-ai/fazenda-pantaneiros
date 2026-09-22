import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  INITIAL_MEMBERS,
  INITIAL_TRANSACTIONS,
  INITIAL_GOALS,
  INITIAL_DELIVERIES,
  INITIAL_SPLIT_SETTINGS,
  INITIAL_COMPANIES,
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
};

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos em milissegundos

export function FarmProvider({ children }) {
  // --- Persistent States ---
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    let list = saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    // Ensure mem-master is always present in list
    if (!list.some((m) => m.id === 'mem-master' || m.role === 'master')) {
      const masterAcc = INITIAL_MEMBERS.find((m) => m.id === 'mem-master');
      if (masterAcc) {
        list = [masterAcc, ...list];
      }
    }
    return list;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [deliveries, setDeliveries] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
    return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
  });

  const [splitSettings, setSplitSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SPLIT_SETTINGS;
  });

  const [currentUserId, setCurrentUserId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved || 'mem-raquel'; // default is Dona (Raquel Souza)
  });

  const [closedCycles, setClosedCycles] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CYCLES);
    return saved ? JSON.parse(saved) : [];
  });

  const [companies, setCompanies] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    return saved ? JSON.parse(saved) : INITIAL_COMPANIES;
  });

  const [currentCompanyId, setCurrentCompanyId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY);
    return saved || 'comp-fazenda';
  });

  const [discordSettings, setDiscordSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DISCORD);
    return saved
      ? JSON.parse(saved)
      : {
          webhookUrl: '',
          enabled: true,
          autoCashflow: true,
          autoDeliveries: true,
          autoPayroll: true,
        };
  });

  // --- Authentication & 15-Minute Inactivity States ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Requires login explicitly - check active session
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
          if (row.key === 'companies' && Array.isArray(row.value) && row.value.length > 0) {
            setCompanies(row.value);
          }
          if (row.key === 'discord' && row.value) {
            setDiscordSettings((prev) => {
              if (row.value?.webhookUrl) {
                return row.value;
              }
              if (prev?.webhookUrl) {
                // If local has a webhook URL, persist it up to Supabase
                supabase.from('farm_settings').upsert({
                  key: 'discord',
                  value: prev,
                  updated_at: new Date().toISOString(),
                }).then();
                return prev;
              }
              return row.value;
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
          if (payload.new.key === 'discord' && payload.new.value) setDiscordSettings(payload.new.value);
          if (payload.new.key === 'companies' && Array.isArray(payload.new.value)) setCompanies(payload.new.value);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Current active user object
  const currentUser = members.find((m) => m.id === currentUserId) || members[0];
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
    sessionStorage.setItem('pantaneiros_auth_v1', 'true');
    sessionStorage.setItem('pantaneiros_user_id', member.id);
    return { success: true, member };
  };

  const logout = (reason = 'user') => {
    setIsAuthenticated(false);
    setLogoutReason(reason);
    sessionStorage.removeItem('pantaneiros_auth_v1');
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
  const currentCompany =
    companies.find((c) => c.id === currentCompanyId) || companies[0] || INITIAL_COMPANIES[0];

  const selectCompany = (companyId) => {
    if (companies.some((c) => c.id === companyId)) {
      setCurrentCompanyId(companyId);
    }
  };

  const addCompany = ({ name, segment, icon, unitLabel, code, initialBalance = 0, description = '' }) => {
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

  // Scoped Members by Active Company (Master has access to all, others belong to their company or 'all')
  const activeCompanyMembers = members.filter((m) => {
    if (m.role === 'master' || m.companyId === 'all') return true;
    return (m.companyId || 'comp-fazenda') === currentCompanyId;
  });

  // Member stats for Active Company
  const memberContributions = {};
  activeCompanyMembers.forEach((m) => {
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
    if (memberContributions[tx.memberId]) {
      if (tx.type === 'income') {
        memberContributions[tx.memberId].totalIncomeAdded += Number(tx.amount);
      } else {
        memberContributions[tx.memberId].totalExpenseTaken += Number(tx.amount);
      }
    }
  });

  activeDeliveries
    .filter((d) => d.status === 'confirmed')
    .forEach((d) => {
      if (memberContributions[d.memberId]) {
        memberContributions[d.memberId].sacksDelivered += Number(d.quantity);
      }
    });

  activeGoals.forEach((g) => {
    if (memberContributions[g.targetMemberId]) {
      memberContributions[g.targetMemberId].goalsAssigned.push(g);
      if (g.status === 'completed' || (g.currentAmount >= g.targetAmount && g.targetAmount > 0)) {
        memberContributions[g.targetMemberId].goalsCompleted += 1;
      }
    }
  });

  const totalMemberIncomeOnly = Object.values(memberContributions)
    .filter((entry) => entry.member.role === 'member')
    .reduce((sum, entry) => sum + entry.totalIncomeAdded, 0);

  const managersList = activeCompanyMembers.filter((m) => m.role === 'manager');
  const managerSharePerPerson = managersList.length > 0 ? managersPoolAmount / managersList.length : 0;

  const memberPayouts = Object.values(memberContributions).map((entry) => {
    const isOwner = entry.member.role === 'owner';
    const isManager = entry.member.role === 'manager';
    const isMember = entry.member.role === 'member';

    let estimatedPayout = 0;
    let sharePercentage = 0;

    if (isOwner) {
      estimatedPayout = farmReserveAmount;
      sharePercentage = splitSettings.farmReservePercent;
    } else if (isManager) {
      estimatedPayout = managerSharePerPerson;
      sharePercentage = managersList.length > 0 ? splitSettings.managersPercent / managersList.length : 0;
    } else if (isMember) {
      if (totalMemberIncomeOnly > 0) {
        sharePercentage = (entry.totalIncomeAdded / totalMemberIncomeOnly) * splitSettings.membersPercent;
        estimatedPayout = (entry.totalIncomeAdded / totalMemberIncomeOnly) * membersPoolAmount;
      } else {
        const membersList = activeCompanyMembers.filter((m) => m.role === 'member');
        estimatedPayout = membersList.length > 0 ? membersPoolAmount / membersList.length : 0;
        sharePercentage = membersList.length > 0 ? splitSettings.membersPercent / membersList.length : 0;
      }
    }

    return {
      ...entry,
      sharePercentage,
      estimatedPayout,
    };
  });

  // Pending deliveries count for managers and owner
  const pendingDeliveries = activeDeliveries.filter((d) => d.status === 'pending');
  const myPendingDeliveries = activeDeliveries.filter((d) => {
    if (d.status !== 'pending') return false;
    if (currentRole === 'owner' || currentRole === 'master') return true; // Owner/Master can validate all
    return d.managerId === currentUser.id;
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
    if (discordSettings?.enabled && discordSettings?.autoCashflow && discordSettings?.webhookUrl) {
      sendCashFlowDiscordLog(discordSettings.webhookUrl, {
        type,
        amount: numAmount,
        personName: member.name,
        totalBoxBalance: newBalance,
        category: newTx.category,
        description: newTx.description,
        date: txDate,
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
      goalTitle: goal?.title || `Entrega Avulsa de ${currentCompany.unitLabel}`,
      memberId: currentUser.id,
      memberName: currentUser.name,
      managerId: manager?.id || '',
      managerName: manager?.name || 'Gerente',
      itemType: goal?.unitLabel || currentCompany.unitLabel,
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
      memberName: currentUser.name,
      managerName: manager?.name || 'Gerente',
      quantity: qty,
      itemType: newDelivery.itemType,
      notes,
      date: new Date(),
    });

    // Automatic Discord Webhook Log for Delivery Submission
    if (discordSettings?.enabled && discordSettings?.autoDeliveries && discordSettings?.webhookUrl) {
      sendDeliverySubmittedDiscordLog(discordSettings.webhookUrl, {
        memberName: currentUser.name,
        managerName: manager?.name || 'Gerente',
        quantity: qty,
        itemType: newDelivery.itemType,
        notes,
        goalTitle: newDelivery.goalTitle,
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
              confirmedBy: currentUser.name,
            }
          : d
      )
    );

    // 2. Update goal progress
    let updatedGoal = null;
    if (delivery.goalId) {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === delivery.goalId) {
            const newTotal = Number(g.currentAmount) + qty;
            const isCompleted = newTotal >= g.targetAmount;
            updatedGoal = {
              ...g,
              currentAmount: newTotal,
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
        confirmed_by: currentUser.name,
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
      managerName: currentUser.name,
      quantity: qty,
      itemType: delivery.itemType,
      confirmedTotal: updatedGoal ? updatedGoal.currentAmount : qty,
      targetTotal: updatedGoal ? updatedGoal.targetAmount : null,
      date: new Date(),
    });

    // Automatic Discord Webhook Log for Delivery Confirmation
    if (discordSettings?.enabled && discordSettings?.autoDeliveries && discordSettings?.webhookUrl) {
      sendDeliveryConfirmedDiscordLog(discordSettings.webhookUrl, {
        memberName: delivery.memberName,
        managerName: currentUser.name,
        quantity: qty,
        itemType: delivery.itemType,
        confirmedTotal: updatedGoal ? updatedGoal.currentAmount : qty,
        targetTotal: updatedGoal ? updatedGoal.targetAmount : null,
      }).catch((err) => console.error('Erro ao enviar log para o Discord:', err));
    }

    return { delivery, discordConfirmation };
  };

  const rejectDelivery = (deliveryId, reason) => {
    const rejectedAt = new Date().toISOString();
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'rejected',
              rejectionReason: reason || 'Não conferido ou incorreto',
              rejectedBy: currentUser.name,
              rejectedAt,
            }
          : d
      )
    );

    if (supabase) {
      supabase.from('deliveries').update({
        status: 'rejected',
        rejection_reason: reason || 'Não conferido ou incorreto',
        rejected_by: currentUser.name,
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
      unitLabel: unitLabel || (unitType === 'dols' ? 'DOLS' : currentCompany.unitLabel),
      creatorRole: currentRole,
      creatorName: currentUser.name,
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
    
    // Safety check: Cannot delete Master or primary owner account
    if (memberToDelete.role === 'master') {
      alert('Não é possível excluir a conta Administrador Master da Holding.');
      return false;
    }
    if (memberToDelete.role === 'owner' && members.filter((m) => m.role === 'owner').length <= 1) {
      alert('Não é possível excluir a conta principal do Dono da Fazenda.');
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

  const closeFinancialCycle = ({ title, periodNote }) => {
    const cycleRecord = {
      id: `cycle-${Date.now()}`,
      title: title || `Fechamento ${new Date().toLocaleDateString('pt-BR')}`,
      date: new Date().toISOString(),
      periodNote: periodNote || '',
      closedBy: currentUser.name,
      totalIncome,
      totalExpense,
      netProfit,
      splitSettings: { ...splitSettings },
      payouts: memberPayouts.map((p) => ({
        memberId: p.member.id,
        name: p.member.name,
        role: p.member.role,
        amountAdded: p.totalIncomeAdded,
        payoutAmount: p.estimatedPayout,
        sharePercentage: p.sharePercentage,
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
    if (discordSettings?.enabled && discordSettings?.autoPayroll && discordSettings?.webhookUrl) {
      sendPayrollDiscordLog(discordSettings.webhookUrl, {
        totalIncome,
        totalExpense,
        netProfit,
        farmReserveAmount,
        managersPoolAmount,
        membersPoolAmount,
        splitSettings,
        payouts: cycleRecord.payouts,
        closedBy: currentUser.name,
      }).catch((err) => console.error('Erro ao enviar log de repasses para o Discord:', err));
    }

    return cycleRecord;
  };

  const updateDiscordSettings = async (newSettings) => {
    const merged = { ...discordSettings, ...newSettings };
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

  return (
    <FarmContext.Provider
      value={{
        // Multi-Company (Holding & Segmentos: Fazenda, Ferrovia, Taverna)
        companies,
        currentCompanyId,
        currentCompany,
        selectCompany,
        addCompany,
        updateCompany,
        deleteCompany,
        consolidatedBalance,
        consolidatedIncome,
        companyBalances,
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
        // Discord Webhook Integration
        discordSettings,
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
