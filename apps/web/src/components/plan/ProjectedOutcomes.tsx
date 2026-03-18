import { useState, useRef, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Leaf,
  DollarSign,
  Cloud,
  Shield,
  Target,
} from 'lucide-react';
import type { ForestPlan, ProjectionPoint } from '@/hooks/useForestPlan';

interface ProjectedOutcomesProps {
  plan: ForestPlan;
  formatSEK: (v: number) => string;
}

type ChartTab = 'revenue' | 'value' | 'carbon' | 'biodiversity' | 'risk';

const TABS: { key: ChartTab; label: string; icon: typeof TrendingUp; color: string }[] = [
  { key: 'revenue', label: 'Intäkter', icon: DollarSign, color: '#4ade80' },
  { key: 'value', label: 'Skogsvärde', icon: TrendingUp, color: '#38bdf8' },
  { key: 'carbon', label: 'Kol', icon: Cloud, color: '#34d399' },
  { key: 'biodiversity', label: 'Mångfald', icon: Leaf, color: '#c084fc' },
  { key: 'risk', label: 'Risk', icon: Shield, color: '#f97316' },
];

function MiniChart({
  data,
  getValue,
  color,
  height = 120,
  formatLabel,
  showComparison,
  comparisonValue,
}: {
  data: ProjectionPoint[];
  getValue: (p: ProjectionPoint) => number;
  color: string;
  height?: number;
  formatLabel: (v: number) => string;
  showComparison?: boolean;
  comparisonValue?: (p: ProjectionPoint) => number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; year: number; value: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const values = data.map(getValue);
    const allValues = [...values];
    if (showComparison && comparisonValue) {
      allValues.push(...data.map(comparisonValue));
    }
    const maxV = Math.max(...allValues, 1);
    const minV = Math.min(...allValues, 0);
    const range = maxV - minV || 1;

    const pad = { top: 10, bottom: 20, left: 0, right: 0 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const toX = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
    const toY = (v: number) => pad.top + plotH - ((v - minV) / range) * plotH;

    // Comparison line (status quo)
    if (showComparison && comparisonValue) {
      ctx.beginPath();
      data.forEach((p, i) => {
        const x = toX(i);
        const y = toY(comparisonValue(p));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Main area fill
    ctx.beginPath();
    data.forEach((p, i) => {
      const x = toX(i);
      const y = toY(getValue(p));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(data.length - 1), pad.top + plotH);
    ctx.lineTo(toX(0), pad.top + plotH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    grad.addColorStop(0, color + '30');
    grad.addColorStop(1, color + '05');
    ctx.fillStyle = grad;
    ctx.fill();

    // Main line
    ctx.beginPath();
    data.forEach((p, i) => {
      const x = toX(i);
      const y = toY(getValue(p));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Year labels (every 10 years)
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    data.forEach((p, i) => {
      if ((p.year - 2026) % 10 === 0 || p.year === 2076) {
        ctx.fillText(String(p.year), toX(i), h - 4);
      }
    });
  }, [data, getValue, color, height, showComparison, comparisonValue]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round((x / rect.width) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setTooltip({ x, year: data[clamped].year, value: getValue(data[clamped]) });
  };

  return (
    <div ref={containerRef} className="relative" onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
      <canvas ref={canvasRef} />
      {tooltip && (
        <div
          className="absolute top-0 px-2 py-1 rounded-lg pointer-events-none"
          style={{
            left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 200) - 100),
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span className="text-[9px] font-mono text-[var(--text3)]">{tooltip.year}: </span>
          <span className="text-[9px] font-mono font-semibold" style={{ color }}>{formatLabel(tooltip.value)}</span>
        </div>
      )}
    </div>
  );
}

export function ProjectedOutcomes({ plan, formatSEK }: ProjectedOutcomesProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('revenue');
  const { projections } = plan;

  const last = projections[projections.length - 1];

  // Stacked revenue breakdown for the last point
  const revenueBreakdown = useMemo(() => [
    { label: 'Virke', value: last.timberRevenue, color: '#4ade80' },
    { label: 'Koldioxid', value: last.carbonRevenue, color: '#34d399' },
    { label: 'Ekosystem', value: last.ecosystemRevenue, color: '#c084fc' },
    { label: 'Rekreation', value: last.recreationRevenue, color: '#fbbf24' },
  ], [last]);

  const totalRevenue = revenueBreakdown.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-5">
      {/* 50-year totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Total intäkt 50 år</p>
          <p className="text-lg font-mono font-bold text-[#4ade80]">{formatSEK(plan.totalRevenue50y)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Slutligt skogsvärde</p>
          <p className="text-lg font-mono font-bold text-[#38bdf8]">{formatSEK(plan.finalForestValue)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Bunden koldioxid</p>
          <p className="text-lg font-mono font-bold text-[#34d399]">{plan.totalCarbonStored.toLocaleString('sv-SE')} ton</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Biodiversitet 2076</p>
          <p className="text-lg font-mono font-bold text-[#c084fc]">{last.biodiversityScore.toFixed(0)}/100</p>
        </div>
      </div>

      {/* Comparison: Med plan vs Utan plan */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-[#4ade80]" />
          <h4 className="text-[11px] font-semibold text-[var(--text)] uppercase tracking-wider">
            Med plan vs. Utan plan (status quo)
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] text-[var(--text3)] mb-1">Total intäkt 50 år</p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-mono font-bold text-[#4ade80]">{formatSEK(plan.totalRevenue50y)}</span>
              <span className="text-[9px] text-[var(--text3)]">vs. {formatSEK(plan.statusQuoRevenue50y)}</span>
            </div>
            <p className="text-[9px] text-[#4ade80] mt-0.5">
              +{formatSEK(plan.totalRevenue50y - plan.statusQuoRevenue50y)} mer
            </p>
          </div>
          <div>
            <p className="text-[9px] text-[var(--text3)] mb-1">Skogsvärde 2076</p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-mono font-bold text-[#38bdf8]">{formatSEK(plan.finalForestValue)}</span>
              <span className="text-[9px] text-[var(--text3)]">vs. {formatSEK(plan.statusQuoForestValue)}</span>
            </div>
            <p className="text-[9px] text-[#38bdf8] mt-0.5">
              +{formatSEK(plan.finalForestValue - plan.statusQuoForestValue)} mer
            </p>
          </div>
        </div>
      </div>

      {/* Revenue breakdown stacked bar */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-3">
          Intäktsfördelning 50 år
        </h4>
        <div className="h-6 rounded-full overflow-hidden flex" style={{ background: 'var(--bg3)' }}>
          {revenueBreakdown.filter(r => r.value > 0).map((r) => (
            <div
              key={r.label}
              className="h-full transition-all"
              style={{
                width: `${(r.value / Math.max(totalRevenue, 1)) * 100}%`,
                background: r.color,
                opacity: 0.8,
              }}
              title={`${r.label}: ${formatSEK(r.value)}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {revenueBreakdown.filter(r => r.value > 0).map(r => (
            <div key={r.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: r.color }} />
              <span className="text-[9px] text-[var(--text3)]">{r.label}: {formatSEK(r.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart tabs */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-current text-[var(--text)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
              style={activeTab === tab.key ? { color: tab.color } : undefined}
            >
              <tab.icon size={11} />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === 'revenue' && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 bg-[#4ade80] rounded" />
                  <span className="text-[9px] text-[var(--text3)]">Med plan</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-0.5 rounded" style={{ background: 'rgba(255,255,255,0.12)', borderTop: '1px dashed rgba(255,255,255,0.3)' }} />
                  <span className="text-[9px] text-[var(--text3)]">Status quo</span>
                </div>
              </div>
              <MiniChart
                data={projections}
                getValue={p => p.cumulativeRevenue}
                color="#4ade80"
                formatLabel={v => formatSEK(v)}
                showComparison
                comparisonValue={() => 0}
              />
            </div>
          )}
          {activeTab === 'value' && (
            <MiniChart
              data={projections}
              getValue={p => p.forestValue}
              color="#38bdf8"
              formatLabel={v => formatSEK(v)}
            />
          )}
          {activeTab === 'carbon' && (
            <MiniChart
              data={projections}
              getValue={p => p.carbonStock}
              color="#34d399"
              formatLabel={v => `${v.toLocaleString('sv-SE')} ton CO2`}
            />
          )}
          {activeTab === 'biodiversity' && (
            <MiniChart
              data={projections}
              getValue={p => p.biodiversityScore}
              color="#c084fc"
              formatLabel={v => `${v.toFixed(0)}/100`}
            />
          )}
          {activeTab === 'risk' && (
            <MiniChart
              data={projections}
              getValue={p => p.riskLevel}
              color="#f97316"
              formatLabel={v => `${v.toFixed(0)}%`}
            />
          )}
        </div>
      </div>

      {/* Key milestones */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-3">
          Viktiga milstolpar
        </h4>
        <div className="space-y-2">
          {plan.actions.filter(a => a.milestone).map(a => (
            <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg)]">
              <span className="text-[11px] font-mono font-semibold text-[#4ade80] w-10">{a.year}</span>
              <div className="flex-1">
                <p className="text-[11px] font-medium text-[var(--text)]">{a.milestone}</p>
                <p className="text-[9px] text-[var(--text3)]">{a.parcelName}</p>
              </div>
              {a.estimatedRevenue && a.estimatedRevenue > 0 && (
                <span className="text-[10px] font-mono text-[#4ade80]">{formatSEK(a.estimatedRevenue)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
