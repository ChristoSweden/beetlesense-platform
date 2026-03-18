/**
 * ValueLeakageAnalysis — Bar chart + table showing contract vs spot vs best price per assortment.
 */

import { useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Contract, ValueLeakage } from '@/hooks/useContractAnalysis';
import { formatSEK } from '@/hooks/useContractAnalysis';
import { ASSORTMENTS } from '@/services/timberMarketService';

interface Props {
  contract: Contract;
  leakage: ValueLeakage;
}

// ─── SVG Bar Chart ───

const CHART_W = 680;
const CHART_H = 280;
const PAD = { top: 20, right: 20, bottom: 50, left: 60 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

interface BarTooltip {
  x: number;
  y: number;
  assortment: string;
  contractPrice: number;
  spotPrice: number;
  bestPrice: number;
}

export function ValueLeakageAnalysis({ contract, leakage }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<BarTooltip | null>(null);

  const assortments = leakage.assortmentBreakdown;
  const n = assortments.length;

  // Scale
  const maxPrice = useMemo(
    () => Math.ceil(Math.max(...assortments.map((a) => Math.max(a.contractPrice, a.spotPrice, a.bestPrice))) / 50) * 50 + 50,
    [assortments],
  );

  const yScale = (v: number) => PAD.top + PLOT_H - (v / maxPrice) * PLOT_H;
  const groupWidth = PLOT_W / n;
  const barWidth = Math.min(groupWidth * 0.22, 40);
  const barGap = barWidth * 0.3;

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = Math.ceil(maxPrice / 5 / 50) * 50;
    for (let v = 0; v <= maxPrice; v += step) ticks.push(v);
    return ticks;
  }, [maxPrice]);

  return (
    <div className="space-y-5">
      {/* Headline stat */}
      <div
        className="rounded-xl border border-[var(--red)]/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ background: '#f8717108' }}
      >
        <div className="flex-1">
          <p className="text-xs text-[var(--text3)] mb-1">Förlorat värde senaste 12 mån</p>
          <p className="text-2xl font-mono font-bold text-[var(--red)]">
            {formatSEK(leakage.totalLeakage12Months)}
          </p>
        </div>
        <div className="h-8 w-px bg-[var(--border)] hidden sm:block" />
        <div className="flex-1">
          <p className="text-xs text-[var(--text3)] mb-1">Projicerad förlust återstående avtal</p>
          <p className="text-2xl font-mono font-bold text-[var(--yellow)]">
            {formatSEK(leakage.projectedLeakageRemaining)}
          </p>
        </div>
      </div>

      {/* Bar chart: contract vs spot vs best */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3">
          Prisjämförelse per sortiment — {contract.buyer}
        </h4>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--text3)' }} />
            <span className="text-[var(--text3)]">Avtalspris</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#fbbf24' }} />
            <span className="text-[var(--text3)]">Spotmarknad</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#4ade80' }} />
            <span className="text-[var(--text3)]">Bästa tillgängliga</span>
          </span>
        </div>

        <div className="relative overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="w-full h-auto"
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Grid */}
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  y1={yScale(v)}
                  x2={CHART_W - PAD.right}
                  y2={yScale(v)}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                />
                <text
                  x={PAD.left - 8}
                  y={yScale(v) + 4}
                  textAnchor="end"
                  fill="var(--text3)"
                  fontFamily="monospace"
                  fontSize={10}
                >
                  {v}
                </text>
              </g>
            ))}

            {/* Y-axis label */}
            <text
              x={12}
              y={PAD.top + PLOT_H / 2}
              textAnchor="middle"
              transform={`rotate(-90, 12, ${PAD.top + PLOT_H / 2})`}
              fill="var(--text3)"
              fontFamily="monospace"
              fontSize={10}
            >
              kr/m³fub
            </text>

            {/* Bars */}
            {assortments.map((a, i) => {
              const cx = PAD.left + groupWidth * (i + 0.5);
              const x1 = cx - barWidth * 1.5 - barGap;
              const x2 = cx - barWidth * 0.5;
              const x3 = cx + barWidth * 0.5 + barGap;

              const info = ASSORTMENTS.find((x) => x.id === a.assortment);

              return (
                <g
                  key={a.assortment}
                  onMouseEnter={() =>
                    setTooltip({
                      x: cx,
                      y: PAD.top,
                      assortment: a.nameSv,
                      contractPrice: a.contractPrice,
                      spotPrice: a.spotPrice,
                      bestPrice: a.bestPrice,
                    })
                  }
                >
                  {/* Contract price bar */}
                  <rect
                    x={x1}
                    y={yScale(a.contractPrice)}
                    width={barWidth}
                    height={PLOT_H - (yScale(a.contractPrice) - PAD.top)}
                    fill="var(--text3)"
                    rx={3}
                    opacity={0.6}
                  />
                  {/* Spot price bar */}
                  <rect
                    x={x2}
                    y={yScale(a.spotPrice)}
                    width={barWidth}
                    height={PLOT_H - (yScale(a.spotPrice) - PAD.top)}
                    fill="#fbbf24"
                    rx={3}
                    opacity={0.8}
                  />
                  {/* Best price bar */}
                  <rect
                    x={x3}
                    y={yScale(a.bestPrice)}
                    width={barWidth}
                    height={PLOT_H - (yScale(a.bestPrice) - PAD.top)}
                    fill="#4ade80"
                    rx={3}
                    opacity={0.9}
                  />

                  {/* X-axis label */}
                  <text
                    x={cx}
                    y={CHART_H - 10}
                    textAnchor="middle"
                    fill="var(--text3)"
                    fontFamily="monospace"
                    fontSize={10}
                  >
                    {info?.nameSv ?? a.assortment}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-10 pointer-events-none rounded-lg border border-[var(--border2)] p-3 shadow-lg text-[11px]"
              style={{
                background: 'var(--bg)',
                left: `${(tooltip.x / CHART_W) * 100}%`,
                top: '10px',
                transform: tooltip.x > CHART_W * 0.7 ? 'translateX(-110%)' : 'translateX(10%)',
              }}
            >
              <p className="font-semibold text-[var(--text)] mb-2">{tooltip.assortment}</p>
              <div className="space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text3)]">Avtalspris</span>
                  <span className="font-mono text-[var(--text3)]">{tooltip.contractPrice} kr</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--yellow)]">Spotmarknad</span>
                  <span className="font-mono text-[var(--yellow)]">{tooltip.spotPrice} kr</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--green)]">Bästa pris</span>
                  <span className="font-mono text-[var(--green)]">{tooltip.bestPrice} kr</span>
                </div>
                <div className="border-t border-[var(--border)] pt-1 mt-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-[var(--red)]">Värdeförlust</span>
                    <span className="font-mono text-[var(--red)]">
                      −{tooltip.spotPrice - tooltip.contractPrice} kr/m³
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenario text */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={16} className="text-[var(--yellow)] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)] mb-1">
              Om du hade sålt på spotmarknaden...
            </h4>
            <p className="text-[11px] text-[var(--text3)] leading-relaxed">
              Under de senaste 12 månaderna hade du tjänat{' '}
              <span className="font-mono font-semibold text-[var(--green)]">
                {formatSEK(leakage.totalLeakage12Months)}
              </span>{' '}
              mer genom att sälja till spotmarknadspriser istället för ditt avtal med {contract.buyer}.
              Under återstående avtalstid projiceras ytterligare{' '}
              <span className="font-mono font-semibold text-[var(--yellow)]">
                {formatSEK(leakage.projectedLeakageRemaining)}
              </span>{' '}
              i utebliven intäkt.
            </p>
          </div>
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3">
          Månadsvis uppdelning
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[var(--text3)] text-left">
                <th className="pb-2 font-mono font-medium">Månad</th>
                <th className="pb-2 font-mono font-medium text-right">Avtalsintäkt</th>
                <th className="pb-2 font-mono font-medium text-right">Spotintäkt</th>
                <th className="pb-2 font-mono font-medium text-right">Bästa alt.</th>
                <th className="pb-2 font-mono font-medium text-right">Förlust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {leakage.monthlyBreakdown.map((m) => (
                <tr key={m.month} className="hover:bg-[var(--bg3)]/50">
                  <td className="py-1.5 font-mono text-[var(--text2)]">{m.label}</td>
                  <td className="py-1.5 font-mono text-right text-[var(--text3)]">
                    {m.contractRevenue.toLocaleString('sv-SE')}
                  </td>
                  <td className="py-1.5 font-mono text-right text-[var(--yellow)]">
                    {m.spotRevenue.toLocaleString('sv-SE')}
                  </td>
                  <td className="py-1.5 font-mono text-right text-[var(--green)]">
                    {m.bestRevenue.toLocaleString('sv-SE')}
                  </td>
                  <td className="py-1.5 font-mono text-right text-[var(--red)]">
                    −{m.leakage.toLocaleString('sv-SE')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] font-semibold">
                <td className="pt-2 text-[var(--text)]">Totalt</td>
                <td className="pt-2 text-right font-mono text-[var(--text3)]">
                  {leakage.monthlyBreakdown.reduce((s, m) => s + m.contractRevenue, 0).toLocaleString('sv-SE')}
                </td>
                <td className="pt-2 text-right font-mono text-[var(--yellow)]">
                  {leakage.monthlyBreakdown.reduce((s, m) => s + m.spotRevenue, 0).toLocaleString('sv-SE')}
                </td>
                <td className="pt-2 text-right font-mono text-[var(--green)]">
                  {leakage.monthlyBreakdown.reduce((s, m) => s + m.bestRevenue, 0).toLocaleString('sv-SE')}
                </td>
                <td className="pt-2 text-right font-mono text-[var(--red)]">
                  −{leakage.totalLeakage12Months.toLocaleString('sv-SE')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
