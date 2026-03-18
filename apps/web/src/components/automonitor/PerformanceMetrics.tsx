/**
 * PerformanceMetrics — System performance stats for autonomous monitoring.
 * Detection-to-action time, false positive rate, drone success rate, costs, trends.
 */

import {
  Clock,
  ShieldCheck,
  Plane,
  TreePine,
  Satellite,
  Banknote,
  TrendingDown,
  TrendingUp,
  Timer,
  BarChart3,
} from 'lucide-react';
import type { PerformanceStats } from '@/hooks/useAutoMonitor';

// ─── Stat Card ───

function MetricCard({
  icon,
  label,
  value,
  unit,
  trend,
  trendLabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down';
  trendLabel?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        {trend && trendLabel && (
          <span className={`text-[9px] font-mono flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${
            trend === 'down' ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'bg-red-500/10 text-red-400'
          }`}>
            {trend === 'down' ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {trendLabel}
          </span>
        )}
      </div>
      <p className="text-xl font-semibold font-mono text-[var(--text)]">
        {value}
        {unit && <span className="text-xs text-[var(--text3)] font-normal ml-1">{unit}</span>}
      </p>
      <p className="text-[10px] text-[var(--text3)] mt-0.5">{label}</p>
    </div>
  );
}

// ─── Mini Sparkline ───

function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) / (data.length - 1) * w}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}

// ─── Trend Chart ───

function TrendChart({
  title,
  data,
  labels,
  color,
  unit,
  invertTrend,
}: {
  title: string;
  data: number[];
  labels: string[];
  color: string;
  unit: string;
  invertTrend?: boolean;
}) {
  const first = data[0];
  const last = data[data.length - 1];
  const change = last - first;
  const isPositive = invertTrend ? change < 0 : change > 0;

  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-medium text-[var(--text3)] uppercase">{title}</p>
        <span className={`text-[9px] font-mono flex items-center gap-0.5 ${
          isPositive ? 'text-[var(--green)]' : 'text-red-400'
        }`}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {change > 0 ? '+' : ''}{change.toFixed(1)}{unit}
        </span>
      </div>
      <Sparkline data={data} color={color} height={40} />
      <div className="flex justify-between mt-1">
        {labels.map((l, i) => (
          <span key={i} className="text-[8px] text-[var(--text3)]">{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── PerformanceMetrics Component ───

export function PerformanceMetrics({ stats }: { stats: PerformanceStats }) {
  const costSavingsPct = Math.round((1 - stats.costPerDetection / stats.manualCostPerDetection) * 100);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <BarChart3 size={16} className="text-[var(--green)]" />
          Systemprestanda
        </h3>
        <p className="text-[10px] text-[var(--text3)] mt-0.5">
          Autonom övervakning — 6 månaders data
        </p>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard
          icon={<Timer size={16} />}
          label="Snitt detektering → åtgärd"
          value={stats.avgDetectionToAction.toFixed(1)}
          unit="timmar"
          trend="down"
          trendLabel="-48%"
          color="#4ade80"
        />
        <MetricCard
          icon={<ShieldCheck size={16} />}
          label="Falskt positiv-andel"
          value={`${stats.falsePositiveRate}`}
          unit="%"
          trend="down"
          trendLabel="-57%"
          color="#3b82f6"
        />
        <MetricCard
          icon={<Plane size={16} />}
          label="Drönar-dispatch lyckad"
          value={`${stats.droneDispatchSuccess}`}
          unit="%"
          trend="up"
          trendLabel="+16%"
          color="#f59e0b"
        />
        <MetricCard
          icon={<Banknote size={16} />}
          label="Kostnad per detektering"
          value={`${stats.costPerDetection}`}
          unit="SEK"
          trend="down"
          trendLabel={`-${costSavingsPct}%`}
          color="#a855f7"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <MetricCard
          icon={<TreePine size={16} />}
          label="Övervakad yta"
          value={stats.areasMonitored.toFixed(1)}
          unit="ha"
          color="#4ade80"
        />
        <MetricCard
          icon={<Satellite size={16} />}
          label="Satellitpassager/mån"
          value={`${stats.satellitePasses}`}
          color="#06b6d4"
        />
        <MetricCard
          icon={<Clock size={16} />}
          label="Manuell kostnad per detektering"
          value={`${stats.manualCostPerDetection}`}
          unit="SEK"
          color="#6b7280"
        />
      </div>

      {/* Savings banner */}
      <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 p-4 mb-4">
        <p className="text-sm font-semibold text-[var(--green)] text-center">
          BeetleSense sparar {stats.timeSaved} timmar/månad jämfört med manuell tillsyn
        </p>
        <p className="text-[10px] text-[var(--text3)] text-center mt-1">
          {costSavingsPct}% lägre kostnad per detektering | {stats.areasMonitored} ha övervakas automatiskt
        </p>
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TrendChart
          title="Detekteringstid (timmar)"
          data={stats.trends.detectionTime}
          labels={stats.trends.months}
          color="#4ade80"
          unit="h"
          invertTrend
        />
        <TrendChart
          title="Falskt positiv-andel (%)"
          data={stats.trends.falsePositiveRate}
          labels={stats.trends.months}
          color="#3b82f6"
          unit="%"
          invertTrend
        />
        <TrendChart
          title="Dispatch lyckad (%)"
          data={stats.trends.dispatchSuccess}
          labels={stats.trends.months}
          color="#f59e0b"
          unit="%"
        />
      </div>
    </div>
  );
}
