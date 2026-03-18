import { useTranslation } from 'react-i18next';
import { X, Mountain, TreePine, Ruler, Layers, Trees, Axe } from 'lucide-react';
import type { StandRiskResult, RiskFactors } from '@/services/stormRiskService';
import { getRiskColor, classifyRisk } from '@/services/stormRiskService';

interface RiskBreakdownProps {
  stand: StandRiskResult;
  onClose: () => void;
}

const FACTOR_ICONS: Record<keyof RiskFactors, React.ReactNode> = {
  terrainExposure: <Mountain size={14} />,
  edgeEffect: <Trees size={14} />,
  heightDiameterRatio: <Ruler size={14} />,
  soilAnchoring: <Layers size={14} />,
  speciesVulnerability: <TreePine size={14} />,
  recentThinning: <Axe size={14} />,
};

const FACTOR_KEYS: (keyof RiskFactors)[] = [
  'terrainExposure',
  'edgeEffect',
  'heightDiameterRatio',
  'soilAnchoring',
  'speciesVulnerability',
  'recentThinning',
];

function RadarChart({ factors }: { factors: RiskFactors }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 75;
  const levels = 5;

  // 6 axes
  const angleStep = (Math.PI * 2) / 6;
  const values = FACTOR_KEYS.map((k) => factors[k]);

  // Grid rings
  const gridRings = Array.from({ length: levels }, (_, i) => {
    const r = (maxRadius / levels) * (i + 1);
    const pts = FACTOR_KEYS.map((_, j) => {
      const angle = j * angleStep - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    return pts;
  });

  // Data polygon
  const dataPts = values.map((v, j) => {
    const r = (v / 10) * maxRadius;
    const angle = j * angleStep - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  // Axis lines
  const axisLines = FACTOR_KEYS.map((_, j) => {
    const angle = j * angleStep - Math.PI / 2;
    return {
      x: cx + maxRadius * Math.cos(angle),
      y: cy + maxRadius * Math.sin(angle),
    };
  });

  // Labels
  const labelPositions = FACTOR_KEYS.map((_, j) => {
    const angle = j * angleStep - Math.PI / 2;
    const labelR = maxRadius + 18;
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto">
      {/* Grid rings */}
      {gridRings.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="var(--border)"
          strokeWidth={i === levels - 1 ? 1 : 0.5}
          opacity={0.5}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((pt, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={pt.x}
          y2={pt.y}
          stroke="var(--border)"
          strokeWidth={0.5}
          opacity={0.5}
        />
      ))}

      {/* Data polygon */}
      <polygon
        points={dataPts}
        fill="rgba(239, 68, 68, 0.15)"
        stroke="#ef4444"
        strokeWidth={2}
      />

      {/* Data points */}
      {values.map((v, j) => {
        const r = (v / 10) * maxRadius;
        const angle = j * angleStep - Math.PI / 2;
        return (
          <circle
            key={j}
            cx={cx + r * Math.cos(angle)}
            cy={cy + r * Math.sin(angle)}
            r={3}
            fill="#ef4444"
          />
        );
      })}

      {/* Value labels */}
      {labelPositions.map((pt, j) => (
        <text
          key={j}
          x={pt.x}
          y={pt.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-[var(--text3)]"
          fontSize={9}
          fontFamily="monospace"
        >
          {values[j]}
        </text>
      ))}
    </svg>
  );
}

export function RiskBreakdown({ stand, onClose }: RiskBreakdownProps) {
  const { t } = useTranslation();
  const riskColor = getRiskColor(stand.classification);

  function getPlainLanguage(): string {
    switch (stand.classification) {
      case 'critical':
        return t('storm.breakdown.meaningCritical');
      case 'high':
        return t('storm.breakdown.meaningHigh');
      case 'moderate':
        return t('storm.breakdown.meaningModerate');
      case 'low':
        return t('storm.breakdown.meaningLow');
    }
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {stand.standName}
          </h3>
          <p className="text-[10px] text-[var(--text3)]">
            {stand.parcelName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold font-mono"
              style={{ color: riskColor }}
            >
              {stand.overallScore}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
              style={{ color: riskColor, background: `${riskColor}15` }}
            >
              {t(`storm.risk.${stand.classification}`)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={16} className="text-[var(--text3)]" />
          </button>
        </div>
      </div>

      {/* Radar chart */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
          {t('storm.breakdown.riskProfile')}
        </p>
        <RadarChart factors={stand.factors} />
      </div>

      {/* Factor list */}
      <div className="px-4 pb-3 space-y-2">
        {FACTOR_KEYS.map((key) => {
          const value = stand.factors[key];
          const factorClassification = classifyRisk(value * 10);
          const factorColor = getRiskColor(factorClassification);

          return (
            <div
              key={key}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
            >
              <div
                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ color: factorColor, background: `${factorColor}15` }}
              >
                {FACTOR_ICONS[key]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--text)]">
                    {t(`storm.factors.${key}`)}
                  </span>
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: factorColor }}
                  >
                    {value}/10
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                  {stand.explanations[key]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* What this means */}
      <div className="px-4 pb-4">
        <div
          className="p-3 rounded-lg border"
          style={{ borderColor: `${riskColor}40`, background: `${riskColor}08` }}
        >
          <p className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-1">
            {t('storm.breakdown.whatThisMeans')}
          </p>
          <p className="text-xs text-[var(--text2)] leading-relaxed">
            {getPlainLanguage()}
          </p>
        </div>
      </div>
    </div>
  );
}
