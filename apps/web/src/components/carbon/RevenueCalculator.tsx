import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, TrendingUp, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import {
  type ParcelCarbonResult,
  type CertificationProgram,
  CERTIFICATION_PROGRAMS,
  SEK_PER_EUR,
  formatSEK,
  formatCO2,
} from '@/services/carbonService';

// ─── 10-year projection SVG chart ───

function ProjectionChart({
  annualRevenue,
  annualCost,
  certCost,
}: {
  annualRevenue: number;
  annualCost: number;
  certCost: number;
}) {
  const { t } = useTranslation();
  const years = 10;
  const w = 600;
  const h = 250;
  const pad = { top: 20, right: 20, bottom: 40, left: 70 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Cumulative data points
  const data = useMemo(() => {
    const points: { year: number; cumRevenue: number; cumNet: number }[] = [];
    let cumRevenue = 0;
    let cumCost = certCost; // initial certification cost

    for (let yr = 1; yr <= years; yr++) {
      cumRevenue += annualRevenue;
      cumCost += annualCost;
      points.push({
        year: yr,
        cumRevenue,
        cumNet: cumRevenue - cumCost,
      });
    }
    return points;
  }, [annualRevenue, annualCost, certCost]);

  const maxVal = Math.max(...data.map((d) => d.cumRevenue), 1);

  function toX(year: number) {
    return pad.left + ((year - 1) / (years - 1)) * plotW;
  }
  function toY(val: number) {
    return pad.top + plotH - (val / maxVal) * plotH;
  }

  const revenuePath = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(d.year)} ${toY(d.cumRevenue)}`
  ).join(' ');

  const netPath = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(d.year)} ${toY(Math.max(d.cumNet, 0))}`
  ).join(' ');

  // Revenue fill area
  const revenueArea = revenuePath +
    ` L ${toX(years)} ${pad.top + plotH} L ${toX(1)} ${pad.top + plotH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-label={t('carbon.revenue.projectionChart')}>
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
            className="text-[9px] fill-[var(--text3)] font-mono"
          >
            {formatSEK(maxVal * frac)}
          </text>
        </g>
      ))}

      {/* Year labels */}
      {data.map((d) => (
        <text
          key={d.year}
          x={toX(d.year)}
          y={h - 10}
          textAnchor="middle"
          className="text-[9px] fill-[var(--text3)] font-mono"
        >
          {t('carbon.revenue.yearN', { n: d.year })}
        </text>
      ))}

      {/* Revenue area */}
      <path d={revenueArea} fill="var(--green)" opacity="0.08" />

      {/* Revenue line */}
      <path d={revenuePath} fill="none" stroke="var(--green)" strokeWidth="2" />

      {/* Net revenue line */}
      <path d={netPath} fill="none" stroke="#86efac" strokeWidth="2" strokeDasharray="4,4" />

      {/* Data dots */}
      {data.map((d) => (
        <g key={d.year}>
          <circle cx={toX(d.year)} cy={toY(d.cumRevenue)} r="3" fill="var(--green)" />
          <circle cx={toX(d.year)} cy={toY(Math.max(d.cumNet, 0))} r="2.5" fill="#86efac" />
        </g>
      ))}

      {/* Legend */}
      <g transform={`translate(${pad.left + 10}, ${pad.top + 10})`}>
        <line x1="0" y1="0" x2="16" y2="0" stroke="var(--green)" strokeWidth="2" />
        <text x="20" y="4" className="text-[9px] fill-[var(--text2)]">{t('carbon.revenue.cumulativeGross')}</text>
        <line x1="0" y1="14" x2="16" y2="14" stroke="#86efac" strokeWidth="2" strokeDasharray="4,4" />
        <text x="20" y="18" className="text-[9px] fill-[var(--text2)]">{t('carbon.revenue.cumulativeNet')}</text>
      </g>
    </svg>
  );
}

// ─── Main Component ───

interface RevenueCalculatorProps {
  results: ParcelCarbonResult[];
}

export function RevenueCalculator({ results }: RevenueCalculatorProps) {
  const { t } = useTranslation();
  const [selectedProgram, setSelectedProgram] = useState<CertificationProgram>('gold_standard');

  const programs: CertificationProgram[] = ['gold_standard', 'verra', 'plan_vivo'];

  const totalAnnualSeq = useMemo(
    () => results.reduce((s, r) => s + r.annualSequestration, 0),
    [results],
  );

  const programInfo = CERTIFICATION_PROGRAMS[selectedProgram];
  const annualRevenueSek = totalAnnualSeq * programInfo.priceEurPerTon * SEK_PER_EUR;
  const annualCostSek = programInfo.annualVerificationCost * SEK_PER_EUR;
  const certCostSek = programInfo.certificationCost * SEK_PER_EUR;
  const netAnnualSek = annualRevenueSek - annualCostSek;
  const tenYearNet = netAnnualSek * 10 - certCostSek;

  return (
    <div className="space-y-6">
      {/* Program selector */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
          {t('carbon.revenue.selectProgram')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {programs.map((prog) => {
            const info = CERTIFICATION_PROGRAMS[prog];
            const isSelected = prog === selectedProgram;
            return (
              <button
                key={prog}
                onClick={() => setSelectedProgram(prog)}
                className={`
                  p-4 rounded-lg border text-left transition-all duration-150
                  ${isSelected
                    ? 'border-[var(--green)] bg-[var(--green)]/5 ring-1 ring-[var(--green)]/30'
                    : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]'
                  }
                `}
              >
                <p className="text-sm font-semibold text-[var(--text)]">{info.name}</p>
                <p className="text-xs text-[var(--green)] font-mono mt-1">
                  ~€{info.priceEurPerTon}/{t('carbon.revenue.tonCO2')}
                </p>
                <p className="text-[10px] text-[var(--text3)] mt-1">
                  {t('carbon.revenue.timeline')}: {info.timelineMonths} {t('carbon.revenue.months')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Revenue summary */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Banknote size={14} className="text-[var(--green)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                {t('carbon.revenue.annualGross')}
              </span>
            </div>
            <p className="text-xl font-bold font-mono text-[var(--text)]">
              {formatSEK(annualRevenueSek)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-[var(--text3)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                {t('carbon.revenue.annualCosts')}
              </span>
            </div>
            <p className="text-xl font-bold font-mono text-[var(--text3)]">
              -{formatSEK(annualCostSek)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-[var(--green)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                {t('carbon.revenue.netAnnual')}
              </span>
            </div>
            <p className="text-xl font-bold font-mono text-[var(--green)]">
              {formatSEK(netAnnualSek)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-[var(--text3)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                {t('carbon.revenue.certCost')}
              </span>
            </div>
            <p className="text-xl font-bold font-mono text-[var(--text3)]">
              {formatSEK(certCostSek)}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-sm text-[var(--text2)]">{t('carbon.revenue.tenYearNet')}</span>
          <span className="text-2xl font-bold font-mono text-[var(--green)]">
            {formatSEK(tenYearNet)}
          </span>
        </div>
      </div>

      {/* Sequestration inputs */}
      <div className="rounded-lg border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight size={14} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text2)]">
            {t('carbon.revenue.basedOn', { tons: formatCO2(totalAnnualSeq) })}
          </span>
        </div>
        <p className="text-[10px] text-[var(--text3)]">
          {t('carbon.revenue.disclaimer')}
        </p>
      </div>

      {/* 10-year projection chart */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
          {t('carbon.revenue.tenYearProjection')}
        </h3>
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <ProjectionChart
            annualRevenue={annualRevenueSek}
            annualCost={annualCostSek}
            certCost={certCostSek}
          />
        </div>
      </div>
    </div>
  );
}
