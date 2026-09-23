import React from 'react';
import { renderToString } from 'react-dom/server';
import { FarmProvider, useFarm } from './src/context/FarmContext';
import { CompanySwitcher } from './src/components/Company/CompanySwitcher';
import { MasterCompanyDashboard } from './src/components/Company/MasterCompanyDashboard';
import { ProfitSplitView } from './src/components/OwnerProfitSplit/ProfitSplitView';
import { MemberManager } from './src/components/Members/MemberManager';
import { CompanyPanel } from './src/components/Company/CompanyPanel';
import { CreateCompanyModal } from './src/components/Company/CreateCompanyModal';
import { CashFlowDashboard } from './src/components/CashFlow/CashFlowDashboard';
import { GoalManager } from './src/components/Goals/GoalManager';
import { GoalModal } from './src/components/Goals/GoalModal';
import { LoginScreen } from './src/components/Auth/LoginScreen';
import { Sidebar } from './src/components/Sidebar/Sidebar';
import { INITIAL_MEMBERS } from './src/utils/initialData';
import fs from 'fs';
import { rateLimiter } from './src/utils/security';

// Mock browser globals for SSR / Node environment
if (typeof window === 'undefined') {
  global.window = {
    confirm: () => true,
    alert: () => {},
    localStorage: {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
      clear() { this._data = {}; }
    }
  };
  global.localStorage = global.window.localStorage;
  global.sessionStorage = global.window.localStorage;
  global.document = {
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

let testErrors = [];

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    testErrors.push(message);
  } else {
    console.log('✅ PASS:', message);
  }
}

// 1. Test LoginScreen rendering
console.log('\n--- 1. Testing LoginScreen ---');
try {
  const loginHtml = renderToString(
    <FarmProvider>
      <LoginScreen />
    </FarmProvider>
  );
  assert(loginHtml.includes('Fazenda Pantaneiros'), 'LoginScreen renders brand title');
  assert(loginHtml.includes('Passaporte / ID ou Nome'), 'LoginScreen has identifier input');
  assert(!loginHtml.includes('1234'), 'LoginScreen does NOT leak default password');
} catch (e) {
  assert(false, 'LoginScreen threw error: ' + e.message);
}

// Test Helper to set logged-in user in mock localStorage
function setTestUser(user) {
  try {
    const currentMembersJson = global.localStorage.getItem('pantaneiros_team_members_v1');
    let currentList = currentMembersJson ? JSON.parse(currentMembersJson) : INITIAL_MEMBERS;
    if (!currentList.some(m => m.id === user.id)) {
      currentList = [...currentList, user];
    }
    global.localStorage.setItem('pantaneiros_team_members_v1', JSON.stringify(currentList));
  } catch (_) {}
  global.localStorage.setItem('pantaneiros_team_user_v1', user.id);
  global.sessionStorage.setItem('pantaneiros_auth_v1', 'true');
  global.sessionStorage.setItem('pantaneiros_user_id', user.id);
}

// 2. Test Master role: Empreendimentos, Switcher, Master Dashboard, Create Company
console.log('\n--- 2. Testing Master Role & Empreendimentos ---');
const masterUser = INITIAL_MEMBERS.find(m => m.role === 'master');
setTestUser(masterUser);

try {
  // Test CompanySwitcher as Master (closed)
  const switcherHtml = renderToString(
    <FarmProvider>
      <CompanySwitcher onOpenCreateCompany={() => {}} />
    </FarmProvider>
  );
  assert(switcherHtml.includes('Holding Master'), 'CompanySwitcher shows Holding Master for master user');
  assert(!switcherHtml.includes('ReferenceError'), 'CompanySwitcher renders without ReferenceError');

  // Test CompanySwitcher as Master (OPEN - clicking Empreendimentos)
  const switcherOpenHtml = renderToString(
    <FarmProvider>
      <CompanySwitcher onOpenCreateCompany={() => {}} initialOpen={true} />
    </FarmProvider>
  );
  assert(switcherOpenHtml.includes('Empreendimentos'), 'CompanySwitcher dropdown renders "Empreendimentos" title');
  assert(switcherOpenHtml.includes('Fundar Nova Empresa'), 'CompanySwitcher dropdown renders "+ Fundar Nova Empresa" for master');
  assert(switcherOpenHtml.includes('Total Holding:'), 'CompanySwitcher dropdown renders Total Holding balance');
  assert(!switcherOpenHtml.includes('ReferenceError'), 'CompanySwitcher open dropdown has NO ReferenceError');
} catch (e) {
  assert(false, 'CompanySwitcher threw error: ' + e.message);
}

