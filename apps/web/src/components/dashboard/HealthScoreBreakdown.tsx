import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { HealthScoreBreakdownData, SubScore } from '@/hooks/useForestHealthScore';

// ─── Helpers ───

function getBarColor(value: number): string {
  if (value <= 33) return '#ef4444';
  if (value <= 66) return '#eab308';
  return '#4ade80';
}

function getBarBgColor(value: number): string {
  if (value <= 33) return 'rgba(239, 68, 68, 0.1)';
  if (value <= 66) return 'rgba(234, 179, 8, 0.1)';
  return 'rgba(74, 222, 128, 0.1)';
}

interface SubScoreConfig {
  key: string;
  labelKey: string;
  tooltipKey: string;
}

const SUB_SCORE_ORDER: SubScoreConfig[] = [
  { key: 'vegetationHealth', labelKey: 'health.vegetationHealth', tooltipKey: 'health.vegetationHealthTooltip' },
  { key: 'pestRisk',         labelKey: 'health.pestRisk',         tooltipKey: 'health.pestRiskTooltip' },
  { key: 'speciesDiversity', labelKey: 'health.speciesDiversity', tooltipKey: 'health.speciesDiversityTooltip' },
  { key: 'growthRate',       labelKey: 'health.growthRate',       tooltipKey: 'health.growthRateTooltip' },
  { key: 'soilConditions',   labelKey: 'health.soilConditions',   tooltipKey: 'health.soilConditionsTooltip' },
];

// ─── Sub-score bar ───

interface SubScoreBarProps {
  label: string;
  tooltip: string;
  value: number;
}

function getStatusLabel(value: number): string {
  if (value <= 33) return 'Critical';
  if (value <= 66) return 'At Risk';
  return 'Healthy';
}

function SubScoreBar({ label, tooltip, value }: SubScoreBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = getBarColor(value);
  const statusLabel = getStatusLabel(value);

  return (
    <div className="space-y-1.5" role="group" aria-label={`${label}: ${value} out of 100, ${statusLabel}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--text2)]">{label}</span>
          <button
            type="button"
            className="text-[var(--text3)] hover:text-[var(--text2)] transition-colors relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            aria-label={`Info about ${label}: ${tooltip}`}
          >
            <Info size={12} aria-hidden="true" />
            {showTooltip && (
              <div
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-[10px] leading-relaxed w-52 text-center z-50 shadow-lg border border-[var(--border)]"
                style={{ background: 'var(--bg)' }}
              >
                <span className="text-[var(--text2)]">{tooltip}</span>
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-[var(--border)]"
                  style={{ background: 'var(--bg)', marginTop: '-4px' }}
                  aria-hidden="true"
                />
              </div>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium uppercase tracking-wide" style={{ color }}>
            {statusLabel}
          </span>
          <span className="text-xs font-mono tabular-nums" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: getBarBgColor(value) }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${value}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───

interface HealthScoreBreakdownProps {
  breakdown: HealthScoreBreakdownData;
  isLoading?: boolean;
}

export function HealthScoreBreakdown({ breakdown, isLoading }: HealthScoreBreakdownProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-40 bg-[var(--bg3)] rounded" />
      </div>
    );
  }

  const breakdownMap: Record<string, SubScore> = {
    vegetationHealth: breakdown.vegetationHealth,
    pestRisk: breakdown.pestRisk,
    speciesDiversity: breakdown.speciesDiversity,
    growthRate: breakdown.growthRate,
    soilConditions: breakdown.soilConditions,
  };

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg3)] transition-colors"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-[var(--text)]">
          {t('health.breakdownTitle')}
        </span>
        {expanded ? (
          <ChevronUp size={16} className="text-[var(--text3)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--text3)]" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {SUB_SCORE_ORDER.map((config) => {
            const sub = breakdownMap[config.key];
            return (
              <SubScoreBar
                key={config.key}
                label={t(config.labelKey)}
                tooltip={t(config.tooltipKey)}
                value={sub?.value ?? 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
