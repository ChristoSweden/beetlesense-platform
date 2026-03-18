/**
 * ForestStateCard — Shows forest state at a point in time for a parcel,
 * with tree silhouette visualization that grows/changes with time.
 */

import type { ParcelSnapshot, Species } from '@/hooks/useDigitalTwin';

interface ForestStateCardProps {
  snapshot: ParcelSnapshot;
  baselineSnapshot?: ParcelSnapshot;
  showComparison?: boolean;
}

const SPECIES_LABELS: Record<Species, string> = {
  gran: 'Gran (spruce)',
  tall: 'Tall (pine)',
  björk: 'Björk (birch)',
  ek: 'Ek (oak)',
  bok: 'Bok (beech)',
  douglasgran: 'Douglasgran',
  hybridlärk: 'Hybridlärk',
};

const SPECIES_COLORS: Record<Species, string> = {
  gran: '#22c55e',
  tall: '#16a34a',
  björk: '#a3e635',
  ek: '#65a30d',
  bok: '#4ade80',
  douglasgran: '#06b6d4',
  hybridlärk: '#2dd4bf',
};

function formatSEK(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MSEK`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} kSEK`;
  return `${value} SEK`;
}

function DeltaChip({ current, baseline, unit: _unit, invert }: { current: number; baseline: number; unit: string; invert?: boolean }) {
  const diff = current - baseline;
  if (Math.abs(diff) < 0.5) return null;
  const isPositive = invert ? diff < 0 : diff > 0;
  const pct = baseline > 0 ? Math.round((diff / baseline) * 100) : 0;
  return (
    <span
      className="ml-1.5 text-[9px] font-mono px-1 py-0.5 rounded"
      style={{
        background: isPositive ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
        color: isPositive ? '#4ade80' : '#ef4444',
      }}
    >
      {diff > 0 ? '+' : ''}{pct}%
    </span>
  );
}

// Tree silhouette SVG that changes with age/height
function TreeVisualization({ snapshot }: { snapshot: ParcelSnapshot }) {
  const maxHeight = Math.max(...snapshot.speciesStates.map(s => s.avgHeight));
  const avgAge = snapshot.speciesStates.reduce((s, sp) => s + sp.avgAge * (sp.pct / 100), 0);

  // Scale factor: young trees are small, mature are tall, old growth is wide
  const scale = Math.min(1, maxHeight / 30);
  const trunkWidth = avgAge > 80 ? 8 : avgAge > 40 ? 5 : 3;
  const crownWidth = scale * 40 + 10;
  const treeHeight = scale * 50 + 15;

  // Determine tree shape by dominant species
  const isConifer = ['gran', 'tall', 'douglasgran', 'hybridlärk'].includes(snapshot.dominantSpecies);

  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
      {/* Ground */}
      <ellipse cx="40" cy="75" rx="30" ry="4" fill="rgba(74,222,128,0.1)" />

      {/* Trunk */}
      <rect
        x={40 - trunkWidth / 2}
        y={75 - treeHeight * 0.3}
        width={trunkWidth}
        height={treeHeight * 0.3}
        rx="1"
        fill="#8B6914"
        opacity="0.8"
      />

      {isConifer ? (
        /* Conifer crown (triangle layers) */
        <>
          <polygon
            points={`40,${75 - treeHeight} ${40 - crownWidth * 0.3},${75 - treeHeight * 0.5} ${40 + crownWidth * 0.3},${75 - treeHeight * 0.5}`}
            fill={SPECIES_COLORS[snapshot.dominantSpecies] || '#4ade80'}
            opacity="0.9"
          />
          <polygon
            points={`40,${75 - treeHeight * 0.85} ${40 - crownWidth * 0.4},${75 - treeHeight * 0.35} ${40 + crownWidth * 0.4},${75 - treeHeight * 0.35}`}
            fill={SPECIES_COLORS[snapshot.dominantSpecies] || '#4ade80'}
            opacity="0.7"
          />
          <polygon
            points={`40,${75 - treeHeight * 0.7} ${40 - crownWidth * 0.5},${75 - treeHeight * 0.2} ${40 + crownWidth * 0.5},${75 - treeHeight * 0.2}`}
            fill={SPECIES_COLORS[snapshot.dominantSpecies] || '#4ade80'}
            opacity="0.5"
          />
        </>
      ) : (
        /* Deciduous crown (rounded) */
        <ellipse
          cx="40"
          cy={75 - treeHeight * 0.55}
          rx={crownWidth * 0.5}
          ry={treeHeight * 0.4}
          fill={SPECIES_COLORS[snapshot.dominantSpecies] || '#4ade80'}
          opacity="0.7"
        />
      )}

      {/* Height label */}
      <text x="70" y={75 - treeHeight * 0.5} fill="var(--text3)" fontSize="6" textAnchor="start" fontFamily="monospace">
        {Math.round(maxHeight)}m
      </text>
    </svg>
  );
}