try {
  // Test MasterCompanyDashboard
  const masterDashHtml = renderToString(
    <FarmProvider>
      <MasterCompanyDashboard onOpenCreateCompany={() => {}} />
    </FarmProvider>
  );
  assert(masterDashHtml.includes('Empreendimentos Ativos'), 'MasterCompanyDashboard renders Empreendimentos Ativos');
  assert(masterDashHtml.includes('Caixa Geral Consolidado'), 'MasterCompanyDashboard renders consolidated holding balance');
  assert(masterDashHtml.includes('Fazenda Pantaneiros'), 'MasterCompanyDashboard renders Fazenda');
  assert(masterDashHtml.includes('Ferrovia West Fox'), 'MasterCompanyDashboard renders Ferrovia');
  assert(masterDashHtml.includes('Taverna dos Pantaneiros'), 'MasterCompanyDashboard renders Taverna');
} catch (e) {
  assert(false, 'MasterCompanyDashboard threw error: ' + e.message);
}

try {
  // Test CompanyPanel for Master (Holding tab)
  const panelHtml = renderToString(
    <FarmProvider>
      <CompanyPanel 
        onOpenDiscordSettings={() => {}}
        onOpenDatabaseSettings={() => {}}
        onOpenCreateCompany={() => {}}
      />
    </FarmProvider>
  );
  assert(panelHtml.includes('Holding Master'), 'CompanyPanel renders Holding Master tab for master');
  assert(panelHtml.includes('Repartição de Lucros'), 'CompanyPanel has Lucros tab');
  assert(panelHtml.includes('Gestão de Contas'), 'CompanyPanel has Contas tab');
} catch (e) {
  assert(false, 'CompanyPanel threw error for Master: ' + e.message);
}

try {
  // Test CreateCompanyModal
  const modalHtml = renderToString(
    <FarmProvider>
      <CreateCompanyModal isOpen={true} onClose={() => {}} />
    </FarmProvider>
  );
  assert(modalHtml.includes('Fundar Nova Empresa'), 'CreateCompanyModal opens and renders title');
  assert(modalHtml.includes('Nome da Empresa'), 'CreateCompanyModal has company name input');
} catch (e) {
  assert(false, 'CreateCompanyModal threw error: ' + e.message);
}

// 3. Test Owner role: Raquel Souza (SaaS Tenant Isolation)
console.log('\n--- 3. Testing Owner Role (Raquel Souza) & Tenant Isolation ---');
const ownerUser = INITIAL_MEMBERS.find(m => m.name === 'Raquel Souza');
setTestUser(ownerUser);

try {
  // Test CompanySwitcher as Owner - MUST NOT show dropdown or other companies
  const switcherOwnerHtml = renderToString(
    <FarmProvider>
      <CompanySwitcher onOpenCreateCompany={() => {}} />
    </FarmProvider>
  );
  assert(switcherOwnerHtml.includes('Sua Empresa'), 'CompanySwitcher shows fixed "Sua Empresa" badge for owner');
  assert(!switcherOwnerHtml.includes('Holding Master'), 'Owner CANNOT see Holding Master');
  assert(!switcherOwnerHtml.includes('Total Holding:'), 'Owner CANNOT see Total Holding');
} catch (e) {
  assert(false, 'CompanySwitcher threw error for Owner: ' + e.message);
}

