import { useTranslation } from 'react-i18next';
import { ArrowRight, Sparkles, TrendingUp, TrendingDown, ShieldAlert, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ScenarioResult } from '@/services/scenarioEngine';

interface ComparisonSummaryProps {
  result: ScenarioResult;
}

export function ComparisonSummary({ result }: ComparisonSummaryProps) {
  const { t } = useTranslation();

  const years = result.baseline.length - 1;
  const baselineEnd = result.baseline[years];
  const actionEnd = result.action[years];
  const baselineStart = result.baseline[0];

  // Calculate deltas
  const valueDelta = actionEnd.timberValue - baselineEnd.timberValue;
  const healthDelta = actionEnd.health - baselineEnd.health;
  const riskDelta = actionEnd.beetleRisk - baselineEnd.beetleRisk;
  const bioDelta = actionEnd.biodiversity - baselineEnd.biodiversity;
  const _carbonDelta = actionEnd.carbonSeq - baselineEnd.carbonSeq;

  // Baseline self-comparison (what changes if you do nothing)
  const baselineValueChange = baselineEnd.timberValue - baselineStart.timberValue;

  const formatSEK = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M kr`;
    if (abs >= 1_000) return `${Math.round(v / 1_000)}\u00A0000 kr`;
    return `${v} kr`;
  };

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('scenarios.comparisonTitle')}
        </h3>
        <p className="text-xs text-[var(--text3)] mt-0.5">
          {t('scenarios.comparisonSubtitle', { years })}
        </p>
      </div>

      {/* Side-by-side panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
        {/* Do Nothing panel */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider">
              {t('scenarios.doNothing')}
            </span>
          </div>

          <div className="space-y-3">
            <MetricRow
              icon={<TrendingDown size={14} />}
              label={t('scenarios.metrics.timberValue')}
              value={formatSEK(baselineEnd.timberValue)}
              delta={formatSEK(baselineValueChange)}
              positive={baselineValueChange >= 0}
            />
            <MetricRow
              icon={<ShieldAlert size={14} />}
              label={t('scenarios.metrics.health')}
              value={`${baselineEnd.health}/100`}
              delta={`${baselineEnd.health - baselineStart.health}`}
              positive={baselineEnd.health >= baselineStart.health}
            />
            <MetricRow
              icon={<ShieldAlert size={14} />}
              label={t('scenarios.metrics.beetleRisk')}
              value={`${baselineEnd.beetleRisk}%`}
              delta={`+${baselineEnd.beetleRisk - baselineStart.beetleRisk}`}
              positive={false}
            />
            <MetricRow
              icon={<Leaf size={14} />}
              label={t('scenarios.metrics.biodiversity')}
              value={`${baselineEnd.biodiversity}/100`}
              delta={`${baselineEnd.biodiversity - baselineStart.biodiversity}`}
              positive={baselineEnd.biodiversity >= baselineStart.biodiversity}
            />
          </div>
        </div>

        {/* Take Action panel */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
            <span className="text-xs font-semibold text-[#4ade80] uppercase tracking-wider">
              {t('scenarios.takeAction')}
            </span>
          </div>

          <div className="space-y-3">
            <MetricRow
              icon={<TrendingUp size={14} />}
              label={t('scenarios.metrics.timberValue')}
              value={formatSEK(actionEnd.timberValue)}
              delta={`${valueDelta >= 0 ? '+' : ''}${formatSEK(valueDelta)} ${t('scenarios.vsBaseline')}`}
              positive={valueDelta >= 0}
            />
            <MetricRow
              icon={<ShieldAlert size={14} />}
              label={t('scenarios.metrics.health')}
              value={`${actionEnd.health}/100`}
              delta={`${healthDelta >= 0 ? '+' : ''}${healthDelta} ${t('scenarios.vsBaseline')}`}
              positive={healthDelta >= 0}
            />
            <MetricRow
              icon={<ShieldAlert size={14} />}
              label={t('scenarios.metrics.beetleRisk')}
              value={`${actionEnd.beetleRisk}%`}
              delta={`${riskDelta >= 0 ? '+' : ''}${riskDelta} ${t('scenarios.vsBaseline')}`}
              positive={riskDelta <= 0}
            />
            <MetricRow
              icon={<Leaf size={14} />}
              label={t('scenarios.metrics.biodiversity')}
              value={`${actionEnd.biodiversity}/100`}
              delta={`${bioDelta >= 0 ? '+' : ''}${bioDelta} ${t('scenarios.vsBaseline')}`}
              positive={bioDelta >= 0}
            />
          </div>
        </div>
      </div>

      {/* Summary message */}
      <div className="px-5 py-4 border-t border-[var(--border)]" style={{ background: 'var(--bg)' }}>
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          {t(result.summaryKey, result.summaryParams)}
        </p>
      </div>

      {/* CTA */}
      <div className="px-5 py-4 border-t border-[var(--border)]">
        <Link
          to="/owner/dashboard"
          onClick={() => {
            // Signal to open companion panel with scenario context
            sessionStorage.setItem('beetlesense-companion-context', JSON.stringify({
              type: 'scenario',
              scenarioId: result.scenarioId,
            }));
          }}
          className="
            inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
            bg-[var(--green)]/10 border border-[var(--green)]/20
            text-sm font-medium text-[var(--green)]
            hover:bg-[var(--green)]/15 transition-colors
          "
        >
          <Sparkles size={16} />
          {t('scenarios.talkToAi')}
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ─── MetricRow ───

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  positive: boolean;
}

function MetricRow({ icon, label, value, delta, positive }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[var(--text3)]">{icon}</span>
        <span className="text-xs text-[var(--text2)]">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-mono font-semibold text-[var(--text)]">{value}</span>
        <span className={`block text-[10px] font-mono ${positive ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
          {delta}
        </span>
      </div>
    </div>
  );
}
