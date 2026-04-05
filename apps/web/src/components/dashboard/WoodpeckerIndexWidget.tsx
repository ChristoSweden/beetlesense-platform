import { useState, useEffect, memo } from 'react';
import { Bird, Bug, TrendingUp, Eye } from 'lucide-react';
import {
  getBiodiversitySnapshot,
  type BiodiversitySnapshot,
  type WoodpeckerActivity,
} from '@/services/opendata/biodiversityOccurrenceService';

// ─── Helpers ───

const SIGNAL_COLORS: Record<string, string> = {
  strong: '#ef4444',
  moderate: '#fbbf24',
  none: '#4ade80',
};

const TREND_ARROWS: Record<string, string> = {
  increasing: '↑',
  stable: '→',
  decreasing: '↓',
};

// ─── Component ───

export const WoodpeckerIndexWidget = memo(function WoodpeckerIndexWidget({
  lat = 56.88,
  lng = 14.81,
}: {
  lat?: number;
  lng?: number;
}) {
  const [data, setData] = useState<BiodiversitySnapshot | null>(null);

  useEffect(() => {
    getBiodiversitySnapshot(lat, lng).then(setData).catch(console.warn);
  }, [lat, lng]);

  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-36 bg-[var(--bg)] rounded mb-3" />
        <div className="h-16 bg-[var(--bg)] rounded" />
      </div>
    );
  }

  const predatorColor = data.beetlePredatorActivity >= 70 ? '#ef4444'
    : data.beetlePredatorActivity >= 40 ? '#fbbf24'
    : '#4ade80';

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bird size={16} className="text-[var(--green)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            Woodpecker Beetle Proxy
          </span>
        </div>
        <span
          className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full"
          style={{ background: `${predatorColor}15`, color: predatorColor }}
        >
          {data.beetlePredatorActivity}/100
        </span>
      </div>

      {/* Predator activity gauge */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--text3)]">Beetle Predator Activity</span>
          <span className="text-[10px] text-[var(--text3)]">
            {data.beetlePredatorActivity >= 70 ? 'Likely infestation nearby' :
             data.beetlePredatorActivity >= 40 ? 'Elevated activity' : 'Normal baseline'}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-[var(--bg)] border border-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${data.beetlePredatorActivity}%`,
              background: `linear-gradient(90deg, #4ade80, ${predatorColor})`,
            }}
          />
        </div>
      </div>

      {/* Species breakdown */}
      <div className="space-y-1.5 mb-3">
        {data.woodpeckerIndex.slice(0, 4).map((wp: WoodpeckerActivity) => {
          const signalColor = SIGNAL_COLORS[wp.beetleRiskSignal] ?? '#4ade80';
          return (
            <div
              key={wp.species}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 border border-[var(--border)]"
              style={{ background: 'var(--bg)' }}
            >
              <div className="flex items-center gap-1.5">
                <Bird size={10} style={{ color: signalColor }} />
                <span className="text-[10px] text-[var(--text)]">{wp.species}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[var(--text2)]">
                  {wp.observationCount} obs
                </span>
                <span className="text-[10px]" style={{ color: signalColor }}>
                  {TREND_ARROWS[wp.trend]} {wp.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key insight */}
      <div
        className="rounded-lg p-2 border"
        style={{
          background: `${predatorColor}08`,
          borderColor: `${predatorColor}30`,
        }}
      >
        <div className="flex items-start gap-1.5">
          <Bug size={10} style={{ color: predatorColor, flexShrink: 0, marginTop: 2 }} />
          <p className="text-[10px] text-[var(--text2)]">
            {data.beetlePredatorActivity >= 70
              ? 'Three-toed woodpecker activity is significantly elevated — this species specializes in bark beetles and tracks active infestations. Recommend ground inspection.'
              : data.beetlePredatorActivity >= 40
              ? 'Woodpecker activity is above baseline. Monitor for early beetle signs.'
              : 'Woodpecker activity within normal range. No biological indicator of beetle pressure.'}
          </p>
        </div>
      </div>

      <p className="text-[9px] text-[var(--text3)] mt-2">
        Sources: GBIF occurrence data, eBird observations | {data.totalObservations} records, {data.totalSpecies} species
      </p>
    </div>
  );
});
