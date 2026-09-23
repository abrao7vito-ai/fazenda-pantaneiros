-- =========================================================
-- FAZENDA PANTANEIROS - BANCO DE DADOS SUPABASE (POSTGRESQL)
-- =========================================================

-- 1. TABELA DE INTEGRANTES / MEMBROS
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    role_label TEXT DEFAULT 'Membro Produtor',
    avatar TEXT DEFAULT '🌾',
    passport TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    pin TEXT DEFAULT '1234',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE TRANSAÇÕES / LIVRO CAIXA
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'income' ou 'expense'
    amount NUMERIC NOT NULL,
    member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
    member_name TEXT,
    category TEXT,
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    box_balance_after NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE METAS
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'owner_to_manager',
    unit_type TEXT DEFAULT 'sacks',
    unit_label TEXT DEFAULT 'Sacas de Milho',
    creator_role TEXT,
    creator_name TEXT,
    target_member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
    target_member_name TEXT,
    target_amount NUMERIC DEFAULT 0,
    current_amount NUMERIC DEFAULT 0,
    deadline TEXT,
    status TEXT DEFAULT 'in_progress',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE ENTREGAS DE PRODUÇÃO
CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
    member_name TEXT,
    member_role TEXT,
    manager_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
    manager_name TEXT,
    goal_id TEXT REFERENCES public.goals(id) ON DELETE SET NULL,
    quantity NUMERIC DEFAULT 0,
    item_type TEXT DEFAULT 'Sacas de Milho',
    notes TEXT,
    proof_url TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
    date TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    confirmed_by TEXT,
    rejection_reason TEXT,
    rejected_by TEXT,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE FECHAMENTOS DE CICLOS FINANCEIROS
CREATE TABLE IF NOT EXISTS public.closed_cycles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    period_note TEXT,
    closed_by TEXT,
    total_income NUMERIC DEFAULT 0,
    total_expense NUMERIC DEFAULT 0,
    net_profit NUMERIC DEFAULT 0,
    split_settings JSONB,
    payouts JSONB,
    farm_reserve_amount NUMERIC DEFAULT 0,
    managers_pool_amount NUMERIC DEFAULT 0,
    members_pool_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE CONFIGURAÇÕES GERAIS (DIVISÃO E DISCORD)
CREATE TABLE IF NOT EXISTS public.farm_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- HABILITAR SEGURANÇA ROW LEVEL SECURITY (RLS)
-- =========================================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_settings ENABLE ROW LEVEL SECURITY;

-- 1. MEMBERS: Leitura pública das contas ativas; Modificações restritas
DROP POLICY IF EXISTS "Allow all on members" ON public.members;
DROP POLICY IF EXISTS "Public read on members" ON public.members;
DROP POLICY IF EXISTS "Allow member self update" ON public.members;
DROP POLICY IF EXISTS "Allow member insert" ON public.members;
DROP POLICY IF EXISTS "Allow member update" ON public.members;

-- Leitura pública dos integrantes para identificação no sistema
CREATE POLICY "Public read on members" ON public.members 
  FOR SELECT USING (active = true);

-- Inserção de novos membros (controlada pela aplicação e service_role)
CREATE POLICY "Allow member insert" ON public.members 
  FOR INSERT WITH CHECK (name IS NOT NULL AND length(trim(name)) > 0);

-- Atualização de membros
CREATE POLICY "Allow member update" ON public.members 
  FOR UPDATE USING (true) WITH CHECK (name IS NOT NULL);

-- 2. TRANSACTIONS: Leitura pública do extrato; Inserção de lançamentos válidos; Exclusão restrita
DROP POLICY IF EXISTS "Allow all on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Public read on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow transaction insert" ON public.transactions;
DROP POLICY IF EXISTS "Allow transaction update" ON public.transactions;
DROP POLICY IF EXISTS "Allow transaction delete" ON public.transactions;

CREATE POLICY "Public read on transactions" ON public.transactions 
  FOR SELECT USING (true);

-- Permite adicionar lançamentos apenas com valores positivos
CREATE POLICY "Allow transaction insert" ON public.transactions 
  FOR INSERT WITH CHECK (amount > 0 AND (type = 'income' OR type = 'expense'));

-- 3. GOALS: Leitura pública; Criação e atualização de metas
DROP POLICY IF EXISTS "Allow all on goals" ON public.goals;
DROP POLICY IF EXISTS "Public read on goals" ON public.goals;
DROP POLICY IF EXISTS "Allow goal insert" ON public.goals;
DROP POLICY IF EXISTS "Allow goal update" ON public.goals;
DROP POLICY IF EXISTS "Allow goal delete" ON public.goals;

CREATE POLICY "Public read on goals" ON public.goals 
  FOR SELECT USING (true);

CREATE POLICY "Allow goal insert" ON public.goals 
  FOR INSERT WITH CHECK (title IS NOT NULL AND target_amount >= 0);

CREATE POLICY "Allow goal update" ON public.goals 
  FOR UPDATE USING (true) WITH CHECK (current_amount >= 0);

