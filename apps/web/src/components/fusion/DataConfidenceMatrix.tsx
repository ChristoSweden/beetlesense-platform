import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, AlertTriangle, X, Layers, Info } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DataConfidenceMatrix — Spatial confidence grid showing where
   multiple data sources agree or disagree about risk assessment
   across different forest zones.
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ───────────────────────────────────────────────────────────────

type RiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'none';
type Consensus = 'agreement' | 'partial' | 'conflict';

interface SourceAssessment {
  sourceId: string;
  sourceName: string;
  riskLevel: RiskLevel;
  confidence: number; // 0-1
  lastUpdated: string; // relative time like "2h ago"
}

export interface ZoneAssessment {
  zoneId: string;
  zoneName: string;
  sources: SourceAssessment[];
  consensus: Consensus;
  fusedRisk: number; // 0-100 final fused score
  fusedConfidence: number; // 0-1
}

export interface DataConfidenceMatrixProps {
  zones: ZoneAssessment[];
  sources: string[]; // ordered list of source names for column headers
  onZoneSelect?: (zoneId: string) => void;
  selectedZone?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: 'var(--risk-high)',
  high: '#f97316',
  moderate: 'var(--risk-mid)',
  low: 'var(--risk-low)',
  none: 'var(--text3)',
};

/** Raw hex fallbacks for SVG fill where CSS vars may not resolve */
const RISK_COLORS_RAW: Record<RiskLevel, string> = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#f59e0b',
  low: '#10b981',
  none: '#6b7280',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  none: 'None',
};

const CONSENSUS_META: Record<Consensus, { label: string; color: string }> = {
  agreement: { label: 'Agreement', color: 'var(--risk-low)' },
  partial: { label: 'Partial', color: 'var(--risk-mid)' },
  conflict: { label: 'Conflict', color: 'var(--risk-high)' },
};

function riskBarColor(score: number): string {
  if (score >= 75) return RISK_COLORS_RAW.critical;
  if (score >= 50) return RISK_COLORS_RAW.high;
  if (score >= 25) return RISK_COLORS_RAW.moderate;
  return RISK_COLORS_RAW.low;
}

// ─── Tooltip Component ──────────────────────────────────────────────────

function CellTooltip({ source }: { source: SourceAssessment }) {
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 px-3 py-2 rounded-lg border border-[var(--border)] shadow-xl whitespace-nowrap pointer-events-none"
      style={{ backgroundColor: 'var(--bg)', fontFamily: 'var(--font-main)' }}
    >
      <p className="text-[11px] font-semibold text-[var(--text)] mb-1">
        {source.sourceName}
      </p>
      <p className="text-[10px] text-[var(--text2)]">
        Risk:{' '}
        <span className="font-semibold" style={{ color: RISK_COLORS[source.riskLevel] }}>
          {RISK_LABELS[source.riskLevel]}
        </span>
      </p>
      <p className="text-[10px] text-[var(--text2)]">
        Confidence:{' '}
        <span className="font-semibold text-[var(--text)]">
          {Math.round(source.confidence * 100)}%
        </span>
      </p>
      <p className="text-[10px] text-[var(--text3)]">
        Updated: {source.lastUpdated}
      </p>
      {/* Arrow */}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid var(--bg)',
        }}
      />
    </div>
  );
}

// ─── Risk Circle Cell ───────────────────────────────────────────────────

