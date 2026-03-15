import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { ANALYSIS_MODULES, type AnalysisModule } from './ModuleCard';

export type SurveyStatus = 'draft' | 'processing' | 'complete' | 'failed';

export interface SurveyData {
  id: string;
  name: string;
  parcel_name: string;
  created_at: string;
  modules: AnalysisModule[];
  status: SurveyStatus;
  priority: 'standard' | 'priority';
}

interface SurveyCardProps {
  survey: SurveyData;
}

const STATUS_CONFIG: Record<SurveyStatus, { label: string; color: string; bg: string; pulse?: boolean }> = {
  draft: { label: 'Draft', color: 'text-[var(--text3)]', bg: 'bg-forest-700/50' },
  processing: {
    label: 'Processing',
    color: 'text-amber',
    bg: 'bg-amber/10',
    pulse: true,
  },
  complete: { label: 'Complete', color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10' },
  failed: { label: 'Failed', color: 'text-danger', bg: 'bg-danger/10' },
};

export function SurveyCard({ survey }: SurveyCardProps) {
  const statusCfg = STATUS_CONFIG[survey.status] ?? STATUS_CONFIG.draft;

  const moduleInfos = survey.modules
    .map((id) => ANALYSIS_MODULES.find((m) => m.id === id))
    .filter(Boolean);

  const dateStr = new Date(survey.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link
      to={`/owner/surveys/${survey.id}`}
      className="block rounded-xl border border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)] transition-colors group"
    >
      <div className="p-4">
        {/* Top row: name + status */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text)] truncate">
              {survey.name}
            </h3>
            <p className="text-[11px] text-[var(--text3)] mt-0.5">{survey.parcel_name}</p>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.color} ${statusCfg.bg} ${statusCfg.pulse ? 'animate-pulse' : ''}`}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Module badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {moduleInfos.map((mod) =>
            mod ? (
              <span
                key={mod.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-forest-800 text-[10px] text-[var(--text2)] border border-[var(--border)]"
              >
                <span>{mod.icon}</span>
                {mod.title}
              </span>
            ) : null,
          )}
        </div>

        {/* Bottom row: date + arrow */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[var(--text3)]">
            <Calendar size={12} />
            <span className="text-[10px] font-mono">{dateStr}</span>
            {survey.priority === 'priority' && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber/10 text-amber">
                PRIORITY
              </span>
            )}
          </div>
          <ChevronRight
            size={14}
            className="text-[var(--text3)] group-hover:text-[var(--green)] transition-colors"
          />
        </div>
      </div>
    </Link>
  );
}
