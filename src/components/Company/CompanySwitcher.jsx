import React, { useState, useRef, useEffect } from 'react';
import { useFarm } from '../../context/FarmContext';
import { formatDols } from '../../utils/formatters';
import { ChevronDown, Check, Plus, Building2, Layers } from 'lucide-react';

export function CompanySwitcher({ onOpenCreateCompany }) {
  const { 
    companies, 
    currentCompanyId, 
    currentCompany, 
    selectCompany, 
    companyBalances, 
    consolidatedBalance,
    currentRole
  } = useFarm();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isMaster = currentRole === 'master';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Strict SaaS Tenant Isolation:
  // Owners, managers, and members ONLY see their own company badge.
  // They cannot click, cannot switch, cannot see other businesses, and cannot see total holding.
  if (!isMaster) {
    return (
      <div className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-card text-left select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-300/80 flex items-center justify-center text-lg shrink-0 shadow-inner">
            {currentCompany?.icon || '🌾'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900 truncate">
                {currentCompany?.name}
              </span>
            </div>
            <div className="text-[10px] text-stone-400 font-mono truncate">
              {currentCompany?.code || currentCompany?.segment}
            </div>
          </div>
        </div>

        <div className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-800 shrink-0">
          Sua Empresa
        </div>
      </div>
    );
  }

  return (
    <div className="relative select-none" ref={dropdownRef}>
      
      {/* Switcher Trigger Button (Master Only) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 shadow-card transition-all text-left group cursor-pointer"
        title="Holding Master • Alternar entre empresas"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-300/80 flex items-center justify-center text-lg shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            {currentCompany?.icon || '🌾'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900 truncate">
                {currentCompany?.name}
              </span>
            </div>
            <div className="text-[10px] text-stone-400 font-mono truncate">
              {currentCompany?.code || currentCompany?.segment}
            </div>
          </div>
        </div>

        <div className="p-1 rounded-lg text-stone-400 group-hover:text-stone-700 transition-colors">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Switcher Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden animate-fadeIn p-1.5 min-w-[260px]">
          
          {/* Header */}
          <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Empreendimentos</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-stone-500">
              {companies.length} ativas
            </span>
          </div>

          {/* Companies List */}
          <div className="max-h-60 overflow-y-auto py-1 space-y-1">
            {companies.map((comp) => {
              const isSelected = comp.id === currentCompanyId;
              const balance = companyBalances[comp.id] != null ? companyBalances[comp.id] : 0;

              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    selectCompany(comp.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-amber-50/80 border border-amber-300 text-stone-900 font-bold'
                      : 'hover:bg-stone-50 text-stone-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{comp.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs truncate font-bold text-stone-900">{comp.name}</div>
                      <div className="text-[10px] text-stone-400 truncate">{comp.segment}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <div className="text-xs font-mono font-bold text-stone-800">
                      {formatDols(balance)}
                    </div>
                    {isSelected && (
                      <span className="text-[9px] text-amber-700 font-bold flex items-center justify-end gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Ativa
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Consolidated Group Balance Footer */}
          <div className="px-3 py-2 bg-stone-50/80 rounded-xl border border-stone-200/70 mt-1 flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-bold text-stone-500">Total Holding:</span>
            <span className="font-mono font-extrabold text-stone-900 text-xs">
              {formatDols(consolidatedBalance)}
            </span>
          </div>

          {/* New Company Action Button (Owner only) */}
          {isOwner && onOpenCreateCompany && (
            <div className="pt-1.5 mt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreateCompany();
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-amber-200/80 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Fundar Nova Empresa</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
