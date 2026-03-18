import {
  Shield,
  Calendar,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import type { InsurancePolicy } from '@/hooks/useInsurance';

interface Props {
  policy: InsurancePolicy;
  potentialSavings: number;
  onCompare: () => void;
}

export function CoverageOverview({ policy, potentialSavings, onCompare }: Props) {
  const daysUntilExpiry = Math.ceil(
    (new Date(policy.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const expiryUrgent = daysUntilExpiry < 60;

  return (
    <div className="space-y-5">
      {/* Provider card */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center text-2xl">
              {policy.provider.logo}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">{policy.provider.name}</h3>
              <p className="text-xs text-[var(--text3)]">{policy.type}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
            Aktiv
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-3 border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
            <p className="text-[10px] text-[var(--text3)] mb-1">Försäkringsnummer</p>
            <p className="text-xs font-mono text-[var(--text)]">{policy.policyNumber}</p>
          </div>
          <div className="rounded-lg p-3 border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
            <p className="text-[10px] text-[var(--text3)] mb-1">Areal</p>
            <p className="text-xs font-mono text-[var(--text)]">{policy.totalHectares} ha</p>
          </div>
        </div>

        {/* Premium */}
        <div className="rounded-lg p-4 border border-[var(--border)] mb-4" style={{ background: 'var(--bg3)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-0.5">Årspremie</p>
              <p className="text-xl font-semibold font-mono text-[var(--text)]">
                {policy.annualPremium.toLocaleString('sv-SE')} SEK
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                {Math.round(policy.annualPremium / policy.totalHectares)} SEK/ha/år
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
              <Shield size={20} className="text-[var(--green)]" />
            </div>
          </div>
        </div>

        {/* Expiry */}
        <div
          className={`rounded-lg p-3 border flex items-center gap-3 ${
            expiryUrgent
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-[var(--border)]'
          }`}
          style={!expiryUrgent ? { background: 'var(--bg3)' } : undefined}
        >
          <Calendar size={16} className={expiryUrgent ? 'text-amber-400' : 'text-[var(--text3)]'} />
          <div className="flex-1">
            <p className="text-xs text-[var(--text)]">
              Giltig t.o.m. {new Date(policy.expiryDate).toLocaleDateString('sv-SE')}
            </p>
            <p className="text-[10px] text-[var(--text3)]">
              {daysUntilExpiry} dagar kvar
              {expiryUrgent && ' — förnyelse snart!'}
            </p>
          </div>
          {expiryUrgent && <AlertTriangle size={14} className="text-amber-400" />}
        </div>
      </div>

      {/* Coverage lines */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Skyddsnivåer</h3>
        <div className="space-y-3">
          {policy.coverageLines.map((line) => (
            <div
              key={line.type}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--bg3)' }}
            >
              <div className="flex items-center gap-3">
                {line.covered ? (
                  <CheckCircle2 size={16} className="text-[var(--green)]" />
                ) : (
                  <XCircle size={16} className="text-red-400/60" />
                )}
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">{line.label}</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    Självrisk: {line.deductible.toLocaleString('sv-SE')} SEK
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-[var(--text)]">
                  {line.covered ? `${(line.limit / 1000000).toFixed(0)} MSEK` : 'Ej täckt'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Savings teaser */}
      {potentialSavings > 0 && (
        <button
          onClick={onCompare}
          className="w-full rounded-xl border border-[var(--green)]/20 p-4 text-left hover:border-[var(--green)]/40 transition-colors"
          style={{ background: 'var(--green)' + '08' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
                <TrendingDown size={18} className="text-[var(--green)]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--green)]">Potentiell besparing</p>
                <p className="text-lg font-mono font-semibold text-[var(--text)]">
                  {potentialSavings.toLocaleString('sv-SE')} SEK/år
                </p>
                <p className="text-[10px] text-[var(--text3)]">Jämför med andra försäkringsbolag</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[var(--green)]" />
          </div>
        </button>
      )}
    </div>
  );
}
