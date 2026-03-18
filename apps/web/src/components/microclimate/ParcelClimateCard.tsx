import {
  Thermometer,
  Droplets,
  Wind,
  Mountain,
  Bug,
  Snowflake,
  TreePine,
} from 'lucide-react';
import type { ParcelMicroclimate, BeetleRiskLevel } from '@/hooks/useMicroclimate';

// ─── Helpers ───

function riskColor(level: BeetleRiskLevel): string {
  switch (level) {
    case 'low': return '#4ade80';
    case 'medium': return '#fbbf24';
    case 'high': return '#f97316';
    case 'critical': return '#ef4444';
  }
}

function riskLabel(level: BeetleRiskLevel): string {
  switch (level) {
    case 'low': return 'Låg';
    case 'medium': return 'Medel';
    case 'high': return 'Hög';
    case 'critical': return 'Kritisk';
  }
}

// ─── Mini Sparkline ───

function Sparkline({ data, color = '#4ade80' }: { data: { avg: number }[]; color?: string }) {
  if (data.length < 2) return null;
  const values = data.map((d) => d.avg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 120;
  const height = 28;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── GDD Gauge ───

function GDDGauge({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, (current / target) * 100);
  const threshold600Pct = (600 / target) * 100;
  const threshold900Pct = (900 / target) * 100;

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[var(--text3)]">GDD (bas 5°C)</span>
        <span className="text-[10px] font-mono font-semibold text-[var(--text)]">{current}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-[var(--bg3)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: current >= 600 ? (current >= 900 ? '#ef4444' : '#f97316') : '#4ade80',
          }}
        />
        {/* 600 threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[var(--yellow)]"
          style={{ left: `${threshold600Pct}%` }}
          title="600 GDD — Första svärmning"
        />
        {/* 900 threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[var(--red)]"
          style={{ left: `${threshold900Pct}%` }}
          title="900 GDD — Andra generationen"
        />
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[9px] text-[var(--text3)]">0</span>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-[var(--yellow)]">600</span>
          <span className="text-[9px] text-[var(--red)]">900</span>
        </div>
        <span className="text-[9px] text-[var(--text3)]">{target}</span>
      </div>
    </div>
  );
}

// ─── Component ───

interface ParcelClimateCardProps {
  parcel: ParcelMicroclimate;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ParcelClimateCard({ parcel, isSelected, onClick }: ParcelClimateCardProps) {
  const color = riskColor(parcel.beetleRiskLevel);
  const frostDays = parcel.frostRiskDays.filter((d) => d.hasFrost).length;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border transition-all ${
        isSelected
          ? 'border-[var(--green)] ring-1 ring-[var(--green)]/30'
          : 'border-[var(--border)] hover:border-[var(--border2)]'
      }`}
      style={{ background: 'var(--bg2)' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">{parcel.parcelName}</h3>
            <p className="text-[10px] text-[var(--text3)]">
              {parcel.areaHectares} ha &middot; {parcel.aspect}
            </p>
          </div>
          {/* Beetle risk badge */}
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ color, background: `${color}15` }}
          >
            {riskLabel(parcel.beetleRiskLevel)}
          </div>
        </div>

        {/* Current conditions grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <Thermometer size={12} className="text-[#f97316]" />
            <span className="text-xs font-mono font-semibold text-[var(--text)]">{parcel.currentTemp}°</span>
            <span className="text-[8px] text-[var(--text3)]">Temp</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <Droplets size={12} className="text-[#60a5fa]" />
            <span className="text-xs font-mono font-semibold text-[var(--text)]">{parcel.currentHumidity}%</span>
            <span className="text-[8px] text-[var(--text3)]">Fukt</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <Wind size={12} className="text-[var(--text3)]" />
            <span className="text-xs font-mono font-semibold text-[var(--text)]">{parcel.currentWindSpeed}</span>
            <span className="text-[8px] text-[var(--text3)]">m/s</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <Droplets size={12} className="text-[#a78bfa]" />
            <span className="text-xs font-mono font-semibold text-[var(--text)]">{parcel.soilMoisture}%</span>
            <span className="text-[8px] text-[var(--text3)]">Mark</span>
          </div>
        </div>

        {/* GDD Gauge */}
        <div className="mb-3">
          <GDDGauge current={parcel.gddCurrent} target={parcel.gddYearlyTarget} />
        </div>

        {/* Beetle flight risk + frost + sparkline row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Beetle score */}
            <div className="flex items-center gap-1">
              <Bug size={11} style={{ color }} />
              <span className="text-[10px] font-mono font-bold" style={{ color }}>
                {parcel.beetleRiskScore}/100
              </span>
            </div>
            {/* Frost risk */}
            {frostDays > 0 && (
              <div className="flex items-center gap-1">
                <Snowflake size={11} className="text-[#60a5fa]" />
                <span className="text-[10px] font-mono text-[#60a5fa]">
                  {frostDays}d frost
                </span>
              </div>
            )}
          </div>

          {/* Sparkline */}
          <Sparkline data={parcel.tempHistory30d} color="var(--green)" />
        </div>

        {/* Elevation + aspect info */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1">
            <Mountain size={10} className="text-[var(--text3)]" />
            <span className="text-[9px] text-[var(--text3)]">{parcel.elevation}m ö.h.</span>
          </div>
          <div className="flex items-center gap-1">
            <TreePine size={10} className="text-[var(--text3)]" />
            <span className="text-[9px] text-[var(--text3)]">{parcel.sprucePct}% gran</span>
          </div>
          {parcel.daysUntilGDD600 !== null && (
            <span className="text-[9px] text-[var(--yellow)] ml-auto">
              ~{parcel.daysUntilGDD600}d till GDD 600
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
