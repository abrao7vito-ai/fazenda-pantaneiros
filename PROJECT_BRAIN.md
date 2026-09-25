# 🧠 CÉREBRO DO PROJETO • FAZENDA PANTANEIROS (PROJECT BRAIN)

> **INSTRUÇÃO PARA A IA (ASSISTENTE):**
> Leia este documento atentamente antes de fazer qualquer análise ou alteração no código. Ele contém o mapa completo da arquitetura, regras de negócio, tabelas do Supabase, estrutura de permissões e boas práticas. Não gaste tokens explorando múltiplos arquivos desnecessariamente; use este documento como fonte única da verdade sobre o sistema.

---

## 📌 1. Visão Geral do Sistema

* **Objetivo:** Sistema SaaS Multi-Empresa para controle operacional e financeiro da Fazenda Pantaneiros e seus empreendimentos coligados no RedM / RP.
* **Stack:**
  * **Frontend:** React 18, Vite 6, Tailwind CSS, Lucide Icons.
  * **Backend / Banco de Dados:** Supabase (PostgreSQL, Row Level Security, Realtime Pub/Sub).
  * **Bot Integrado:** Discord Bot (Node.js) em `bot/index.js` para integração de despachos de rotas e webhooks de logs.
  * **Deploy:** Render (build estático com `render.yaml` e Vite build).
* **Empresas Cadastradas:**
  * `comp-fazenda`: **Fazenda Pantaneiros** (Matriz principal, agricultura, gado, produção de milho, café, etc. Moeda: DOLS, unidade padrão: Sacas).
  * `comp-ferrovia`: **Ferrovia West Fox** (Transporte de cargas e rotas ferroviárias).
  * `comp-taverna`: **Taverna dos Pantaneiros** (Comércio de bebidas, comidas e pousada).

---

## 👥 2. Hierarquia de Cargos e Permissões (RBAC)

O controle de acesso é centralizado em `src/utils/security.js` e consumido no `src/context/FarmContext.jsx`:

| Cargo (`role`) | Identificador Chave | Acessos e Responsabilidades |
| :--- | :--- | :--- |
| **`master`** | `mem-master` | **Administrador Master (Holding):** Cria e gerencia empresas, vê saldo consolidado de todos os empreendimentos (`all`), isento de primeiro acesso. Não é integrante do campo. |
| **`owner`** | `mem-raquel`, `mem-vaticano` | **Proprietários / Líderes:** Acesso total à sua empresa ativa. Define repartição de lucros, cria metas, lança receitas e despesas, exclui transações e gerencia integrantes. |
| **`manager`** | `mem-william`, `mem-abraao` | **Gerentes Operacionais:** Validam entregas de metas, lançam receitas e despesas operacionais, realizam retiradas e podem excluir lançamentos indevidos. |
| **`member`** | *DEMAIS VAQUEIROS* | **Integrantes / Vaqueiros:** Podem lançar apenas receitas próprias, submetem entregas de produção para conferência e visualizam suas metas. |
| **`guest`** | *Nenhum* | Usuário não autenticado. Acesso estrito apenas à tela de Login. |

### Matriz de Permissões (`PERMISSIONS` em `src/utils/security.js`):
* `MANAGE_COMPANIES`: apenas `[master]`
* `DELETE_TRANSACTION`: `[master, owner, manager]`
* `ADD_EXPENSE`: `[master, owner, manager]`
* `ADD_MEMBER`: `[master, owner]`
* `DELETE_MEMBER`: `[master, owner]`
* `MANAGE_GOALS`: `[master, owner, manager]`
* `VALIDATE_DELIVERIES`: `[master, owner, manager]`
* `CLOSE_CYCLE`: `[master, owner]`
* `MANAGE_PROFIT_SPLIT`: `[master, owner]`
* `MANAGE_DISCORD_SETTINGS`: `[master, owner]`

---

## 🔐 3. Autenticação, PIN e Primeiro Acesso

1. **Credenciais:** Login por Passaporte, ID ou Nome + Senha/PIN de 4 a 8 caracteres.
2. **Primeiro Acesso Obrigatório:** Todos os integrantes não-master (`firstAccessDone !== true`) ao logarem são interceptados pela tela `FirstAccessScreen.jsx` para cadastrar um novo PIN pessoal obrigatório antes de acessar o painel.
3. **Timeout de Inatividade:** 15 minutos sem interação (`INACTIVITY_TIMEOUT_MS`) encerra a sessão automaticamente por segurança (`sessionStorage` e `localStorage`).
4. **Proteção Contra Força Bruta:** `rateLimiter` em `src/utils/security.js` bloqueia contas após tentativas sucessivas de senha incorreta.

---

## 💰 4. Mecânica Financeira (Fluxo de Caixa e Lucros)

* **Entradas (`income`):** Vendas de colheita, gado, despacho de rotas e adições ao cofre.
* **Saídas (`expense`):** Retiradas, compras de insumos, maquinário e folha de pagamento.
* **Saldo Atual:** `totalBalance = totalIncome - totalExpense`.
* **Lucro Líquido Real:** `netProfit = Math.max(0, totalIncome - operationalExpense)`, onde `operationalExpense` ignora retiradas de folha de pagamento anteriores.
* **Repartição de Lucros (`ProfitSplitView.jsx`):**
  * Reserva da Empresa (% configurável)
  * Pool de Gerentes (% configurável)
  * Pool de Membros (% proporcional às sacas entregues)
