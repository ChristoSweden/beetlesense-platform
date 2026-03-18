import { useTranslation } from 'react-i18next';
import { Shield, Clock, ArrowDown, Coins } from 'lucide-react';
import type { StandRiskResult, MitigationAction } from '@/services/stormRiskService';

interface MitigationPlanProps {
  stands: StandRiskResult[];
}

function getPriorityColor(priority: MitigationAction['priority']): string {
  switch (priority) {
    case 'immediate': return '#ef4444';
    case 'this_season': return '#fbbf24';
    case 'next_5_years': return '#4ade80';
  }
}

function formatSEK(amount: number): string {
  if (amount === 0) return '—';
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MitigationPlan({ stands }: MitigationPlanProps) {
  const { t } = useTranslation();

  // Collect all actions, sorted by priority (immediate first)
  const allActions: { action: MitigationAction; standName: string }[] = [];
  for (const stand of stands) {
    for (const action of stand.mitigationActions) {
      allActions.push({ action, standName: stand.standName });
    }
  }

  const priorityOrder: MitigationAction['priority'][] = ['immediate', 'this_season', 'next_5_years'];
  allActions.sort(
    (a, b) =>
      priorityOrder.indexOf(a.action.priority) - priorityOrder.indexOf(b.action.priority),
  );

  // Group by priority
  const grouped = priorityOrder.map((priority) => ({
    priority,
    items: allActions.filter((a) => a.action.priority === priority),
  }));

  // Totals
  const totalCost = allActions.reduce((sum, a) => sum + a.action.estimatedCostSEK, 0);
  const maxReduction = Math.max(...allActions.map((a) => a.action.riskReductionPercent), 0);

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              {t('storm.mitigation.title')}
            </h3>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {t('storm.mitigation.subtitle')}
            </p>
          </div>
          <Shield size={16} className="text-[var(--green)]" />
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-[var(--text)]">{allActions.length}</p>
          <p className="text-[9px] text-[var(--text3)] uppercase">{t('storm.mitigation.actions')}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-[var(--text)]">{formatSEK(totalCost)}</p>
          <p className="text-[9px] text-[var(--text3)] uppercase">{t('storm.mitigation.totalCost')}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold font-mono text-[var(--green)]">-{maxReduction}%</p>
          <p className="text-[9px] text-[var(--text3)] uppercase">{t('storm.mitigation.maxReduction')}</p>
        </div>
      </div>

      {/* Action groups */}
      <div className="px-4 py-3 space-y-4">
        {grouped.map(({ priority, items }) => {
          if (items.length === 0) return null;
          const prColor = getPriorityColor(priority);

          return (
            <div key={priority}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={12} style={{ color: prColor }} />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: prColor }}
                >
                  {t(`storm.mitigation.priority.${priority}`)}
                </span>
              </div>

              <div className="space-y-2">
                {items.map(({ action, standName }) => (
                  <div
                    key={action.id}
                    className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-[var(--text)]">
                        {action.action}
                      </p>
                    </div>
                    <p className="text-[10px] text-[var(--text3)] mb-2 leading-relaxed">
                      {action.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg2)] border border-[var(--border)] text-[var(--text3)]">
                        {standName}
                      </span>
                      {action.estimatedCostSEK > 0 && (
                        <div className="flex items-center gap-1">
                          <Coins size={10} className="text-[var(--text3)]" />
                          <span className="text-[10px] text-[var(--text2)] font-mono">
                            {formatSEK(action.estimatedCostSEK)}
                          </span>
                        </div>
                      )}
                      {action.riskReductionPercent > 0 && (
                        <div className="flex items-center gap-1">
                          <ArrowDown size={10} className="text-[var(--green)]" />
                          <span className="text-[10px] text-[var(--green)] font-mono">
                            -{action.riskReductionPercent}% {t('storm.mitigation.risk')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
