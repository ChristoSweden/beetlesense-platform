import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmergencyStore, type ReportStatus } from '@/stores/emergencyStore';
import { EmergencyReportCard } from './EmergencyReport';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

// ─── Status filter tabs ───

const STATUS_FILTERS: Array<{ value: ReportStatus | 'all'; labelKey: string }> = [
  { value: 'all', labelKey: 'emergency.filter.all' },
  { value: 'open', labelKey: 'emergency.status.open' },
  { value: 'inspector_contacted', labelKey: 'emergency.status.inspectorContacted' },
  { value: 'resolved', labelKey: 'emergency.status.resolved' },
];

/**
 * EmergencyHistory — Full page list of past emergency reports.
 * Used in the dashboard as a widget and could be its own page.
 */
export function EmergencyHistory() {
  const { t } = useTranslation();
  const reports = useEmergencyStore((s) => s.reports);
  const updateReportStatus = useEmergencyStore((s) => s.updateReportStatus);
  const deleteReport = useEmergencyStore((s) => s.deleteReport);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter((r) => r.status === filter);

  if (reports.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            {t('emergency.history')}
          </h2>
          <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-1.5 py-0.5 rounded-full">
            {reports.length}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`
              px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap
              transition-colors
              ${filter === f.value
                ? 'bg-[var(--green)]/15 text-[var(--green)]'
                : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
              }
            `}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {/* Report list */}
      <div className="px-4 pb-4 space-y-3">
        {filteredReports.length === 0 ? (
          <p className="text-xs text-[var(--text3)] text-center py-6">
            {t('emergency.noReports')}
          </p>
        ) : (
          filteredReports.map((report) => {
            const isExpanded = expandedId === report.id;
            return (
              <div key={report.id}>
                {/* Clickable wrapper */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full text-left"
                  aria-expanded={isExpanded}
                >
                  <EmergencyReportCard report={report} expanded={isExpanded} />
                </button>

                {/* Status actions when expanded */}
                {isExpanded && (
                  <div className="flex items-center gap-2 mt-2 ml-4">
                    {report.status === 'open' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateReportStatus(report.id, 'inspector_contacted');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                      >
                        <Clock size={10} />
                        {t('emergency.markInspectorContacted')}
                      </button>
                    )}
                    {(report.status === 'open' || report.status === 'inspector_contacted') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateReportStatus(report.id, 'resolved');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[var(--green)] bg-[var(--green)]/10 hover:bg-[var(--green)]/20 transition-colors"
                      >
                        <CheckCircle2 size={10} />
                        {t('emergency.markResolved')}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t('emergency.confirmDelete'))) {
                          deleteReport(report.id);
                          setExpandedId(null);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors ml-auto"
                    >
                      <Trash2 size={10} />
                      {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for the dashboard sidebar.
 * Shows the count and latest 2 reports.
 */
export function EmergencyHistoryWidget() {
  const { t } = useTranslation();
  const reports = useEmergencyStore((s) => s.reports);
  const openReports = reports.filter((r) => r.status !== 'resolved');

  if (openReports.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-500/10">
        <AlertTriangle size={14} className="text-red-400" />
        <h3 className="text-xs font-semibold text-red-400">
          {t('emergency.activeReports')}
        </h3>
        <span className="text-[10px] font-mono text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-full ml-auto">
          {openReports.length}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {openReports.slice(0, 2).map((report) => (
          <EmergencyReportCard key={report.id} report={report} expanded={false} />
        ))}
      </div>
    </div>
  );
}
