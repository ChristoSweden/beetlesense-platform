import { useMemo } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  CloudLightning,
  Droplets,
  Eye,
  ArrowUp,
  RefreshCw,
  Thermometer,
  Sprout,
  AlertTriangle,
} from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { getWeatherInfo, type DailyForecast, type WeatherIconType } from '@/services/smhiService';

interface WeatherDashboardProps {
  lat?: number;
  lon?: number;
  parcelId?: string;
}

function getWeatherIcon(iconType: WeatherIconType, size: number = 20) {
  const props = { size, strokeWidth: 1.5 };
  switch (iconType) {
    case 'clear-day':
      return <Sun {...props} className="text-yellow-400" />;
    case 'clear-night':
      return <Sun {...props} className="text-blue-300" />;
    case 'partly-cloudy':
      return <Cloud {...props} className="text-slate-300" />;
    case 'cloudy':
      return <Cloud {...props} className="text-slate-400" />;
    case 'fog':
      return <Cloud {...props} className="text-slate-500" />;
    case 'light-rain':
      return <CloudRain {...props} className="text-blue-400" />;
    case 'heavy-rain':
      return <CloudRain {...props} className="text-blue-500" />;
    case 'snow':
      return <CloudSnow {...props} className="text-cyan-300" />;
    case 'thunder':
      return <CloudLightning {...props} className="text-yellow-500" />;
    default:
      return <Cloud {...props} className="text-slate-400" />;
  }
}

function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SV', 'V', 'NV'];
  return dirs[Math.round(deg / 45) % 8];
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['S\u00f6n', 'M\u00e5n', 'Tis', 'Ons', 'Tor', 'Fre', 'L\u00f6r'];
  return days[date.getDay()];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function isHarvestDay(date: string, harvestWindows: Array<{ startDate: string; endDate: string }>): boolean {
  for (const w of harvestWindows) {
    if (date >= w.startDate && date <= w.endDate) return true;
  }
  return false;
}

