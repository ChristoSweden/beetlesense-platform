import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Bug,
  CloudRain,
  TreePine,
  Leaf,
  BarChart3,
  Database,
  Sparkles,
} from 'lucide-react';
import { DataSourceBadge, DEMO_DATA_SOURCES } from './DataSourceBadge';
import { ActionPriorityList, DEMO_ACTIONS } from './ActionPriorityList';
import type { DataSource } from './DataSourceBadge';
import type { ActionItem } from './ActionPriorityList';

// ─── Types ───

type SignalStatus = 'green' | 'amber' | 'red';

interface Signal {
  id: string;
  label: string;
  status: SignalStatus;
}

interface HealthBreakdown {
  healthy: number;
  stressed: number;
  critical: number;
}

interface TopRisk {
  title: string;
  daysUntil: number;
  phase: string;
  weatherAlert?: string;
}

interface ValueData {
  timberValueSEK: number;
  growthRatePercent: number;
  carbonCredits: number;
}

interface ForestIntelligenceData {
  forestName: string;
  healthScore: number;
  healthTrend: 'improving' | 'declining' | 'stable';
  attentionTreeCount: number;
  signals: Signal[];
  healthBreakdown: HealthBreakdown;
  sparklineData: number[];
  topRisk: TopRisk;
  value: ValueData;
  dataSources: DataSource[];
  actions: ActionItem[];
  lastUpdatedHoursAgo: number;
}

// ─── Demo Data ───

const DEMO_DATA: ForestIntelligenceData = {
  forestName: 'Norra Skogen',
  healthScore: 92,
  healthTrend: 'improving',
  attentionTreeCount: 3,
  signals: [
    { id: 'health', label: 'Hälsa', status: 'green' },
    { id: 'beetle', label: 'Barkborre', status: 'amber' },
    { id: 'weather', label: 'Väder', status: 'green' },
    { id: 'growth', label: 'Tillväxt', status: 'green' },
    { id: 'market', label: 'Marknad', status: 'green' },
    { id: 'water', label: 'Vatten', status: 'amber' },
  ],
  healthBreakdown: { healthy: 847, stressed: 12, critical: 3 },
  sparklineData: [78, 80, 82, 85, 84, 87, 88, 89, 91, 92],
  topRisk: {
    title: 'Barkborreangrepp i zon NV-12',
    daysUntil: 14,
    phase: 'Tidig svärmning',
    weatherAlert: 'Värmebölja förväntas 22-25 mars',
  },
  value: {
    timberValueSEK: 3450000,
    growthRatePercent: 3.2,
    carbonCredits: 128,
  },
  dataSources: DEMO_DATA_SOURCES,
  actions: DEMO_ACTIONS,
  lastUpdatedHoursAgo: 4,
};

// ─── Helpers ───

function getSignalDot(status: SignalStatus): string {
  switch (status) {
    case 'green': return '🟢';
    case 'amber': return '🟡';
    case 'red': return '🔴';
  }
}

function _getSignalColor(status: SignalStatus): string {
  switch (status) {
    case 'green': return '#4ade80';
    case 'amber': return '#eab308';
    case 'red': return '#ef4444';
  }
}

