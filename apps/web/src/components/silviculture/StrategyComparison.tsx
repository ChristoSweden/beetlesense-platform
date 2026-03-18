/**
 * StrategyComparison — Side-by-side comparison of 4 silviculture strategies.
 *
 * Stacked area chart of income sources, NPV comparison, risk/biodiversity/carbon
 * metrics with winner badges per metric.
 */

import { useState } from 'react';
import {
  Trophy,
  Shield,
  Leaf,
  Cloud,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import type {
  StrategyId,
  Strategy,
  StrategyProjection,
  IncomeSource,
} from '@/hooks/useSilviculture';

interface Props {
  strategies: Strategy[];
  projections: Record<StrategyId, StrategyProjection>;
  selectedStrategy: StrategyId;
  onSelectStrategy: (id: StrategyId) => void;
  winners: {
    highestNPV: StrategyId;
    lowestRisk: StrategyId;
    bestBiodiversity: StrategyId;
    bestCarbon: StrategyId;
    mostStable: StrategyId;
    fastestIncome: StrategyId;
  };
}

function formatSEK(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function WinnerBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[var(--green)]/15 text-[var(--green)] px-1.5 py-0.5 rounded-full">
      <Trophy size={10} />
      {label}
    </span>
  );
}

function MiniStackedChart({ timeline, color }: { timeline: IncomeSource[]; color: string }) {
  // Aggregate into 5-year buckets
  const buckets: { year: number; timber: number; carbon: number; other: number }[] = [];
  for (let i = 0; i < 50; i += 5) {
    const slice = timeline.slice(i, i + 5);
    const timber = slice.reduce((s, v) => s + v.timber, 0);
    const carbon = slice.reduce((s, v) => s + v.carbon, 0);
    const other = slice.reduce((s, v) => s + v.subsidies + v.hunting + v.recreation + v.water + v.stormProtection, 0);
    buckets.push({ year: i + 5, timber, carbon, other });
  }

  const maxTotal = Math.max(...buckets.map(b => b.timber + b.carbon + b.other), 1);

  return (
    <div className="flex items-end gap-0.5 h-16 mt-2">
      {buckets.map((b, i) => {
        const total = b.timber + b.carbon + b.other;
        const h = (total / maxTotal) * 100;
        const timberH = total > 0 ? (b.timber / total) * h : 0;
        const carbonH = total > 0 ? (b.carbon / total) * h : 0;
        const otherH = h - timberH - carbonH;

        return (
          <div
            key={i}
            className="flex-1 flex flex-col justify-end rounded-t-sm overflow-hidden"
            style={{ height: '100%' }}
            title={`Year ${b.year}: ${formatSEK(total)} SEK`}
          >
            <div className="flex flex-col justify-end" style={{ height: `${h}%` }}>
              {otherH > 0 && (
                <div style={{ height: `${(otherH / h) * 100}%`, background: '#a78bfa', opacity: 0.6 }} />
              )}
              {carbonH > 0 && (
                <div style={{ height: `${(carbonH / h) * 100}%`, background: '#4ade80', opacity: 0.7 }} />
              )}
              {timberH > 0 && (
                <div style={{ height: `${(timberH / h) * 100}%`, background: color, opacity: 0.9 }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StrategyComparison({
  strategies,
  projections,
  selectedStrategy,
  onSelectStrategy,
  winners,
}: Props) {
  const [expandedCard, setExpandedCard] = useState<StrategyId | null>(null);

  const winnerLabels: Record<string, { id: StrategyId; label: string; icon: React.ReactNode }> = {
    highestNPV: { id: winners.highestNPV, label: 'Highest NPV', icon: <TrendingUp size={12} /> },
    lowestRisk: { id: winners.lowestRisk, label: 'Lowest Risk', icon: <Shield size={12} /> },
    bestBiodiversity: { id: winners.bestBiodiversity, label: 'Best Biodiversity', icon: <Leaf size={12} /> },
    bestCarbon: { id: winners.bestCarbon, label: 'Best Climate', icon: <Cloud size={12} /> },
    mostStable: { id: winners.mostStable, label: 'Most Stable', icon: <Shield size={12} /> },
    fastestIncome: { id: winners.fastestIncome, label: 'Fastest Income', icon: <Clock size={12} /> },
  };

  function getBadgesForStrategy(sid: StrategyId) {
    return Object.entries(winnerLabels)
      .filter(([, v]) => v.id === sid)
      .map(([k, v]) => <WinnerBadge key={k} label={v.label} />);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Strategy Comparison</h2>
        <span className="text-[10px] text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
          50-year projection
        </span>
      </div>

      {/* Chart legend */}
      <div className="flex items-center gap-4 mb-3 text-[10px] text-[var(--text3)]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[var(--text2)]" /> Timber
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[var(--green)]" /> Carbon
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-purple-400 opacity-60" /> Other
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {strategies.map((strat) => {
          const proj = projections[strat.id];
          const badges = getBadgesForStrategy(strat.id);
          const isSelected = selectedStrategy === strat.id;
          const isExpanded = expandedCard === strat.id;

          return (
            <button
              key={strat.id}
              onClick={() => onSelectStrategy(strat.id)}
              className={`text-left rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--border2)]'
              }`}
              style={{ background: isSelected ? undefined : 'var(--bg2)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{strat.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text)]">{strat.nameSv}</p>
                    <p className="text-[10px] text-[var(--text3)]">{strat.name}</p>
                  </div>
                </div>
                <div
                  className="w-2 h-2 rounded-full mt-1"
                  style={{ background: strat.color }}
                />
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {badges}
                </div>
              )}

              {/* Mini chart */}
              <MiniStackedChart timeline={proj.incomeTimeline} color={strat.color} />
              <div className="flex justify-between text-[9px] text-[var(--text3)] mt-0.5 px-0.5">
                <span>Yr 5</span>
                <span>25</span>
                <span>50</span>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Total NPV</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {formatSEK(proj.totalNPV)} <span className="text-[9px] font-normal">SEK</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">NPV/ha</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {formatSEK(proj.npvPerHa)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Avg/ha/yr</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {formatSEK(proj.avgAnnualPerHa)}
                  </p>
                </div>
              </div>

              {/* Score bars */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text3)] w-16">Risk</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${proj.riskScore * 10}%`,
                        background: proj.riskScore <= 3 ? '#4ade80' : proj.riskScore <= 6 ? '#fbbf24' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text2)] w-6 text-right">{proj.riskScore}/10</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text3)] w-16">Biodiversity</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full bg-[var(--green)]"
                      style={{ width: `${proj.biodiversityScore * 10}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text2)] w-6 text-right">{proj.biodiversityScore}/10</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text3)] w-16">CO2 stored</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{ width: `${Math.min((proj.carbonStorage / 350) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text2)] w-8 text-right">{proj.carbonStorage}t</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text3)] w-16">Stability</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full bg-purple-400"
                      style={{ width: `${proj.incomeStability}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text2)] w-8 text-right">{proj.incomeStability}%</span>
                </div>
              </div>

              {/* Expand/collapse details */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCard(isExpanded ? null : strat.id);
                }}
                className="flex items-center gap-1 mt-3 text-[10px] text-[var(--text3)] hover:text-[var(--green)] transition-colors"
              >
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {isExpanded ? 'Less details' : 'More details'}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2 text-[11px] text-[var(--text2)]">
                  <p>{strat.descriptionSv}</p>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                    <Info size={10} />
                    <span>Rekommenderas av: {strat.recommendedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text3)]">Harvest method:</span>
                    <span className="text-[10px]">{strat.harvestMethodSv}</span>
                  </div>
                  {strat.rotationYears && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text3)]">Rotation:</span>
                      <span className="text-[10px]">{strat.rotationYears[0]}-{strat.rotationYears[1]} years</span>
                    </div>
                  )}
                  <p className="italic text-[10px] text-[var(--green)]">&ldquo;{strat.taglineSv}&rdquo;</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary insight */}
      <div className="mt-4 p-3 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5">
        <p className="text-xs text-[var(--text)]">
          <span className="font-semibold text-[var(--green)]">Key insight:</span>{' '}
          {winners.highestNPV === 'conservation' || winners.highestNPV === 'ccf'
            ? 'Alternative management strategies outperform industrial clearcut when total ecosystem value is included. The forest industry only counts timber — you should count everything.'
            : 'Even when timber-focused strategies score highest on NPV, the gap narrows dramatically when carbon credits, biodiversity subsidies, and ecosystem services are included.'}
        </p>
      </div>
    </div>
  );
}
