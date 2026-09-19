import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  X,
  Layers,
  Terminal,
  Server
} from 'lucide-react';

const SQL_SCHEMA = `-- =========================================================
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
    type TEXT NOT NULL,
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
    status TEXT DEFAULT 'pending',
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

-- 6. TABELA DE CONFIGURAÇÕES GERAIS
CREATE TABLE IF NOT EXISTS public.farm_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR RLS & POLÍTICAS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closed_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_settings ENABLE ROW LEVEL SECURITY;

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

-- HABILITAR REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.closed_cycles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.farm_settings;

-- DADOS INICIAIS DA FAZENDA PANTANEIROS
INSERT INTO public.members (id, name, role, role_label, avatar, passport, phone, pin, active)
VALUES
  ('mem-raquel', 'Raquel Souza', 'owner', 'Dona da Fazenda', '👑', '70', '', '1234', true),
  ('mem-vaticano', 'Vaticano', 'owner', 'Dono da Fazenda', '👑', '', '', '1234', true),
  ('mem-william', 'William Erick', 'manager', 'Gerente Geral', '⭐', '69', '', '1234', true),
  ('mem-abraao', 'Abraão', 'manager', 'Gerente de Operações', '👔', '', '', '1234', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, type, amount, member_id, member_name, category, description, date, box_balance_after)
VALUES
  ('tx-pantanal-01', 'income', 26500, 'mem-raquel', 'Raquel Souza [70]', 'Produção da Fazenda', 'Faturamento Total da Produção do Turno', '2026-09-19 18:00:00+00', 26500),
  ('tx-pantanal-02', 'expense', 12155.97, 'mem-william', 'William Erick [69]', 'Folha de Pagamento', 'Saques parciais de pagamento da equipe no baú da fazenda', NOW(), 14344.03)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.goals (id, title, type, unit_type, unit_label, creator_role, creator_name, target_member_id, target_member_name, target_amount, current_amount, deadline, status, notes)
VALUES
  ('goal-milho-1', 'Meta de 100 Sacas de Milho - Turno Oficial', 'owner_to_manager', 'sacks', 'Sacas de Milho', 'owner', 'Raquel Souza', 'mem-william', 'William Erick [69]', 100, 0, '2026-09-30', 'in_progress', 'Entregar para os gerentes William Erick ou Abraão no silo central.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.farm_settings (key, value)
VALUES
  ('split', '{"farmReservePercent": 30, "managersPercent": 35, "membersPercent": 35, "bonusForGoalAchieved": 883.33}'::jsonb),
  ('discord', '{"webhookUrl": "", "enabled": true, "autoCashflow": true, "autoDeliveries": true, "autoPayroll": true}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
`;

export function DatabaseStatusModal({ isOpen, onClose }) {
  const { dbStatus, refreshDbConnection } = useFarm();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCHEMA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDbConnection();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const isConnected = dbStatus === 'connected';
  const isPendingTables = dbStatus === 'tables_missing' || dbStatus === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Banco de Dados em Nuvem (Supabase)
              </h3>
              <p className="text-xs text-stone-500">
                Sincronização em tempo real entre todos os dispositivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div className="space-y-1">
              <div className="text-sm font-bold flex items-center gap-2">
                <span>{isConnected ? 'Banco de Dados Conectado & Operacional' : 'Configuração Inicial do Banco de Dados'}</span>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-extrabold ${
                  isConnected ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {isConnected ? 'Realtime Ativo' : 'Tabelas Pendentes'}
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {isConnected
                  ? 'Todas as movimentações de caixa, confirmações de milho, metas e pagamentos estão sincronizando instantaneamente na nuvem via Supabase!'
                  : 'As chaves do projeto já estão conectadas com sucesso! Para começar a salvar na nuvem, basta executar o Script SQL abaixo uma única vez no Supabase.'}
              </p>
            </div>
          </div>

          {/* Setup Instructions if pending */}
          {isPendingTables && (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>3 Passos Rápidos (Leva 1 Minuto)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <div className="text-xs font-bold text-stone-900">Abra o SQL Editor</div>
                  <p className="text-[11px] text-stone-500">
                    Acesse o painel do seu projeto no Supabase.
                  </p>
                  <a
                    href="https://supabase.com/dashboard/project/isqjusvluobjooknybdu/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline pt-1"
                  >
                    <span>Abrir SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <div className="text-xs font-bold text-stone-900">Cole o Script SQL</div>
                  <p className="text-[11px] text-stone-500">
                    Clique no botão verde abaixo para copiar todo o código e cole lá no editor.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <div className="text-xs font-bold text-stone-900">Clique em "RUN"</div>
                  <p className="text-[11px] text-stone-500">
                    Execute no Supabase. O banco criará as tabelas e sincronizará tudo na hora!
                  </p>
                </div>

              </div>

              {/* Code Box */}
              <div className="relative rounded-2xl bg-stone-900 text-stone-200 p-4 font-mono text-[11px] overflow-hidden border border-stone-800">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800 text-[10px] text-stone-400">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>schema.sql (Tabelas, RLS e Realtime da Fazenda Pantaneiros)</span>
                  </div>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Script'}</span>
                  </button>
                </div>
                <pre className="max-h-48 overflow-y-auto leading-relaxed text-stone-300 select-all">
                  {SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}

          {/* Connection Info */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="text-xs font-bold text-stone-700 flex items-center gap-2">
              <Server className="w-4 h-4 text-stone-500" />
              <span>Instância Conectada</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 truncate">
                <span className="text-stone-400 block text-[10px]">URL DO PROJETO</span>
                https://isqjusvluobjooknybdu.supabase.co
              </div>
              <div className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 truncate">
                <span className="text-stone-400 block text-[10px]">CHAVE ANON / PUBLISHABLE</span>
                sb_publishable_4rVEwpMQ...
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-stone-900 px-3 py-2 rounded-xl hover:bg-stone-200/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Verificando...' : 'Testar Conexão Novamente'}</span>
          </button>

          <div className="flex items-center gap-2">
            {isPendingTables && (
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado para a Área de Transferência!' : 'Copiar Script SQL'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
