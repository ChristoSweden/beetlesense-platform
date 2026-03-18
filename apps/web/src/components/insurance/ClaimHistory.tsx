import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Banknote,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Shield,
  Wind,
  Bug,
  Flame,
  TreePine,
  Droplets,
} from 'lucide-react';
import { useState } from 'react';
import type { InsuranceClaim, DamageType, ClaimStatus } from '@/hooks/useInsurance';

interface Props {
  claims: InsuranceClaim[];
  totalHistoricalPayouts: number;
}

const DAMAGE_ICONS: Record<DamageType, React.ReactNode> = {
  storm: <Wind size={14} />,
  beetle: <Bug size={14} />,
  fire: <Flame size={14} />,
  moose: <TreePine size={14} />,
  flooding: <Droplets size={14} />,
};

const DAMAGE_LABELS: Record<DamageType, string> = {
  storm: 'Stormskada',
  beetle: 'Barkborreskada',
  fire: 'Brandskada',
  moose: 'Älgskada',
  flooding: 'Översvämning',
};

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string; icon: React.ReactNode }> = {
  inskickad: { label: 'Inskickad', color: '#60a5fa', icon: <Clock size={12} /> },
  under_behandling: { label: 'Under behandling', color: '#fbbf24', icon: <AlertCircle size={12} /> },
  godkänd: { label: 'Godkänd', color: '#4ade80', icon: <CheckCircle2 size={12} /> },
  utbetald: { label: 'Utbetald', color: '#4ade80', icon: <Banknote size={12} /> },
  avslagen: { label: 'Avslagen', color: '#ef4444', icon: <XCircle size={12} /> },
};

function ClaimCard({ claim }: { claim: InsuranceClaim }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[claim.status];

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-[var(--bg3)]/50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: statusConfig.color + '15', color: statusConfig.color }}
            >
              {DAMAGE_ICONS[claim.damageType]}
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text)]">
                {DAMAGE_LABELS[claim.damageType]} — {claim.parcelName}
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                {new Date(claim.filedDate).toLocaleDateString('sv-SE')} &middot; {claim.affectedAreaHa} ha
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: statusConfig.color + '15', color: statusConfig.color }}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
            {expanded ? (
              <ChevronUp size={14} className="text-[var(--text3)]" />
            ) : (
              <ChevronDown size={14} className="text-[var(--text3)]" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div>
            <p className="text-[10px] text-[var(--text3)]">Krav</p>
            <p className="text-sm font-mono font-semibold text-[var(--text)]">
              {claim.claimedAmountSEK.toLocaleString('sv-SE')} SEK
            </p>
          </div>
          {claim.payoutAmountSEK !== null && (
            <div>
              <p className="text-[10px] text-[var(--text3)]">Utbetalat</p>
              <p className="text-sm font-mono font-semibold text-[var(--green)]">
                {claim.payoutAmountSEK.toLocaleString('sv-SE')} SEK
              </p>
            </div>
          )}
          {claim.satelliteEvidence && (
            <div className="flex items-center gap-1 ml-auto">
              <Shield size={10} className="text-[var(--green)]" />
              <span className="text-[9px] text-[var(--green)]">Satellitbevis</span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded timeline */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)]">
          <div className="pt-4 space-y-0">
            {claim.timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-3 relative">
                {/* Timeline line */}
                {i < claim.timeline.length - 1 && (
                  <div
                    className="absolute left-[7px] top-[18px] w-px h-[calc(100%)]"
                    style={{ background: step.completed ? 'var(--green)' : 'var(--border)' }}
                  />
                )}
                {/* Dot */}
                <div
                  className={`w-[15px] h-[15px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    step.completed ? 'bg-[var(--green)]' : 'bg-[var(--bg3)] border border-[var(--border)]'
                  }`}
                >
                  {step.completed && <CheckCircle2 size={9} className="text-[#030d05]" />}
                </div>
                <div className="pb-4">
                  <p className="text-xs text-[var(--text)]">{step.label}</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    {new Date(step.date).toLocaleDateString('sv-SE')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Volume info */}
          <div className="mt-2 p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
            <p className="text-[10px] text-[var(--text3)]">
              Volymförlust: <span className="font-mono text-[var(--text)]">{claim.volumeLossM3.toLocaleString('sv-SE')} m&sup3;</span>
            </p>
          </div>

          {/* Actions */}
          {claim.status === 'avslagen' && (
            <button className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/30 text-xs text-amber-400 hover:bg-amber-500/5 transition-colors">
              <RotateCcw size={12} />
              Överklaga beslut
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ClaimHistory({ claims, totalHistoricalPayouts }: Props) {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[var(--text3)] mb-1">Totalt utbetalat historiskt</p>
            <p className="text-2xl font-mono font-bold text-[var(--green)]">
              {totalHistoricalPayouts.toLocaleString('sv-SE')} SEK
            </p>
            <p className="text-[10px] text-[var(--text3)]">{claims.length} ärenden totalt</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
            <Banknote size={22} className="text-[var(--green)]" />
          </div>
        </div>
      </div>

      {/* Claims list */}
      <div className="space-y-3">
        {claims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>

      {claims.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text3)]">Inga tidigare ärenden</p>
        </div>
      )}
    </div>
  );
}
