import { useState, useEffect } from 'react';
import { Shield, TrendingUp, TrendingDown, Minus, Leaf, Bug, Droplets, Thermometer } from 'lucide-react';
import {
  getSatelliteOverview,
  type SatelliteOverview,
} from '@/services/opendata/sentinelService';
import {
  getLiveWeatherObservation,
  type LiveWeatherObservation,
} from '@/services/opendata/smhiObservationService';
import {
  getGlobalForestWatchOverview,
  type GFWOverview,
} from '@/services/opendata/globalForestWatchService';

interface HealthFactor {
  label: string;
  score: number;
  icon: React.ReactNode;
  detail: string;
  source: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#4ade80';
  if (score >= 40) return '#fbbf24';
  return '#ef4444';
}

function trendIcon(val: number) {
  if (val > 0.005) return <TrendingUp size={10} />;
  if (val < -0.005) return <TrendingDown size={10} />;
  return <Minus size={10} />;
}

export function ForestHealthIndicatorWidget() {
  const [satellite, setSatellite] = useState<SatelliteOverview | null>(null);
  const [weather, setWeather] = useState<LiveWeatherObservation | null>(null);
  const [gfw, setGfw] = useState<GFWOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSatelliteOverview(),
      getLiveWeatherObservation(),
      getGlobalForestWatchOverview(),
    ])
      .then(([sat, wx, forest]) => {
        setSatellite(sat);
        setWeather(wx);
        setGfw(forest);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Live Forest Health</span>
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-16 w-full rounded-lg bg-[var(--bg3)]" />
          <div className="h-3 w-2/3 rounded bg-[var(--bg3)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--bg3)]" />
        </div>
      </div>
    );
  }

  // Compute composite health score from all sources
  const factors: HealthFactor[] = [];

  if (satellite) {
    const ndvi = satellite.ndviStats;
    // NDVI score: 0.3 -> 0, 0.8 -> 100
    const ndviScore = Math.round(Math.max(0, Math.min(100, (ndvi.mean - 0.3) / 0.5 * 100)));
    factors.push({
      label: 'Vegetation Index',
      score: ndviScore,
      icon: <Leaf size={12} style={{ color: scoreColor(ndviScore) }} />,
      detail: `NDVI ${ndvi.mean.toFixed(2)} (${ndvi.healthyPct}% healthy)`,
      source: 'Sentinel-2',
    });
  }

  if (weather) {
    // Temperature score: extreme cold or heat is bad for forests
    const temp = weather.temperature ?? 10;
    let tempScore = 75;
    if (temp >= 5 && temp <= 25) tempScore = 85;
    else if (temp < 0 || temp > 30) tempScore = 40;
    factors.push({
      label: 'Temperature',
      score: tempScore,
      icon: <Thermometer size={12} style={{ color: scoreColor(tempScore) }} />,
      detail: `${temp.toFixed(1)}°C at ${weather.stationName}`,
      source: 'SMHI',
    });

    // Moisture score
    const humidity = weather.humidity ?? 65;
    const moistureScore = humidity >= 40 && humidity <= 80 ? 80 : humidity > 80 ? 60 : 45;
    factors.push({
      label: 'Moisture',
      score: moistureScore,
      icon: <Droplets size={12} style={{ color: scoreColor(moistureScore) }} />,
      detail: `${humidity}% RH, ${(weather.precipitation ?? 0).toFixed(1)} mm/h rain`,
      source: 'SMHI',
    });
  }

  if (gfw) {
    // Alert score: fewer alerts = healthier
    const alerts = gfw.alertCount30d;
    const alertScore = alerts <= 3 ? 90 : alerts <= 8 ? 70 : 45;
    factors.push({
      label: 'Disturbance',
      score: alertScore,
      icon: <Bug size={12} style={{ color: scoreColor(alertScore) }} />,
      detail: `${alerts} alerts in 30 days (${gfw.alertTrend})`,
      source: 'GFW',
    });
  }

  const overallScore = factors.length > 0
    ? Math.round(factors.reduce((sum, f) => sum + f.score, 0) / factors.length)
    : 0;

  const ndviChange = satellite?.ndviStats.changeFromPrevious ?? 0;

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Live Forest Health</span>
        </div>
        <div className="flex items-center gap-1" style={{ color: scoreColor(overallScore) }}>
          {trendIcon(ndviChange)}
          <span className="text-[10px] font-semibold">{overallScore}/100</span>
        </div>
      </div>

      {/* Score arc visualization */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="var(--bg3)"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={scoreColor(overallScore)}
              strokeWidth="3"
              strokeDasharray={`${overallScore}, 100`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold font-mono" style={{ color: scoreColor(overallScore) }}>
              {overallScore}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-xs font-semibold text-[var(--text)]">
            {overallScore >= 70 ? 'Forest conditions are good' :
             overallScore >= 40 ? 'Some areas need attention' :
             'Multiple risk factors detected'}
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            Aggregated from {factors.length} data sources updated live
          </p>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-1.5">
        {factors.map(factor => (
          <div
            key={factor.label}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: 'var(--bg3)' }}
          >
            {factor.icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[var(--text)]">{factor.label}</span>
                <span
                  className="text-[10px] font-mono font-bold"
                  style={{ color: scoreColor(factor.score) }}
                >
                  {factor.score}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--text3)] truncate">{factor.detail}</span>
                <span className="text-[8px] text-[var(--text3)] opacity-50 ml-1">{factor.source}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live indicator */}
      <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: weather?.isLive ? '#4ade80' : '#fbbf24' }}
        />
        <span className="text-[9px] text-[var(--text3)]">
          {weather?.isLive ? 'Live data' : 'Demo data'} from SMHI, Sentinel-2, Global Forest Watch
        </span>
      </div>
    </div>
  );
}