function formatSEK(value: number): string {
  if (value >= 1000000) {
    const millions = value / 1000000;
    return `${millions.toFixed(1).replace('.0', '')} Mkr`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)} tkr`;
  }
  return `${value} kr`;
}

// ─── Animated Count-Up Hook ───

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) {
      setValue(target);
      return;
    }
    startRef.current = null;
    setValue(0);

    function animate(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─── Sparkline SVG ───

function Sparkline({ data, color = '#4ade80', width = 120, height = 32 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;

  // Area fill path
  const firstX = padding;
  const lastX = padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2);
  const areaPath = `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(' ')} L${lastX},${height} L${firstX},${height} Z`;

  return (
    <svg width={width} height={height} className="block" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(',')[0])}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ─── Health Score Circle ───

function HealthCircle({ score, size = 80 }: { score: number; size?: number }) {
  const animatedScore = useCountUp(score);
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - animatedScore / 100);

  const color = score > 66 ? '#4ade80' : score > 33 ? '#eab308' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(74, 222, 128, 0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
        />
      </svg>
      <span
        className="absolute text-2xl font-mono font-bold tabular-nums"
        style={{ color }}
      >
        {animatedScore}
      </span>
    </div>
  );
}

// ─── Section A: The Pulse ───

function ThePulse({ data }: { data: ForestIntelligenceData }) {
  const healthPercent = data.healthScore;
  const label = healthPercent >= 80 ? 'frisk' : healthPercent >= 50 ? 'måttlig' : 'svag';

  return (
    <div className="px-4 py-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
      {/* Summary sentence */}
      <p className="text-sm text-[var(--text)] font-medium">
        <span className="text-[var(--green)] font-semibold">{data.forestName}</span>
        {': '}
        <span className="tabular-nums">{healthPercent}%</span>
        {' '}
        {label}
        {data.attentionTreeCount > 0 && (
          <span className="text-[var(--text3)]">
            {' — '}{data.attentionTreeCount} träd kräver uppmärksamhet
          </span>
        )}
      </p>

      {/* Signal dots */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {data.signals.map((signal) => (
          <div key={signal.id} className="flex items-center gap-1.5">
            <span className="text-xs" aria-hidden="true">{getSignalDot(signal.status)}</span>
            <span className="text-[11px] text-[var(--text3)]">{signal.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section B: Key Cards ───

function KeyCards({ data }: { data: ForestIntelligenceData }) {
  const { healthScore, healthTrend, healthBreakdown, sparklineData, topRisk, value } = data;

  const TrendIcon = healthTrend === 'improving' ? TrendingUp :
    healthTrend === 'declining' ? TrendingDown : Minus;
  const trendColor = healthTrend === 'improving' ? '#4ade80' :
    healthTrend === 'declining' ? '#ef4444' : '#eab308';
  const trendLabel = healthTrend === 'improving' ? 'Förbättras' :
    healthTrend === 'declining' ? 'Försämras' : 'Stabil';

  const animatedTimberValue = useCountUp(value.timberValueSEK, 1600);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Card 1: Skogens hälsa */}
      <div
        className="rounded-xl border border-[var(--border)] p-4 flex flex-col"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TreePine size={14} className="text-[var(--green)]" />
          <h3 className="text-xs font-semibold text-[var(--text)]">Skogens hälsa</h3>
        </div>

        <div className="flex items-center gap-4">
          <HealthCircle score={healthScore} />
          <div className="flex-1">
            <Sparkline data={sparklineData} />
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon size={12} style={{ color: trendColor }} />
              <span className="text-[10px]" style={{ color: trendColor }}>{trendLabel}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text3)] space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            <span>{healthBreakdown.healthy} friska</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#eab308]" />
            <span>{healthBreakdown.stressed} stressade</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            <span>{healthBreakdown.critical} kritiska</span>
          </div>
        </div>
      </div>

      {/* Card 2: Risker just nu */}
      <div
        className="rounded-xl border border-[var(--border)] p-4 flex flex-col"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Bug size={14} className="text-[#eab308]" />
          <h3 className="text-xs font-semibold text-[var(--text)]">Risker just nu</h3>
        </div>

        {/* Top risk */}
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text)]">
            {topRisk.title}
          </p>

          {/* Countdown */}
          <div className="flex items-center gap-2 mt-2">
            <div
              className="text-2xl font-mono font-bold tabular-nums text-[#eab308]"
            >
              {topRisk.daysUntil}
            </div>
            <div className="text-[10px] text-[var(--text3)] leading-tight">
              dagar till<br />åtgärd krävs
            </div>
          </div>

          {/* Beetle phase */}
          <div className="mt-3 flex items-center gap-2 rounded-md px-2.5 py-1.5" style={{ background: 'rgba(234, 179, 8, 0.08)' }}>
            <Bug size={12} className="text-[#eab308]" />
            <span className="text-[10px] text-[#eab308] font-medium">{topRisk.phase}</span>
          </div>

          {/* Weather alert */}
          {topRisk.weatherAlert && (
            <div className="mt-2 flex items-center gap-2 rounded-md px-2.5 py-1.5" style={{ background: 'rgba(234, 179, 8, 0.05)' }}>
              <CloudRain size={12} className="text-[var(--text3)]" />
              <span className="text-[10px] text-[var(--text3)]">{topRisk.weatherAlert}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Värde & tillväxt */}
      <div
        className="rounded-xl border border-[var(--border)] p-4 flex flex-col"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-[var(--green)]" />
          <h3 className="text-xs font-semibold text-[var(--text)]">Värde & tillväxt</h3>
        </div>

        {/* Big timber value */}
        <div className="flex-1">
          <div className="text-3xl font-mono font-bold tabular-nums text-[var(--green)]">
            {formatSEK(animatedTimberValue)}
          </div>
          <span className="text-[10px] text-[var(--text3)]">Uppskattat virkesvärde</span>

          {/* Growth rate */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp size={14} className="text-[var(--green)]" />
              <span className="text-lg font-mono font-semibold text-[var(--text)]">
                {value.growthRatePercent}%
              </span>
            </div>
            <span className="text-[10px] text-[var(--text3)]">årlig tillväxt</span>
          </div>

          {/* Carbon credits */}
          <div className="mt-3 flex items-center gap-2 rounded-md px-2.5 py-1.5" style={{ background: 'rgba(74, 222, 128, 0.08)' }}>
            <Leaf size={12} className="text-[var(--green)]" />
            <span className="text-[10px] text-[var(--green)] font-medium">
              {value.carbonCredits} ton CO₂ kolkrediter
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section C: Data Sources ───

function DataSourcesSection({ sources, lastUpdatedHours }: {
  sources: DataSource[];
  lastUpdatedHours: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeSources = sources.filter((s) => s.status !== 'missing').length;

  return (
    <div className="rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Database size={14} className="text-[var(--text3)]" />
          <span className="text-xs font-medium text-[var(--text)]">
            {activeSources} datakällor aktiva
          </span>
          <span className="text-[10px] text-[var(--text3)]">
            — senast uppdaterad {lastUpdatedHours} tim sedan
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[var(--text3)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--text3)]" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sources.map((source) => (
              <DataSourceBadge key={source.id} source={source} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main: ForestIntelligenceSummary ───

interface ForestIntelligenceSummaryProps {
  data?: ForestIntelligenceData;
}

export function ForestIntelligenceSummary({ data = DEMO_DATA }: ForestIntelligenceSummaryProps) {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Demo badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--green)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Skogsöversikt
          </h2>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
          DEMO
        </span>
      </div>

      {/* A. The Pulse */}
      <ThePulse data={data} />

      {/* B. Key Cards */}
      <KeyCards data={data} />

      {/* C. Data Sources (expandable) */}
      <DataSourcesSection
        sources={data.dataSources}
        lastUpdatedHours={data.lastUpdatedHoursAgo}
      />

      {/* D. Åtgärder */}
      <ActionPriorityList actions={data.actions} />
    </div>
  );
}
export default ForestIntelligenceSummary;
