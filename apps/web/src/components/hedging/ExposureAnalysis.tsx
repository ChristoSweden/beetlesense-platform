/**
 * ExposureAnalysis — Shows unhedged timber value, Value at Risk scenarios,
 * per-assortment exposure breakdown, harvest timeline, volatility indicators,
 * and a visual bar chart of hedged vs unhedged volumes.
 */

import { AlertTriangle, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import type { TimberExposure } from '@/hooks/useTimberHedging';

interface Props {
  exposures: TimberExposure[];
  totalUnhedgedM3: number;
  totalHedgedM3: number;
  totalUnhedgedValueSEK: number;
  valueAtRisk10: number;
  valueAtRisk20: number;
  valueAtRisk30: number;
}

function formatSEK(val: number): string {
  return val.toLocaleString('sv-SE');
}

function VolatilityBadge({ pct }: { pct: number }) {
  const color = pct > 10 ? 'text-red-400 bg-red-400/10' : pct > 7 ? 'text-amber-400 bg-amber-400/10' : 'text-[var(--green)] bg-[var(--green)]/10';
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${color}`}>
      {pct.toFixed(1)}% vol
    </span>
  );
}

export function ExposureAnalysis({
  exposures,
  totalUnhedgedM3,
  totalHedgedM3,
  totalUnhedgedValueSEK,
  valueAtRisk10,
  valueAtRisk20,
  valueAtRisk30,
}: Props) {
  const totalPlanned = totalUnhedgedM3 + totalHedgedM3;
  const hedgedPct = totalPlanned > 0 ? Math.round((totalHedgedM3 / totalPlanned) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Risk warning banner */}
      <div className="rounded-xl border border-amber-500/30 p-4" style={{ background: 'rgba(251,191,36,0.05)' }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-400 mb-1">Prisrisk-exponering</p>
            <p className="text-sm text-[var(--text)]">
              Dina <span className="font-mono font-semibold">{totalUnhedgedM3} m³</span> ohedgat virke
              värderas till <span className="font-mono font-semibold">{formatSEK(totalUnhedgedValueSEK)} SEK</span> vid
              dagens priser. Vid 15% prisfall riskerar du{' '}
              <span className="font-mono font-semibold text-amber-400">
                {formatSEK(Math.round(totalUnhedgedValueSEK * 0.15))} SEK
              </span>{' '}
              i värdeförlust.
            </p>
          </div>
        </div>
      </div>

      {/* Value at Risk cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={14} className="text-[var(--text3)]" />
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">Value at Risk</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '-10% prisfall', value: valueAtRisk10, color: 'text-amber-400' },
            { label: '-20% prisfall', value: valueAtRisk20, color: 'text-orange-400' },
            { label: '-30% prisfall', value: valueAtRisk30, color: 'text-red-400' },
          ].map((scenario) => (
            <div
              key={scenario.label}
              className="rounded-lg border border-[var(--border)] p-3"
              style={{ background: 'var(--bg2)' }}
            >
              <p className="text-[10px] text-[var(--text3)] mb-1">{scenario.label}</p>
              <p className={`text-lg font-mono font-semibold ${scenario.color}`}>
                -{formatSEK(scenario.value)}
              </p>
              <p className="text-[10px] text-[var(--text3)]">SEK</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hedged vs Unhedged bar chart */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-[var(--text3)]" />
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            Hedgad vs ohedgad volym
          </h3>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          {/* Summary bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--text2)]">Total: {totalPlanned} m³</span>
              <span className="text-xs font-mono text-[var(--green)]">{hedgedPct}% skyddad</span>
            </div>
            <div className="h-4 rounded-full bg-[var(--bg3)] overflow-hidden flex">
              <div
                className="h-full bg-[var(--green)] rounded-l-full transition-all duration-500"
                style={{ width: `${hedgedPct}%` }}
              />
              <div
                className="h-full bg-amber-500/40 transition-all duration-500"
                style={{ width: `${100 - hedgedPct}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[var(--green)]" />
                <span className="text-[10px] text-[var(--text3)]">Hedgad ({totalHedgedM3} m³)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/40" />
                <span className="text-[10px] text-[var(--text3)]">Ohedgad ({totalUnhedgedM3} m³)</span>
              </div>
            </div>
          </div>

          {/* Per-assortment bars */}
          <div className="space-y-3">
            {exposures.map((exp) => {
              const hedgedPctLocal = exp.volumeM3 > 0 ? Math.round((exp.hedgedM3 / exp.volumeM3) * 100) : 0;
              return (
                <div key={exp.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--text)]">{exp.label}</span>
                    <div className="flex items-center gap-2">
                      <VolatilityBadge pct={exp.priceVolatilityPct} />
                      <span className="text-[10px] font-mono text-[var(--text3)]">
                        {exp.hedgedM3}/{exp.volumeM3} m³
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--bg3)] overflow-hidden flex">
                    <div
                      className="h-full bg-[var(--green)] transition-all duration-500"
                      style={{ width: `${hedgedPctLocal}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Harvest timeline */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-[var(--text3)]" />
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            Planerade avverkningar
          </h3>
        </div>
        <div className="space-y-2">
          {exposures.map((exp) => {
            const unhedged = exp.volumeM3 - exp.hedgedM3;
            const unhedgedValue = unhedged * exp.spotPriceSEK;
            return (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono text-[var(--text3)] w-16">{exp.estimatedHarvestDate}</div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text)]">{exp.label}</p>
                    <p className="text-[10px] text-[var(--text3)]">
                      {exp.volumeM3} m³ totalt &middot; {exp.spotPriceSEK} SEK/m³
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {unhedged > 0 ? (
                    <>
                      <p className="text-xs font-mono text-amber-400">{unhedged} m³ ohedgat</p>
                      <p className="text-[10px] text-[var(--text3)]">{formatSEK(unhedgedValue)} SEK exponerat</p>
                    </>
                  ) : (
                    <p className="text-xs font-mono text-[var(--green)]">Fullt hedgad</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