try {
  // Test ProfitSplitView for Owner
  const profitHtml = renderToString(
    <FarmProvider>
      <ProfitSplitView />
    </FarmProvider>
  );
  assert(profitHtml.includes('Cálculo e Repartição de Lucros'), 'ProfitSplitView renders title');
  assert(profitHtml.includes('Caixa da Fazenda'), 'ProfitSplitView renders reserve slider');
  assert(!profitHtml.includes('ReferenceError'), 'ProfitSplitView has no ReferenceError');
} catch (e) {
  assert(false, 'ProfitSplitView threw error: ' + e.message);
}

try {
  // Test MemberManager
  const memberMgrHtml = renderToString(
    <FarmProvider>
      <MemberManager />
    </FarmProvider>
  );
  assert(memberMgrHtml.includes('Quadro de Funcionários'), 'MemberManager renders title');
  assert(memberMgrHtml.includes('Raquel Souza'), 'MemberManager lists owner');
} catch (e) {
  assert(false, 'MemberManager threw error: ' + e.message);
}

// 4. Test Goals & Deliveries
console.log('\n--- 4. Testing Goals & Deliveries ---');
try {
  const goalsHtml = renderToString(
    <FarmProvider>
      <GoalManager onOpenSubmitDelivery={() => {}} />
    </FarmProvider>
  );
  assert(goalsHtml.includes('Metas'), 'GoalManager renders');

  const goalModalHtml = renderToString(
    <FarmProvider>
      <GoalModal isOpen={true} onClose={() => {}} />
    </FarmProvider>
  );
  assert(goalModalHtml.includes('Criar Nova Meta'), 'GoalModal renders');
  assert(goalModalHtml.includes('Todos os Membros') || goalModalHtml.includes('Todos'), 'GoalModal has option for all members');
} catch (e) {
  assert(false, 'Goals threw error: ' + e.message);
}

// 5. Test Cash Flow
console.log('\n--- 5. Testing Cash Flow ---');
try {
  const cashflowHtml = renderToString(
    <FarmProvider>
      <CashFlowDashboard onOpenNewTransaction={() => {}} />
    </FarmProvider>
  );
  assert(cashflowHtml.includes('Fluxo de Caixa') || cashflowHtml.includes('Saldo'), 'CashFlowDashboard renders');
} catch (e) {
  assert(false, 'CashFlowDashboard threw error: ' + e.message);
}

// 6. Test Sidebar Navigation for all roles
console.log('\n--- 6. Testing Sidebar across all roles ---');
for (const role of ['master', 'owner', 'manager', 'member']) {
  const user = INITIAL_MEMBERS.find(m => m.role === role) || { ...INITIAL_MEMBERS[1], role };
  setTestUser(user);
  try {
    const sidebarHtml = renderToString(
      <FarmProvider>
        <Sidebar activeTab="goals" setActiveTab={() => {}} />
      </FarmProvider>
    );
    assert(sidebarHtml.includes('Pantaneiros'), `Sidebar renders cleanly for role: ${role}`);
    if (role === 'master') {
      assert(sidebarHtml.includes('Gestão de Empresas'), 'Master has Gestão de Empresas in sidebar');
    }
    if (role === 'manager' || role === 'member') {
      assert(!sidebarHtml.includes('Gestão de Empresas') && !sidebarHtml.includes('Holding Master'), `${role} cannot see Holding Master in sidebar`);
    }
  } catch (e) {
    assert(false, `Sidebar threw error for role ${role}: ` + e.message);
  }
}

// 7. Mandatory Security Tests (Audit & Hardening Verification)
console.log('\n--- 7. Testing Mandatory Security Requirements ---');

let capturedContext = null;
function SecurityTestConsumer() {
  capturedContext = useFarm();
  return <div id="sec-consumer">Security Consumer</div>;
}

