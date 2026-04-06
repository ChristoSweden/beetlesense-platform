import { Link } from 'react-router-dom';
import { FileText, ChevronRight, Calendar, DollarSign, Users } from 'lucide-react';

/* ─── Demo lease summary (matches DEMO_LEASES in LeaseManagementPage) ─── */

const DEMO_SUMMARY = {
  activeCount: 3,
  annualRevenue: 28000,
  nextRenewal: {
    date: '2026-06-30',
    lessee: 'Erik Johansson',
  },
};

function formatSEK(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function LeaseWidget() {
  const { activeCount, annualRevenue, nextRenewal } = DEMO_SUMMARY;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Land Leases</h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
          {activeCount} active
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-2.5 mb-3">
        <div className="flex items-center gap-2.5 p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--green)]/10 text-[var(--green)] flex-shrink-0">
            <DollarSign size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-[var(--text)] block">Annual Revenue</span>
            <span className="text-[10px] font-mono text-[var(--green)]">{formatSEK(annualRevenue)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-amber-500/10 text-amber-500 flex-shrink-0">
            <Calendar size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-[var(--text)] block truncate">
              Next renewal: {nextRenewal.lessee}
            </span>
            <span className="text-[10px] font-mono text-[var(--text3)]">{nextRenewal.date}</span>
          </div>
        </div>
      </div>

      {/* Link */}
      <Link
        to="/owner/leases"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        Manage leases
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
