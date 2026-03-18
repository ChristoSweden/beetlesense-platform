import {
  X,
  Leaf,
  TreePine,
  Thermometer,
  Droplets,
  Bug,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Coins,
  BarChart3,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import type { SpeciesProfile as SpeciesProfileType, SuitabilityRating } from '@/hooks/useClimateAdaptation';

interface Props {
  species: SpeciesProfileType;
  timeHorizons: number[];
  onClose: () => void;
}

const RATING_COLORS: Record<SuitabilityRating, string> = {
  excellent: '#10b981',
  good: '#4ade80',
  marginal: '#facc15',
  stressed: '#fb923c',
  unsuitable: '#ef4444',
};

function Sparkline({ species, timeHorizons }: { species: SpeciesProfileType; timeHorizons: number[] }) {
  const scores = timeHorizons.map((y) => species.suitability[y].score);
  const max = 100;
  const min = 0;
  const width = 200;
  const height = 48;
  const padding = 4;

  const points = scores.map((score, i) => {
    const x = padding + (i / (scores.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((score - min) / (max - min)) * (height - 2 * padding);
    return { x, y, score };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
      {/* Grid lines */}
      {[25, 50, 75].map((val) => {
        const y = height - padding - ((val - min) / (max - min)) * (height - 2 * padding);
        return (
          <line key={val} x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeWidth={0.5} />
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--green)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill={RATING_COLORS[species.suitability[timeHorizons[i]].rating]} />
          <text
            x={p.x}
            y={p.y - 7}
            textAnchor="middle"
            className="text-[8px] fill-[var(--text2)]"
            fontFamily="monospace"
          >
            {p.score}
          </text>
        </g>
      ))}

      {/* Year labels */}
      {points.map((p, i) => (
        <text
          key={`label-${i}`}
          x={p.x}
          y={height}
          textAnchor="middle"
          className="text-[7px] fill-[var(--text3)]"
          fontFamily="monospace"
        >
          {timeHorizons[i]}
        </text>
      ))}
    </svg>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-[var(--text3)] mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{label}</div>
        <div className="text-xs text-[var(--text)] mt-0.5 leading-relaxed">{value}</div>
      </div>
    </div>
  );
}

export function SpeciesProfile({ species: sp, timeHorizons, onClose }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--text)]">{sp.nameSwedish}</h3>
            {sp.climateWinner && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400">
                <TrendingUp size={10} />
                Klimatvinnare
              </span>
            )}
            {sp.climateLoser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/15 text-red-400">
                <TrendingDown size={10} />
                Klimatforlorare
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text3)] italic mt-0.5">{sp.nameLatin}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                sp.isNative ? 'bg-blue-500/15 text-blue-300' : 'bg-purple-500/15 text-purple-300'
              }`}
            >
              {sp.isNative ? 'Inhemskt' : 'Introducerat'}
            </span>
            {sp.isRecommended && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--green)]">
                <Award size={10} />
                Rekommenderad
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
          aria-label="Stäng"
        >
          <X size={16} />
        </button>
      </div>

      {/* Sparkline */}
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <div className="text-[10px] text-[var(--text3)] mb-1">Lämplighet 2026 - 2080</div>
        <Sparkline species={sp} timeHorizons={timeHorizons} />
      </div>

      {/* Suitability cards row */}
      <div className="grid grid-cols-4 gap-0 border-b border-[var(--border)]">
        {timeHorizons.map((year) => {
          const suit = sp.suitability[year];
          const color = RATING_COLORS[suit.rating];
          return (
            <div key={year} className="p-3 border-r border-[var(--border)] last:border-r-0 text-center">
              <div className="text-[10px] text-[var(--text3)]">{year}</div>
              <div className="text-lg font-mono font-bold mt-0.5" style={{ color }}>
                {suit.score}
              </div>
              <p className="text-[9px] text-[var(--text3)] mt-1 leading-snug">{suit.explanation}</p>
            </div>
          );
        })}
      </div>

      {/* Details */}
      <div className="px-5 py-3">
        <InfoRow
          icon={<TreePine size={12} />}
          label="Nuvarande prestation"
          value={sp.currentPerformance}
        />
        <InfoRow
          icon={<Thermometer size={12} />}
          label="Temperaturintervall"
          value={sp.tempRange}
        />
        <InfoRow
          icon={<Droplets size={12} />}
          label="Nederbordsbehov"
          value={sp.precipNeeds}
        />
        <InfoRow
          icon={<Leaf size={12} />}
          label="Markpreferens"
          value={sp.soilPreference}
        />
        <InfoRow
          icon={<BarChart3 size={12} />}
          label="Tillväxtprognos under uppvärmning"
          value={sp.growthProjection}
        />
        <InfoRow
          icon={<Coins size={12} />}
          label="Timmervärde & marknad"
          value={`${sp.timberValue} — ${sp.marketDemand}`}
        />
        <InfoRow
          icon={<Bug size={12} />}
          label="Skadegörare & sjukdomar"
          value={sp.pestVulnerabilities}
        />
        <InfoRow
          icon={<ShieldCheck size={12} />}
          label="Riskpoäng"
          value={`${sp.riskScore}/100 — ${sp.riskScore < 35 ? 'Lag risk' : sp.riskScore < 55 ? 'Medel risk' : 'Hög risk'}`}
        />
        <InfoRow
          icon={<Globe size={12} />}
          label="NPV 60 ar"
          value={`${sp.npv60yr.toLocaleString('sv-SE')} SEK/ha`}
        />
        {sp.regulatoryNote && (
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={11} className="text-amber-400" />
              <span className="text-[10px] font-medium text-amber-400">Regelverk</span>
            </div>
            <p className="text-[11px] text-[var(--text3)]">{sp.regulatoryNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
