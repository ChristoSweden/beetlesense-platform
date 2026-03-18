/**
 * PoolCard — Timber pool card showing volume progress, members, premium, and join action.
 */

import { Users, MapPin, Calendar, TrendingUp, Clock, CheckCircle, Lock } from 'lucide-react';
import type { TimberPool } from '@/hooks/useGroupSelling';

interface PoolCardProps {
  pool: TimberPool;
  onJoin: (poolId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  collecting: { label: 'Samlar volym', color: 'var(--green)', bg: 'var(--green)' },
  full: { label: 'Full — auktion snart', color: 'var(--yellow)', bg: 'var(--yellow)' },
  auction_live: { label: 'Auktion pågår', color: '#f97316', bg: '#f97316' },
  completed: { label: 'Avslutad', color: 'var(--text3)', bg: 'var(--text3)' },
  cancelled: { label: 'Avbruten', color: 'var(--red)', bg: 'var(--red)' },
};

export function PoolCard({ pool, onJoin }: PoolCardProps) {
  const pct = Math.min(100, Math.round((pool.currentVolumeM3 / pool.targetVolumeM3) * 100));
  const statusCfg = STATUS_CONFIG[pool.status] ?? STATUS_CONFIG.collecting;
  const daysLeft = Math.max(0, Math.ceil((new Date(pool.deadline).getTime() - Date.now()) / 86400000));
  const canJoin = pool.status === 'collecting' && !pool.isMember;

  return (
    <div className="rounded-xl border border-[var(--border)] p-5 hover:border-[var(--green)]/30 transition-colors" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text)] truncate">{pool.name}</h3>
          <p className="text-xs text-[var(--text3)] mt-0.5">{pool.assortmentLabel}</p>
        </div>
        <span
          className="ml-2 flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ color: statusCfg.color, background: `color-mix(in srgb, ${statusCfg.bg} 12%, transparent)` }}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Volume progress */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-[var(--text2)]">Volym poolad</span>
          <span className="text-xs font-mono text-[var(--text)]">
            {pool.currentVolumeM3.toLocaleString('sv-SE')} / {pool.targetVolumeM3.toLocaleString('sv-SE')} m³
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? 'var(--yellow)' : 'var(--green)',
            }}
          />
        </div>
        <p className="text-[10px] text-[var(--text3)] mt-1">{pct}% av målvolym</p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text2)]">{pool.memberCount} skogsägare</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text2)]">{pool.kommun}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text2)]">Leverans {pool.deliveryQuarter}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text2)]">{daysLeft}d kvar</span>
        </div>
      </div>

      {/* Expected premium */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg mb-4 bg-[var(--green)]/8 border border-[var(--green)]/15">
        <TrendingUp size={14} className="text-[var(--green)] flex-shrink-0" />
        <span className="text-xs font-medium text-[var(--green)]">
          +{pool.expectedPremiumMin}–{pool.expectedPremiumMax}% vs individuellt pris
        </span>
      </div>

      {/* Member badge or join button */}
      {pool.isMember ? (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5">
          <CheckCircle size={14} className="text-[var(--green)]" />
          <span className="text-xs font-medium text-[var(--green)]">Du är med i denna pool</span>
        </div>
      ) : canJoin ? (
        <button
          onClick={() => onJoin(pool.id)}
          className="w-full py-2.5 rounded-lg text-xs font-semibold transition-colors bg-[var(--green)] text-[#030d05] hover:brightness-110"
        >
          Gå med i pool
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg3)]">
          <Lock size={14} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text3)]">{pool.status === 'full' ? 'Poolen är full' : 'Ej tillgänglig'}</span>
        </div>
      )}
    </div>
  );
}
