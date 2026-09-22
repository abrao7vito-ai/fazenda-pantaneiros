import React, { useState } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols } from '../../utils/formatters';
import { 
  Building2, 
  Layers, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  Wheat, 
  Target, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export function MasterCompanyDashboard({ onOpenCreateCompany }) {
  const { 
    companies, 
    currentCompanyId, 
    selectCompany, 
    companyBalances, 
    consolidatedBalance, 
    consolidatedIncome,
    deleteCompany,
    allGoals
  } = useFarm();

  return (
    <div className="space-y-6">
      
      {/* Master Top Holding Banner */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                HOLDING MASTER • VELHO OESTE
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {companies.length} Empreendimentos
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Painel Master de Empresas
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-xl">
              Administração centralizada do grupo econômico. Alterne instantaneamente entre a Fazenda, Ferrovia, Taverna ou funde novos negócios.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCreateCompany}
            className="self-start md:self-auto py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Fundar Nova Empresa</span>
          </button>
        </div>

        {/* Master Consolidated KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-stone-700/80">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
              Caixa Geral Consolidado
            </div>
            <div className="text-2xl font-mono font-extrabold text-amber-400 mt-1">
              {formatDols(consolidatedBalance)}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              Soma de todos os cofres do grupo
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
              Faturamento Bruto Acumulado
            </div>
            <div className="text-2xl font-mono font-extrabold text-emerald-400 mt-1">
              {formatDols(consolidatedIncome)}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              Entradas registradas na rede
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
              Metas de Produção em Curso
            </div>
            <div className="text-2xl font-mono font-extrabold text-white mt-1">
              {allGoals.filter((g) => g.status === 'in_progress').length}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              Contratos e entregas ativas
            </div>
          </div>
        </div>

      </div>

      {/* Grid of Companies */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900">Empreendimentos Ativos</h3>
            <p className="text-xs text-stone-500">
              Clique em "Acessar Empresa" para gerenciar o caixa, entregas e metas individualmente.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {companies.map((comp) => {
            const isSelected = comp.id === currentCompanyId;
            const balance = companyBalances[comp.id] != null ? companyBalances[comp.id] : 0;
            const compGoals = allGoals.filter((g) => (g.companyId || 'comp-fazenda') === comp.id);
            const activeCompGoals = compGoals.filter((g) => g.status === 'in_progress').length;

            return (
              <div
                key={comp.id}
                className={`bg-white border rounded-3xl p-5 shadow-card transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                    : 'border-stone-200/90 hover:border-stone-300'
                }`}
              >
                <div>
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#fbfaf6] border border-stone-200 flex items-center justify-center text-2xl shadow-inner">
                        {comp.icon}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-stone-900 leading-tight">
                          {comp.name}
                        </h4>
                        <span className="text-[10px] font-bold text-stone-500 font-mono">
                          {comp.code}
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Ativa</span>
                      </span>
                    ) : (
                      comp.id !== 'comp-fazenda' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Excluir o negócio "${comp.name}"?`)) {
                              deleteCompany(comp.id);
                            }
                          }}
                          title="Excluir Empresa"
                          className="text-stone-300 hover:text-rose-600 p-1 rounded-lg hover:bg-stone-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>

                  {/* Segment & Description */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                      {comp.segment}
                    </span>
                    {comp.description && (
                      <p className="text-xs text-stone-500 mt-2 line-clamp-2">
                        {comp.description}
                      </p>
                    )}
                  </div>

                  {/* Metrics Box */}
                  <div className="mt-4 p-3 rounded-2xl bg-[#fcfbf7] border border-stone-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 font-medium">Caixa Atual:</span>
                      <span className="font-mono font-extrabold text-stone-900 text-sm">
                        {formatDols(balance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200/60">
                      <span className="text-stone-500 font-medium">Unidade de Meta:</span>
                      <span className="font-bold text-stone-700 text-[11px]">
                        {comp.unitLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200/60">
                      <span className="text-stone-500 font-medium">Metas em Curso:</span>
                      <span className="font-bold text-amber-800 text-[11px]">
                        {activeCompGoals} ativa{activeCompGoals !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Card Action Button */}
                <div className="mt-5 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => selectCompany(comp.id)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        : 'bg-pantanal-700 hover:bg-pantanal-800 text-white shadow-sm hover:-translate-y-0.5'
                    }`}
                  >
                    <span>{isSelected ? 'Empresa Selecionada' : 'Acessar Esta Empresa'}</span>
                    {!isSelected && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
