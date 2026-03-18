import { useState } from 'react';
import {
  Satellite,
  Camera,
  Scan,
  Thermometer,
  Mountain,
  CloudRain,
  Database,
  Wifi,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ───

export interface DataSource {
  id: string;
  name: string;
  icon: string;
  lastUpdate: string;        // ISO date or 'realtime'
  status: 'fresh' | 'stale' | 'missing';
  quality: 1 | 2 | 3 | 4 | 5;
  resolution?: string;
  coverage?: string;
  lastReading?: string;
  updateFrequency: string;
}

// ─── Demo Data ───

export const DEMO_DATA_SOURCES: DataSource[] = [
  {
    id: 'sentinel-2',
    name: 'Sentinel-2 satellit',
    icon: 'satellite',
    lastUpdate: '2026-03-14T08:00:00Z',
    status: 'fresh',
    quality: 4,
    resolution: '10m/pixel',
    coverage: '100%',
    lastReading: 'NDVI: 0.72 medel',
    updateFrequency: 'var 5:e dag',
  },
  {
    id: 'drone-rgb',
    name: 'Drönare RGB',
    icon: 'camera',
    lastUpdate: '2026-03-10T14:30:00Z',
    status: 'fresh',
    quality: 5,
    resolution: '2cm/pixel',
    coverage: '85%',
    lastReading: '2 480 bilder bearbetade',
    updateFrequency: 'senaste: 10 mars',
  },
  {
    id: 'multispectral',
    name: 'Multispektral',
    icon: 'scan',
    lastUpdate: '2026-03-10T14:30:00Z',
    status: 'fresh',
    quality: 5,
    resolution: '5cm/pixel',
    coverage: '85%',
    lastReading: 'NDVI anomali: 3 zoner',
    updateFrequency: 'senaste: 10 mars',
  },
  {
    id: 'thermal',
    name: 'Termisk',
    icon: 'thermometer',
    lastUpdate: '2026-03-10T14:30:00Z',
    status: 'fresh',
    quality: 4,
    resolution: '10cm/pixel',
    coverage: '85%',
    lastReading: 'Temp avvikelse: 2 zoner',
    updateFrequency: 'senaste: 10 mars',
  },
  {
    id: 'lidar',
    name: 'LiDAR',
    icon: 'mountain',
    lastUpdate: '2026-02-08T10:00:00Z',
    status: 'stale',
    quality: 3,
    resolution: '20 pts/m²',
    coverage: '100%',
    lastReading: 'Medelhöjd: 22.4m',
    updateFrequency: 'senaste: 8 feb',
  },
  {
    id: 'smhi',
    name: 'SMHI väder',
    icon: 'cloudrain',
    lastUpdate: 'realtime',
    status: 'fresh',
    quality: 4,
    resolution: '1km',
    coverage: '100%',
    lastReading: '12°C, 65% RF',
    updateFrequency: 'realtid',
  },
  {
    id: 'skogsstyrelsen',
    name: 'Skogsstyrelsen öppna data',
    icon: 'database',
    lastUpdate: '2026-03-01T00:00:00Z',
    status: 'fresh',
    quality: 3,
    resolution: 'Avdelningsnivå',
    coverage: '100%',
    lastReading: 'Svärmningsvarning: aktiv',
    updateFrequency: 'veckovis',
  },
];

// ─── Helpers ───

const ICON_MAP: Record<string, LucideIcon> = {
  satellite: Satellite,
  camera: Camera,
  scan: Scan,
  thermometer: Thermometer,
  mountain: Mountain,
  cloudrain: CloudRain,
  database: Database,
};

function getStatusColor(status: DataSource['status']): string {
  switch (status) {
    case 'fresh': return '#4ade80';
    case 'stale': return '#eab308';
    case 'missing': return '#ef4444';
  }
}

function getStatusLabel(status: DataSource['status']): string {
  switch (status) {
    case 'fresh': return 'Aktiv';
    case 'stale': return 'Ej aktuell';
    case 'missing': return 'Saknas';
  }
}

function formatFreshness(lastUpdate: string): string {
  if (lastUpdate === 'realtime') return 'Realtid';

  const now = new Date('2026-03-18T12:00:00Z');
  const then = new Date(lastUpdate);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Idag';
  if (diffDays === 1) return '1 dag sedan';
  if (diffDays < 7) return `${diffDays} dagar sedan`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'vecka' : 'veckor'} sedan`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} ${months === 1 ? 'månad' : 'månader'} sedan`;
}

// ─── Quality Bars Component ───

function QualityBars({ level }: { level: number }) {
  return (
    <div
      className="flex items-end gap-[2px]"
      role="img"
      aria-label={`Datakvalitet: ${level} av 5`}
    >
      {[1, 2, 3, 4, 5].map((bar) => (
        <div
          key={bar}
          className="rounded-[1px] transition-colors duration-200"
          style={{
            width: 3,
            height: 4 + bar * 2,
            backgroundColor: bar <= level ? '#4ade80' : 'rgba(74, 222, 128, 0.15)',
          }}
        />
      ))}
    </div>
  );
}

// ─── DataSourceBadge Component ───

interface DataSourceBadgeProps {
  source: DataSource;
  onClick?: (source: DataSource) => void;
}

export function DataSourceBadge({ source, onClick }: DataSourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const IconComp = ICON_MAP[source.icon] ?? Database;
  const freshness = formatFreshness(source.lastUpdate);
  const statusColor = getStatusColor(source.status);

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 border border-[var(--border)] transition-all duration-200 hover:border-[var(--border2)] hover:bg-[var(--bg3)] cursor-pointer text-left group"
        style={{ background: 'var(--bg2)' }}
        onClick={() => onClick?.(source)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`${source.name} — ${getStatusLabel(source.status)} — ${freshness}`}
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(74, 222, 128, 0.08)' }}
        >
          <IconComp size={16} className="text-[var(--green)]" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text)] truncate">
              {source.name}
            </span>
            {/* Status dot */}
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColor }}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[var(--text3)]">
              {freshness}
            </span>
          </div>
        </div>

        {/* Quality bars */}
        <QualityBars level={source.quality} />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-50 left-0 right-0 -top-1 -translate-y-full rounded-lg border border-[var(--border2)] px-3 py-2.5 shadow-xl pointer-events-none"
          style={{ background: '#0d1f10' }}
          role="tooltip"
        >
          <div className="text-[10px] text-[var(--text)] font-medium mb-1">
            {source.name}
          </div>
          <div className="space-y-0.5 text-[10px] text-[var(--text3)]">
            {source.lastReading && (
              <div className="flex items-center gap-1.5">
                {source.lastUpdate === 'realtime' ? (
                  <Wifi size={10} className="text-[var(--green)]" />
                ) : (
                  <WifiOff size={10} />
                )}
                <span>{source.lastReading}</span>
              </div>
            )}
            {source.resolution && (
              <div>Upplösning: {source.resolution}</div>
            )}
            {source.coverage && (
              <div>Täckning: {source.coverage}</div>
            )}
          </div>
          {/* Tooltip arrow */}
          <div
            className="absolute left-6 -bottom-1 w-2 h-2 rotate-45 border-b border-r border-[var(--border2)]"
            style={{ background: '#0d1f10' }}
          />
        </div>
      )}
    </div>
  );
}
export default DataSourceBadge;
