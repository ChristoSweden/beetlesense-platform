import { Link } from 'react-router-dom';
import {
  Radio,
  Thermometer,
  Droplets,
  Wind,
  ChevronRight,
  Plus,
  Clock,
} from 'lucide-react';

// ─── Demo data (matches WeatherStationPage demo data) ───

interface StationReading {
  temperature_c: number;
  humidity_pct: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
}

interface StationSummary {
  id: string;
  name: string;
  status: 'connected' | 'offline' | 'pending' | 'error';
  device_type: string;
  last_reading?: StationReading;
  last_reading_at?: string;
}

const DEMO_STATIONS: StationSummary[] = [
  {
    id: 'ws-1',
    name: 'Norr\u00e5ker North',
    status: 'connected',
    device_type: 'Davis Vantage Pro2',
    last_reading: { temperature_c: 7.2, humidity_pct: 68, wind_speed_ms: 4.3, wind_direction_deg: 195 },
    last_reading_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: 'ws-2',
    name: 'S\u00f6dra Skogen Edge',
    status: 'connected',
    device_type: 'Ecowitt',
    last_reading: { temperature_c: 9.8, humidity_pct: 72, wind_speed_ms: 3.1, wind_direction_deg: 210 },
    last_reading_at: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
];

function windLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export function WeatherStationWidget() {
  // In production, this would fetch from Supabase. For now, use demo data.
  const stations = DEMO_STATIONS;
  const hasStations = stations.length > 0;
  const primary = stations[0];

  if (!hasStations) {
    return (
      <div
        className="rounded-xl border border-[var(--border)] overflow-hidden"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              Weather Station
            </h3>
            <Radio size={14} className="text-[var(--text3)]" />
          </div>
          <p className="text-xs text-[var(--text3)] mb-3">
            Connect a weather station for hyper-local forecasts and better beetle predictions.
          </p>
          <Link
            to="/owner/weather-stations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[var(--green)] text-white hover:brightness-110 transition-colors"
          >
            <Plus size={12} /> Set up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/owner/weather-stations"
      className="block rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--green)]/30 transition-colors"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Weather Station
          </h3>
          <div className="flex items-center gap-1.5">
            {/* Status indicator */}
            <span className="relative flex h-2 w-2">
              {primary.status === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${primary.status === 'connected' ? 'bg-[#16a34a]' : 'bg-[#6b7280]'}`} />
            </span>
            <Radio size={14} className="text-[var(--text3)]" />
          </div>
        </div>

        {/* Station name */}
        <p className="text-xs font-medium text-[var(--text)] mb-2">{primary.name}</p>

        {/* Readings */}
        {primary.last_reading && (
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-1">
              <Thermometer size={12} className="text-[#ef4444]" />
              <span className="text-sm font-bold font-mono text-[var(--text)]">{primary.last_reading.temperature_c}&deg;C</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets size={12} className="text-[#3b82f6]" />
              <span className="text-xs font-mono text-[var(--text)]">{primary.last_reading.humidity_pct}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind size={12} className="text-[#64748b]" />
              <span className="text-xs font-mono text-[var(--text)]">{primary.last_reading.wind_speed_ms} m/s {windLabel(primary.last_reading.wind_direction_deg)}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
            <Clock size={10} />
            {primary.last_reading_at ? formatTime(primary.last_reading_at) : 'No data'}
            {stations.length > 1 && (
              <span className="ml-1">+{stations.length - 1} more</span>
            )}
          </div>
          <ChevronRight size={14} className="text-[var(--text3)]" />
        </div>
      </div>
    </Link>
  );
}
