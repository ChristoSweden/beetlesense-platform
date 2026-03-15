import { FileText, FileBarChart, Shield, Calendar, User, Globe } from 'lucide-react';

// ─── Types ───

export type ReportType = 'standard' | 'valuation' | 'insurance';
export type ReportStatus = 'draft' | 'generated' | 'shared';

export interface ReportData {
  id: string;
  title: string;
  type: ReportType;
  parcel_name: string;
  created_at: string;
  language: 'en' | 'sv';
  status: ReportStatus;
  inspector_name?: string;
  pdf_url?: string;
}

interface ReportCardProps {
  report: ReportData;
  onClick?: (report: ReportData) => void;
}

// ─── Config ───

const TYPE_CONFIG: Record<ReportType, { label: string; color: string; icon: typeof FileText }> = {
  standard: { label: 'Standard', color: 'text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/20', icon: FileText },
  valuation: { label: 'Valuation', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: FileBarChart },
  insurance: { label: 'Insurance', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Shield },
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; dot: string }> = {
  draft: { label: 'Draft', dot: 'bg-[var(--text3)]' },
  generated: { label: 'Generated', dot: 'bg-[var(--green)]' },
  shared: { label: 'Shared', dot: 'bg-blue-400' },
};

// ─── Component ───

export function ReportCard({ report, onClick }: ReportCardProps) {
  const typeCfg = TYPE_CONFIG[report.type];
  const statusCfg = STATUS_CONFIG[report.status];
  const TypeIcon = typeCfg.icon;

  return (
    <button
      onClick={() => onClick?.(report)}
      className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 hover:bg-[var(--bg3)] transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${typeCfg.color}`}>
            <TypeIcon size={16} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-[var(--text)] truncate group-hover:text-[var(--green)] transition-colors">
              {report.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[var(--text3)]">
              <span>{report.parcel_name}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-[var(--text3)]" />
              <span className="flex items-center gap-0.5">
                <Calendar size={9} />
                {new Date(report.created_at).toLocaleDateString('sv-SE')}
              </span>
              <span className="w-0.5 h-0.5 rounded-full bg-[var(--text3)]" />
              <span className="flex items-center gap-0.5">
                <Globe size={9} />
                {report.language === 'sv' ? 'Svenska' : 'English'}
              </span>
            </div>

            {report.inspector_name && (
              <p className="text-[10px] text-[var(--text3)] mt-1 flex items-center gap-1">
                <User size={9} />
                {report.inspector_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Type Badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeCfg.color}`}>
            {typeCfg.label}
          </span>

          {/* Status */}
          <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>
      </div>
    </button>
  );
}