// Security Test 1: Unauthenticated user cannot access private operations
console.log('\n* Test 1: Unauthenticated Access & Session Gate *');
try {
  global.sessionStorage.clear();
  global.localStorage.clear();
  renderToString(
    <FarmProvider>
      <SecurityTestConsumer />
    </FarmProvider>
  );

  assert(capturedContext.isAuthenticated === false, 'Test 1.1: Unauthenticated session has isAuthenticated = false');
  assert(capturedContext.currentUser === null, 'Test 1.2: Unauthenticated currentUser is strictly null');
  assert(capturedContext.currentRole === 'guest', 'Test 1.3: Unauthenticated role defaults to "guest", NOT "owner"');

  const unauthTx = capturedContext.addTransaction({ type: 'income', amount: 100 });
  assert(unauthTx.success === false, 'Test 1.4: Unauthenticated cannot add transactions directly');

  const unauthDeliv = capturedContext.confirmDelivery('deliv-1');
  assert(unauthDeliv.success === false, 'Test 1.5: Unauthenticated cannot confirm deliveries directly');
} catch (e) {
  assert(false, 'Security Test 1 threw error: ' + e.message);
}

// Security Test 2: Regular member cannot perform admin / owner actions
console.log('\n* Test 2: RBAC - Member cannot perform Admin Actions *');
try {
  const memberUser = { id: 'mem-test-worker', name: 'Trabalhador Teste', role: 'member', companyId: 'comp-fazenda', active: true };
  setTestUser(memberUser);
  renderToString(
    <FarmProvider>
      <SecurityTestConsumer />
    </FarmProvider>
  );

  assert(capturedContext.currentRole === 'member', 'Test 2.1: Context loaded with role: member');

  const delTx = capturedContext.deleteTransaction('tx-any');
  assert(delTx.success === false && delTx.error.includes('Acesso negado'), 'Test 2.2: Member CANNOT delete transactions');

  const addMem = capturedContext.addMember({ name: 'Hacker', role: 'owner' });
  assert(addMem.success === false && addMem.error.includes('Acesso negado'), 'Test 2.3: Member CANNOT add new members');

  const delMem = capturedContext.deleteMember('mem-raquel');
  assert(delMem.success === false && delMem.error.includes('Acesso negado'), 'Test 2.4: Member CANNOT delete other members');

  const confDeliv = capturedContext.confirmDelivery('deliv-any');
  assert(confDeliv.success === false && confDeliv.error.includes('Acesso negado'), 'Test 2.5: Member CANNOT validate deliveries');

  const splitRes = capturedContext.setSplitSettings({ farmReservePercent: 99 });
  assert(splitRes.success === false && splitRes.error.includes('Acesso negado'), 'Test 2.6: Member CANNOT change profit split');

  const cycleRes = capturedContext.closeFinancialCycle({ title: 'Ciclo Ilícito' });
  assert(cycleRes.success === false && cycleRes.error.includes('Acesso negado'), 'Test 2.7: Member CANNOT close financial cycle');
} catch (e) {
  assert(false, 'Security Test 2 threw error: ' + e.message);
}

// Security Test 3: ID parameter manipulation & Privilege Escalation Prevention
console.log('\n* Test 3: Parameter Tampering & Privilege Escalation *');
try {
  const updOther = capturedContext.updateMember('mem-raquel', { name: 'Raquel Adulterada' });
  assert(updOther.success === false && updOther.error.includes('Acesso negado'), 'Test 3.1: Member CANNOT alter another member record');

  // Attempt to elevate privileges to master
  const selfEscalate = capturedContext.updateMember('mem-test-worker', { role: 'master', companyId: 'all' });
  assert(selfEscalate.success === true, 'Test 3.2: Member update returns success for safe fields');
  const targetMemberState = capturedContext.members.find(m => m.id === 'mem-test-worker');
  assert(targetMemberState.role === 'member', 'Test 3.3: Privilege escalation blocked - role remains "member"');
} catch (e) {
  assert(false, 'Security Test 3 threw error: ' + e.message);
}

