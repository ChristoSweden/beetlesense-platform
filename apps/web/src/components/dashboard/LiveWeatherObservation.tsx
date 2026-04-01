import { useState, useEffect, useCallback } from 'react';
import { Thermometer, Wind, Droplets, CloudRain, RefreshCw, Radio, AlertCircle } from 'lucide-react';
import {
  getLiveWeatherObservation,
  type LiveWeatherObservation as LiveWeatherData,
} from '@/services/opendata/smhiObservationService';

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function LiveWeatherObservationWidget() {
  const [data, setData] = useState<LiveWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const result = await getLiveWeatherObservation('vaxjo');
      setData(result);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    // Auto-refresh every 10 minutes
    const interval = setInterval(fetch, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetch]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetch();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Radio size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Live Station Data</span>
        </div>
        <div className="grid grid-cols-2 gap-2 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 rounded-lg bg-[var(--bg3)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const readings = [
    {
      icon: <Thermometer size={14} />,
      label: 'Temperature',
      value: data.temperature !== null ? `${data.temperature.toFixed(1)}°C` : '--',
      color: data.temperature !== null
        ? data.temperature > 25 ? '#ef4444' : data.temperature < 0 ? '#60a5fa' : '#4ade80'
        : '#94a3b8',
    },
    {
      icon: <Wind size={14} />,
      label: 'Wind',
      value: data.windSpeed !== null ? `${data.windSpeed.toFixed(1)} m/s` : '--',
      color: data.windSpeed !== null
        ? data.windSpeed > 10 ? '#ef4444' : data.windSpeed > 6 ? '#fbbf24' : '#4ade80'
        : '#94a3b8',
    },
    {
      icon: <Droplets size={14} />,
      label: 'Humidity',
      value: data.humidity !== null ? `${data.humidity}%` : '--',
      color: '#60a5fa',
    },
    {
      icon: <CloudRain size={14} />,
      label: 'Precipitation',
      value: data.precipitation !== null ? `${data.precipitation.toFixed(1)} mm/h` : '--',
      color: data.precipitation !== null && data.precipitation > 0 ? '#60a5fa' : '#4ade80',
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Live Station Data</span>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1 rounded-lg hover:bg-[var(--bg3)] transition-colors"
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw
            size={12}
            className={`text-[var(--text3)] ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Station info */}
      <div className="flex items-center gap-1.5 mb-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: data.isLive ? '#4ade80' : '#fbbf24',
            boxShadow: data.isLive ? '0 0 6px #4ade8080' : 'none',
          }}
        />
        <span className="text-[10px] text-[var(--text3)]">
          {data.stationName} ({data.stationId})
        </span>
        <span className="text-[10px] text-[var(--text3)] opacity-60">
          {formatTimestamp(data.timestamp)}
        </span>
      </div>

      {/* Readings grid */}
      <div className="grid grid-cols-2 gap-2">
        {readings.map(r => (
          <div
            key={r.label}
            className="rounded-lg p-2.5 flex items-start gap-2"
            style={{ background: 'var(--bg3)' }}
          >
            <div style={{ color: r.color }} className="mt-0.5">{r.icon}</div>
            <div>
              <p className="text-sm font-bold font-mono text-[var(--text)]" style={{ color: r.color }}>
                {r.value}
              </p>
              <p className="text-[9px] text-[var(--text3)]">{r.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Source */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-[var(--text3)] opacity-60">
          Source: SMHI Open Data (observations)
        </span>
        {!data.isLive && (
          <span className="text-[9px] text-[var(--text3)] opacity-60 flex items-center gap-0.5">
            <AlertCircle size={8} />
            Fallback data
          </span>
        )}
      </div>
    </div>
  );
}
