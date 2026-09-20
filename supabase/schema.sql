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

-- POLÍTICAS DE ACESSO TOTAL PÚBLICO (ANON COM PIN NA APLICAÇÃO)
DROP POLICY IF EXISTS "Allow all on members" ON public.members;
CREATE POLICY "Allow all on members" ON public.members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on transactions" ON public.transactions;
CREATE POLICY "Allow all on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on goals" ON public.goals;
CREATE POLICY "Allow all on goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on deliveries" ON public.deliveries;
CREATE POLICY "Allow all on deliveries" ON public.deliveries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on closed_cycles" ON public.closed_cycles;
CREATE POLICY "Allow all on closed_cycles" ON public.closed_cycles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on farm_settings" ON public.farm_settings;
CREATE POLICY "Allow all on farm_settings" ON public.farm_settings FOR ALL USING (true) WITH CHECK (true);

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
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
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
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
