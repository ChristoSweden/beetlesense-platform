import { getIntegrationStatuses, getDataMode, type IntegrationStatus as IntStatus } from '@/lib/dataMode';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Key, Radio } from 'lucide-react';

const STATUS_STYLES: Record<IntStatus['status'], { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  live: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle2 },
  ready: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Key },
  mock: { bg: 'bg-[var(--text3)]/10', text: 'text-[var(--text3)]', icon: AlertCircle },
};

const STATUS_LABELS: Record<IntStatus['status'], string> = {
  live: 'Connected',
  ready: 'Ready (key needed)',
  mock: 'Demo data',
};

export function IntegrationStatusPanel() {
  const { t } = useTranslation();
  const integrations = getIntegrationStatuses();
  const mode = getDataMode();

  const liveCount = integrations.filter((i) => i.status === 'live').length;
  const total = integrations.length;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio size={18} className="text-[var(--green)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t('settings.integrations', 'Data Integrations')}
            </h3>
            <p className="text-xs text-[var(--text3)]">
              {t('settings.dataMode', 'Data mode')}: <span className="font-medium text-[var(--text2)]">{mode}</span>
              {' · '}{liveCount}/{total} {t('settings.connected', 'connected')}
            </p>
          </div>
        </div>
      </div>

      {/* Integration list */}
      <div className="divide-y divide-[var(--border)]">
        {integrations.map((integration) => {
          const style = STATUS_STYLES[integration.status];
          const Icon = style.icon;

          return (
            <div
              key={integration.id}
              className="flex items-center gap-4 px-5 py-3"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${style.bg}`}>
                <Icon size={16} className={style.text} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {integration.name}
                </p>
                <p className="text-xs text-[var(--text3)] truncate">
                  {integration.description}
                </p>
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${style.text} flex-shrink-0`}>
                {STATUS_LABELS[integration.status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default IntegrationStatusPanel;
