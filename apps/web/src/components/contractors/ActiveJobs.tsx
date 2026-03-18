/**
 * ActiveJobs — Track ongoing forestry work from the open marketplace.
 *
 * Shows job cards with progress timeline, photo upload placeholder,
 * GPS tracking placeholder, and invoice/payment status.
 */

import {
  CheckCircle2,
  Circle,
  Camera,
  MapPin,
  Receipt,
  ChevronRight,
  TreePine,
  ArrowRight,
} from 'lucide-react';
import {
  SERVICE_LABELS,
  JOB_STATUS_ORDER,
  JOB_STATUS_LABELS,
  type JobPosting,
  type JobStatus,
} from '@/hooks/useContractorMarketplace';

interface ActiveJobsProps {
  jobs: JobPosting[];
  onSelectJob: (job: JobPosting) => void;
  onAdvanceStatus: (jobId: string) => void;
}

const _STEP_ICONS: Record<JobStatus, typeof CheckCircle2> = {
  posted: Circle,
  bids_received: Circle,
  contractor_selected: Circle,
  work_started: Circle,
  inspection: Circle,
  complete: CheckCircle2,
};

function ProgressTimeline({ status }: { status: JobStatus }) {
  const currentIdx = JOB_STATUS_ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-0.5 mb-3">
      {JOB_STATUS_ORDER.map((step, idx) => {
        const isComplete = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-0.5 flex-1">
            <div
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                isComplete
                  ? 'bg-[var(--green)]'
                  : isCurrent
                    ? 'bg-[var(--green)]/50'
                    : 'bg-[var(--bg3)]'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

function InvoiceStatus({ status }: { status: 'none' | 'sent' | 'paid' }) {
  const styles = {
    none: { bg: 'bg-[var(--bg3)]', text: 'text-[var(--text3)]', label: 'Ej fakturerad' },
    sent: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Faktura skickad' },
    paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Betald' },
  };
  const s = styles[status];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${s.bg}`}>
      <Receipt size={10} className={s.text} />
      <span className={`text-[9px] font-mono ${s.text}`}>{s.label}</span>
    </div>
  );
}

function JobCard({
  job,
  onSelect,
  onAdvance,
}: {
  job: JobPosting;
  onSelect: () => void;
  onAdvance: () => void;
}) {
  const selectedBid = job.bids.find((b) => b.id === job.selected_bid_id);
  const isActive = ['work_started', 'inspection'].includes(job.status);
  const canAdvance = job.status !== 'complete' && job.status !== 'posted' && job.status !== 'bids_received';

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-all duration-200"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text)] truncate">
            {job.parcel_name}
          </h3>
          <p className="text-[11px] text-[var(--text3)]">
            {job.services.map((s) => SERVICE_LABELS[s]).join(', ')} &middot; {job.area_ha} ha
          </p>
        </div>
        <InvoiceStatus status={job.invoice_status} />
      </div>

      {/* Progress timeline */}
      <ProgressTimeline status={job.status} />

      {/* Current status label */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--green)]/10 text-[var(--green)]">
          {JOB_STATUS_LABELS[job.status]}
        </span>
        <span className="text-[10px] text-[var(--text3)]">
          {new Date(job.created_at).toLocaleDateString('sv-SE')}
        </span>
      </div>

      {/* Selected contractor */}
      {selectedBid && (
        <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text)]">{selectedBid.contractor_name}</p>
              <p className="text-[10px] text-[var(--text3)]">
                {selectedBid.price_sek.toLocaleString('sv-SE')} kr &middot; {selectedBid.timeline}
              </p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors">
              <ChevronRight size={14} className="text-[var(--text3)]" />
            </button>
          </div>
        </div>
      )}

      {/* Active job features */}
      {isActive && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Photo upload */}
          <button className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-colors">
            <Camera size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] text-[var(--text3)]">Ladda upp foto</span>
          </button>
          {/* GPS tracking placeholder */}
          <button className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-colors">
            <MapPin size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] text-[var(--text3)]">GPS-spårning</span>
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          {job.bids.length > 0 && job.status !== 'complete'
            ? `Visa offerter (${job.bids.length})`
            : 'Visa detaljer'}
          <ChevronRight size={13} />
        </button>
        {canAdvance && (
          <button
            onClick={onAdvance}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-[var(--green)]/15 text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/25 transition-colors"
          >
            Nästa steg
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ActiveJobs({ jobs, onSelectJob, onAdvanceStatus }: ActiveJobsProps) {
  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center">
        <TreePine size={32} className="text-[var(--text3)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text)] font-medium mb-1">Inga pågående jobb</p>
        <p className="text-xs text-[var(--text3)]">
          Publicera en förfrågan för att komma igång
        </p>
      </div>
    );
  }

  // Separate active from completed
  const active = jobs.filter((j) => j.status !== 'complete');
  const completed = jobs.filter((j) => j.status === 'complete');

  return (
    <div className="space-y-4">
      {/* Active */}
      {active.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-3">
            Pågående ({active.length})
          </h3>
          <div className="space-y-3">
            {active.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onSelect={() => onSelectJob(job)}
                onAdvance={() => onAdvanceStatus(job.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-3">
            Slutförda ({completed.length})
          </h3>
          <div className="space-y-3">
            {completed.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onSelect={() => onSelectJob(job)}
                onAdvance={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
