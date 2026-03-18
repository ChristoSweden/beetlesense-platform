import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wind,
  Droplets,
  ThermometerSun,
  Bug,
  Snowflake,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { WeatherIcon } from '@/components/dashboard/WeatherIcons';
import { getWeatherInfo, type RiskLevel } from '@/services/smhiService';

// ─── Helpers ───

function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return '#4ade80';
    case 'medium': return '#fbbf24';
    case 'high': return '#ef4444';
  }
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDate(isoString: string, locale: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return isoString;
  }
}

function formatHour(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Component ───

interface WeatherWidgetProps {
  /** WGS84 lat */
  lat?: number;
  /** WGS84 lon */
  lon?: number;
  /** Alternatively, provide a parcelId to look up coordinates */
  parcelId?: string;
}

export function WeatherWidget({ lat, lon, parcelId }: WeatherWidgetProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const locale = i18n.language;

  const weather = useWeather({ lat, lon, parcelId });

  if (weather.isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-40 rounded bg-[var(--bg3)] mb-3" />
        <div className="h-12 w-24 rounded bg-[var(--bg3)] mb-3" />
        <div className="flex gap-2">
          <div className="h-3 w-16 rounded bg-[var(--bg3)]" />
          <div className="h-3 w-16 rounded bg-[var(--bg3)]" />
          <div className="h-3 w-16 rounded bg-[var(--bg3)]" />
        </div>
      </div>
    );
  }

  if (!weather.current) {
    return null;
  }

  const { current, daily, droughtRisk, beetleConditions, frostRisk } = weather;
  const weatherInfo = getWeatherInfo(current.weatherSymbol);
  const desc = locale === 'sv' ? weatherInfo.descSv : weatherInfo.descEn;

  const droughtLabel =
    droughtRisk === 'low' ? t('weather.low') :
    droughtRisk === 'medium' ? t('weather.medium') :
    t('weather.high');

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            {t('weather.title')}
          </h3>
          <button
            onClick={weather.refetch}
            className="p-1 rounded hover:bg-[var(--bg3)] transition-colors"
            title={t('common.retry')}
          >
            <RefreshCw size={12} className="text-[var(--text3)]" />
          </button>
        </div>

        {/* Current conditions */}
        <div className="flex items-center gap-3 mb-2">
          <WeatherIcon type={weatherInfo.icon} size={32} />
          <div>
            <p className="text-2xl font-semibold font-mono text-[var(--text)]">
              {Math.round(current.temperature)}°C
            </p>
            <p className="text-[11px] text-[var(--text3)]">{desc}</p>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Wind size={12} className="text-[var(--text3)]" />
            <span className="text-[11px] text-[var(--text2)]">
              {Math.round(current.windSpeed * 10) / 10} m/s {windDirectionLabel(current.windDirection)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets size={12} className="text-[#60a5fa]" />
            <span className="text-[11px] text-[var(--text2)]">
              {Math.round(current.precipitation * 10) / 10} mm/h
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets size={12} className="text-[var(--text3)]" />
            <span className="text-[11px] text-[var(--text2)]">
              {Math.round(current.humidity)}%
            </span>
          </div>
        </div>

        {/* Forestry indicators */}
        <div className="space-y-1.5 mb-3">
          {/* Drought risk */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <ThermometerSun size={13} style={{ color: getRiskColor(droughtRisk) }} />
              <span className="text-[11px] text-[var(--text2)]">{t('weather.droughtRisk')}</span>
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: getRiskColor(droughtRisk),
                background: `${getRiskColor(droughtRisk)}15`,
              }}
            >
              {droughtLabel}
            </span>
          </div>

          {/* Beetle conditions */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Bug size={13} className={beetleConditions ? 'text-[#ef4444]' : 'text-[#4ade80]'} />
              <span className="text-[11px] text-[var(--text2)]">{t('weather.beetleActivity')}</span>
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: beetleConditions ? '#ef4444' : '#4ade80',
                background: beetleConditions ? '#ef444415' : '#4ade8015',
              }}
            >
              {beetleConditions ? t('weather.favorable') : t('weather.unfavorable')}
            </span>
          </div>

          {/* Ground frost */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Snowflake size={13} className={frostRisk ? 'text-[#60a5fa]' : 'text-[var(--text3)]'} />
              <span className="text-[11px] text-[var(--text2)]">{t('weather.groundFrost')}</span>
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: frostRisk ? '#60a5fa' : '#4ade80',
                background: frostRisk ? '#60a5fa15' : '#4ade8015',
              }}
            >
              {frostRisk ? t('weather.yes') : t('weather.no')}
            </span>
          </div>
        </div>

        {/* 5-day forecast */}
        <div className="mb-2">
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
            {t('weather.fiveDayForecast')}
          </p>
          <div className="flex gap-1">
            {daily.slice(0, 5).map((day) => {
              const dayInfo = getWeatherInfo(day.weatherSymbol);
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                >
                  <span className="text-[9px] text-[var(--text3)] font-medium">
                    {formatDate(day.date + 'T12:00:00', locale).split(' ')[0]}
                  </span>
                  <WeatherIcon type={dayInfo.icon} size={24} />
                  <div className="text-center">
                    <span className="text-[10px] font-semibold text-[var(--text)]">
                      {Math.round(day.maxTemp)}°
                    </span>
                    <span className="text-[10px] text-[var(--text3)] ml-0.5">
                      {Math.round(day.minTemp)}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last updated + expand toggle */}
        <div className="flex items-center justify-between">
          {weather.fetchedAt && (
            <div className="flex items-center gap-1">
              <Clock size={10} className="text-[var(--text3)]" />
              <span className="text-[9px] text-[var(--text3)]">
                {formatTime(weather.fetchedAt)}
              </span>
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
          >
            {expanded ? t('weather.hideHourly') : t('weather.showHourly')}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expanded hourly forecast */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3 max-h-52 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
            {t('weather.hourlyForecast')}
          </p>
          <div className="space-y-1">
            {weather.hourly.slice(0, 24).map((hour, idx) => {
              const hourInfo = getWeatherInfo(hour.weatherSymbol);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 py-1 text-[11px]"
                >
                  <span className="w-12 text-[var(--text3)] font-mono text-[10px]">
                    {formatHour(hour.time)}
                  </span>
                  <WeatherIcon type={hourInfo.icon} size={24} />
                  <span className="w-10 font-semibold text-[var(--text)]">
                    {Math.round(hour.temperature * 10) / 10}°
                  </span>
                  <div className="flex items-center gap-1 w-16">
                    <Wind size={10} className="text-[var(--text3)]" />
                    <span className="text-[var(--text2)]">{Math.round(hour.windSpeed * 10) / 10}</span>
                  </div>
                  <div className="flex items-center gap-1 w-14">
                    <Droplets size={10} className="text-[#60a5fa]" />
                    <span className="text-[var(--text2)]">{Math.round(hour.precipitation * 10) / 10}</span>
                  </div>
                  <span className="text-[var(--text3)]">{Math.round(hour.humidity)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error notice */}
      {weather.error && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <p className="text-[10px] text-[var(--amber)]">
            {weather.error} — {t('weather.showingDemo')}
          </p>
        </div>
      )}
    </div>
  );
}
