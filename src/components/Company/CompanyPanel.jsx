import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { ProfitSplitView } from '../OwnerProfitSplit/ProfitSplitView';
import { MemberManager } from '../Members/MemberManager';
import { 
  Building2, 
  Crown, 
  Users, 
  Radio, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  ShieldCheck,
  Settings,
  Lock
} from 'lucide-react';

export function CompanyPanel({ onOpenDiscordSettings, onOpenDatabaseSettings }) {
  const { currentRole, discordSettings, dbStatus } = useFarm();
  const [activeTab, setActiveTab] = useState('lucros'); // 'lucros' | 'contas' | 'conexoes'

  // Safety: If not owner, display locked message
  if (currentRole !== 'owner') {
    return (
      <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Acesso Restrito ao Dono da Empresa</h3>
        <p className="text-xs text-stone-500 mt-2">
          O Painel da Empresa é reservado exclusivamente para os Proprietários da Fazenda Pantaneiros.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Company Header Banner */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-2xl shadow-inner">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-stone-900">Painel da Empresa</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wide">
                  Exclusivo Dono
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Gestão estratégica da Fazenda Pantaneiros: lucros, equipe e conexões seguras.
              </p>
            </div>
          </div>

          {/* Tab Navigation Pill Bar */}
          <div className="flex items-center gap-1.5 p-1.5 bg-stone-100/90 rounded-2xl border border-stone-200/80 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('lucros')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'lucros'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>Repartição de Lucros</span>
            </button>

            <button
              onClick={() => setActiveTab('contas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'contas'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-pantanal-700" />
              <span>Gestão de Contas</span>
            </button>

            <button
              onClick={() => setActiveTab('conexoes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'conexoes'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Conexões & Nuvem</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Repartição de Lucros */}
      {activeTab === 'lucros' && (
        <div>
          <ProfitSplitView />
        </div>
      )}

      {/* Tab 2: Gestão de Contas */}
      {activeTab === 'contas' && (
        <div>
          <MemberManager />
        </div>
      )}

      {/* Tab 3: Conexões & Nuvem (Discord + Supabase) */}
      {activeTab === 'conexoes' && (
        <div className="space-y-6">
          
          {/* Informative Security Notice */}
          <div className="bg-amber-50/70 border border-amber-300/80 rounded-3xl p-5 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-sm block mb-0.5">Área de Integrações Confidenciais</strong>
              <span>
                As chaves de API, webhooks e conexões com o banco de dados ficam protegidos neste painel da empresa.
                Integrantes comuns e gerentes não têm acesso a essas configurações ou links externos.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Discord Webhook Integration Card */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-xl shadow-inner">
                      🎮
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Logs Automáticos no Discord</h3>
                      <p className="text-[11px] text-stone-500">Notificações no canal da Fazenda</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                      discordSettings?.webhookUrl && discordSettings?.enabled
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        discordSettings?.webhookUrl && discordSettings?.enabled
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span>
                      {discordSettings?.webhookUrl && discordSettings?.enabled
                        ? 'Conectado'
                        : 'Pendente'}
                    </span>
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed mt-3">
                  Quando ativo, envia automaticamente para o Discord relatórios de fluxo de caixa, avisos de entregas de sacas de milho e confirmações da gerência com a arte oficial da Fazenda Pantaneiros.
                </p>

                <div className="mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Fluxo de Caixa:</span>
                    <span className="font-bold text-stone-800">{discordSettings?.autoCashflow ? 'Sim' : 'Não'}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Entregas de Sacas:</span>
                    <span className="font-bold text-stone-800">{discordSettings?.autoDeliveries ? 'Sim' : 'Não'}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Folha de Pagamento:</span>
                    <span className="font-bold text-stone-800">{discordSettings?.autoPayroll ? 'Sim' : 'Não'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                <span className="text-[11px] text-stone-400">
                  {discordSettings?.webhookUrl ? 'URL Salva no Sistema' : 'Nenhuma URL configurada'}
                </span>
                <button
                  type="button"
                  onClick={onOpenDiscordSettings}
                  className="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurar Discord</span>
                </button>
              </div>
            </div>

            {/* Supabase Database Cloud Card */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-inner">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Banco de Dados Supabase</h3>
                      <p className="text-[11px] text-stone-500">Nuvem PostgreSQL com Realtime</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                      dbStatus === 'connected'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : dbStatus === 'tables_missing'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dbStatus === 'connected'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    <span>
                      {dbStatus === 'connected'
                        ? 'Conectado'
                        : dbStatus === 'tables_missing'
                        ? 'Tabelas Pendentes'
                        : 'Offline'}
                    </span>
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed mt-3">
                  Mantém todos os dados da fazenda salvos na nuvem (membros, metas, entregas, ciclos fechados e caixa). Atualizações acontecem em tempo real via WebSockets entre todos os dispositivos.
                </p>

                <div className="mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Host:</span>
                    <span className="font-bold text-stone-800 truncate max-w-[170px]">supabase.co</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Realtime:</span>
                    <span className="font-bold text-emerald-700">6 Tabelas Ativas</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Sincronização:</span>
                    <span className="font-bold text-stone-800">Bidirecional</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                <span className="text-[11px] text-stone-400">
                  {dbStatus === 'connected' ? 'Sincronização Ativa' : 'Requer Configuração'}
                </span>
                <button
                  type="button"
                  onClick={onOpenDatabaseSettings}
                  className="px-4 py-2 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-ouro-300" />
                  <span>Painel do Banco de Dados</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
