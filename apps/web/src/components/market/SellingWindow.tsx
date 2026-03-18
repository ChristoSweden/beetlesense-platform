/**
 * SellingWindow — 13-week forward price forecast visualization.
 *
 * Shows recommended sell/wait/hold signals per week with historical
 * seasonal pattern overlay and current inventory value estimates.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import {
  useTimberMarket,
  TIMBER_ASSORTMENTS,
  type TimberAssortment,
  type SellingWindowWeek,
} from '@/hooks/useTimberMarket';

const SIGNAL_CONFIG = {
  sell: { label: 'Salj', labelEn: 'Sell', color: '#4ade80', bg: 'bg-[var(--green)]/15' },
  wait: { label: 'Vanta', labelEn: 'Wait', color: '#fbbf24', bg: 'bg-yellow-500/15' },
  hold: { label: 'Avvakta', labelEn: 'Hold', color: '#f87171', bg: 'bg-red-500/15' },
};

// Bar chart dimensions
const CHART_W = 780;
const CHART_H = 200;
const BAR_PAD = 4;

interface SellingWindowProps {
  sellingWindow?: SellingWindowWeek[];
  inventoryM3?: number;
}

export function SellingWindow({ sellingWindow: externalWindow, inventoryM3 = 250 }: SellingWindowProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const market = useTimberMarket();
  const weeks = externalWindow ?? market.sellingWindow;

  const [selectedAssortment, setSelectedAssortment] = useState<TimberAssortment>('talltimmer');
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  const _assortmentMeta = TIMBER_ASSORTMENTS.find((a) => a.id === selectedAssortment)!;

  // Price range for the chart
  const { min, max, barData } = useMemo(() => {
    const values = weeks.map((w) => w.forecasts[selectedAssortment]);
    const min = Math.min(...values) - 20;
    const max = Math.max(...values) + 20;
    return {
      min,
      max,
      barData: weeks.map((w, i) => ({
        ...w,
        price: w.forecasts[selectedAssortment],
        idx: i,
      })),
    };
  }, [weeks, selectedAssortment]);

  // Best week
  const bestWeek = useMemo(() => {
    let best = barData[0];
    for (const b of barData) {
      if (b.price > best.price) best = b;
    }
    return best;
  }, [barData]);

  // Inventory value range
  const minValue = Math.min(...barData.map((b) => b.price)) * inventoryM3;
  const maxValue = Math.max(...barData.map((b) => b.price)) * inventoryM3;
  const valueDiff = maxValue - minValue;

  const barWidth = (CHART_W - 40) / barData.length - BAR_PAD;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[var(--green)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {lang === 'sv' ? 'Saljfonster — Optimal forsakjningstid' : 'Selling Window — Optimal Timing'}
              </h3>
              <p className="text-[10px] text-[var(--text3)]">
                {lang === 'sv' ? '13 veckors prognos baserad pa sasongsmonster' : '13-week forecast based on seasonal patterns'}
              </p>
            </div>
          </div>

          {/* Assortment selector */}
          <div className="flex gap-1.5 flex-wrap">
            {TIMBER_ASSORTMENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAssortment(a.id)}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all
                  ${selectedAssortment === a.id
                    ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                    : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                  }
                `}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {lang === 'sv' ? a.nameSv : a.nameEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Signal summary strip */}
      <div className="flex border-b border-[var(--border)]">
        {barData.map((bar) => {
          const cfg = SIGNAL_CONFIG[bar.signal];
          return (
            <div
              key={bar.weekLabel}
              className={`flex-1 py-1.5 text-center text-[8px] font-mono font-semibold ${cfg.bg}`}
              style={{ color: cfg.color }}
            >
              {bar.weekLabel}
            </div>
          );
        })}
      </div>

      {/* Bar chart */}
      <div className="p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((pct) => {
            const y = CHART_H - 30 - (CHART_H - 50) * pct;
            const val = Math.round(min + (max - min) * pct);
            return (
              <g key={pct}>
                <line
                  x1={36} y1={y} x2={CHART_W} y2={y}
                  stroke="var(--border)" strokeDasharray="3 3" opacity={0.5}
                />
                <text x={32} y={y + 3} textAnchor="end" className="text-[9px]" fill="var(--text3)" fontFamily="monospace">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {barData.map((bar, i) => {
            const x = 40 + i * (barWidth + BAR_PAD);
            const pricePct = (bar.price - min) / (max - min);
            const barH = Math.max(4, pricePct * (CHART_H - 50));
            const y = CHART_H - 30 - barH;
            const cfg = SIGNAL_CONFIG[bar.signal];
            const isBest = bar.idx === bestWeek.idx;
            const isHovered = hoveredWeek === i;

            return (
              <g
                key={bar.weekLabel}
                onMouseEnter={() => setHoveredWeek(i)}
                onMouseLeave={() => setHoveredWeek(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  fill={cfg.color}
                  opacity={isHovered ? 0.9 : isBest ? 0.8 : 0.5}
                />

                {/* Best marker */}
                {isBest && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    className="text-[8px]"
                    fill={cfg.color}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    BEST
                  </text>
                )}

                {/* Price label on hover */}
                {isHovered && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    className="text-[9px]"
                    fill="var(--text)"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {bar.price} kr
                  </text>
                )}

                {/* Week label */}
                <text
                  x={x + barWidth / 2}
                  y={CHART_H - 10}
                  textAnchor="middle"
                  className="text-[8px]"
                  fill="var(--text3)"
                  fontFamily="monospace"
                >
                  {bar.weekLabel}
                </text>

                {/* Signal dot */}
                <circle
                  cx={x + barWidth / 2}
                  cy={CHART_H - 2}
                  r={3}
                  fill={cfg.color}
                />
              </g>
            );
          })}

          {/* Seasonal overlay line */}
          {barData.length > 1 && (
            <polyline
              points={barData.map((bar, i) => {
                const x = 40 + i * (barWidth + BAR_PAD) + barWidth / 2;
                const pct = (bar.seasonalIndex - 0.94) / 0.12; // normalize 0.94-1.06
                const y = CHART_H - 30 - Math.max(0, Math.min(1, pct)) * (CHART_H - 50);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="var(--text3)"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.4}
            />
          )}
        </svg>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 pt-0">
        {/* Best week */}
        <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-[var(--green)]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--green)]">
              {lang === 'sv' ? 'Basta vecka' : 'Best week'}
            </span>
          </div>
          <p className="text-lg font-semibold font-mono text-[var(--text)]">
            {bestWeek.weekLabel}
          </p>
          <p className="text-[10px] text-[var(--text3)]">
            {bestWeek.price} kr/m&sup3;fub {lang === 'sv' ? 'prognos' : 'forecast'}
          </p>
        </div>

        {/* Inventory value */}
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)]">
              {lang === 'sv' ? 'Lagervarde' : 'Inventory value'}
            </span>
          </div>
          <p className="text-lg font-semibold font-mono text-[var(--text)]">
            {new Intl.NumberFormat('sv-SE').format(Math.round(bestWeek.price * inventoryM3))} kr
          </p>
          <p className="text-[10px] text-[var(--text3)]">
            {inventoryM3} m&sup3;fub &middot; {lang === 'sv' ? 'vid basta pris' : 'at best price'}
          </p>
        </div>

        {/* Timing opportunity */}
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle size={12} className="text-yellow-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)]">
              {lang === 'sv' ? 'Tidsskillnad' : 'Timing spread'}
            </span>
          </div>
          <p className="text-lg font-semibold font-mono text-yellow-400">
            {new Intl.NumberFormat('sv-SE').format(Math.round(valueDiff))} kr
          </p>
          <p className="text-[10px] text-[var(--text3)]">
            {lang === 'sv'
              ? 'Skillnad mellan basta och samsta vecka'
              : 'Difference between best and worst week'}
          </p>
        </div>
      </div>

      {/* Signal legend */}
      <div className="px-4 pb-4 flex gap-4">
        {Object.entries(SIGNAL_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            <span className="text-[10px] text-[var(--text3)]">
              {lang === 'sv' ? cfg.label : cfg.labelEn}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-6 border-t border-dashed border-[var(--text3)]" />
          <span className="text-[10px] text-[var(--text3)]">
            {lang === 'sv' ? 'Sasongsmonster' : 'Seasonal pattern'}
          </span>
        </div>
      </div>
    </div>
  );
}
