import { useMemo, useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  CalendarDays,
  Banknote,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { EcosystemSummary } from '@/hooks/useEcosystemServices';

interface PaymentForEcosystemProps {
  summary: EcosystemSummary;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  active: { label: 'Aktivt', icon: <CheckCircle2 size={12} />, color: '#4ade80' },
  pending: { label: 'Vantar', icon: <Clock size={12} />, color: '#fbbf24' },
  expired: { label: 'Utgatt', icon: <AlertCircle size={12} />, color: 'var(--text3)' },
};

const VERIFICATION_LABELS: Record<string, string> = {
  satellite: 'Satellitverifiering',
  hydrology_model: 'Hydrologisk modell',
  biodiversity_survey: 'Biodiversitetsinventering',
  field_measurement: 'Faltmatning',
  visitor_statistics: 'Besoksstatistik',
};

export function PaymentForEcosystem({ summary }: PaymentForEcosystemProps) {
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  const { pesContracts, activePESRevenueSEK, totalEcosystemValueSEK } = summary;

  // 10-year revenue projection
  const projection = useMemo(() => {
    const years: { year: number; contractRevenue: number; potentialRevenue: number; cumulative: number }[] = [];
    let cumulative = 0;
    const currentYear = 2026;

    for (let i = 0; i < 10; i++) {
      const year = currentYear + i;
      // Active contracts that cover this year
      const contractRev = pesContracts.reduce((s, c) => {
        const startYear = new Date(c.startDate).getFullYear();
        const endYear = startYear + c.durationYears;
        if (year >= startYear && year < endYear) return s + c.annualPaymentSEK;
        return s;
      }, 0);

      // Potential: grows as more services are monetized (ramp up over 3 years)
      const rampFactor = Math.min(1, (i + 1) / 3);
      const potential = i === 0 ? 0 : Math.round(totalEcosystemValueSEK * rampFactor * 0.6);

      const yearTotal = contractRev + potential;
      cumulative += yearTotal;
      years.push({ year, contractRevenue: contractRev, potentialRevenue: potential, cumulative });
    }
    return years;
  }, [pesContracts, totalEcosystemValueSEK]);

  const maxCumulative = projection[projection.length - 1]?.cumulative ?? 1;
  const ecosystemAddPercent = summary.totalTimberValueSEK > 0
    ? Math.round((summary.totalEcosystemValueSEK / summary.totalTimberValueSEK) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Pioneer message */}
      <div
        className="rounded-xl border border-[var(--green)]/30 p-5"
        style={{ background: 'linear-gradient(135deg, var(--green)/8, var(--bg2))' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)] mb-1">
              Sverige ar pionjar inom PES — var bland de forsta
            </h3>
            <p className="text-xs text-[var(--text2)] mb-3">
              Payment for Ecosystem Services (PES) ar ett vaxande omrade dar skogsagare
              far betalt for de tjanster skogen ger samhallet — utover virke och kol.
              Naturvardsverket driver pilotprogram som du kan delta i.
            </p>
            <a
              href="https://www.naturvardsverket.se/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--green)] hover:underline"
            >
              <ExternalLink size={12} />
              Naturvardsverkets PES-pilotprogram
            </a>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Banknote size={14} className="text-[var(--green)]" />
            <p className="text-[10px] text-[var(--text3)]">Aktiva PES-intakter</p>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--green)]">
            {activePESRevenueSEK.toLocaleString('sv-SE')}
          </p>
          <p className="text-[10px] text-[var(--text3)]">SEK/ar</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-[#38bdf8]" />
            <p className="text-[10px] text-[var(--text3)]">10-arsprognos</p>
          </div>
          <p className="text-xl font-bold font-mono text-[#38bdf8]">
            {summary.projectedPES10YearSEK.toLocaleString('sv-SE')}
          </p>
          <p className="text-[10px] text-[var(--text3)]">SEK kumulativt</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-[#a78bfa]" />
            <p className="text-[10px] text-[var(--text3)]">Aktiva avtal</p>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text)]">
            {pesContracts.filter(c => c.status === 'active').length}
          </p>
          <p className="text-[10px] text-[var(--text3)]">
            av {pesContracts.length} totalt
          </p>
        </div>
      </div>

      {/* Ecosystem add-on comparison */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <p className="text-xs font-semibold text-[var(--text)] mb-2">Tillaggsvarde fran ekosystemtjanster</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
            <div className="h-full rounded-full flex">
              <div className="h-full bg-[#92400e] rounded-l-full" style={{ width: '100%' }} />
            </div>
          </div>
          <span className="text-[10px] text-[var(--text3)] w-16 text-right">Virke</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
            <div
              className="h-full bg-[var(--green)] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(ecosystemAddPercent, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--text3)] w-16 text-right">+{ecosystemAddPercent}%</span>
        </div>
        <p className="text-xs text-[var(--text2)]">
          Ekosystemtjanster tillagg{' '}
          <span className="font-bold text-[var(--green)]">{ecosystemAddPercent}%</span>{' '}
          till din skogs arliga inkomst utover virke.
        </p>
      </div>

      {/* 10-year projection chart */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
          Intaktsprognos 10 ar
        </h3>
        <p className="text-[10px] text-[var(--text3)] mb-4">
          Kumulativa intakter fran alla ekosystemtjanster
        </p>

        <div className="space-y-1.5">
          {projection.map(row => {
            const _cumulPct = maxCumulative > 0 ? (row.cumulative / maxCumulative) * 100 : 0;
            const contractPct = maxCumulative > 0 ? (row.contractRevenue / maxCumulative) * 100 : 0;
            const potentialPct = maxCumulative > 0 ? (row.potentialRevenue / maxCumulative) * 100 : 0;

            return (
              <div key={row.year} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[var(--text3)] w-10">{row.year}</span>
                <div className="flex-1 h-5 rounded relative" style={{ background: 'var(--bg)' }}>
                  <div className="absolute top-0 left-0 h-full flex">
                    <div
                      className="h-full bg-[var(--green)] rounded-l"
                      style={{ width: `${contractPct}%`, minWidth: contractPct > 0 ? '2px' : '0' }}
                    />
                    <div
                      className="h-full bg-[var(--green)]/40 rounded-r"
                      style={{ width: `${potentialPct}%`, minWidth: potentialPct > 0 ? '2px' : '0' }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[var(--text2)] w-16 text-right">
                  {row.cumulative > 1000 ? `${Math.round(row.cumulative / 1000)}k` : row.cumulative}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded bg-[var(--green)]" />
            <span className="text-[10px] text-[var(--text3)]">Avtalade</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded bg-[var(--green)]/40" />
            <span className="text-[10px] text-[var(--text3)]">Potentiella</span>
          </div>
        </div>
      </div>

      {/* Active contracts list */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <FileText size={16} className="text-[var(--green)]" />
          PES-avtal
        </h3>

        <div className="space-y-2">
          {pesContracts.map(contract => {
            const isExpanded = expandedContract === contract.id;
            const status = STATUS_CONFIG[contract.status];
            const endDate = new Date(contract.startDate);
            endDate.setFullYear(endDate.getFullYear() + contract.durationYears);
            const totalContractValue = contract.annualPaymentSEK * contract.durationYears;

            return (
              <div
                key={contract.id}
                className="rounded-lg border border-[var(--border)] overflow-hidden"
                style={{ background: 'var(--bg)' }}
              >
                <button
                  onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg3)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]"
                      style={{ background: `${status.color}15`, color: status.color }}
                    >
                      {status.icon}
                      <span>{status.label}</span>
                    </div>
                    <span className="text-xs font-medium text-[var(--text)]">{contract.serviceName}</span>
                    <span className="text-[10px] text-[var(--text3)]">— {contract.buyerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--green)]">
                      {contract.annualPaymentSEK.toLocaleString('sv-SE')} SEK/ar
                    </span>
                    {isExpanded ? <ChevronUp size={14} className="text-[var(--text3)]" /> : <ChevronDown size={14} className="text-[var(--text3)]" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-[var(--border)] pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Tjanst</p>
                        <p className="text-xs text-[var(--text)]">{contract.serviceName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Areal</p>
                        <p className="text-xs text-[var(--text)]">{contract.areaHa} ha</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Arsbetalning</p>
                        <p className="text-xs font-mono text-[var(--green)]">{contract.annualPaymentSEK.toLocaleString('sv-SE')} SEK</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Avtalstid</p>
                        <p className="text-xs text-[var(--text)]">{contract.durationYears} ar</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Startdatum</p>
                        <p className="text-xs text-[var(--text)] flex items-center gap-1">
                          <CalendarDays size={10} />
                          {contract.startDate}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Slutdatum</p>
                        <p className="text-xs text-[var(--text)]">{endDate.toISOString().slice(0, 10)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Verifieringsmetod</p>
                        <p className="text-xs text-[var(--text)]">{VERIFICATION_LABELS[contract.verificationMethod]}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Rapportering</p>
                        <p className="text-xs text-[var(--text)]">
                          {contract.reportingFrequency === 'quarterly' ? 'Kvartalsvis' : 'Arsvis'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text3)]">Totalt avtalsvarde</p>
                        <p className="text-xs font-mono font-semibold text-[var(--green)]">
                          {totalContractValue.toLocaleString('sv-SE')} SEK
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {pesContracts.length === 0 && (
          <div className="text-center py-6">
            <FileText size={24} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-xs text-[var(--text3)]">Inga aktiva PES-avtal annu</p>
          </div>
        )}
      </div>
    </div>
  );
}
