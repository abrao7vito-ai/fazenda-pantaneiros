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

console.log('\n======================================');
if (testErrors.length > 0) {
  console.error(`💥 TEST SUITE COMPLETED WITH ${testErrors.length} ERRORS!`);
  process.exit(1);
} else {
  console.log('🎉 ALL SYSTEM TESTS PASSED PERFECTLY WITH ZERO ERRORS!');
  process.exit(0);
}
