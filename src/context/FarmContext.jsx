import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  INITIAL_MEMBERS,
  INITIAL_TRANSACTIONS,
  INITIAL_GOALS,
  INITIAL_DELIVERIES,
  INITIAL_SPLIT_SETTINGS,
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
};

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos em milissegundos

export function FarmProvider({ children }) {
  // --- Persistent States ---
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
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

  // Current active user object
  const currentUser = members.find((m) => m.id === currentUserId) || members[0];
  const currentRole = currentUser?.role || 'owner';

  // --- Auth Handlers & 15-Minute Inactivity Engine ---
  const login = ({ memberId, pin }) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) {
      return { success: false, error: 'Conta não encontrada no sistema da fazenda.' };
    }

    const expectedPin = member.pin || '1234';
    if (pin && String(pin).trim() !== expectedPin) {
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

  // --- Financial Calculations ---
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalExpense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalBalance = totalIncome - totalExpense;

  // Despesas operacionais puras (insumos, maquinário), excluindo saques de folha de pagamento já realizados
  const operationalExpense = transactions
    .filter((tx) => tx.type === 'expense' && tx.category !== 'Folha de Pagamento' && tx.category !== 'Retirada de Lucro')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Lucro operacional repartível da produção
  const netProfit = Math.max(0, totalIncome - operationalExpense);

  // Profit Split Calculation
  const farmReserveAmount = (netProfit * (splitSettings.farmReservePercent || 0)) / 100;
  const managersPoolAmount = (netProfit * (splitSettings.managersPercent || 0)) / 100;
  const membersPoolAmount = (netProfit * (splitSettings.membersPercent || 0)) / 100;

  // Member stats
  const memberContributions = {};
  members.forEach((m) => {
    memberContributions[m.id] = {
      member: m,
      totalIncomeAdded: 0,
      totalExpenseTaken: 0,
      sacksDelivered: 0,
      goalsAssigned: [],
      goalsCompleted: 0,
    };
  });

  transactions.forEach((tx) => {
    if (memberContributions[tx.memberId]) {
      if (tx.type === 'income') {
        memberContributions[tx.memberId].totalIncomeAdded += Number(tx.amount);
      } else {
        memberContributions[tx.memberId].totalExpenseTaken += Number(tx.amount);
      }
    }
  });

  deliveries
    .filter((d) => d.status === 'confirmed')
    .forEach((d) => {
      if (memberContributions[d.memberId]) {
        memberContributions[d.memberId].sacksDelivered += Number(d.quantity);
      }
    });

  goals.forEach((g) => {
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

  const managersList = members.filter((m) => m.role === 'manager');
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
        const membersList = members.filter((m) => m.role === 'member');
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
  const pendingDeliveries = deliveries.filter((d) => d.status === 'pending');
  const myPendingDeliveries = deliveries.filter((d) => {
    if (d.status !== 'pending') return false;
    if (currentRole === 'owner') return true; // Owner can validate all
    return d.managerId === currentUser.id;
  });

  // --- Actions ---

  const addTransaction = ({ type, amount, memberId, category, description, date }) => {
    const numAmount = Number(amount);
    const member = members.find((m) => m.id === memberId) || currentUser;
    const txDate = date || new Date().toISOString();

    const newBalance = type === 'income' ? totalBalance + numAmount : totalBalance - numAmount;

    const newTx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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

    // If income, check financial goals
    if (type === 'income') {
      setGoals((prevGoals) =>
        prevGoals.map((goal) => {
          if (goal.unitType === 'dols') {
            let updatedCurrent = goal.currentAmount;
            if (goal.targetMemberId === member.id && goal.status === 'in_progress') {
              updatedCurrent += numAmount;
            } else if (goal.type === 'owner_to_manager' && goal.targetMemberId === member.id) {
              updatedCurrent += numAmount;
            }
            return {
              ...goal,
              currentAmount: updatedCurrent,
              status: updatedCurrent >= goal.targetAmount ? 'completed' : goal.status,
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
  };

  // Deliveries Workflow (Member informs, Manager confirms)
  const submitDelivery = ({ goalId, quantity, managerId, notes }) => {
    const qty = Number(quantity);
    const goal = goals.find((g) => g.id === goalId);
    const manager = members.find((m) => m.id === managerId) || members.find((m) => m.role === 'manager');

    const newDelivery = {
      id: `deliv-${Date.now()}`,
      goalId: goal?.id || null,
      goalTitle: goal?.title || 'Entrega Avulsa de Sacas de Milho',
      memberId: currentUser.id,
      memberName: currentUser.name,
      managerId: manager?.id || '',
      managerName: manager?.name || 'Gerente',
      itemType: goal?.unitLabel || 'Sacas de Milho',
      quantity: qty,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      confirmedAt: null,
      notes: notes || '',
    };

    setDeliveries((prev) => [newDelivery, ...prev]);

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
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: 'rejected',
              rejectionReason: reason || 'Não conferido ou incorreto',
              rejectedBy: currentUser.name,
              rejectedAt: new Date().toISOString(),
            }
          : d
      )
    );
  };

  const addGoal = ({ title, type, unitType, unitLabel, targetMemberId, targetAmount, deadline, notes }) => {
    const targetMember = members.find((m) => m.id === targetMemberId);
    const newGoal = {
      id: `goal-${Date.now()}`,
      title,
      type: type || (currentRole === 'owner' ? 'owner_to_manager' : 'manager_to_member'),
      unitType: unitType || 'sacks', // 'sacks' | 'dols'
      unitLabel: unitLabel || (unitType === 'dols' ? 'DOLS' : 'Sacas de Milho'),
      creatorRole: currentRole,
      creatorName: currentUser.name,
      targetMemberId,
      targetMemberName: targetMember?.name || 'Não atribuído',
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      deadline,
      status: 'in_progress',
      notes: notes || '',
    };
    setGoals((prev) => [newGoal, ...prev]);
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
        return merged;
      })
    );
  };

  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const addMember = ({ name, role, avatar, passport, phone, pin }) => {
    const newMember = {
      id: `mem-${Date.now()}`,
      name: name.trim(),
      role: role || 'member',
      roleLabel: role === 'owner' ? 'Dono da Fazenda' : role === 'manager' ? 'Gerente Geral' : 'Membro Produtor',
      avatar: avatar || (role === 'owner' ? '👑' : role === 'manager' ? '👔' : '🌾'),
      passport: passport ? String(passport).trim() : '',
      phone: phone ? String(phone).trim() : '',
      pin: pin ? String(pin).trim() : '',
      createdAt: new Date().toISOString(),
      active: true,
    };
    setMembers((prev) => [...prev, newMember]);
    return newMember;
  };

  const deleteMember = (id) => {
    const memberToDelete = members.find((m) => m.id === id);
    if (!memberToDelete) return false;
    
    // Safety check: Cannot delete the primary owner account if it's the last one
    if (memberToDelete.role === 'owner' && members.filter((m) => m.role === 'owner').length <= 1) {
      alert('Não é possível excluir a conta principal do Dono da Fazenda.');
      return false;
    }

    setMembers((prev) => prev.filter((m) => m.id !== id));

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
        return { ...m, ...updates };
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

  const updateDiscordSettings = (newSettings) => {
    setDiscordSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetToDefaultData = () => {
    setMembers(INITIAL_MEMBERS);
    setTransactions(INITIAL_TRANSACTIONS);
    setGoals(INITIAL_GOALS);
    setDeliveries(INITIAL_DELIVERIES);
    setSplitSettings(INITIAL_SPLIT_SETTINGS);
    setCurrentUserId('mem-1');
    setClosedCycles([]);
  };

  return (
    <FarmContext.Provider
      value={{
        members,
        currentUserId,
        setCurrentUserId,
        currentUser,
        currentRole,
        transactions,
        totalIncome,
        totalExpense,
        totalBalance,
        operationalExpense,
        netProfit,
        goals,
        deliveries,
        pendingDeliveries,
        myPendingDeliveries,
        splitSettings,
        setSplitSettings,
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
