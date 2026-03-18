import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Coins,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Filter,
  Calendar,
} from 'lucide-react';
import type { Certification, CertificationRequirement, RequirementStatus } from '@/hooks/useCertification';

interface GapAnalysisProps {
  cert: Certification;
  lang: string;
  onBack: () => void;
}

type FilterType = 'all' | 'gaps' | 'met';
type SortType = 'priority' | 'cost' | 'hours';

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_LABELS: Record<string, { sv: string; en: string; color: string }> = {
  critical: { sv: 'Kritisk', en: 'Critical', color: '#ef4444' },
  high: { sv: 'Hog', en: 'High', color: '#f59e0b' },
  medium: { sv: 'Medel', en: 'Medium', color: '#60a5fa' },
  low: { sv: 'Lag', en: 'Low', color: '#6b7280' },
};

const STATUS_LABELS: Record<RequirementStatus, { sv: string; en: string; icon: React.ReactNode; color: string }> = {
  uppfyllt: {
    sv: 'Uppfyllt',
    en: 'Met',
    icon: <CheckCircle2 size={14} />,
    color: '#4ade80',
  },
  delvis: {
    sv: 'Delvis uppfyllt',
    en: 'Partially Met',
    icon: <AlertTriangle size={14} />,
    color: '#fbbf24',
  },
  ej_uppfyllt: {
    sv: 'Ej uppfyllt',
    en: 'Not Met',
    icon: <XCircle size={14} />,
    color: '#ef4444',
  },
};

