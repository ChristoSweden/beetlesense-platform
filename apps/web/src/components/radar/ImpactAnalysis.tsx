import { useTranslation } from 'react-i18next';
import {
  MapPin,
  ArrowRight,
  Calendar,
  DollarSign,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { RegulatoryChange } from '@/data/regulatoryChanges';

interface Props {
  change: RegulatoryChange;
  onClose: () => void;
}

export function ImpactAnalysis({ change, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const title = lang === 'sv' ? change.title_sv : change.title_en;

  const complianceDate = change.complianceDeadline
    ? new Date(change.complianceDeadline).toLocaleDateString(
        lang === 'sv' ? 'sv-SE' : 'en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' },
      )
    : null;

  const daysUntilDeadline = change.complianceDeadline
    ? Math.ceil(
        (new Date(change.complianceDeadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('radar.impactAnalysis')}
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-[var(--bg3)] flex items-center justify-center transition-colors"
          aria-label={t('common.close')}
        >
          <X size={14} className="text-[var(--text3)]" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Change reference */}
        <p className="text-xs text-[var(--text3)] font-medium">
          {title}
        </p>

        {/* Affected parcels with reasons */}
        {change.affectedParcels.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} />
              {t('radar.affectedParcels')}
            </h4>
            <div className="space-y-2">
              {change.affectedParcels.map((parcel) => (
                <div
                  key={parcel.parcelId}
                  className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-semibold text-[var(--text)]">
                      {parcel.parcelName}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text2)] ml-4">
                    {lang === 'sv' ? parcel.reason_sv : parcel.reason_en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Before / After comparison */}
        {change.beforeAfter.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRight size={12} />
              {t('radar.beforeAfter')}
            </h4>
            <div className="space-y-2">
              {change.beforeAfter.map((ba, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                >
                  <p className="text-[10px] font-medium text-[var(--text3)] mb-2 uppercase">
                    {lang === 'sv' ? ba.label_sv : ba.label_en}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-2 rounded bg-red-500/5 border border-red-500/10">
                      <p className="text-[9px] text-red-400/60 uppercase mb-0.5">
                        {lang === 'sv' ? 'Före' : 'Before'}
                      </p>
                      <p className="text-[11px] text-red-400 font-mono">{ba.before}</p>
                    </div>
                    <ArrowRight size={14} className="text-[var(--text3)] flex-shrink-0" />
                    <div className="flex-1 p-2 rounded bg-[var(--green)]/5 border border-[var(--green)]/10">
                      <p className="text-[9px] text-[var(--green)]/60 uppercase mb-0.5">
                        {lang === 'sv' ? 'Efter' : 'After'}
                      </p>
                      <p className="text-[11px] text-[var(--green)] font-mono font-medium">{ba.after}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial impact */}
        {change.financialImpact && (
          <div>
            <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={12} />
              {t('radar.financialImpact')}
            </h4>
            <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text2)] leading-relaxed">
                {lang === 'sv' ? change.financialImpact.estimate_sv : change.financialImpact.estimate_en}
              </p>
            </div>
          </div>
        )}

        {/* Compliance deadline */}
        {complianceDate && (
          <div>
            <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={12} />
              {t('radar.complianceDeadline')}
            </h4>
            <div
              className={`p-3 rounded-lg border ${
                daysUntilDeadline !== null && daysUntilDeadline <= 30
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-[var(--bg)] border-[var(--border)]'
              }`}
            >
              <p className="text-xs font-semibold text-[var(--text)]">
                {complianceDate}
              </p>
              {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
                <p className={`text-[10px] mt-0.5 ${daysUntilDeadline <= 30 ? 'text-red-400' : 'text-[var(--text3)]'}`}>
                  {daysUntilDeadline} {t('radar.daysRemaining')}
                </p>
              )}
              {daysUntilDeadline !== null && daysUntilDeadline <= 0 && (
                <p className="text-[10px] mt-0.5 text-red-400 font-semibold">
                  {t('radar.deadlinePassed')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Recommended actions */}
        {change.requiredActions.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-[var(--text3)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              {t('radar.recommendedActions')}
            </h4>
            <div className="space-y-1.5">
              {change.requiredActions.map((action) => {
                const text = lang === 'sv' ? action.text_sv : action.text_en;
                return (
                  <div
                    key={action.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${action.completed ? 'bg-[var(--green)]/20' : 'bg-[var(--bg3)]'}`}>
                      {action.completed && <CheckCircle2 size={10} className="text-[var(--green)]" />}
                    </div>
                    <span className={`text-xs ${action.completed ? 'text-[var(--text3)] line-through' : 'text-[var(--text)]'}`}>
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