-- 4. DELIVERIES: Leitura pública; Inserção com quantidade positiva; Atualização de status
DROP POLICY IF EXISTS "Allow all on deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Public read on deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Allow delivery insert" ON public.deliveries;
DROP POLICY IF EXISTS "Allow delivery update" ON public.deliveries;
DROP POLICY IF EXISTS "Allow delivery delete" ON public.deliveries;

CREATE POLICY "Public read on deliveries" ON public.deliveries 
  FOR SELECT USING (true);

CREATE POLICY "Allow delivery insert" ON public.deliveries 
  FOR INSERT WITH CHECK (quantity > 0);

CREATE POLICY "Allow delivery update" ON public.deliveries 
  FOR UPDATE USING (true) WITH CHECK (status IN ('pending', 'confirmed', 'rejected'));

-- 5. CLOSED CYCLES: Leitura pública do histórico de fechamento; Inserção permitida; Exclusão bloqueada
DROP POLICY IF EXISTS "Allow all on closed_cycles" ON public.closed_cycles;
DROP POLICY IF EXISTS "Public read on closed_cycles" ON public.closed_cycles;
DROP POLICY IF EXISTS "Allow cycle insert" ON public.closed_cycles;

CREATE POLICY "Public read on closed_cycles" ON public.closed_cycles 
  FOR SELECT USING (true);

CREATE POLICY "Allow cycle insert" ON public.closed_cycles 
  FOR INSERT WITH CHECK (total_income >= 0);

-- 6. FARM SETTINGS: Leitura pública; Atualização controlada
DROP POLICY IF EXISTS "Allow all on farm_settings" ON public.farm_settings;
DROP POLICY IF EXISTS "Public read on farm_settings" ON public.farm_settings;
DROP POLICY IF EXISTS "Allow settings upsert" ON public.farm_settings;

CREATE POLICY "Public read on farm_settings" ON public.farm_settings 
  FOR SELECT USING (true);

CREATE POLICY "Allow settings upsert" ON public.farm_settings 
  FOR ALL USING (key IN ('split', 'discord', 'companies', 'routes')) 
  WITH CHECK (key IN ('split', 'discord', 'companies', 'routes'));

-- =========================================================
-- HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME WEBSOCKETS)
-- =========================================================
DO $$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH t IN ARRAY ARRAY['members', 'transactions', 'goals', 'deliveries', 'closed_cycles', 'farm_settings']
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_publication p ON pr.prpubid = p.oid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- DADOS INICIAIS DA FAZENDA PANTANEIROS
-- =========================================================

-- Liderança Oficial
INSERT INTO public.members (id, name, role, role_label, avatar, passport, phone, pin, active)
VALUES
  ('mem-raquel', 'Raquel Souza', 'owner', 'Dona da Fazenda', '👑', '70', '', '1234', true),
  ('mem-vaticano', 'Vaticano', 'owner', 'Dono da Fazenda', '👑', '', '', '1234', true),
  ('mem-william', 'William Erick', 'manager', 'Gerente Geral', '⭐', '69', '', '1234', true),
  ('mem-abraao', 'Abraão', 'manager', 'Gerente de Operações', '👔', '', '', '1234', true)
ON CONFLICT (id) DO NOTHING;

-- Movimentações do Caixa: Entrada de $ 26.500,00 e Saques de $ 12.155,97 -> Saldo Real $ 14.344,03
INSERT INTO public.transactions (id, type, amount, member_id, member_name, category, description, date, box_balance_after)
VALUES
  ('tx-pantanal-01', 'income', 26500, 'mem-raquel', 'Raquel Souza [70]', 'Produção da Fazenda', 'Faturamento Total da Produção do Turno', '2026-09-19 18:00:00+00', 26500),
  ('tx-pantanal-02', 'expense', 12155.97, 'mem-william', 'William Erick [69]', 'Folha de Pagamento', 'Saques parciais de pagamento da equipe no baú da fazenda', NOW(), 14344.03)
ON CONFLICT (id) DO NOTHING;

-- Meta de Milho do Turno
INSERT INTO public.goals (id, title, type, unit_type, unit_label, creator_role, creator_name, target_member_id, target_member_name, target_amount, current_amount, deadline, status, notes)
VALUES
  ('goal-milho-1', 'Meta de 100 Sacas de Milho - Turno Oficial', 'owner_to_manager', 'sacks', 'Sacas de Milho', 'owner', 'Raquel Souza', 'mem-william', 'William Erick [69]', 100, 0, '2026-09-30', 'in_progress', 'Entregar para os gerentes William Erick ou Abraão no silo central.')
ON CONFLICT (id) DO NOTHING;

-- Configuração da Divisão de Lucros & Discord
INSERT INTO public.farm_settings (key, value)
VALUES
  ('split', '{"farmReservePercent": 30, "managersPercent": 35, "membersPercent": 35, "bonusForGoalAchieved": 883.33}'::jsonb),
  ('discord', '{"webhookUrl": "", "enabled": true, "autoCashflow": true, "autoDeliveries": true, "autoPayroll": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
