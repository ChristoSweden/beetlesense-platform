import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wind, ArrowUp, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import {
  getWindConditions,
  getWindAlertColor,
  type WindAlertLevel,
} from '@/services/stormRiskService';

function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function formatHour(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getBarHeight(speed: number, maxSpeed: number): number {
  return Math.max(4, (speed / maxSpeed) * 48);
}

function getBarColor(speed: number): string {
  if (speed > 25) return '#ef4444';
  if (speed > 15) return '#f97316';
  if (speed > 8) return '#fbbf24';
  return '#4ade80';
}

export function WindForecast() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const conditions = getWindConditions();
  const alertColor = getWindAlertColor(conditions.alertLevel);
  const maxForecastSpeed = Math.max(...conditions.forecast48h.map((h) => h.gustSpeed), 1);

  const isStormWarning = conditions.alertLevel === 'storm_warning' || conditions.alertLevel === 'strong';

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Storm warning banner */}
      {isStormWarning && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-b"
          style={{ background: `${alertColor}15`, borderColor: `${alertColor}40` }}
        >
          <AlertTriangle size={14} style={{ color: alertColor }} />
          <span className="text-[11px] font-semibold" style={{ color: alertColor }}>
            {conditions.alertLevel === 'storm_warning'
              ? t('storm.wind.stormWarningBanner')
              : t('storm.wind.strongWindBanner')}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            {t('storm.wind.title')}
          </h3>
          <Wind size={16} className="text-[var(--text3)]" />
        </div>
      </div>

      {/* Current conditions */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-4 mb-3">
          {/* Wind speed */}
          <div>
            <p className="text-2xl font-bold font-mono text-[var(--text)]">
              {conditions.currentSpeed}
              <span className="text-sm text-[var(--text3)] ml-1">m/s</span>
            </p>
            <p className="text-[10px] text-[var(--text3)]">
              {t('storm.wind.gusts')}: {conditions.currentGust} m/s
            </p>
          </div>

          {/* Wind direction compass */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--bg)]"
              title={`${conditions.currentDirection}° (${windDirectionLabel(conditions.currentDirection)})`}
            >
              <ArrowUp
                size={16}
                className="text-[var(--text2)]"
                style={{ transform: `rotate(${conditions.currentDirection}deg)` }}
              />
            </div>
            <span className="text-xs font-mono text-[var(--text2)]">
              {windDirectionLabel(conditions.currentDirection)}
            </span>
          </div>

          {/* Alert level */}
          <div className="ml-auto">
            <span
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ color: alertColor, background: `${alertColor}15` }}
            >
              {t(`storm.wind.alert.${conditions.alertLevel}`)}
            </span>
          </div>
        </div>

        {/* Alert level scale */}
        <div className="flex gap-1 mb-3">
          {(['calm', 'moderate', 'strong', 'storm_warning'] as WindAlertLevel[]).map((level) => {
            const color = getWindAlertColor(level);
            const isActive = level === conditions.alertLevel;
            return (
              <div
                key={level}
                className="flex-1 h-1.5 rounded-full transition-all"
                style={{
                  background: isActive ? color : `${color}30`,
                  boxShadow: isActive ? `0 0 6px ${color}40` : 'none',
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[8px] text-[var(--text3)] mb-4">
          <span>&lt;8 m/s</span>
          <span>8-15</span>
          <span>15-25</span>
          <span>&gt;25</span>
        </div>

        {/* 48h forecast bar chart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
              {t('storm.wind.forecast48h')}
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
            >
              {expanded ? t('storm.wind.showLess') : t('storm.wind.showAll')}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          <div className="flex items-end gap-[2px] h-14 overflow-hidden">
            {conditions.forecast48h.slice(0, expanded ? 48 : 24).map((hour, idx) => {
              const height = getBarHeight(hour.windSpeed, maxForecastSpeed);
              const color = getBarColor(hour.windSpeed);
              return (
                <div
                  key={idx}
                  className="flex-1 min-w-0 rounded-t transition-all cursor-default group relative"
                  style={{ height: `${height}px`, background: color }}
                  title={`${formatHour(hour.time)}: ${hour.windSpeed} m/s (gusts ${hour.gustSpeed} m/s) ${windDirectionLabel(hour.windDirection)}`}
                />
              );
            })}
          </div>

          {/* Time labels */}
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-[var(--text3)]">{t('storm.wind.now')}</span>
            <span className="text-[8px] text-[var(--text3)]">+12h</span>
            <span className="text-[8px] text-[var(--text3)]">{expanded ? '+36h' : '+24h'}</span>
            {expanded && <span className="text-[8px] text-[var(--text3)]">+48h</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
