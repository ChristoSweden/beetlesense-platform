import { useState } from 'react';
import { ArrowUpDown, Award, Crown, TrendingDown } from 'lucide-react';
import type { SpeciesProfile, SuitabilityRating, SortKey } from '@/hooks/useClimateAdaptation';

interface Props {
  species: SpeciesProfile[];
  timeHorizons: number[];
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  onSelectSpecies: (id: string) => void;
}

const RATING_COLORS: Record<SuitabilityRating, { bg: string; text: string; label: string }> = {
  excellent:   { bg: 'bg-emerald-500/25', text: 'text-emerald-400', label: 'Utmärkt' },
  good:        { bg: 'bg-green-500/20',   text: 'text-green-400',   label: 'Bra' },
  marginal:    { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  label: 'Marginell' },
  stressed:    { bg: 'bg-orange-500/20',  text: 'text-orange-400',  label: 'Stressad' },
  unsuitable:  { bg: 'bg-red-500/20',     text: 'text-red-400',     label: 'Olämplig' },
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'current', label: 'Nuläge' },
  { key: 'future2060', label: '2060' },
  { key: 'economic', label: 'Ekonomi' },
  { key: 'risk', label: 'Risk' },
];

function SuitabilityCell({
  score,
  onHover,
}: {
  score: { rating: SuitabilityRating; score: number; explanation: string };
  onHover: (explanation: string | null) => void;
}) {
  const colors = RATING_COLORS[score.rating];
  return (
    <td
      className={`px-2 py-2.5 text-center cursor-default ${colors.bg}`}
      onMouseEnter={() => onHover(score.explanation)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={`text-sm font-mono font-semibold ${colors.text}`}>{score.score}</div>
      <div className={`text-[10px] ${colors.text} opacity-70`}>{colors.label}</div>
    </td>
  );
}

export function SpeciesSuitabilityMatrix({ species, timeHorizons, sortKey, onSortChange, onSelectSpecies }: Props) {
  const [hoveredExplanation, setHoveredExplanation] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Artlämplighet per tidshorisont</h3>
          <p className="text-xs text-[var(--text3)] mt-0.5">12 trädslag, 4 klimatscenarier</p>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={12} className="text-[var(--text3)]" />
          <span className="text-[10px] text-[var(--text3)] mr-1">Sortera:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSortChange(opt.key)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                sortKey === opt.key
                  ? 'bg-[var(--green)]/15 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredExplanation && (
        <div className="px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg3)]">
          <p className="text-xs text-[var(--text2)]">{hoveredExplanation}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider w-48">
                Trädslag
              </th>
              {timeHorizons.map((year) => (
                <th
                  key={year}
                  className="text-center px-2 py-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider"
                >
                  {year}
                </th>
              ))}
              <th className="text-center px-3 py-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">
                Trend
              </th>
              <th className="text-right px-4 py-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">
                NPV 60 år
              </th>
            </tr>
          </thead>
          <tbody>
            {species.map((sp) => (
              <tr
                key={sp.id}
                onClick={() => onSelectSpecies(sp.id)}
                className={`border-b border-[var(--border)]/50 cursor-pointer transition-colors hover:bg-[var(--bg3)] ${
                  sp.isCurrentDominant ? 'bg-[var(--bg3)]/50' : ''
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[var(--text)]">{sp.nameSwedish}</span>
                        {sp.isCurrentDominant && (
                          <Crown size={11} className="text-amber-400 flex-shrink-0" aria-label="Nuvarande dominant" />
                        )}
                        {sp.isRecommended && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded bg-[var(--green)]/15 text-[var(--green)]">
                            <Award size={9} />
                            Rekommenderad
                          </span>
                        )}
                        {sp.climateLoser && (
                          <TrendingDown size={11} className="text-red-400 flex-shrink-0" aria-label="Klimatförlorare" />
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text3)] italic">{sp.nameLatin}</div>
                    </div>
                  </div>
                </td>
                {timeHorizons.map((year) => (
                  <SuitabilityCell key={year} score={sp.suitability[year]} onHover={setHoveredExplanation} />
                ))}
                <td className="text-center px-3 py-2.5">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      sp.trend === 'strongly_increasing'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : sp.trend === 'increasing'
                          ? 'bg-green-500/15 text-green-400'
                          : sp.trend === 'stable'
                            ? 'bg-blue-500/15 text-blue-300'
                            : sp.trend === 'declining'
                              ? 'bg-orange-500/15 text-orange-400'
                              : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {sp.trendLabel}
                  </span>
                </td>
                <td className="text-right px-4 py-2.5 font-mono text-[var(--text2)]">
                  {(sp.npv60yr / 1000).toFixed(0)}k
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-[var(--border)] flex items-center gap-4 flex-wrap">
        {Object.entries(RATING_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${val.bg}`} />
            <span className="text-[10px] text-[var(--text3)]">{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
