import {
  TreePine,
  Truck,
  Factory,
  Timer,
  Filter,
  Plus,
  ChevronRight,
  Shield,
  Package,
} from 'lucide-react';
import type { TimberBatch, BatchStatus } from '@/hooks/useProvenance';

// ─── Status config ───

const STATUS_CONFIG: Record<BatchStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  standing: { label: 'Planerad', icon: <Timer size={13} />, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  harvested: { label: 'Avverkad', icon: <TreePine size={13} />, color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  in_transport: { label: 'Transport', icon: <Truck size={13} />, color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  at_mill: { label: 'Levererad', icon: <Factory size={13} />, color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
};

interface BatchListProps {
  batches: TimberBatch[];
  totalVolume: number;
  complianceRate: number;
  statusFilter: BatchStatus | 'all';
  onStatusFilterChange: (f: BatchStatus | 'all') => void;
  speciesFilter: string;
  onSpeciesFilterChange: (f: string) => void;
  onSelectBatch: (id: string) => void;
}

export function BatchList({
  batches,
  totalVolume,
  complianceRate,
  statusFilter,
  onStatusFilterChange,
  speciesFilter,
  onSpeciesFilterChange,
  onSelectBatch,
}: BatchListProps) {
  const allSpecies = [...new Set(batches.map((b) => b.species_sv))];

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Totalt volym" value={`${totalVolume} m³`} color="#4ade80" icon={<Package size={15} />} />
        <StatBox label="Aktiva partier" value={String(batches.length)} color="#60a5fa" icon={<TreePine size={15} />} />
        <StatBox label="EUDR-compliance" value={`${complianceRate}%`} color={complianceRate === 100 ? '#4ade80' : '#fbbf24'} icon={<Shield size={15} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={13} className="text-[var(--text3)]" />

        {/* Status filter */}
        <div className="flex gap-1">
          <FilterPill
            label="Alla"
            active={statusFilter === 'all'}
            onClick={() => onStatusFilterChange('all')}
          />
          {(Object.keys(STATUS_CONFIG) as BatchStatus[]).map((s) => (
            <FilterPill
              key={s}
              label={STATUS_CONFIG[s].label}
              active={statusFilter === s}
              onClick={() => onStatusFilterChange(s)}
              dotColor={STATUS_CONFIG[s].color}
            />
          ))}
        </div>

        {/* Species filter */}
        <select
          value={speciesFilter}
          onChange={(e) => onSpeciesFilterChange(e.target.value)}
          className="text-[10px] px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none"
        >
          <option value="all">Alla arter</option>
          {allSpecies.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Batch cards */}
      <div className="space-y-2">
        {batches.length === 0 ? (
          <div className="text-center py-8">
            <Package size={32} className="text-[var(--text3)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text3)]">Inga partier matchar filtret</p>
          </div>
        ) : (
          batches.map((batch) => {
            const sc = STATUS_CONFIG[batch.status];
            return (
              <button
                key={batch.id}
                onClick={() => onSelectBatch(batch.id)}
                className="w-full text-left rounded-xl border border-[var(--border)] p-4 hover:border-[var(--green)]/30 hover:bg-[var(--bg2)] transition-all group"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-[var(--green)]">
                        {batch.id}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ color: sc.color, background: sc.bg }}
                      >
                        {sc.icon}
                        {sc.label}
                      </span>
                      {batch.eudrCompliance === 100 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded-full">
                          <Shield size={9} />
                          EUDR
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[var(--text)]">
                      {batch.volume_m3} m³ {batch.species_sv.toLowerCase()}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[var(--text3)]">
                        {batch.parcelName}
                      </span>
                      <span className="text-[10px] text-[var(--text3)]">→</span>
                      <span className="text-[10px] text-[var(--text3)]">
                        {batch.destination}
                      </span>
                    </div>

                    {/* Mini chain progress */}
                    <div className="flex gap-1 mt-2">
                      {batch.custodyChain.map((step) => (
                        <div
                          key={step.id}
                          className="h-1.5 flex-1 rounded-full"
                          style={{
                            background:
                              step.status === 'completed'
                                ? '#4ade80'
                                : step.status === 'in_progress'
                                  ? '#fbbf24'
                                  : 'var(--bg3)',
                          }}
                          title={step.label_sv}
                        />
                      ))}
                    </div>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-[var(--text3)] group-hover:text-[var(--green)] transition-colors flex-shrink-0 mt-1"
                  />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Create new batch */}
      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[var(--border)] text-xs font-medium text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors">
        <Plus size={14} />
        Skapa nytt parti
      </button>
    </div>
  );
}

// ─── Helpers ───

function StatBox({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] p-3"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <p className="text-lg font-mono font-bold text-[var(--text)]">{value}</p>
      <p className="text-[10px] text-[var(--text3)]">{label}</p>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  dotColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/10'
          : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)] hover:border-[var(--text3)]'
      }`}
    >
      {dotColor && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
      )}
      {label}
    </button>
  );
}
