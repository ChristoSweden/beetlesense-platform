import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  CheckSquare,
  Square,
  Clock,
  MapPin,
  AlertTriangle,
  Info,
  Tag,
} from 'lucide-react';
import type { RegulatoryChange, ImpactSeverity, RegulatoryCategory } from '@/data/regulatoryChanges';

// ─── Severity Config ───

const SEVERITY_CONFIG: Record<ImpactSeverity, { bg: string; text: string; border: string; label_en: string; label_sv: string }> = {
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label_en: 'High', label_sv: 'Hög' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label_en: 'Medium', label_sv: 'Medel' },
  low: { bg: 'bg-[var(--green)]/10', text: 'text-[var(--green)]', border: 'border-[var(--green)]/20', label_en: 'Low', label_sv: 'Låg' },
  informational: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label_en: 'Info', label_sv: 'Info' },
};

const CATEGORY_LABELS: Record<RegulatoryCategory, { en: string; sv: string }> = {
  felling_rules: { en: 'Felling Rules', sv: 'Avverkningsregler' },
  environmental_protection: { en: 'Environmental Protection', sv: 'Miljöskydd' },
  tax_finance: { en: 'Tax & Finance', sv: 'Skatt & Ekonomi' },
  eu_directives: { en: 'EU Directives', sv: 'EU-direktiv' },
  biodiversity: { en: 'Biodiversity', sv: 'Biologisk mångfald' },
  climate: { en: 'Climate', sv: 'Klimat' },
};

interface Props {
  change: RegulatoryChange;
  onMarkAsRead: (id: string) => void;
  onToggleAction: (changeId: string, actionId: string) => void;
  onShowImpact?: (change: RegulatoryChange) => void;
}