// Security Test 4: Session termination on logout
console.log('\n* Test 4: Logout & Session Invalidation *');
try {
  capturedContext.logout('test_logout');
  assert(global.sessionStorage.getItem('pantaneiros_auth_v1') === null, 'Test 4.1: sessionStorage auth removed on logout');
  assert(global.sessionStorage.getItem('pantaneiros_user_id') === null, 'Test 4.2: sessionStorage user_id removed on logout');

  // Re-render FarmProvider to test post-logout fresh request state
  renderToString(
    <FarmProvider>
      <SecurityTestConsumer />
    </FarmProvider>
  );
  assert(capturedContext.isAuthenticated === false, 'Test 4.3: Context isAuthenticated set to false');
  assert(capturedContext.currentUser === null, 'Test 4.4: Context currentUser set to null');
} catch (e) {
  assert(false, 'Security Test 4 threw error: ' + e.message);
}

// Security Test 5: Verify no hardcoded secrets or third-party PINs in bundles
console.log('\n* Test 5: Secrets Leakage Audit *');
try {
  const supabaseClientCode = fs.readFileSync('./src/utils/supabaseClient.js', 'utf8');
  assert(supabaseClientCode.includes('import.meta.env.VITE_SUPABASE_ANON_KEY') && !supabaseClientCode.includes('eyJhbGci'), 'Test 5.1: Supabase client securely references environment variables');

  const botIndexCode = fs.readFileSync('./bot/index.js', 'utf8');
  assert(botIndexCode.includes('process.env.DISCORD_BOT_TOKEN') && !botIndexCode.includes('client.login("M'), 'Test 5.2: Discord bot securely references environment variables');
} catch (e) {
  assert(false, 'Security Test 5 threw error: ' + e.message);
}

// Security Test 6: Rate Limiting on Login (Brute Force Defense)
console.log('\n* Test 6: Rate Limiting & Brute Force Defense *');
try {
  rateLimiter.resetAll();
  const testTargetId = 'brute_force_target';

  // 5 failed login attempts
  for (let i = 0; i < 5; i++) {
    capturedContext.login({ identifier: testTargetId, pin: 'errado_' + i });
  }

  // 6th attempt should be blocked immediately by rate limiter
  const blockedAttempt = capturedContext.login({ identifier: testTargetId, pin: '1234' });
  assert(blockedAttempt.success === false, 'Test 6.1: 6th login attempt is rejected');
  assert(blockedAttempt.error && blockedAttempt.error.includes('bloqueada'), 'Test 6.2: Lockout message returned correctly');
} catch (e) {
  assert(false, 'Security Test 6 threw error: ' + e.message);
}

// 8. Penetration Test: Simulated Regular User (Authorized Testing)
console.log('\n--- 8. Penetration Test: Authenticated Regular User Scenarios ---');

const userA = {
  id: 'mem-test-vaqueiro-a',
  name: 'Vaqueiro A (Comum)',
  role: 'member',
  companyId: 'comp-fazenda',
  active: true,
  passport: '1001',
  phone: '555-0101',
  pin: '1111',
};

const userB = {
  id: 'mem-test-vaqueiro-b',
  name: 'Vaqueiro B (Comum)',
  role: 'member',
  companyId: 'comp-fazenda',
  active: true,
  passport: '1002',
  phone: '555-0102',
  pin: '2222',
};

const userAdmin = {
  id: 'mem-test-admin',
  name: 'Admin Fazenda (Gerente/Dono)',
  role: 'owner',
  companyId: 'comp-fazenda',
  active: true,
  passport: '9999',
  phone: '555-9999',
  pin: '9999',
};

// Set User A as current authenticated session
setTestUser(userA);

// Register User A, User B, and Admin in members store
const existingMembersJson = global.localStorage.getItem('pantaneiros_team_members_v1');
let fullMembersList = existingMembersJson ? JSON.parse(existingMembersJson) : INITIAL_MEMBERS;
[userA, userB, userAdmin].forEach(u => {
  if (!fullMembersList.some(m => m.id === u.id)) fullMembersList.push(u);
});
global.localStorage.setItem('pantaneiros_team_members_v1', JSON.stringify(fullMembersList));

