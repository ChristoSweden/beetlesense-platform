import { useMemo, memo } from 'react';
import {
  AlertTriangle,
  Shield,
  Thermometer,
  Droplets,
  Flame,
  Bird,
  Satellite,
  TreePine,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { getSwarmingRiskDemo } from '@/services/swarmingProbabilityModel';

/**
 * ThreatFusionCard — the "Forest OS" signature component.
 *
 * Shows converging multi-source intelligence with financial impact.
 * Instead of "beetle risk in Zone 4B", it says:
 * "Timber at risk: 1.2M SEK — act within 10 days"
 *
 * Signal convergence from 6+ independent sources is what produces
 * 94% confidence rather than 60%. This card makes that visible.
 */

// ─── Types ───

interface ConvergingSignal {
  id: string;
  source: string;
  icon: typeof AlertTriangle;
  status: 'clear' | 'elevated' | 'critical';
  value: string;
  detail: string;
}

interface ThreatAssessment {
  headline: string;
  subheadline: string;
  timberAtRiskSEK: number;
  daysToAct: number;
  confidencePct: number;
  convergingSignals: ConvergingSignal[];
  overallStatus: 'clear' | 'watch' | 'warning' | 'critical';
  recommendation: string;
}

// ─── Helpers ───

function formatSEK(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M kr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k kr`;
  return `${Math.round(value)} kr`;
}

const STATUS_COLORS: Record<string, string> = {
  clear: '#4ade80',
  elevated: '#fbbf24',
  critical: '#ef4444',
  watch: '#f97316',
  warning: '#f97316',
};

// ─── Assessment Builder ───

function buildThreatAssessment(): ThreatAssessment {
  const swarming = getSwarmingRiskDemo();

  // Build converging signals from all available data sources
  const signals: ConvergingSignal[] = [
    {
      id: 'degree-days',
      source: 'SMHI Weather',
      icon: Thermometer,
      status: swarming.overallScore >= 60 ? 'critical' : swarming.overallScore >= 35 ? 'elevated' : 'clear',
      value: `${swarming.factors.find(f => f.name === 'Degree-Days')?.value ?? 0} DD`,
      detail: 'Accumulated heat units toward swarming threshold',
    },
    {
      id: 'drought',
      source: 'ERA5 Soil Moisture',
      icon: Droplets,
      status: swarming.factors.find(f => f.name === 'Drought Stress')?.status === 'danger' ? 'critical'
        : swarming.factors.find(f => f.name === 'Drought Stress')?.status === 'warning' ? 'elevated' : 'clear',
      value: `${swarming.factors.find(f => f.name === 'Drought Stress')?.value ?? 0}mm deficit`,
      detail: 'Precipitation deficit weakens tree defenses',
    },
    {
      id: 'fire',
      source: 'NASA FIRMS',
      icon: Flame,
      status: 'clear',
      value: '0 fires',
      detail: 'No post-fire stress volatiles in area',
    },
    {
      id: 'woodpecker',
      source: 'GBIF/eBird',
      icon: Bird,
      status: 'elevated',
      value: '14 obs/wk',
      detail: 'Three-toed woodpecker activity above baseline — biological proxy for beetle presence',
    },
    {
      id: 'sar',
      source: 'Sentinel-1 SAR',
      icon: Satellite,
      status: 'clear',
      value: '0.62 coherence',
      detail: 'Radar coherence stable — no canopy disruption detected',
    },
    {
      id: 'ndvi',
      source: 'Sentinel-2 NDVI',
      icon: TreePine,
      status: 'elevated',
      value: '0.68 NDVI',
      detail: 'Vegetation index declining in NE sector (−0.04 vs last pass)',
    },
  ];

  // Count agreeing elevated/critical signals
  const elevatedCount = signals.filter(s => s.status !== 'clear').length;
  const criticalCount = signals.filter(s => s.status === 'critical').length;

  // Confidence increases with signal convergence
  const baseConfidence = 0.55;
  const convergenceBonus = elevatedCount * 0.07;
  const confidence = Math.min(0.97, baseConfidence + convergenceBonus);

  // Financial impact calculation
  const baseTimberValue = 3_450_000; // SEK for demo parcel
  const riskFraction = swarming.overallScore >= 60 ? 0.35 : swarming.overallScore >= 40 ? 0.15 : 0.05;
  const timberAtRisk = Math.round(baseTimberValue * riskFraction);

  // Overall status
  let overallStatus: ThreatAssessment['overallStatus'] = 'clear';
  if (criticalCount >= 2) overallStatus = 'critical';
  else if (elevatedCount >= 3) overallStatus = 'warning';
  else if (elevatedCount >= 1) overallStatus = 'watch';

  // Time-to-act from swarming window
  const daysToAct = Math.max(0, swarming.daysUntilSwarm - 7); // need 7 days buffer

  // Financial headline
  const headline = overallStatus === 'critical'
    ? `Timber at risk: ${formatSEK(timberAtRisk)}`
    : overallStatus === 'warning'
    ? `${formatSEK(timberAtRisk)} exposure — ${elevatedCount} signals converging`
    : overallStatus === 'watch'
    ? `Monitoring: ${elevatedCount} signal${elevatedCount > 1 ? 's' : ''} elevated`
    : 'All clear — forest performing well';

  const subheadline = overallStatus !== 'clear'
    ? `${elevatedCount} of ${signals.length} independent sources detect elevated risk`
    : `${signals.length} data sources monitoring — no threats detected`;

  // Actionable recommendation
  const recommendations: Record<string, string> = {
    critical: `Schedule thermal drone survey within ${Math.min(daysToAct, 7)} days. Prepare sanitation harvesting plan for affected zones. Estimated salvage value: ${formatSEK(timberAtRisk * 0.6)}.`,
    warning: `Deploy pheromone traps in spruce stands. Schedule drone inspection within ${daysToAct} days. Early intervention preserves ${formatSEK(timberAtRisk * 0.85)} in timber value.`,
    watch: 'Continue automated monitoring. Next satellite pass in 3 days will update NDVI baseline.',
    clear: 'No action needed. Your forest is growing at 3.2% annually, adding ~110k SEK in timber value per year.',
  };

  return {
    headline,
    subheadline,
    timberAtRiskSEK: timberAtRisk,
    daysToAct,
    confidencePct: Math.round(confidence * 100),
    convergingSignals: signals,
    overallStatus,
    recommendation: recommendations[overallStatus],
  };
}

// ─── Component ───

export const ThreatFusionCard = memo(function ThreatFusionCard() {
  const assessment = useMemo(() => buildThreatAssessment(), []);
  const statusColor = STATUS_COLORS[assessment.overallStatus] ?? '#4ade80';

  return (
    <div
      className="rounded-xl border-2 p-4"
      style={{
        background: 'var(--bg2)',
        borderColor: assessment.overallStatus === 'clear' ? 'var(--border)' : `${statusColor}40`,
      }}
    >
      {/* Header — financial headline */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {assessment.overallStatus !== 'clear' ? (
              <AlertTriangle size={18} style={{ color: statusColor }} />
            ) : (
              <Shield size={18} style={{ color: statusColor }} />
            )}
            <span
              className="text-base font-bold"
              style={{ color: assessment.overallStatus === 'clear' ? 'var(--text)' : statusColor }}
            >
              {assessment.headline}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text3)]">
            {assessment.subheadline}
          </p>
        </div>
        {assessment.daysToAct > 0 && assessment.overallStatus !== 'clear' && (
          <div className="text-right ml-3">
            <div className="flex items-center gap-1">
              <Clock size={12} style={{ color: statusColor }} />
              <span className="text-sm font-bold font-mono" style={{ color: statusColor }}>
                {assessment.daysToAct}d
              </span>
            </div>
            <span className="text-[9px] text-[var(--text3)]">to act</span>
          </div>
        )}
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-[var(--text3)]">Signal convergence</span>
          <span className="text-[10px] font-mono font-semibold" style={{ color: statusColor }}>
            {assessment.confidencePct}% confidence
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg)] border border-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${assessment.confidencePct}%`,
              background: `linear-gradient(90deg, ${statusColor}80, ${statusColor})`,
            }}
          />
        </div>
      </div>

      {/* Converging signals grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {assessment.convergingSignals.map((signal) => {
          const Icon = signal.icon;
          const color = STATUS_COLORS[signal.status] ?? '#4ade80';
          return (
            <div
              key={signal.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 border border-[var(--border)]"
              style={{ background: signal.status !== 'clear' ? `${color}06` : 'var(--bg)' }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                style={{ background: `${color}15` }}
              >
                <Icon size={10} style={{ color }} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-[var(--text3)] block truncate">{signal.source}</span>
                <span className="text-[10px] font-mono font-semibold text-[var(--text)]">{signal.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      <div
        className="rounded-lg p-2.5 border"
        style={{
          background: `${statusColor}06`,
          borderColor: `${statusColor}25`,
        }}
      >
        <div className="flex items-start gap-2">
          <TrendingUp size={12} style={{ color: statusColor, flexShrink: 0, marginTop: 2 }} />
          <p className="text-[11px] text-[var(--text2)] leading-relaxed">
            {assessment.recommendation}
          </p>
        </div>
      </div>

      <p className="text-[8px] text-[var(--text3)] mt-2 text-center">
        Forest OS — {assessment.convergingSignals.length} independent data sources fused in real time
      </p>
    </div>
  );
});
