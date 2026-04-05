import { useState, useEffect, memo } from 'react';
import { Droplets, AlertTriangle, TrendingDown } from 'lucide-react';
import {
  fetchSoilMoistureTimeSeries,
  type SoilMoistureTimeSeries,
  type DroughtStatus,
} from '@/services/opendata/era5SoilMoistureService';

// ─── Helpers ───

const SEVERITY_COLORS: Record<string, string> = {
  none: '#4ade80',
  mild: '#a3e635',
  moderate: '#fbbf24',
  severe: '#f97316',
  extreme: '#ef4444',
};

const SEVERITY_LABELS: Record<string, string> = {
  none: 'Normal',
  mild: 'Mild Drought',
  moderate: 'Moderate',
  severe: 'Severe',
  extreme: 'Extreme',
};

const TREND_ICONS: Record<string, string> = {
  wetting: '↑',
  stable: '→',
  drying: '↓',
};

// ─── Component ───

export const DroughtMonitorWidget = memo(function DroughtMonitorWidget({
  lat = 56.88,
  lng = 14.81,
}: {
  lat?: number;
  lng?: number;
}) {
  const [data, setData] = useState<SoilMoistureTimeSeries | null>(null);

  useEffect(() => {
    fetchSoilMoistureTimeSeries(lat, lng, 12).then(setData).catch(console.warn);
  }, [lat, lng]);

  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-32 bg-[var(--bg)] rounded mb-3" />
        <div className="h-16 bg-[var(--bg)] rounded" />
      </div>
    );
  }

  const { droughtStatus } = data;
  const color = SEVERITY_COLORS[droughtStatus.severity] ?? '#4ade80';
  const recentData = data.data.slice(-6);

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={16} style={{ color }} />
          <span className="text-sm font-semibold text-[var(--text)]">
            Soil Moisture & Drought
          </span>
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}
        >
          {SEVERITY_LABELS[droughtStatus.severity]}
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <span className="text-[10px] text-[var(--text3)] block mb-0.5">Anomaly</span>
          <span className="text-sm font-bold font-mono" style={{ color }}>
            {droughtStatus.currentAnomaly > 0 ? '+' : ''}{droughtStatus.currentAnomaly.toFixed(1)}σ
          </span>
        </div>
        <div className="rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <span className="text-[10px] text-[var(--text3)] block mb-0.5">Dry Months</span>
          <span className="text-sm font-bold font-mono text-[var(--text)]">
            {droughtStatus.consecutiveDryMonths}
          </span>
        </div>
        <div className="rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <span className="text-[10px] text-[var(--text3)] block mb-0.5">Trend</span>
          <span className="text-sm font-bold text-[var(--text)]">
            {TREND_ICONS[droughtStatus.trendDirection]} {droughtStatus.trendDirection}
          </span>
        </div>
      </div>

      {/* Mini moisture chart (last 6 months) */}
      <div className="rounded-lg p-2.5 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
        <span className="text-[10px] font-semibold text-[var(--text2)] block mb-2">
          Soil Moisture (6 months)
        </span>
        <div className="flex items-end gap-1 h-12">
          {recentData.map((d, i) => {
            const maxVWC = 0.45;
            const height = Math.max(4, (d.volumetricWaterContent / maxVWC) * 100);
            const barColor = d.anomaly < -0.5 ? '#f97316' : d.anomaly < -0.2 ? '#fbbf24' : '#4ade80';
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{ height: `${height}%`, background: barColor, opacity: 0.7 }}
                />
                <span className="text-[8px] text-[var(--text3)]">
                  {d.date.slice(5, 7)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Beetle risk link */}
      {droughtStatus.severity !== 'none' && (
        <div
          className="mt-2 rounded-lg p-2 flex items-start gap-2 border"
          style={{ background: `${color}08`, borderColor: `${color}30` }}
        >
          <AlertTriangle size={12} style={{ color, flexShrink: 0, marginTop: 1 }} />
          <p className="text-[10px] text-[var(--text2)]">
            {droughtStatus.severity === 'extreme' || droughtStatus.severity === 'severe'
              ? 'Drought-stressed trees are highly vulnerable to bark beetle attack. Prioritize inspection of spruce stands.'
              : 'Moderate moisture deficit detected. Monitor spruce stands for early stress signs.'}
          </p>
        </div>
      )}

      <p className="text-[9px] text-[var(--text3)] mt-2">
        Source: ERA5-Land reanalysis ({data.period.start.slice(0, 7)} – {data.period.end.slice(0, 7)}) | Percentile: {droughtStatus.percentile}th
      </p>
    </div>
  );
});