renderToString(
  <FarmProvider>
    <SecurityTestConsumer />
  </FarmProvider>
);

// 8.1 Direct Administrative Access Attempts
console.log('\n* 8.1 Direct Administrative Operations as Regular User *');
try {
  const addComp = capturedContext.addCompany({ name: 'Empresa Ilícita' });
  assert(addComp && addComp.success === false, '8.1.1: Regular user CANNOT create new companies');

  const updComp = capturedContext.updateCompany('comp-fazenda', { name: 'Empresa Invadida' });
  assert(updComp && updComp.success === false, '8.1.2: Regular user CANNOT update company metadata');

  const delComp = capturedContext.deleteCompany('comp-fazenda');
  assert(delComp && delComp.success === false, '8.1.3: Regular user CANNOT delete companies');

  const addCustomR = capturedContext.addCustomRoute({ title: 'Rota Maliciosa', rewardAmount: 99999 });
  assert(addCustomR && addCustomR.success === false, '8.1.4: Regular user CANNOT create custom routes or alter rewards');

  const resetR = capturedContext.resetRoute('route-1');
  assert(resetR && resetR.success === false, '8.1.5: Regular user CANNOT reset inventory of routes');

  const addExpense = capturedContext.addTransaction({ type: 'expense', amount: 5000, category: 'Despesa Não Autorizada' });
  assert(addExpense && addExpense.success === false, '8.1.6: Regular user CANNOT register expenses or withdraw from treasury');
} catch (e) {
  assert(false, '8.1 threw error: ' + e.message);
}

// 8.2 Horizontal IDOR & Inter-Account Tampering (User A targeting User B)
console.log('\n* 8.2 Horizontal IDOR & Inter-Account Tampering *');
try {
  // User A tries to edit User B's profile
  const editB = capturedContext.updateMember('mem-test-vaqueiro-b', { name: 'Vaqueiro B Adulterado', phone: '000-0000' });
  assert(editB.success === false && editB.error.includes('Acesso negado'), '8.2.1: User A CANNOT modify User B profile (IDOR blocked)');

  // User A tries to submit a delivery pretending to be User B
  const spoofedDelivery = capturedContext.submitDelivery({
    goalId: 'goal-cafe',
    quantity: 50,
    managerId: 'mem-test-admin',
    memberId: 'mem-test-vaqueiro-b', // Spoofed parameter
  });
  assert(spoofedDelivery && spoofedDelivery.success === true, '8.2.2: User A can submit valid delivery');
  assert(spoofedDelivery.newDelivery.memberId === 'mem-test-vaqueiro-a', '8.2.3: IDOR prevention forced memberId to authenticated user (User A)');

  // User A tries to validate/confirm a delivery
  const confirmAttempt = capturedContext.confirmDelivery(spoofedDelivery.newDelivery.id);
  assert(confirmAttempt && confirmAttempt.success === false, '8.2.4: Regular User A CANNOT confirm deliveries');

  // User A tries to reject a delivery
  const rejectAttempt = capturedContext.rejectDelivery({ deliveryId: spoofedDelivery.newDelivery.id, reason: 'Sabotagem' });
  assert(rejectAttempt && rejectAttempt.success === false, '8.2.5: Regular User A CANNOT reject deliveries');
} catch (e) {
  assert(false, '8.2 threw error: ' + e.message);
}

// 8.3 Parameter Tampering & Boundary Values
console.log('\n* 8.3 Parameter Tampering & Boundary Violations *');
try {
  // Negative amount in transactions
  const negTx = capturedContext.addTransaction({ type: 'income', amount: -500 });
  assert(negTx.success === false, '8.3.1: Negative transaction amounts are strictly rejected');

  // Zero / negative quantity in deliveries
  const negDeliv = capturedContext.submitDelivery({ goalId: 'goal-cafe', quantity: 0 });
  assert(negDeliv.success === false, '8.3.2: Zero or negative delivery quantities are strictly rejected');

  // Tenant Boundary: Regular member cannot switch to unauthorized company
  capturedContext.selectCompany('comp-ferrovia');
  assert(capturedContext.currentCompanyId === 'comp-fazenda', '8.3.3: Regular user locked to their assigned tenant/company');
} catch (e) {
  assert(false, '8.3 threw error: ' + e.message);
}

