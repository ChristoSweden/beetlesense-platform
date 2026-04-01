import { useState, useEffect } from 'react';
import { Satellite, Clock, ArrowUpRight, Leaf, AlertCircle } from 'lucide-react';
import {
  getSatelliteOverview,
  getTimeSincePass,
  getTimeUntilPass,
  type SatelliteOverview,
} from '@/services/opendata/sentinelService';

function ndviColor(val: number): string {
  if (val >= 0.65) return '#4ade80';
  if (val >= 0.45) return '#fbbf24';
  return '#ef4444';
}

function ndviLabel(val: number): string {
  if (val >= 0.65) return 'Healthy';
  if (val >= 0.45) return 'Moderate';
  return 'Stressed';
}

export function SatelliteStatusWidget() {
  const [data, setData] = useState<SatelliteOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSatelliteOverview()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Satellite size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Sentinel-2 Status</span>
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-3 w-2/3 rounded bg-[var(--bg3)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--bg3)]" />
          <div className="h-8 w-full rounded bg-[var(--bg3)]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { latestPass, nextPass, ndviStats } = data;
  const changeSign = ndviStats.changeFromPrevious >= 0 ? '+' : '';
  const changeColor = ndviStats.changeFromPrevious >= 0 ? '#4ade80' : '#ef4444';

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Satellite size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Sentinel-2 Satellite</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: latestPass.status === 'available' ? '#4ade80' : '#fbbf24',
              boxShadow: `0 0 6px ${latestPass.status === 'available' ? '#4ade8080' : '#fbbf2480'}`,
            }}
          />
          <span className="text-[10px] text-[var(--text3)] capitalize">{latestPass.status}</span>
        </div>
      </div>

      {/* Latest pass info */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg3)' }}>
          <div className="flex items-center gap-1 mb-1">
            <Clock size={10} className="text-[var(--text3)]" />
            <span className="text-[10px] text-[var(--text3)]">Last Pass</span>
          </div>
          <p className="text-xs font-semibold text-[var(--text)]">{latestPass.satellite}</p>
          <p className="text-[10px] text-[var(--text2)]">{getTimeSincePass(latestPass.passTime)}</p>
          <p className="text-[10px] text-[var(--text3)]">Cloud: {latestPass.cloudCover}%</p>
        </div>

        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg3)' }}>
          <div className="flex items-center gap-1 mb-1">
            <ArrowUpRight size={10} className="text-[var(--text3)]" />
            <span className="text-[10px] text-[var(--text3)]">Next Pass</span>
          </div>
          <p className="text-xs font-semibold text-[var(--text)]">{nextPass.satellite}</p>
          <p className="text-[10px] text-[var(--text2)]">{getTimeUntilPass(nextPass.passTime)}</p>
          <p className="text-[10px] text-[var(--text3)]">Tile: {nextPass.tileId}</p>
        </div>
      </div>

      {/* NDVI Overview */}
      <div className="rounded-lg p-2.5" style={{ background: 'var(--bg3)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Leaf size={10} style={{ color: ndviColor(ndviStats.mean) }} />
            <span className="text-[10px] font-semibold text-[var(--text)]">NDVI Vegetation Index</span>
          </div>
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: changeColor }}
          >
            {changeSign}{ndviStats.changeFromPrevious.toFixed(3)}
          </span>
        </div>

        {/* NDVI bar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-5 rounded-full overflow-hidden flex" style={{ background: 'var(--bg2)' }}>
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${ndviStats.healthyPct}%`, background: '#4ade80' }}
            />
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${ndviStats.stressedPct}%`, background: '#fbbf24' }}
            />
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${ndviStats.barePct}%`, background: '#ef4444' }}
            />
          </div>
          <span
            className="text-sm font-bold font-mono min-w-[3.5rem] text-right"
            style={{ color: ndviColor(ndviStats.mean) }}
          >
            {ndviStats.mean.toFixed(2)}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
            Healthy {ndviStats.healthyPct}%
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
            Stressed {ndviStats.stressedPct}%
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
            Bare {ndviStats.barePct}%
          </span>
        </div>
      </div>

      {/* Status label */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-[var(--text3)]">
          Overall: <span style={{ color: ndviColor(ndviStats.mean) }} className="font-semibold">{ndviLabel(ndviStats.mean)}</span>
        </span>
        {!data.isLive && (
          <span className="text-[9px] text-[var(--text3)] opacity-60 flex items-center gap-0.5">
            <AlertCircle size={8} />
            Simulated
          </span>
        )}
      </div>
    </div>
  );
}