function RiskCell({ source }: { source: SourceAssessment | undefined }) {
  const [hovered, setHovered] = useState(false);

  if (!source) {
    return (
      <td className="px-2 py-2 text-center">
        <span className="text-[var(--text3)] text-[10px]">--</span>
      </td>
    );
  }

  const isNone = source.riskLevel === 'none';
  const color = RISK_COLORS[source.riskLevel];

  return (
    <td
      className="px-2 py-2 text-center relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="inline-flex flex-col items-center gap-1">
        {/* Risk circle */}
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r="6"
            fill={isNone ? 'transparent' : color}
            stroke={color}
            strokeWidth={isNone ? 1.5 : 0}
          />
        </svg>
        {/* Confidence micro-bar */}
        <div
          className="rounded-full overflow-hidden"
          style={{
            width: 20,
            height: 3,
            backgroundColor: 'var(--bg3)',
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${source.confidence * 100}%`,
              backgroundColor: color,
              opacity: 0.7,
            }}
          />
        </div>
      </div>
      {hovered && <CellTooltip source={source} />}
    </td>
  );
}

// ─── Consensus Icon ─────────────────────────────────────────────────────

function ConsensusIcon({ consensus }: { consensus: Consensus }) {
  const meta = CONSENSUS_META[consensus];

  if (consensus === 'agreement') {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full"
        style={{ color: meta.color, animation: 'dcm-fade-in 0.5s ease-out' }}
        aria-label="Agreement"
      >
        <Check size={16} strokeWidth={2.5} />
      </span>
    );
  }
  if (consensus === 'partial') {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full"
        style={{ color: meta.color }}
        aria-label="Partial agreement"
      >
        <AlertTriangle size={15} strokeWidth={2} />
      </span>
    );
  }
  // conflict
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full"
      style={{ color: meta.color, animation: 'dcm-pulse 2.5s ease-in-out infinite' }}
      aria-label="Conflict"
    >
      <X size={16} strokeWidth={2.5} />
    </span>
  );
}

// ─── Fused Risk Bar ─────────────────────────────────────────────────────

function FusedRiskBar({
  score,
  confidence,
}: {
  score: number;
  confidence: number;
}) {
  const barColor = riskBarColor(score);

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-1.5">
        <div
          className="relative rounded-full overflow-hidden"
          style={{ width: 80, height: 8, backgroundColor: 'var(--bg3)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
            }}
          />
        </div>
        <span
          className="text-xs font-bold tabular-nums"
          style={{
            color: barColor,
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {score}
        </span>
      </div>
      <span className="text-[10px] text-[var(--text3)] tabular-nums">
        conf. {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────

function MatrixLegend() {
  const { t } = useTranslation();
  const riskEntries: { level: RiskLevel; label: string; filled: boolean }[] = [
    { level: 'critical', label: t('dataConfidenceMatrix.legend.critical', 'Critical'), filled: true },
    { level: 'high', label: t('dataConfidenceMatrix.legend.high', 'High'), filled: true },
    { level: 'moderate', label: t('dataConfidenceMatrix.legend.moderate', 'Moderate'), filled: true },
    { level: 'low', label: t('dataConfidenceMatrix.legend.low', 'Low'), filled: true },
    { level: 'none', label: t('dataConfidenceMatrix.legend.none', 'None'), filled: false },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {riskEntries.map(({ level, label, filled }) => (
        <span key={level} className="inline-flex items-center gap-1 text-[10px] text-[var(--text3)]">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <circle
              cx="5"
              cy="5"
              r="4"
              fill={filled ? RISK_COLORS[level] : 'transparent'}
              stroke={RISK_COLORS[level]}
              strokeWidth={filled ? 0 : 1.5}
            />
          </svg>
          {label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text3)] ml-2">
        <span className="inline-block rounded-full" style={{ width: 20, height: 3, background: 'var(--text3)', opacity: 0.5 }} />
        {t('dataConfidenceMatrix.legend.confidenceBar', 'Confidence')}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function DataConfidenceMatrix({
  zones,
  sources,
  onZoneSelect,
  selectedZone,
}: DataConfidenceMatrixProps) {
  const { t } = useTranslation();

  const handleRowClick = useCallback(
    (zoneId: string) => {
      onZoneSelect?.(zoneId);
    },
    [onZoneSelect],
  );

  // ─── Summary stats ───
  const { agreementCount, highestConflictZone } = useMemo(() => {
    let agreeCount = 0;
    let worstConflict: ZoneAssessment | null = null;

    for (const zone of zones) {
      if (zone.consensus === 'agreement') agreeCount++;
      if (
        zone.consensus === 'conflict' &&
        (!worstConflict || zone.fusedRisk > worstConflict.fusedRisk)
      ) {
        worstConflict = zone;
      }
      // Also consider "partial" as potential conflict target if no explicit conflict
      if (
        zone.consensus === 'partial' &&
        !worstConflict &&
        (!worstConflict || zone.fusedRisk > (worstConflict?.fusedRisk ?? 0))
      ) {
        worstConflict = zone;
      }
    }

    return {
      agreementCount: agreeCount,
      highestConflictZone: worstConflict,
    };
  }, [zones]);

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes dcm-fade-in {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes dcm-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>

      <div
        className="rounded-xl bg-[var(--bg2)] border border-[var(--border)] overflow-hidden"
        style={{ fontFamily: 'var(--font-main)' }}
      >
        {/* ─── Header ─── */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3
                className="text-lg font-semibold text-[var(--text)]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {t('dataConfidenceMatrix.title', 'Source Agreement Matrix')}
              </h3>
              <p className="text-xs text-[var(--text3)] mt-1">
                {t(
                  'dataConfidenceMatrix.subtitle',
                  'Where data sources agree, confidence is highest',
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text3)]">
              <Layers size={14} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {sources.length} {t('dataConfidenceMatrix.sources', 'sources')}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3">
            <MatrixLegend />
          </div>
        </div>

        {/* ─── Matrix Table ─── */}
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse"
            role="grid"
            aria-label={t('dataConfidenceMatrix.ariaLabel', 'Source agreement matrix')}
          >
            <thead>
              <tr
                className="border-t border-b border-[var(--border)]"
                style={{ backgroundColor: 'var(--bg3)' }}
              >
                {/* Zone name header */}
                <th
                  className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)] whitespace-nowrap"
                  scope="col"
                >
                  {t('dataConfidenceMatrix.zone', 'Zone')}
                </th>
                {/* Source columns */}
                {sources.map((source) => (
                  <th
                    key={source}
                    className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]"
                    scope="col"
                  >
                    <span className="inline-block md:whitespace-nowrap dcm-col-header">
                      {source}
                    </span>
                  </th>
                ))}
                {/* Consensus column */}
                <th
                  className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)] whitespace-nowrap"
                  scope="col"
                >
                  {t('dataConfidenceMatrix.consensus', 'Consensus')}
                </th>
                {/* Fused risk column */}
                <th
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)] whitespace-nowrap"
                  scope="col"
                >
                  {t('dataConfidenceMatrix.fusedRisk', 'Fused Risk')}
                </th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => {
                const isSelected = selectedZone === zone.zoneId;
                return (
                  <tr
                    key={zone.zoneId}
                    className="border-b border-[var(--border)] cursor-pointer transition-colors duration-150 hover:bg-[var(--bg3)]"
                    style={{
                      height: 56,
                      backgroundColor: isSelected ? 'var(--bg3)' : undefined,
                      borderLeft: isSelected
                        ? '3px solid var(--green)'
                        : '3px solid transparent',
                    }}
                    onClick={() => handleRowClick(zone.zoneId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(zone.zoneId);
                      }
                    }}
                    tabIndex={0}
                    role="row"
                    aria-selected={isSelected}
                  >
                    {/* Zone name */}
                    <td className="px-4 py-2">
                      <span
                        className="text-sm font-medium text-[var(--text)] whitespace-nowrap"
                        title={zone.zoneName}
                      >
                        {zone.zoneName}
                      </span>
                    </td>

                    {/* Source cells */}
                    {sources.map((sourceName) => {
                      const sourceData = zone.sources.find(
                        (s) => s.sourceName === sourceName,
                      );
                      return (
                        <RiskCell key={sourceName} source={sourceData} />
                      );
                    })}

                    {/* Consensus */}
                    <td className="px-3 py-2 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <ConsensusIcon consensus={zone.consensus} />
                        <span
                          className="text-[9px] font-medium"
                          style={{
                            color: CONSENSUS_META[zone.consensus].color,
                          }}
                        >
                          {CONSENSUS_META[zone.consensus].label}
                        </span>
                      </div>
                    </td>

                    {/* Fused risk */}
                    <td className="px-3 py-2">
                      <FusedRiskBar
                        score={zone.fusedRisk}
                        confidence={zone.fusedConfidence}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── Bottom Summary ─── */}
        <div
          className="px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--border)]"
          style={{ backgroundColor: 'var(--bg3)' }}
        >
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text2)]">
            <Check size={13} style={{ color: 'var(--risk-low)' }} />
            {t('dataConfidenceMatrix.agreementSummary', 'Sources in agreement on {{count}} of {{total}} zones', {
              count: agreementCount,
              total: zones.length,
            })}
          </span>

          {highestConflictZone && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text2)]">
              <Info size={13} style={{ color: 'var(--risk-mid)' }} />
              {t(
                'dataConfidenceMatrix.conflictSummary',
                'Highest conflict: {{zone}} — recommend drone verification',
                { zone: highestConflictZone.zoneName },
              )}
            </span>
          )}
        </div>
      </div>

      {/* ─── Responsive column header rotation ─── */}
      <style>{`
        @media (max-width: 768px) {
          .dcm-col-header {
            writing-mode: vertical-rl;
            transform: rotate(225deg);
            display: inline-block;
            font-size: 9px;
            max-width: 1.2em;
            line-height: 1.2;
          }
        }
      `}</style>
    </>
  );
}

// ─── Demo Data ──────────────────────────────────────────────────────────

export const DEMO_SOURCES = [
  'Sentinel-2',
  'SMHI',
  'Skogsstyrelsen',
  'NASA FIRMS',
  'ForestWard',
  'Community',
];

export const DEMO_ZONES: ZoneAssessment[] = [
  {
    zoneId: 'ns-nw',
    zoneName: 'Norra Skiftet \u2014 NW',
    sources: [
      { sourceId: 'sentinel', sourceName: 'Sentinel-2', riskLevel: 'low', confidence: 0.89, lastUpdated: '6h ago' },
      { sourceId: 'smhi', sourceName: 'SMHI', riskLevel: 'low', confidence: 0.94, lastUpdated: '1h ago' },
      { sourceId: 'skogsstyrelsen', sourceName: 'Skogsstyrelsen', riskLevel: 'low', confidence: 0.87, lastUpdated: '12h ago' },
      { sourceId: 'firms', sourceName: 'NASA FIRMS', riskLevel: 'none', confidence: 0.92, lastUpdated: '3h ago' },
      { sourceId: 'forestward', sourceName: 'ForestWard', riskLevel: 'low', confidence: 0.81, lastUpdated: '1d ago' },
      { sourceId: 'community', sourceName: 'Community', riskLevel: 'none', confidence: 0.45, lastUpdated: '3d ago' },
    ],
    consensus: 'agreement',
    fusedRisk: 12,
    fusedConfidence: 0.88,
  },
  {
    zoneId: 'ek-sr',
    zoneName: 'Ekbacken \u2014 South Ridge',
    sources: [
      { sourceId: 'sentinel', sourceName: 'Sentinel-2', riskLevel: 'moderate', confidence: 0.72, lastUpdated: '6h ago' },
      { sourceId: 'smhi', sourceName: 'SMHI', riskLevel: 'high', confidence: 0.91, lastUpdated: '1h ago' },
      { sourceId: 'skogsstyrelsen', sourceName: 'Skogsstyrelsen', riskLevel: 'critical', confidence: 0.94, lastUpdated: '4h ago' },
      { sourceId: 'firms', sourceName: 'NASA FIRMS', riskLevel: 'none', confidence: 0.92, lastUpdated: '3h ago' },
      { sourceId: 'forestward', sourceName: 'ForestWard', riskLevel: 'high', confidence: 0.85, lastUpdated: '8h ago' },
      { sourceId: 'community', sourceName: 'Community', riskLevel: 'critical', confidence: 0.88, lastUpdated: '2h ago' },
    ],
    consensus: 'partial',
    fusedRisk: 78,
    fusedConfidence: 0.87,
  },
  {
    zoneId: 'ek-es',
    zoneName: 'Ekbacken \u2014 East Slope',
    sources: [
      { sourceId: 'sentinel', sourceName: 'Sentinel-2', riskLevel: 'moderate', confidence: 0.68, lastUpdated: '6h ago' },
      { sourceId: 'smhi', sourceName: 'SMHI', riskLevel: 'moderate', confidence: 0.90, lastUpdated: '1h ago' },
      { sourceId: 'skogsstyrelsen', sourceName: 'Skogsstyrelsen', riskLevel: 'high', confidence: 0.78, lastUpdated: '12h ago' },
      { sourceId: 'firms', sourceName: 'NASA FIRMS', riskLevel: 'none', confidence: 0.92, lastUpdated: '3h ago' },
      { sourceId: 'forestward', sourceName: 'ForestWard', riskLevel: 'moderate', confidence: 0.82, lastUpdated: '1d ago' },
      { sourceId: 'community', sourceName: 'Community', riskLevel: 'moderate', confidence: 0.65, lastUpdated: '1d ago' },
    ],
    consensus: 'partial',
    fusedRisk: 52,
    fusedConfidence: 0.79,
  },
  {
    zoneId: 'ns-se',
    zoneName: 'Norra Skiftet \u2014 SE',
    sources: [
      { sourceId: 'sentinel', sourceName: 'Sentinel-2', riskLevel: 'low', confidence: 0.91, lastUpdated: '6h ago' },
      { sourceId: 'smhi', sourceName: 'SMHI', riskLevel: 'moderate', confidence: 0.88, lastUpdated: '1h ago' },
      { sourceId: 'skogsstyrelsen', sourceName: 'Skogsstyrelsen', riskLevel: 'low', confidence: 0.85, lastUpdated: '12h ago' },
      { sourceId: 'firms', sourceName: 'NASA FIRMS', riskLevel: 'none', confidence: 0.92, lastUpdated: '3h ago' },
      { sourceId: 'forestward', sourceName: 'ForestWard', riskLevel: 'low', confidence: 0.79, lastUpdated: '1d ago' },
      { sourceId: 'community', sourceName: 'Community', riskLevel: 'none', confidence: 0.30, lastUpdated: '5d ago' },
    ],
    consensus: 'agreement',
    fusedRisk: 22,
    fusedConfidence: 0.84,
  },
  {
    zoneId: 'tm-c',
    zoneName: 'Tallmon \u2014 Central',
    sources: [
      { sourceId: 'sentinel', sourceName: 'Sentinel-2', riskLevel: 'none', confidence: 0.93, lastUpdated: '6h ago' },
      { sourceId: 'smhi', sourceName: 'SMHI', riskLevel: 'low', confidence: 0.95, lastUpdated: '1h ago' },
      { sourceId: 'skogsstyrelsen', sourceName: 'Skogsstyrelsen', riskLevel: 'none', confidence: 0.90, lastUpdated: '12h ago' },
      { sourceId: 'firms', sourceName: 'NASA FIRMS', riskLevel: 'none', confidence: 0.92, lastUpdated: '3h ago' },
      { sourceId: 'forestward', sourceName: 'ForestWard', riskLevel: 'none', confidence: 0.88, lastUpdated: '2d ago' },
      { sourceId: 'community', sourceName: 'Community', riskLevel: 'none', confidence: 0.55, lastUpdated: '4d ago' },
    ],
    consensus: 'agreement',
    fusedRisk: 5,
    fusedConfidence: 0.92,
  },
  {
    zoneId: 'ns-sw',
    zoneName: 'Norra Skiftet \u2014 SW',
    sources: [
      { sourceId: 'sentinel', sourceName: 'Sentinel-2', riskLevel: 'high', confidence: 0.84, lastUpdated: '6h ago' },
      { sourceId: 'smhi', sourceName: 'SMHI', riskLevel: 'moderate', confidence: 0.90, lastUpdated: '1h ago' },
      { sourceId: 'skogsstyrelsen', sourceName: 'Skogsstyrelsen', riskLevel: 'high', confidence: 0.91, lastUpdated: '4h ago' },
      { sourceId: 'firms', sourceName: 'NASA FIRMS', riskLevel: 'none', confidence: 0.92, lastUpdated: '3h ago' },
      { sourceId: 'forestward', sourceName: 'ForestWard', riskLevel: 'moderate', confidence: 0.77, lastUpdated: '1d ago' },
      { sourceId: 'community', sourceName: 'Community', riskLevel: 'high', confidence: 0.82, lastUpdated: '6h ago' },
    ],
    consensus: 'partial',
    fusedRisk: 68,
    fusedConfidence: 0.86,
  },
  {
    zoneId: 'tm-n',
    zoneName: 'Tallmon \u2014 North Edge',
    sources: [
      { sourceId: 'sentinel', sourceName: 'Sentinel-2', riskLevel: 'low', confidence: 0.88, lastUpdated: '6h ago' },
      { sourceId: 'smhi', sourceName: 'SMHI', riskLevel: 'low', confidence: 0.92, lastUpdated: '1h ago' },
      { sourceId: 'skogsstyrelsen', sourceName: 'Skogsstyrelsen', riskLevel: 'moderate', confidence: 0.70, lastUpdated: '2d ago' },
      { sourceId: 'firms', sourceName: 'NASA FIRMS', riskLevel: 'none', confidence: 0.92, lastUpdated: '3h ago' },
      { sourceId: 'forestward', sourceName: 'ForestWard', riskLevel: 'low', confidence: 0.83, lastUpdated: '1d ago' },
      { sourceId: 'community', sourceName: 'Community', riskLevel: 'low', confidence: 0.40, lastUpdated: '7d ago' },
    ],
    consensus: 'agreement',
    fusedRisk: 18,
    fusedConfidence: 0.82,
  },
  {
    zoneId: 'ek-w',
    zoneName: 'Ekbacken \u2014 West Valley',
    sources: [
      { sourceId: 'sentinel', sourceName: 'Sentinel-2', riskLevel: 'low', confidence: 0.60, lastUpdated: '3d ago' },
      { sourceId: 'smhi', sourceName: 'SMHI', riskLevel: 'high', confidence: 0.93, lastUpdated: '1h ago' },
      { sourceId: 'skogsstyrelsen', sourceName: 'Skogsstyrelsen', riskLevel: 'moderate', confidence: 0.75, lastUpdated: '1d ago' },
      { sourceId: 'firms', sourceName: 'NASA FIRMS', riskLevel: 'none', confidence: 0.92, lastUpdated: '3h ago' },
      { sourceId: 'forestward', sourceName: 'ForestWard', riskLevel: 'high', confidence: 0.86, lastUpdated: '8h ago' },
      { sourceId: 'community', sourceName: 'Community', riskLevel: 'critical', confidence: 0.90, lastUpdated: '4h ago' },
    ],
    consensus: 'conflict',
    fusedRisk: 61,
    fusedConfidence: 0.72,
  },
];

export default DataConfidenceMatrix;
