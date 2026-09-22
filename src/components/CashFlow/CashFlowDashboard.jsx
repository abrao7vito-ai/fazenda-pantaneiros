import React from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols } from '../../utils/formatters';
import { TransactionList } from './TransactionList';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  PlusCircle, 
  Sparkles
} from 'lucide-react';

export function CashFlowDashboard({ onOpenNewTransaction }) {
  const { 
    totalBalance, 
    totalIncome, 
    totalExpense, 
    netProfit, 
    transactions,
    currentCompany
  } = useFarm();

  const totalVolume = totalIncome + totalExpense;
  const incomePercent = totalVolume > 0 ? Math.round((totalIncome / totalVolume) * 100) : 100;
  const expensePercent = totalVolume > 0 ? 100 - incomePercent : 0;

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Clean Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Painel Financeiro & Operacional</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
              <span>{currentCompany?.icon || '🏢'}</span>
              <span>Fluxo de Caixa • {currentCompany?.name || 'Empresa'}</span>
            </h1>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Monitore todas as entradas de DOLS, despesas operacionais e saldo disponível no cofre de {currentCompany?.name || 'sua empresa'}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-2 bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Lançar no Caixa (+)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: TOTAL NO CAIXA */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-card group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Total no Caixa Atual
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-stone-900">
              {formatDols(totalBalance)}
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Disponível em cofre</span>
            </div>
          </div>
        </div>

        {/* Card 2: TOTAL ADICIONADO (ENTRADAS) */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-card group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Total Entradas (Vendas)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-stone-900">
              {formatDols(totalIncome)}
            </div>
            <div className="text-xs text-emerald-700 mt-1 font-semibold">
              {transactions.filter((t) => t.type === 'income').length} adições registradas
            </div>
          </div>
        </div>

        {/* Card 3: TOTAL RETIRADO (DESPESAS) */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-card group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Despesas & Insumos
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-rose-700">
              {formatDols(totalExpense)}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Custos operacionais da fazenda
            </div>
          </div>
        </div>

        {/* Card 4: LUCRO LÍQUIDO DISPONÍVEL */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-card group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Lucro Líquido Real
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-800">
              {formatDols(netProfit)}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Receita menos despesas
            </div>
          </div>
        </div>

      </div>

      {/* Visual Analytics / Flow Distribution Bar */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Balanço de Movimentação (Entradas vs Saídas)
          </div>
          <div className="text-xs font-mono text-stone-700 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>
              {incomePercent}% Entradas ({formatDols(totalIncome)})
            </span>
            <span className="flex items-center gap-1.5 text-rose-800 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600"></span>
              {expensePercent}% Saídas ({formatDols(totalExpense)})
            </span>
          </div>
        </div>
        
        {/* Ratio Bar */}
        <div className="w-full h-3.5 bg-stone-100 rounded-full overflow-hidden flex border border-stone-200">
          <div
            style={{ width: `${incomePercent}%` }}
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500"
          />
          <div
            style={{ width: `${expensePercent}%` }}
            className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-500"
          />
        </div>
      </div>

      {/* Transaction List Table */}
      <TransactionList />

    </div>
  );
}