function RequirementRow({ req, lang, isExpanded, onToggle }: {
  req: CertificationRequirement;
  lang: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const status = STATUS_LABELS[req.status];
  const priority = PRIORITY_LABELS[req.priority];
  const isGap = req.status !== 'uppfyllt';

  return (
    <div
      className={`rounded-lg border transition-all ${
        isExpanded ? 'border-[var(--border2)]' : 'border-[var(--border)]'
      }`}
      style={{ background: 'var(--bg)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div style={{ color: status.color }} className="flex-shrink-0">
          {status.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-[var(--text)] leading-tight">
            {lang === 'sv' ? req.label_sv : req.label_en}
          </p>
        </div>
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: `${priority.color}15`, color: priority.color }}
        >
          {lang === 'sv' ? priority.sv : priority.en}
        </span>
        {isExpanded ? (
          <ChevronUp size={14} className="text-[var(--text3)] flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-[var(--text3)] flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-[var(--border)] pt-2 space-y-2">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text3)]">Status:</span>
            <span className="text-[10px] font-medium" style={{ color: status.color }}>
              {lang === 'sv' ? status.sv : status.en}
            </span>
          </div>

          {/* Evidence */}
          {req.evidence && (
            <div>
              <span className="text-[10px] text-[var(--text3)]">
                {lang === 'sv' ? 'Bevis:' : 'Evidence:'}
              </span>
              <p className="text-[10px] text-[var(--text2)] mt-0.5">{req.evidence}</p>
            </div>
          )}

          {/* Action needed */}
          {isGap && (req.actionNeeded_sv || req.actionNeeded_en) && (
            <div className="p-2 rounded bg-amber-500/5 border border-amber-500/10">
              <span className="text-[10px] font-medium text-amber-400">
                {lang === 'sv' ? 'Atgard kravs:' : 'Action needed:'}
              </span>
              <p className="text-[10px] text-amber-300/80 mt-0.5">
                {lang === 'sv' ? req.actionNeeded_sv : req.actionNeeded_en}
              </p>
            </div>
          )}

          {/* Effort estimation */}
          {isGap && (req.estimatedHours > 0 || req.estimatedCostSEK > 0) && (
            <div className="flex items-center gap-4">
              {req.estimatedHours > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                  <Clock size={11} />
                  <span>{req.estimatedHours} {lang === 'sv' ? 'timmar' : 'hours'}</span>
                </div>
              )}
              {req.estimatedCostSEK > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                  <Coins size={11} />
                  <span>{req.estimatedCostSEK.toLocaleString('sv-SE')} SEK</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GapAnalysis({ cert, lang, onBack }: GapAnalysisProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const metCount = cert.requirements.filter((r) => r.status === 'uppfyllt').length;
  const gapCount = cert.requirements.length - metCount;
  const totalHours = cert.requirements
    .filter((r) => r.status !== 'uppfyllt')
    .reduce((sum, r) => sum + r.estimatedHours, 0);
  const totalCost = cert.requirements
    .filter((r) => r.status !== 'uppfyllt')
    .reduce((sum, r) => sum + r.estimatedCostSEK, 0);

  const filteredAndSorted = useMemo(() => {
    let list = [...cert.requirements];

    // Filter
    if (filter === 'gaps') {
      list = list.filter((r) => r.status !== 'uppfyllt');
    } else if (filter === 'met') {
      list = list.filter((r) => r.status === 'uppfyllt');
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'priority') {
        const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pDiff !== 0) return pDiff;
        // Within same priority, gaps first
        const statusOrder: Record<RequirementStatus, number> = { ej_uppfyllt: 0, delvis: 1, uppfyllt: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (sortBy === 'cost') return b.estimatedCostSEK - a.estimatedCostSEK;
      if (sortBy === 'hours') return b.estimatedHours - a.estimatedHours;
      return 0;
    });

    return list;
  }, [cert.requirements, filter, sortBy]);

  // Generate timeline estimate
  const estimatedWeeks = Math.ceil(totalHours / 20); // 20h/week assumption

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
        >
          <ArrowLeft size={16} className="text-[var(--text2)]" />
        </button>
        <div>
          <h2 className="text-base font-serif font-bold text-[var(--text)]">
            {lang === 'sv' ? 'Gap-analys' : 'Gap Analysis'} — {cert.name}
          </h2>
          <p className="text-[11px] text-[var(--text3)]">
            {lang === 'sv' ? cert.fullName_sv : cert.fullName_en}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={13} className="text-[var(--green)]" />
            <span className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Uppfyllda' : 'Met'}</span>
          </div>
          <p className="text-lg font-mono font-bold text-[var(--green)]">
            {metCount} <span className="text-[10px] font-normal text-[var(--text3)]">/ {cert.requirements.length}</span>
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle size={13} className="text-red-400" />
            <span className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Gap att atgarda' : 'Gaps to fix'}</span>
          </div>
          <p className="text-lg font-mono font-bold text-red-400">{gapCount}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={13} className="text-[var(--text3)]" />
            <span className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Uppskattat arbete' : 'Est. effort'}</span>
          </div>
          <p className="text-lg font-mono font-bold text-[var(--text)]">
            {totalHours} <span className="text-[10px] font-normal text-[var(--text3)]">{lang === 'sv' ? 'timmar' : 'hours'}</span>
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Coins size={13} className="text-amber-400" />
            <span className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Uppskattad kostnad' : 'Est. cost'}</span>
          </div>
          <p className="text-lg font-mono font-bold text-amber-400">
            {totalCost.toLocaleString('sv-SE')} <span className="text-[10px] font-normal">SEK</span>
          </p>
        </div>
      </div>

      {/* Total summary */}
      <div
        className="rounded-lg border border-[var(--border)] p-3 mb-5 flex items-center justify-between"
        style={{ background: 'var(--bg2)' }}
      >
        <p className="text-xs text-[var(--text)]">
          <span className="font-semibold">{metCount}</span>{' '}
          {lang === 'sv' ? `av ${cert.requirements.length} krav uppfyllda` : `of ${cert.requirements.length} requirements met`}
          {' — '}
          <span className="font-semibold text-amber-400">{gapCount}</span>{' '}
          {lang === 'sv' ? 'gap att atgarda' : 'gaps to address'}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text3)]">
          <Calendar size={12} />
          <span>~{estimatedWeeks} {lang === 'sv' ? 'veckor' : 'weeks'}</span>
        </div>
      </div>

      {/* Compliance progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Total compliance' : 'Total compliance'}</span>
          <span className="text-xs font-mono font-semibold text-[var(--text)]">{cert.compliancePct}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${cert.compliancePct}%`,
              background: cert.compliancePct >= 80 ? '#4ade80' : cert.compliancePct >= 50 ? '#fbbf24' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Filters and sort */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-[var(--text3)]" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="text-[11px] bg-[var(--bg2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          >
            <option value="all">{lang === 'sv' ? 'Alla krav' : 'All requirements'}</option>
            <option value="gaps">{lang === 'sv' ? 'Endast gap' : 'Gaps only'}</option>
            <option value="met">{lang === 'sv' ? 'Uppfyllda' : 'Met'}</option>
          </select>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortType)}
          className="text-[11px] bg-[var(--bg2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
        >
          <option value="priority">{lang === 'sv' ? 'Prioritet' : 'Priority'}</option>
          <option value="cost">{lang === 'sv' ? 'Kostnad' : 'Cost'}</option>
          <option value="hours">{lang === 'sv' ? 'Arbetstid' : 'Effort'}</option>
        </select>
      </div>

      {/* Requirements list */}
      <div className="space-y-2">
        {filteredAndSorted.map((req) => (
          <RequirementRow
            key={req.id}
            req={req}
            lang={lang}
            isExpanded={expandedId === req.id}
            onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)}
          />
        ))}
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-[var(--text3)]">
            {lang === 'sv' ? 'Inga krav matchar filtret' : 'No requirements match the filter'}
          </p>
        </div>
      )}

      {/* Action plan */}
      {gapCount > 0 && (
        <div
          className="rounded-xl border border-[var(--green)]/20 p-4 mt-6"
          style={{ background: 'var(--green)', opacity: 0.05 }}
        >
        </div>
      )}
      {gapCount > 0 && (
        <div className="rounded-xl border border-[var(--green)]/20 p-4 mt-6" style={{ background: 'rgba(74, 222, 128, 0.05)' }}>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-[var(--green)]" />
            {lang === 'sv' ? 'Foreslagen handlingsplan' : 'Suggested Action Plan'}
          </h3>
          <div className="space-y-2">
            {cert.requirements
              .filter((r) => r.status !== 'uppfyllt')
              .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
              .map((req, idx) => (
                <div key={req.id} className="flex items-start gap-3 py-1.5">
                  <span className="text-[10px] font-mono text-[var(--text3)] w-5 flex-shrink-0 mt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[var(--text)]">
                      {lang === 'sv' ? (req.actionNeeded_sv || req.label_sv) : (req.actionNeeded_en || req.label_en)}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[9px] text-[var(--text3)]">{req.estimatedHours}h</span>
                      <span className="text-[9px] text-[var(--text3)]">{req.estimatedCostSEK.toLocaleString('sv-SE')} SEK</span>
                      <span
                        className="text-[9px] font-mono px-1 py-0.5 rounded"
                        style={{ background: `${PRIORITY_LABELS[req.priority].color}15`, color: PRIORITY_LABELS[req.priority].color }}
                      >
                        {lang === 'sv' ? PRIORITY_LABELS[req.priority].sv : PRIORITY_LABELS[req.priority].en}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--text3)]">
              {lang === 'sv' ? 'Total uppskattad tidsram:' : 'Total estimated timeline:'}
            </span>
            <span className="text-xs font-mono font-semibold text-[var(--green)]">
              ~{estimatedWeeks} {lang === 'sv' ? 'veckor' : 'weeks'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
