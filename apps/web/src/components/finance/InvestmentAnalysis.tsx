/**
 * InvestmentAnalysis — Forest as investment: historical returns comparison,
 * risk metrics, inflation hedge, and diversification benefit.
 */

import {
  TrendingUp,
  Shield,
  BarChart3,
  Percent,
  ArrowDown,
  Waves,
  Info,
} from 'lucide-react';
import type { InvestmentMetrics, AssetComparison } from '@/hooks/useForestFinance';

// ─── Helpers ───

function formatPct(v: number, sign = false): string {
  const s = sign && v > 0 ? '+' : '';
  return `${s}${v.toFixed(1)}%`;
}

// ─── Comparison Chart (pure SVG) ───

function ComparisonChart({ assets }: { assets: AssetComparison[] }) {
  const w = 500;
  const h = 200;
  const pad = { top: 10, right: 10, bottom: 28, left: 45 };

  const allValues = assets.flatMap((a) => a.returns);
  const maxV = Math.max(...allValues) * 1.05;
  const years = 20;

  const xScale = (i: number) => pad.left + (i / (years - 1)) * (w - pad.left - pad.right);
  const yScale = (v: number) => pad.top + ((maxV - v) / maxV) * (h - pad.top - pad.bottom);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 100, 200, 300, 400].filter((v) => v <= maxV).map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            y1={yScale(v)}
            x2={w - pad.right}
            y2={yScale(v)}
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
          <text
            x={pad.left - 4}
            y={yScale(v) + 3}
            textAnchor="end"
            className="fill-[var(--text3)]"
            style={{ fontSize: 9, fontFamily: 'monospace' }}
          >
            +{v}%
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {[0, 5, 10, 15, 19].map((i) => (
        <text
          key={i}
          x={xScale(i)}
          y={h - 4}
          textAnchor="middle"
          className="fill-[var(--text3)]"
          style={{ fontSize: 9, fontFamily: 'monospace' }}
        >
          {2006 + i}
        </text>
      ))}

      {/* Asset lines */}
      {assets.map((asset) => {
        const d = asset.returns
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`)
          .join(' ');
        return (
          <path
            key={asset.asset}
            d={d}
            fill="none"
            stroke={asset.color}
            strokeWidth={asset.asset === 'Svensk skog' ? 2.5 : 1.5}
            strokeLinejoin="round"
            opacity={asset.asset === 'Svensk skog' ? 1 : 0.7}
          />
        );
      })}

      {/* End labels */}
      {assets.map((asset) => {
        const lastVal = asset.returns[asset.returns.length - 1];
        return (
          <text
            key={asset.asset}
            x={w - pad.right + 2}
            y={yScale(lastVal) + 3}
            className="fill-current"
            style={{ fontSize: 8, fontFamily: 'monospace', fill: asset.color }}
          >
            +{lastVal}%
          </text>
        );
      })}
    </svg>
  );
}

// ─── Metric Card ───

function MetricCard({
  icon,
  label,
  value,
  description,
  color = 'var(--green)',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-[10px] text-[var(--text3)]">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono text-[var(--text)]">{value}</p>
      <p className="text-[10px] text-[var(--text3)] mt-0.5">{description}</p>
    </div>
  );
}

// ─── Component ───

interface Props {
  investmentMetrics: InvestmentMetrics;
  assetComparisons: AssetComparison[];
}

export function InvestmentAnalysis({ investmentMetrics, assetComparisons }: Props) {
  const m = investmentMetrics;

  return (
    <div className="space-y-6">
      {/* Insight banner */}
      <div className="rounded-xl border border-[var(--green)]/30 p-5 bg-[var(--green)]/5">
        <div className="flex items-start gap-3">
          <TrendingUp size={20} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
              Svensk skog slår Stockholmsbörsen med lägre volatilitet
            </h3>
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              Historiskt har svenskt skogsbruk levererat 8-12% årlig avkastning inklusive
              värdeökning och virkesintäkter. Med lägre volatilitet än aktier och stark
              inflationskorrelation är skog en unik tillgångsklass.
            </p>
          </div>
        </div>
      </div>

      {/* Return breakdown */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Avkastningsfördelning</h3>
        <div className="flex items-end gap-1 mb-4">
          <span className="text-3xl font-bold font-mono text-[var(--green)]">{m.annualReturn}%</span>
          <span className="text-sm text-[var(--text3)] mb-1">genomsnittlig årlig avkastning</span>
        </div>

        <div className="space-y-3">
          <ReturnBar label="Värdeökning" value={m.valueAppreciation} max={m.annualReturn} color="#4ade80" />
          <ReturnBar label="Virkesintäkter" value={m.timberIncome} max={m.annualReturn} color="#86efac" />
          <ReturnBar label="Kolkreditintäkter" value={m.carbonRevenue} max={m.annualReturn} color="#22c55e" />
        </div>
      </div>

      {/* 20-year comparison chart */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
          20 års avkastning: Skog vs andra tillgångar
        </h3>
        <p className="text-[10px] text-[var(--text3)] mb-4">
          Kumulativ totalavkastning 2006-2026 (exkl. skatt)
        </p>

        <ComparisonChart assets={assetComparisons} />

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3">
          {assetComparisons.map((a) => (
            <div key={a.asset} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="text-[10px] text-[var(--text2)]">{a.asset}</span>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                +{a.returns[a.returns.length - 1]}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk metrics */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Riskmått</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={<BarChart3 size={14} />}
            label="Sharpe-kvot"
            value={m.sharpeRatio.toFixed(2)}
            description="Riskjusterad avkastning (> 1.0 = bra)"
            color="#4ade80"
          />
          <MetricCard
            icon={<Waves size={14} />}
            label="Volatilitet"
            value={formatPct(m.volatility)}
            description="Standardavvikelse per år"
            color="#60a5fa"
          />
          <MetricCard
            icon={<ArrowDown size={14} />}
            label="Max nedgång"
            value={formatPct(m.maxDrawdown)}
            description="Största toppfall historiskt"
            color="#f87171"
          />
          <MetricCard
            icon={<Shield size={14} />}
            label="Inflationskorr."
            value={m.inflationCorrelation.toFixed(2)}
            description="Korrelation med KPI (0-1)"
            color="#fbbf24"
          />
        </div>
      </div>

      {/* Inflation hedge */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Inflationsskydd</h3>
            <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
              Med en inflationskorrelation på {m.inflationCorrelation} fungerar skog som ett
              naturligt inflationsskydd. När penningvärdet minskar stiger värdet på realstillgångar
              som skog, mark och virke. Timmerpriser följer generellt inflationen med 1-2 års eftersläpning.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                <p className="text-lg font-bold font-mono text-[var(--green)]">0.78</p>
                <p className="text-[9px] text-[var(--text3)]">Skog vs KPI</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                <p className="text-lg font-bold font-mono text-[var(--text2)]">0.32</p>
                <p className="text-[9px] text-[var(--text3)]">Aktier vs KPI</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                <p className="text-lg font-bold font-mono text-[var(--text2)]">0.65</p>
                <p className="text-[9px] text-[var(--text3)]">Fastigheter vs KPI</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diversification benefit */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start gap-3">
          <Percent size={18} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Diversifieringseffekt</h3>
            <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
              Skog har låg korrelation med traditionella tillgångsslag. En allokering på 10-20%
              skog i en diversifierad portfölj kan öka den riskjusterade avkastningen med upp till
              15% baserat på historiska data.
            </p>
            <div className="space-y-2">
              <CorrBar label="Skog vs Stockholmsbörsen" value={0.15} />
              <CorrBar label="Skog vs Obligationer" value={-0.08} />
              <CorrBar label="Skog vs Fastigheter" value={0.42} />
              <CorrBar label="Skog vs Guld" value={0.21} />
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
        <Info size={14} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-[var(--text3)] leading-relaxed">
          Historisk avkastning är ingen garanti för framtida resultat. Skogsförvaltning innebär
          risker inklusive naturkatastrofer, skadedjur och marknadsfluktuationer. Kontakta en
          certifierad finansiell rådgivare före investeringsbeslut.
        </p>
      </div>
    </div>
  );
}

// ─── Return Bar ───

function ReturnBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--text2)]">{label}</span>
        <span className="text-xs font-mono text-[var(--text)]">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg3)]">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Correlation Bar ───

function CorrBar({ label, value }: { label: string; value: number }) {
  const absVal = Math.abs(value);
  const isNeg = value < 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-[var(--text2)] w-44 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg3)] relative">
        <div
          className="absolute top-0 h-1.5 rounded-full"
          style={{
            width: `${absVal * 100}%`,
            left: isNeg ? undefined : '50%',
            right: isNeg ? '50%' : undefined,
            backgroundColor: isNeg ? '#60a5fa' : '#4ade80',
          }}
        />
        <div className="absolute left-1/2 top-0 w-px h-1.5 bg-[var(--text3)]" />
      </div>
      <span className="text-[10px] font-mono text-[var(--text2)] w-8 text-right">
        {value > 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}
