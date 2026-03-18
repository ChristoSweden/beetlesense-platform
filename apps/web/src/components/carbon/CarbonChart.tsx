import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type CarbonParcel,
  getAgeModifier,
  getSiteIndexModifier,
  CARBON_COEFFICIENTS,
  CERTIFICATION_PROGRAMS,
  SEK_PER_EUR,
  formatSEK,
  formatCO2,
} from '@/services/carbonService';

interface CarbonChartProps {
  parcels: CarbonParcel[];
  projectionYears?: number;
}

interface ChartDataPoint {
  year: number;
  aboveGround: number;
  belowGround: number;
  soil: number;
  total: number;
  revenue: number;
}

export function CarbonChart({ parcels, projectionYears = 20 }: CarbonChartProps) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const points: ChartDataPoint[] = [];
    const maxAge = Math.max(...parcels.map((p) => p.ageYears)) + projectionYears;

    for (let year = 0; year <= maxAge; year += 5) {
      let totalAbove = 0;
      let totalBelow = 0;
      let totalSoil = 0;
      let totalSeq = 0;

      for (const parcel of parcels) {
        const coeff = CARBON_COEFFICIENTS[parcel.species];
        const siMod = getSiteIndexModifier(parcel.siteIndex);
        const effectiveAge = year;

        // Cumulative above-ground
        let cumAbove = 0;
        for (let yr = 1; yr <= effectiveAge; yr++) {
          const ageMod = getAgeModifier(yr);
          cumAbove += coeff.peakSequestration * ageMod * siMod * (1 / (1 + coeff.rootShootRatio));
        }
        cumAbove *= parcel.areaHa;

        const below = cumAbove * coeff.rootShootRatio;
        const soil = coeff.soilCarbonRate * effectiveAge * parcel.areaHa;

        totalAbove += cumAbove;
        totalBelow += below;
        totalSoil += soil;

        // Current year sequestration for revenue
        if (effectiveAge > 0) {
          const ageMod = getAgeModifier(effectiveAge);
          totalSeq += coeff.peakSequestration * ageMod * siMod * parcel.areaHa;
        }
      }

      // Revenue based on Verra mid-range pricing
      const annualRevenue = totalSeq * CERTIFICATION_PROGRAMS.verra.priceEurPerTon * SEK_PER_EUR;

      points.push({
        year,
        aboveGround: Math.round(totalAbove),
        belowGround: Math.round(totalBelow),
        soil: Math.round(totalSoil),
        total: Math.round(totalAbove + totalBelow + totalSoil),
        revenue: Math.round(annualRevenue),
      });
    }

    return points;
  }, [parcels, projectionYears]);

  // SVG dimensions
  const w = 700;
  const h = 320;
  const pad = { top: 25, right: 80, bottom: 45, left: 70 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const maxYear = Math.max(...data.map((d) => d.year));

  function toX(year: number) {
    return pad.left + (year / maxYear) * plotW;
  }
  function toY(val: number) {
    return pad.top + plotH - (val / maxTotal) * plotH;
  }
  function toYRev(val: number) {
    return pad.top + plotH - (val / maxRevenue) * plotH;
  }

  // Current age marker (average)
  const currentAge = parcels.reduce((s, p) => s + p.ageYears, 0) / (parcels.length || 1);

  // Stacked area paths (soil at bottom, below in middle, above on top)
  function makeAreaPath(bottomFn: (d: ChartDataPoint) => number, topFn: (d: ChartDataPoint) => number) {
    const forward = data.map((d) =>
      `${toX(d.year)},${toY(topFn(d))}`
    ).join(' L ');
    const backward = [...data].reverse().map((d) =>
      `${toX(d.year)},${toY(bottomFn(d))}`
    ).join(' L ');
    return `M ${forward} L ${backward} Z`;
  }

  const soilArea = makeAreaPath(
    () => 0,
    (d) => d.soil,
  );
  const belowArea = makeAreaPath(
    (d) => d.soil,
    (d) => d.soil + d.belowGround,
  );
  const aboveArea = makeAreaPath(
    (d) => d.soil + d.belowGround,
    (d) => d.total,
  );

  // Revenue line
  const revenueLine = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(d.year)} ${toYRev(d.revenue)}`
  ).join(' ');

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
        {t('carbon.chart.title')}
      </h3>
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-label={t('carbon.chart.ariaLabel')}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <g key={frac}>
              <line
                x1={pad.left}
                y1={pad.top + plotH * (1 - frac)}
                x2={pad.left + plotW}
                y2={pad.top + plotH * (1 - frac)}
                stroke="var(--border)"
                strokeWidth="0.5"
              />
              <text
                x={pad.left - 8}
                y={pad.top + plotH * (1 - frac) + 4}
                textAnchor="end"
                className="text-[8px] fill-[var(--text3)] font-mono"
              >
                {formatCO2(Math.round(maxTotal * frac))}
              </text>
            </g>
          ))}

          {/* X axis labels */}
          {data.filter((_, i) => i % 2 === 0).map((d) => (
            <text
              key={d.year}
              x={toX(d.year)}
              y={h - 12}
              textAnchor="middle"
              className="text-[8px] fill-[var(--text3)] font-mono"
            >
              {d.year} {t('carbon.chart.yr')}
            </text>
          ))}

          {/* Stacked areas */}
          <path d={soilArea} fill="#8B6914" opacity="0.2" />
          <path d={belowArea} fill="#6B8E23" opacity="0.25" />
          <path d={aboveArea} fill="var(--green)" opacity="0.3" />

          {/* Revenue line (right axis) */}
          <path d={revenueLine} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6,3" />

          {/* Right axis labels (revenue) */}
          {[0, 0.5, 1].map((frac) => (
            <text
              key={frac}
              x={pad.left + plotW + 8}
              y={pad.top + plotH * (1 - frac) + 4}
              className="text-[8px] fill-[#fbbf24] font-mono"
            >
              {formatSEK(maxRevenue * frac)}
            </text>
          ))}

          {/* Current age marker */}
          <line
            x1={toX(currentAge)}
            y1={pad.top}
            x2={toX(currentAge)}
            y2={pad.top + plotH}
            stroke="var(--text3)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          <text
            x={toX(currentAge)}
            y={pad.top - 6}
            textAnchor="middle"
            className="text-[8px] fill-[var(--text2)] font-medium"
          >
            {t('carbon.chart.today')}
          </text>

          {/* Projection zone */}
          <rect
            x={toX(currentAge)}
            y={pad.top}
            width={toX(maxYear) - toX(currentAge)}
            height={plotH}
            fill="var(--green)"
            opacity="0.03"
          />

          {/* Left axis label */}
          <text
            x={12}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${pad.top + plotH / 2})`}
            className="text-[8px] fill-[var(--text3)]"
          >
            {t('carbon.chart.yAxisLabel')}
          </text>

          {/* Right axis label */}
          <text
            x={w - 8}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(90, ${w - 8}, ${pad.top + plotH / 2})`}
            className="text-[8px] fill-[#fbbf24]"
          >
            {t('carbon.chart.revenueLabel')}
          </text>

          {/* Legend */}
          <g transform={`translate(${pad.left + 10}, ${pad.top + 8})`}>
            <rect x="0" y="0" width="10" height="8" fill="var(--green)" opacity="0.4" rx="1" />
            <text x="14" y="7" className="text-[7px] fill-[var(--text2)]">{t('carbon.chart.aboveGround')}</text>

            <rect x="0" y="12" width="10" height="8" fill="#6B8E23" opacity="0.35" rx="1" />
            <text x="14" y="19" className="text-[7px] fill-[var(--text2)]">{t('carbon.chart.belowGround')}</text>

            <rect x="0" y="24" width="10" height="8" fill="#8B6914" opacity="0.3" rx="1" />
            <text x="14" y="31" className="text-[7px] fill-[var(--text2)]">{t('carbon.chart.soilCarbon')}</text>

            <line x1="0" y1="40" x2="10" y2="40" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,2" />
            <text x="14" y="43" className="text-[7px] fill-[#fbbf24]">{t('carbon.chart.revenueOverlay')}</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