function DailyCard({ day, isHarvest }: { day: DailyForecast; isHarvest: boolean }) {
  const info = getWeatherInfo(day.weatherSymbol);

  return (
    <div className="flex flex-col items-center gap-1 min-w-[72px] px-2 py-3 rounded-lg border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.6)] hover:bg-[rgba(4,28,8,0.9)] transition-colors">
      <span className="text-[11px] font-medium text-[#94a3b8]">{formatDay(day.date)}</span>
      <span className="text-[10px] text-[#64748b]">{formatDate(day.date)}</span>
      <div className="my-1">{getWeatherIcon(info.icon, 22)}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-semibold text-[#e2e8f0]">{Math.round(day.maxTemp)}\u00b0</span>
        <span className="text-xs text-[#64748b]">{Math.round(day.minTemp)}\u00b0</span>
      </div>
      {day.totalPrecipitation > 0.1 && (
        <div className="flex items-center gap-0.5">
          <Droplets size={10} className="text-blue-400" />
          <span className="text-[10px] text-blue-400">{day.totalPrecipitation.toFixed(1)}</span>
        </div>
      )}
      <div className="flex items-center gap-0.5">
        <Wind size={10} className="text-[#64748b]" />
        <span className="text-[10px] text-[#64748b]">{day.avgWindSpeed.toFixed(0)} m/s</span>
      </div>
      {isHarvest && (
        <div className="w-full h-1 rounded-full bg-[#4ade80] mt-1" title="Sk\u00f6rdef\u00f6nster" />
      )}
    </div>
  );
}

export function WeatherDashboard({ lat, lon, parcelId }: WeatherDashboardProps) {
  const {
    current,
    daily,
    harvestWindows,
    stormAlerts,
    gdd,
    isLoading,
    error,
    refetch,
    fetchedAt,
  } = useWeather({ lat, lon, parcelId });

  const currentInfo = useMemo(
    () => (current ? getWeatherInfo(current.weatherSymbol) : null),
    [current]
  );

  const gddTarget = 200;
  const gddPercent = Math.min((gdd / gddTarget) * 100, 100);

  const hasActiveStorm = stormAlerts.length > 0;
  const worstStorm = hasActiveStorm
    ? stormAlerts.reduce((worst, s) =>
        s.severity === 'severe' ? s : worst.severity === 'severe' ? worst : s
      )
    : null;

  if (isLoading && !current) {
    return (
      <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-6">
        <div className="flex items-center gap-3">
          <RefreshCw size={16} className="text-[#4ade80] animate-spin" />
          <span className="text-sm text-[#94a3b8]">Laddar v\u00e4derdata fr\u00e5n SMHI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Storm Alert Banner */}
      {hasActiveStorm && worstStorm && (
        <div
          className="rounded-xl border px-4 py-3 flex items-center gap-3 animate-pulse"
          style={{
            borderColor: worstStorm.severity === 'severe' ? 'rgba(239,68,68,0.5)' : 'rgba(249,115,22,0.5)',
            background: worstStorm.severity === 'severe' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
          }}
        >
          <AlertTriangle
            size={20}
            className={worstStorm.severity === 'severe' ? 'text-red-500' : 'text-orange-500'}
          />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${worstStorm.severity === 'severe' ? 'text-red-400' : 'text-orange-400'}`}>
              {worstStorm.titleSv}
            </p>
            <p className="text-xs text-[#94a3b8]">{worstStorm.descriptionSv}</p>
          </div>
          <span className="text-xs text-[#64748b] whitespace-nowrap">
            {worstStorm.maxGust} m/s byar
          </span>
        </div>
      )}

      {/* Current Conditions Hero */}
      {current && currentInfo && (
        <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-[#64748b] mb-1">Just nu / Current</p>
              <div className="flex items-center gap-3">
                {getWeatherIcon(currentInfo.icon, 40)}
                <div>
                  <span className="text-4xl font-bold text-[#e2e8f0]">
                    {Math.round(current.temperature)}\u00b0C
                  </span>
                  <p className="text-sm text-[#94a3b8]">{currentInfo.descSv}</p>
                </div>
              </div>
            </div>

            <button
              onClick={refetch}
              className="p-2 rounded-lg border border-[rgba(74,222,128,0.15)] hover:bg-[rgba(74,222,128,0.1)] transition-colors"
              title="Uppdatera"
            >
              <RefreshCw size={14} className={`text-[#4ade80] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <div className="relative">
                <Wind size={16} className="text-[#4ade80]" />
              </div>
              <div>
                <p className="text-xs text-[#64748b]">Vind</p>
                <p className="text-sm text-[#e2e8f0]">
                  {current.windSpeed.toFixed(1)} m/s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <div
                className="transition-transform"
                style={{ transform: `rotate(${current.windDirection}deg)` }}
              >
                <ArrowUp size={16} className="text-[#4ade80]" />
              </div>
              <div>
                <p className="text-xs text-[#64748b]">Riktning</p>
                <p className="text-sm text-[#e2e8f0]">
                  {windDirectionLabel(current.windDirection)} {current.windDirection}\u00b0
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <Droplets size={16} className="text-blue-400" />
              <div>
                <p className="text-xs text-[#64748b]">Luftfuktighet</p>
                <p className="text-sm text-[#e2e8f0]">{Math.round(current.humidity)}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <Eye size={16} className="text-[#94a3b8]" />
              <div>
                <p className="text-xs text-[#64748b]">Sikt</p>
                <p className="text-sm text-[#e2e8f0]">{current.visibility.toFixed(0)} km</p>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-xs text-yellow-500">
              Kunde inte h\u00e4mta livedata. Visar uppskattade v\u00e4rden.
            </p>
          )}

          {fetchedAt && (
            <p className="mt-2 text-[10px] text-[#64748b]">
              Uppdaterad: {new Date(fetchedAt).toLocaleString('sv-SE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      )}

      {/* 10-Day Forecast Strip */}
      <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">10-dagarsprognos</h3>
          <span className="text-[10px] text-[#64748b]">K\u00e4lla: SMHI</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[rgba(74,222,128,0.2)]">
          {daily.map((day) => (
            <DailyCard
              key={day.date}
              day={day}
              isHarvest={isHarvestDay(day.date, harvestWindows)}
            />
          ))}
        </div>

        {harvestWindows.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="w-3 h-1 rounded-full bg-[#4ade80]" />
            <span className="text-[10px] text-[#64748b]">
              Gr\u00f6nt = sk\u00f6rdef\u00f6nster (torrt, l\u00e4tt vind)
            </span>
          </div>
        )}
      </div>

      {/* Growing Degree Days */}
      <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sprout size={16} className="text-[#4ade80]" />
          <h3 className="text-sm font-semibold text-[#e2e8f0]">V\u00e4xtgraddag (GDD)</h3>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#94a3b8]">Ackumulerat &gt;5\u00b0C (prognosperiod)</span>
          <span className="text-sm font-semibold text-[#4ade80]">{gdd.toFixed(1)} \u00b0Cd</span>
        </div>

        <div className="w-full h-3 rounded-full bg-[rgba(4,28,8,0.6)] border border-[rgba(74,222,128,0.1)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${gddPercent}%`,
              background: gddPercent > 75
                ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                : gddPercent > 40
                  ? 'linear-gradient(90deg, #4ade80, #86efac)'
                  : 'linear-gradient(90deg, #94a3b8, #4ade80)',
            }}
          />
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#64748b]">0</span>
          <span className="text-[10px] text-[#64748b]">M\u00e5l: {gddTarget} \u00b0Cd</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
            <Thermometer size={12} className="text-[#94a3b8] mx-auto mb-1" />
            <p className="text-[10px] text-[#64748b]">Sn.temp</p>
            <p className="text-xs text-[#e2e8f0]">
              {daily.length > 0
                ? (daily.reduce((s, d) => s + (d.maxTemp + d.minTemp) / 2, 0) / daily.length).toFixed(1)
                : '-'}
              \u00b0C
            </p>
          </div>
          <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
            <Sun size={12} className="text-yellow-400 mx-auto mb-1" />
            <p className="text-[10px] text-[#64748b]">Dagar &gt;5\u00b0C</p>
            <p className="text-xs text-[#e2e8f0]">
              {daily.filter((d) => (d.maxTemp + d.minTemp) / 2 > 5).length}/{daily.length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
            <Sprout size={12} className="text-[#4ade80] mx-auto mb-1" />
            <p className="text-[10px] text-[#64748b]">GDD/dag</p>
            <p className="text-xs text-[#e2e8f0]">
              {daily.length > 0 ? (gdd / daily.length).toFixed(1) : '-'} \u00b0Cd
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