export function ForestStateCard({ snapshot, baselineSnapshot, showComparison: _showComparison }: ForestStateCardProps) {
  const s = snapshot;
  const b = baselineSnapshot;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">{s.parcelName}</h3>
          <span className="text-[10px] font-mono text-[var(--text3)]">{s.year}</span>
        </div>
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
          style={{
            background: s.healthScore >= 70 ? 'rgba(74,222,128,0.15)' : s.healthScore >= 45 ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
            color: s.healthScore >= 70 ? '#4ade80' : s.healthScore >= 45 ? '#fbbf24' : '#ef4444',
          }}
        >
          Hälsa: {s.healthScore}/100
          <span className="ml-1 opacity-60">({Math.round(s.healthConfidence * 100)}% konf.)</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-[100px_1fr] gap-4">
        {/* Tree visualization */}
        <div className="aspect-square">
          <TreeVisualization snapshot={s} />
        </div>

        {/* Metrics */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Metric label="Volym" value={`${s.totalVolumePerHa} m³/ha`}>
              {b && <DeltaChip current={s.totalVolumePerHa} baseline={b.totalVolumePerHa} unit="m³/ha" />}
            </Metric>
            <Metric label="Dominant art" value={SPECIES_LABELS[s.dominantSpecies]} />
            <Metric label="Kol lagrat" value={`${s.carbonPerHa} t/ha`}>
              {b && <DeltaChip current={s.carbonPerHa} baseline={b.carbonPerHa} unit="t/ha" />}
            </Metric>
            <Metric label="Biodiversitet" value={`${(s.biodiversityIndex * 100).toFixed(0)}%`}>
              {b && <DeltaChip current={s.biodiversityIndex} baseline={b.biodiversityIndex} unit="%" />}
            </Metric>
            <Metric label="Virkesvärde" value={formatSEK(s.timberValueSEK)}>
              {b && <DeltaChip current={s.timberValueSEK} baseline={b.timberValueSEK} unit="SEK" />}
            </Metric>
            <Metric label="Växtsäsong" value={`${s.growingSeason} dagar`} />
          </div>
        </div>
      </div>

      {/* Species breakdown */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2">
          {s.speciesStates.filter(sp => sp.pct > 2).map(sp => (
            <div
              key={sp.species}
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${sp.pct}%`,
                background: SPECIES_COLORS[sp.species] || '#4ade80',
                opacity: sp.suitability,
              }}
              title={`${SPECIES_LABELS[sp.species]}: ${sp.pct.toFixed(0)}%, höjd ${sp.avgHeight}m, ålder ${sp.avgAge} år`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {s.speciesStates.filter(sp => sp.pct > 2).map(sp => (
            <span key={sp.species} className="text-[9px] text-[var(--text3)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: SPECIES_COLORS[sp.species] }} />
              {SPECIES_LABELS[sp.species].split(' ')[0]} {sp.pct.toFixed(0)}%
              {sp.suitability < 0.6 && (
                <span className="text-[var(--red)] ml-0.5">!</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Risk indicators */}
      <div className="px-4 pb-3 flex gap-2">
        <RiskPill label="Barkborre" value={s.beetleRisk} />
        <RiskPill label="Storm" value={s.stormRisk} />
        <RiskPill label="Torka" value={s.droughtRisk} />
      </div>
    </div>
  );
}

function Metric({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] text-[var(--text3)] uppercase tracking-wider">{label}</div>
      <div className="text-xs font-mono font-medium text-[var(--text)] flex items-center">
        {value}
        {children}
      </div>
    </div>
  );
}

function RiskPill({ label, value }: { label: string; value: number }) {
  const color = value > 0.6 ? '#ef4444' : value > 0.3 ? '#fbbf24' : '#4ade80';
  const bg = value > 0.6 ? 'rgba(239,68,68,0.1)' : value > 0.3 ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)';
  return (
    <span
      className="text-[9px] font-mono px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      {label}: {(value * 100).toFixed(0)}%
    </span>
  );
}
