import React, { useState } from 'react';
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
  CheckCircle2 
} from 'lucide-react';

export function DiscordSettingsModal({ isOpen, onClose }) {
  const { discordSettings, updateDiscordSettings, currentUser } = useFarm();

  const [webhookUrl, setWebhookUrl] = useState(discordSettings?.webhookUrl || '');
  const [enabled, setEnabled] = useState(discordSettings?.enabled ?? true);
  const [autoCashflow, setAutoCashflow] = useState(discordSettings?.autoCashflow ?? true);
  const [autoDeliveries, setAutoDeliveries] = useState(discordSettings?.autoDeliveries ?? true);
  const [autoPayroll, setAutoPayroll] = useState(discordSettings?.autoPayroll ?? true);

  const [testStatus, setTestStatus] = useState(null); // 'loading' | 'success' | 'error' | null
  const [testError, setTestError] = useState('');

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!webhookUrl || !webhookUrl.trim().startsWith('https://discord.com/api/webhooks/')) {
      setTestStatus('error');
      setTestError('Por favor, informe uma URL válida de Webhook do Discord (começa com https://discord.com/api/webhooks/...)');
      return;
    }

    setTestStatus('loading');
    setTestError('');

    const res = await testDiscordWebhook(webhookUrl.trim(), currentUser.name);

    if (res.success) {
      setTestStatus('success');
      setTimeout(() => setTestStatus(null), 4000);
    } else {
      setTestStatus('error');
      setTestError(res.error || 'Não foi possível enviar para o Discord. Verifique o link.');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();

    updateDiscordSettings({
      webhookUrl: webhookUrl.trim(),
      enabled,
      autoCashflow,
      autoDeliveries,
      autoPayroll,
    });

    onClose();
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
              <h3 className="text-base font-bold text-stone-900">Integração de Logs com o Discord</h3>
              <p className="text-xs text-stone-500">Envie lançamentos de caixa e entregas direto pro canal do Discord</p>
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
          
          {/* Quick Guide */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-600 space-y-1.5">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <span>Como pegar o link do Webhook no seu Discord:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-stone-600 pl-1 leading-relaxed">
              <li>No Discord, clique na engrenagem <strong>⚙️ Editar Canal</strong> do canal de logs.</li>
              <li>Vá em <strong>Integrações</strong> &rarr; <strong>Webhooks</strong> &rarr; <strong>Novo Webhook</strong>.</li>
              <li>Clique em <strong>Copiar URL do Webhook</strong> e cole no campo abaixo:</li>
            </ol>
          </div>

          {/* Webhook URL Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              URL do Webhook do Discord:
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
                <span>{testStatus === 'loading' ? 'Enviando teste...' : 'Enviar Mensagem de Teste'}</span>
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
              Disparar Mensagens Automaticamente:
            </span>

            <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCashflow}
                onChange={(e) => setAutoCashflow(e.target.checked)}
                className="rounded accent-pantanal-700 w-4 h-4"
              />
              <span>🟢 Adições e retiradas no Caixa da Fazenda (valores em DOLS)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDeliveries}
                onChange={(e) => setAutoDeliveries(e.target.checked)}
                className="rounded accent-pantanal-700 w-4 h-4"
              />
              <span>🌾 Entregas e confirmações de sacas de milho dos produtores</span>
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
              className="flex-1 py-2.5 px-4 rounded-xl bg-pantanal-700 hover:bg-pantanal-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Configuração do Discord</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
