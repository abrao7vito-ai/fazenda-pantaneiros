import React, { useState, useEffect } from 'react';
import { useFarm } from '../../context/FarmContext';
import { testDiscordWebhook } from '../../utils/discordWebhook';
import { 
  X, 
  Send, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  Bell, 
  CheckCircle2,
  Loader2,
  Building2
} from 'lucide-react';

export function DiscordSettingsModal({ isOpen, onClose }) {
  const { 
    currentUser, 
    currentCompany, 
    currentCompanyId, 
    companies, 
    currentRole,
    getCompanyDiscordSettings, 
    updateDiscordSettings 
  } = useFarm();

  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCompanyId || 'comp-fazenda');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [autoCashflow, setAutoCashflow] = useState(true);
  const [autoDeliveries, setAutoDeliveries] = useState(true);
  const [autoPayroll, setAutoPayroll] = useState(true);
  const [autoDeletePrevious, setAutoDeletePrevious] = useState(true);

  const [testStatus, setTestStatus] = useState(null); // 'loading' | 'success' | 'error' | null
  const [testError, setTestError] = useState('');
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'success' | 'error' | null

  // Ensure selectedCompany matches current company on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedCompanyId(currentCompanyId || 'comp-fazenda');
    }
  }, [isOpen, currentCompanyId]);

  // Load target company settings whenever selected company changes
  useEffect(() => {
    if (isOpen && selectedCompanyId && getCompanyDiscordSettings) {
      const settings = getCompanyDiscordSettings(selectedCompanyId);
      setWebhookUrl(settings?.webhookUrl || '');
      setEnabled(settings?.enabled ?? true);
      setAutoCashflow(settings?.autoCashflow ?? true);
      setAutoDeliveries(settings?.autoDeliveries ?? true);
      setAutoPayroll(settings?.autoPayroll ?? true);
      setAutoDeletePrevious(settings?.autoDeletePrevious ?? true);
      setTestStatus(null);
      setSaveStatus(null);
    }
  }, [selectedCompanyId, isOpen]);

  if (!isOpen) return null;

  const targetCompany = (companies && companies.find((c) => c.id === selectedCompanyId)) || currentCompany;
  const isMaster = currentRole === 'master';

  const handleTest = async () => {
    if (!webhookUrl || !webhookUrl.trim().startsWith('https://discord.com/api/webhooks/')) {
      setTestStatus('error');
      setTestError('Por favor, informe uma URL válida de Webhook do Discord (começa com https://discord.com/api/webhooks/...)');
      return;
    }

    setTestStatus('loading');
    setTestError('');

    const res = await testDiscordWebhook(
      webhookUrl.trim(), 
      currentUser?.name || 'Líder', 
      targetCompany?.name || 'Fazenda Pantaneiros'
    );

    if (res.success) {
      setTestStatus('success');
      setTimeout(() => setTestStatus(null), 4000);
    } else {
      setTestStatus('error');
      setTestError(res.error || 'Não foi possível enviar para o Discord. Verifique o link.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');

    try {
      await updateDiscordSettings({
        webhookUrl: webhookUrl.trim(),
        enabled,
        autoCashflow,
        autoDeliveries,
        autoPayroll,
        autoDeletePrevious,
      }, selectedCompanyId);

      setSaveStatus('success');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#fbfaf6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5865F2]/15 text-[#5865F2] flex items-center justify-center font-bold text-lg">
              🎮
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Logs Automáticos no Discord</h3>
              <p className="text-xs text-stone-500">Configuração independente por empresa do grupo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          {/* Company Selector Tabs (Master or Multi-Company) */}
          {companies && companies.length > 1 && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Selecione a Empresa para Configurar:
              </label>
              <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl overflow-x-auto">
                {companies.map((comp) => {
                  const isSelected = comp.id === selectedCompanyId;
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => setSelectedCompanyId(comp.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <span>{comp.icon || '🏢'}</span>
                      <span>{comp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Enterprise Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{targetCompany?.icon || '🏢'}</span>
              <div>
                <span className="font-bold text-stone-900 block">Canal Exclusivo: {targetCompany?.name}</span>
                <span className="text-[11px] text-stone-500">Cada empresa envia seus logs para seu próprio canal no Discord.</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-stone-200/70 text-stone-700 font-mono text-[10px] font-bold">
              {targetCompany?.code || targetCompany?.segment || 'OFICIAL'}
            </span>
          </div>

          {/* Quick Guide */}
          <div className="p-3.5 rounded-2xl bg-[#5865F2]/5 border border-[#5865F2]/15 text-xs text-stone-600 space-y-1">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <span>Como obter a URL do Webhook do Discord:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-stone-600 pl-1 leading-relaxed">
              <li>No Discord da <strong>{targetCompany?.name}</strong>, clique na engrenagem <strong>⚙️ Editar Canal</strong> do canal de logs.</li>
              <li>Vá em <strong>Integrações</strong> &rarr; <strong>Webhooks</strong> &rarr; <strong>Novo Webhook</strong>.</li>
              <li>Clique em <strong>Copiar URL do Webhook</strong> e cole no campo abaixo:</li>
            </ol>
          </div>

          {/* Webhook URL Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              URL do Webhook do Discord ({targetCompany?.name}):
            </label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setTestStatus(null);
              }}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:border-[#5865F2] outline-none font-mono transition-colors"
            />
          </div>

          {/* Test connection button and feedback */}
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testStatus === 'loading'}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-sm transition-all"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{testStatus === 'loading' ? 'Enviando teste...' : `Testar Webhook de ${targetCompany?.name}`}</span>
              </button>

              {testStatus === 'success' && (
                <div className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mensagem enviada com sucesso no Discord!</span>
                </div>
              )}
            </div>

            {testStatus === 'error' && (
              <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{testError}</span>
              </div>
            )}
          </div>

          {/* Notification Automations Checkboxes */}
          <div className="pt-3 border-t border-stone-100 space-y-2.5">
            <span className="text-xs font-bold text-stone-800 block">
              Disparar Mensagens Automaticamente para {targetCompany?.name}:
            </span>

            <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCashflow}
                onChange={(e) => setAutoCashflow(e.target.checked)}
                className="rounded accent-pantanal-700 w-4 h-4"
              />
              <span>🟢 Adições e retiradas no Caixa de {targetCompany?.name} (DOLS)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDeliveries}
                onChange={(e) => setAutoDeliveries(e.target.checked)}
                className="rounded accent-pantanal-700 w-4 h-4"
              />
              <span>🌾 Entregas e confirmações de {targetCompany?.unitLabel || 'produção'}</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPayroll}
                onChange={(e) => setAutoPayroll(e.target.checked)}
                className="rounded accent-pantanal-700 w-4 h-4"
              />
              <span>💰 Fechamento de Lucros e Repasses aos Integrantes</span>
            </label>

            {/* Auto-limpeza: apagar a log anterior assim que a nova surgir */}
            <div className="pt-2 border-t border-stone-100">
              <label className="flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors">
                <input
                  type="checkbox"
                  checked={autoDeletePrevious}
                  onChange={(e) => setAutoDeletePrevious(e.target.checked)}
                  className="rounded accent-pantanal-700 w-4 h-4 mt-0.5 shrink-0"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span>🗑️ Auto-Limpeza de Logs no Discord</span>
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">Recomendado</span>
                  </span>
                  <span className="text-[11px] text-stone-500 mt-0.5">
                    Assim que a nova log surgir no canal, a anterior é apagada automaticamente para não acumular mensagens antigas.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all ${
                saveStatus === 'success'
                  ? 'bg-emerald-600'
                  : saveStatus === 'error'
                  ? 'bg-rose-600'
                  : 'bg-pantanal-700 hover:bg-pantanal-800'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando no Banco de Dados...</span>
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvo para {targetCompany?.name}!</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Erro ao salvar. Tente novamente.</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Configuração ({targetCompany?.name})</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