// 8.4 Out-of-Order Execution / Double Validation / Replay Attacks
console.log('\n* 8.4 Out-of-Order & Replay Attack Defense *');
try {
  // Create a pending delivery
  const freshDeliv = capturedContext.submitDelivery({ goalId: 'goal-cafe', quantity: 10 });
  const deliveryId = freshDeliv.newDelivery.id;

  // Switch to admin session to confirm it
  setTestUser(userAdmin);
  renderToString(
    <FarmProvider>
      <SecurityTestConsumer />
    </FarmProvider>
  );

  const firstConfirm = capturedContext.confirmDelivery(deliveryId);
  if (!firstConfirm.success) {
    console.log('DEBUG firstConfirm failed with:', firstConfirm);
  }
  assert(firstConfirm.success === true, '8.4.1: Manager can legitimately confirm pending delivery');

  // Replay: Attempt to confirm again (double validation / double goal count)
  const replayConfirm = capturedContext.confirmDelivery(deliveryId);
  assert(replayConfirm.success === false && replayConfirm.error.includes('já foi confirmada'), '8.4.2: Replay attack blocked: double confirmation rejected');

  // Out-of-order: Attempt to reject already confirmed delivery
  const rejectConfirmed = capturedContext.rejectDelivery({ deliveryId, reason: 'Inválido' });
  assert(rejectConfirmed.success === false && rejectConfirmed.error.includes('já foi confirmada'), '8.4.3: Out-of-order state transition rejected');
} catch (e) {
  assert(false, '8.4 threw error: ' + e.message);
}

// 8.5 Post-Logout and Session State Invalidation
console.log('\n* 8.5 Session Validity After Logout *');
try {
  capturedContext.logout('user_exit');
  renderToString(
    <FarmProvider>
      <SecurityTestConsumer />
    </FarmProvider>
  );
  assert(capturedContext.isAuthenticated === false, '8.5.1: Session state reset on logout');

  // Unauthenticated attempts
  const postLogoutTx = capturedContext.addTransaction({ type: 'income', amount: 100 });
  assert(postLogoutTx.success === false, '8.5.2: Post-logout transaction rejected');

  const postLogoutDeliv = capturedContext.submitDelivery({ quantity: 10 });
  assert(postLogoutDeliv.success === false, '8.5.3: Post-logout delivery submission rejected');
} catch (e) {
  assert(false, '8.5 threw error: ' + e.message);
}

// 8.6 Supabase Row Level Security (RLS) Policy Audit
console.log('\n* 8.6 Supabase Row Level Security (RLS) Verification *');
try {
  const schemaSql = fs.readFileSync('./supabase/schema.sql', 'utf8');
  assert(schemaSql.includes('ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;'), '8.6.1: RLS enabled on members table');
  assert(schemaSql.includes('ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;'), '8.6.2: RLS enabled on transactions table');
  assert(schemaSql.includes('ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;'), '8.6.3: RLS enabled on deliveries table');
  assert(schemaSql.includes('ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;'), '8.6.4: RLS enabled on goals table');
  assert(schemaSql.includes('ALTER TABLE public.farm_settings ENABLE ROW LEVEL SECURITY;'), '8.6.5: RLS enabled on farm_settings table');
} catch (e) {
  assert(false, '8.6 threw error: ' + e.message);
}

console.log('\n======================================');
if (testErrors.length > 0) {
  console.error(`💥 TEST SUITE COMPLETED WITH ${testErrors.length} ERRORS!`);
  process.exit(1);
} else {
  console.log('🎉 ALL SYSTEM TESTS PASSED PERFECTLY WITH ZERO ERRORS!');
  process.exit(0);
}