* **Entrada de Moeda Inteligente:** Função `parseCurrencyInput` em `src/utils/security.js` aceita tanto o formato brasileiro (`122.221,28` ou `121976`) quanto formato numérico direto, impedindo que ponto de milhar seja interpretado como centavos.
* **Ordenação Cronológica Estrita:** As consultas e listas sempre ordenam por `date DESC` e desempate por `created_at DESC`.

---

## 🗄️ 5. Esquema do Banco de Dados (Supabase PostgreSQL)

### 1. `public.members`
* `id` (TEXT, PK): ex: `'mem-raquel'`, `'mem-vaticano'`.
* `name` (TEXT): Nome do integrante.
* `role` (TEXT): `'master'`, `'owner'`, `'manager'`, `'member'`.
* `role_label` (TEXT): Rótulo visual + tags embutidas (`[EMP:comp-fazenda] [FIRST_ACCESS_DONE]`).
* `avatar` (TEXT): Emoji ou URL.
* `passport` (TEXT): Número do passaporte / ID in-game.
* `phone` (TEXT): Telefone de contato.
* `pin` (TEXT): Hash ou senha PIN de 4 a 8 dígitos.
* `active` (BOOLEAN): Status do membro.
* `created_at` (TIMESTAMPTZ): Data de cadastro.

### 2. `public.transactions`
* `id` (TEXT, PK): ex: `'tx-1790...-abcd'`.
* `type` (TEXT): `'income'` ou `'expense'`.
* `amount` (NUMERIC): Valor em DOLS (sempre positivo).
* `member_id` (TEXT, FK -> `members.id` ON DELETE SET NULL): **ATENÇÃO:** O usuário `mem-master` não existe na tabela `members`; sempre enviar `null` no `member_id` quando for o Master para evitar erro de violação de chave estrangeira (FK)!
* `member_name` (TEXT): Nome do responsável gravado no momento da transação.
* `category` (TEXT): Categoria (ex: 'Arrecadação de Venda', 'Insumos & Despesas', 'Folha de Pagamento').
* `description` (TEXT): Observação + tag de empresa `[EMP:comp-id]`.
* `date` (TIMESTAMPTZ): Data da transação.
* `box_balance_after` (NUMERIC): Saldo do caixa logo após o lançamento.
* `created_at` (TIMESTAMPTZ): Timestamp exato de criação.

### 3. `public.goals` & `public.deliveries`
* `goals`: Metas de produção vinculadas à empresa ou membros.
* `deliveries`: Registro de remessas entregues pelos membros aguardando validação da gerência (`pending`, `confirmed`, `rejected`).

### 4. `public.closed_cycles` & `public.farm_settings`
* `closed_cycles`: Histórico congelado de fechamentos de lucros passados.
* `farm_settings`: Configurações globais em JSONB (`key = 'companies'`, `key = 'discord'`, `key = 'split'`).

---

## 📁 6. Mapa dos Arquivos Essenciais

```
├── src/
│   ├── context/
│   │   └── FarmContext.jsx          # Cérebro do estado React: auth, dados, cálculos, sincronização Supabase
│   ├── utils/
│   │   ├── security.js              # RBAC, RateLimit, parseCurrencyInput, sanitizePositiveNumber
│   │   ├── supabaseClient.js        # Cliente Supabase, conversores toLocal/toDb e tags de isolamento
│   │   ├── formatters.js            # formatDols, formatDateBR, geradores de texto para Discord
│   │   └── initialData.js           # Dados padrão de contingência e inicialização
│   ├── components/
│   │   ├── Auth/                    # LoginScreen.jsx, FirstAccessScreen.jsx
│   │   ├── CashFlow/                # CashFlowDashboard.jsx, TransactionList.jsx, TransactionFormModal.jsx
│   │   ├── Goals/                   # GoalManager.jsx, GoalCard.jsx, GoalModal.jsx
│   │   ├── Deliveries/              # SubmitDeliveryModal.jsx, DeliveryValidationList.jsx
│   │   ├── OwnerProfitSplit/        # ProfitSplitView.jsx (Cálculo e repartição de lucros)
│   │   ├── Company/                 # CompanySwitcher.jsx, MasterCompanyDashboard.jsx, CompanyPanel.jsx
│   │   ├── Routes/                  # RouteChecklistManager.jsx (Checklist de cargas e animais)
│   │   └── Sidebar/                 # Sidebar.jsx
├── bot/
│   └── index.js                     # Bot do Discord (despacho de rotas e comandos)
└── supabase/
    └── schema.sql                   # Definição oficial das tabelas, índices e políticas RLS
```

---

## ⚡ 7. Regras Mandatórias de Desenvolvimento

1. **Isolamento Multi-Tenant Estrito:** Nunca permitir que dados de uma empresa vazem para outra. Usuários não-master ficam travados na sua respectiva empresa.
2. **Defesa Contra Null Pointer:** Sempre use encadeamento opcional e fallbacks (`(tx.memberName || '').toLowerCase()`).
3. **Foreign Keys Seguras:** Nunca insira em colunas FK IDs de contas virtuais ou que não existam na tabela pai.
4. **Verificação Obrigatória:** Após qualquer alteração, executar `npm test` e `npm run build` antes de subir para produção.