export function RegulatoryChangeCard({ change, onMarkAsRead, onToggleAction, onShowImpact }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [expanded, setExpanded] = useState(false);

  const severity = SEVERITY_CONFIG[change.severity];
  const title = lang === 'sv' ? change.title_sv : change.title_en;
  const summary = lang === 'sv' ? change.summary_sv : change.summary_en;
  const details = lang === 'sv' ? change.details_sv : change.details_en;
  const howAffects = lang === 'sv' ? change.howAffectsYou_sv : change.howAffectsYou_en;

  const effectiveDate = new Date(change.effectiveDate).toLocaleDateString(
    lang === 'sv' ? 'sv-SE' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );

  const _publishedDate = new Date(change.publishedDate).toLocaleDateString(
    lang === 'sv' ? 'sv-SE' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );

  const handleExpand = () => {
    if (!expanded && !change.isRead) {
      onMarkAsRead(change.id);
    }
    setExpanded(!expanded);
  };

  return (
    <div
      className={`rounded-xl border ${change.isRead ? 'border-[var(--border)]' : 'border-[var(--green)]/30'} transition-all duration-200`}
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <button
        onClick={handleExpand}
        className="w-full text-left p-4 pb-3"
      >
        <div className="flex items-start gap-3">
          {/* Unread indicator */}
          {!change.isRead && (
            <div className="w-2 h-2 rounded-full bg-[var(--green)] mt-2 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            {/* Top row: severity badge + source + date */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${severity.bg} ${severity.text} ${severity.border} border`}>
                {change.severity === 'high' && <AlertTriangle size={10} />}
                {change.severity === 'informational' && <Info size={10} />}
                {lang === 'sv' ? severity.label_sv : severity.label_en}
              </span>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {change.source}
              </span>
              <span className="text-[10px] text-[var(--text3)]">
                &middot;
              </span>
              <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                <Clock size={10} />
                {t('radar.effective')} {effectiveDate}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-[var(--text)] leading-tight mb-2">
              {title}
            </h3>

            {/* Summary */}
            <p className="text-xs text-[var(--text2)] leading-relaxed mb-2">
              {summary}
            </p>

            {/* Category tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {change.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)]"
                >
                  <Tag size={8} />
                  {lang === 'sv' ? CATEGORY_LABELS[cat].sv : CATEGORY_LABELS[cat].en}
                </span>
              ))}
              {change.affectedParcels.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <MapPin size={8} />
                  {change.affectedParcels.length} {lang === 'sv' ? 'skiften' : 'parcels'}
                </span>
              )}
            </div>
          </div>

          {/* Expand toggle */}
          <div className="flex-shrink-0 mt-1">
            {expanded ? (
              <ChevronUp size={16} className="text-[var(--text3)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--text3)]" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-4">
          {/* How this affects you */}
          {howAffects && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
              <h4 className="text-[11px] font-semibold text-amber-400 mb-1.5 uppercase tracking-wider">
                {t('radar.howAffectsYou')}
              </h4>
              <p className="text-xs text-[var(--text2)] leading-relaxed">
                {howAffects}
              </p>
            </div>
          )}

          {/* Affected parcels */}
          {change.affectedParcels.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-2 uppercase tracking-wider">
                {t('radar.affectedParcels')}
              </h4>
              <div className="space-y-1.5">
                {change.affectedParcels.map((parcel) => (
                  <div key={parcel.parcelId} className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <MapPin size={12} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-[var(--text)]">{parcel.parcelName}</span>
                      <p className="text-[10px] text-[var(--text3)]">
                        {lang === 'sv' ? parcel.reason_sv : parcel.reason_en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Before/After comparison */}
          {change.beforeAfter.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-2 uppercase tracking-wider">
                {t('radar.beforeAfter')}
              </h4>
              <div className="space-y-1.5">
                {change.beforeAfter.map((ba, i) => (
                  <div key={i} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                    <div>
                      <p className="text-[9px] text-[var(--text3)] uppercase mb-0.5">{lang === 'sv' ? 'Före' : 'Before'}</p>
                      <p className="text-[11px] text-red-400 line-through">{ba.before}</p>
                    </div>
                    <div className="text-[var(--text3)]">&rarr;</div>
                    <div>
                      <p className="text-[9px] text-[var(--text3)] uppercase mb-0.5">{lang === 'sv' ? 'Efter' : 'After'}</p>
                      <p className="text-[11px] text-[var(--green)] font-medium">{ba.after}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required actions */}
          {change.requiredActions.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-2 uppercase tracking-wider">
                {t('radar.requiredActions')}
              </h4>
              <div className="space-y-1.5">
                {change.requiredActions.map((action) => {
                  const actionText = lang === 'sv' ? action.text_sv : action.text_en;
                  const deadline = action.deadline
                    ? new Date(action.deadline).toLocaleDateString(
                        lang === 'sv' ? 'sv-SE' : 'en-GB',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )
                    : null;

                  return (
                    <button
                      key={action.id}
                      onClick={() => onToggleAction(change.id, action.id)}
                      className="flex items-start gap-2 w-full p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border2)] transition-colors text-left"
                    >
                      {action.completed ? (
                        <CheckSquare size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
                      ) : (
                        <Square size={14} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs ${action.completed ? 'text-[var(--text3)] line-through' : 'text-[var(--text)]'}`}>
                          {actionText}
                        </span>
                        {deadline && (
                          <span className="block text-[9px] text-[var(--text3)] mt-0.5">
                            {t('radar.deadline')}: {deadline}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Financial impact */}
          {change.financialImpact && (
            <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-3">
              <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-1 uppercase tracking-wider">
                {t('radar.financialImpact')}
              </h4>
              <p className="text-xs text-[var(--text2)]">
                {lang === 'sv' ? change.financialImpact.estimate_sv : change.financialImpact.estimate_en}
              </p>
            </div>
          )}

          {/* Full details */}
          <div>
            <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-1.5 uppercase tracking-wider">
              {t('radar.fullDetails')}
            </h4>
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              {details}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <a
              href={change.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[11px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              <ExternalLink size={12} />
              {t('radar.officialSource')}
            </a>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--green)]/30 text-[11px] font-medium text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors">
              <Sparkles size={12} />
              {t('radar.askAi')}
            </button>
            {change.affectedParcels.length > 0 && onShowImpact && (
              <button
                onClick={() => onShowImpact(change)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 text-[11px] font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <AlertTriangle size={12} />
                {t('radar.viewImpact')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
