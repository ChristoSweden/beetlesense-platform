import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileEdit,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer,
  Axe,
  Shovel,
  Droplets,
  ClipboardList,
} from 'lucide-react';
import type { FellingPermit } from '@/hooks/useCompliance';
import { PERMIT_STATUS_CONFIG, FELLING_TYPES, WAITING_PERIOD_DAYS, type PermitStatus } from '@/data/regulatoryRules';

// ─── Single permit tracker (detail view) ───

interface PermitTrackerProps {
  permit: FellingPermit;
}

const STEPS: { status: PermitStatus; icon: typeof FileEdit }[] = [
  { status: 'draft', icon: FileEdit },
  { status: 'submitted', icon: Send },
  { status: 'under_review', icon: Clock },
  { status: 'approved', icon: CheckCircle2 },
];

function getStepIndex(status: PermitStatus): number {
  if (status === 'requires_changes') return 2; // Same position as under_review
  if (status === 'expired') return 3;
  const idx = STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

export function PermitTracker({ permit }: PermitTrackerProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const currentStep = getStepIndex(permit.status);
  const statusConfig = PERMIT_STATUS_CONFIG[permit.status];

  // Countdown calculation
  const countdown = useMemo(() => {
    if (!permit.reviewDeadline) return null;
    const deadline = new Date(permit.reviewDeadline).getTime();
    const now = Date.now();
    const remaining = deadline - now;

    if (remaining <= 0) return { days: 0, hours: 0, expired: true };

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return { days, hours, expired: false };
  }, [permit.reviewDeadline]);

  // Progress percentage through the 6-week period
  const waitingProgress = useMemo(() => {
    if (!permit.submittedAt || !permit.reviewDeadline) return 0;
    const start = new Date(permit.submittedAt).getTime();
    const end = new Date(permit.reviewDeadline).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }, [permit.submittedAt, permit.reviewDeadline]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('compliance.permitTracker.title')}
          </h3>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            {permit.parcelName} — {permit.areaHa} ha
          </p>
        </div>
        <span
          className="text-[10px] font-mono px-2.5 py-1 rounded-full"
          style={{ background: statusConfig.bgColor, color: statusConfig.color }}
        >
          {lang === 'sv' ? statusConfig.label_sv : statusConfig.label_en}
        </span>
      </div>

      {/* Step progress bar */}
      <div className="relative mb-6">
        {/* Connecting line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-[var(--border)]" />
        <div
          className="absolute top-4 left-4 h-0.5 bg-[var(--green)] transition-all duration-500"
          style={{ width: `${Math.min(100, (currentStep / (STEPS.length - 1)) * 100)}%` }}
        />

        {/* Step dots */}
        <div className="relative flex justify-between">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            const StepIcon = step.icon;
            const stepConfig = PERMIT_STATUS_CONFIG[step.status];

            // Special handling for requires_changes
            const isError = isCurrent && permit.status === 'requires_changes';

            return (
              <div key={step.status} className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 transition-all
                    ${isCompleted
                      ? 'bg-[var(--green)] border-[var(--green)] text-forest-950'
                      : isCurrent
                        ? isError
                          ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                          : 'bg-[var(--green)]/20 border-[var(--green)] text-[var(--green)]'
                        : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text3)]'
                    }
                  `}
                >
                  {isError ? (
                    <AlertCircle size={14} />
                  ) : (
                    <StepIcon size={14} />
                  )}
                </div>
                <span className={`text-[9px] font-mono ${isCurrent ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                  {lang === 'sv' ? stepConfig.label_sv : stepConfig.label_en}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Countdown timer (only during review) */}
      {(permit.status === 'under_review' || permit.status === 'submitted') && countdown && (
        <div className="mb-4 p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer size={14} className="text-[var(--green)]" />
              <span className="text-xs font-medium text-[var(--text)]">
                {t('compliance.permitTracker.waitingPeriod')}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--text3)]">
              {WAITING_PERIOD_DAYS} {t('compliance.permitTracker.days')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${waitingProgress}%`,
                background: countdown.expired
                  ? '#4ade80'
                  : countdown.days <= 7
                    ? '#fbbf24'
                    : 'var(--green)',
              }}
            />
          </div>

          {/* Countdown text */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text3)]">
              {t('compliance.permitTracker.submitted')}: {formatDate(permit.submittedAt)}
            </span>
            {countdown.expired ? (
              <span className="text-[10px] font-mono text-[var(--green)]">
                {t('compliance.permitTracker.periodComplete')}
              </span>
            ) : (
              <span className={`text-[10px] font-mono ${countdown.days <= 7 ? 'text-amber-400' : 'text-[var(--text2)]'}`}>
                {countdown.days}{t('compliance.permitTracker.daysShort')} {countdown.hours}{t('compliance.permitTracker.hoursShort')} {t('compliance.permitTracker.remaining')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Key dates */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">{t('compliance.permitTracker.created')}</span>
          <p className="text-[11px] font-mono text-[var(--text)] mt-0.5">{formatDate(permit.createdAt)}</p>
        </div>
        <div className="p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">{t('compliance.permitTracker.submitted')}</span>
          <p className="text-[11px] font-mono text-[var(--text)] mt-0.5">{formatDate(permit.submittedAt)}</p>
        </div>
        <div className="p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">{t('compliance.permitTracker.reviewDeadline')}</span>
          <p className="text-[11px] font-mono text-[var(--text)] mt-0.5">{formatDate(permit.reviewDeadline)}</p>
        </div>
        <div className="p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">{t('compliance.permitTracker.approved')}</span>
          <p className="text-[11px] font-mono text-[var(--text)] mt-0.5">{formatDate(permit.approvedAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Multi-permit list view ───

const PERMIT_TYPE_ICONS: Record<string, typeof Axe> = {
  avverkning: Axe,
  markberedning: Shovel,
  dikning: Droplets,
};

interface PermitListProps {
  permits: FellingPermit[];
  onSelect?: (permit: FellingPermit) => void;
  selectedId?: string;
}

function computeDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const remaining = new Date(deadline).getTime() - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

export function PermitList({ permits, onSelect, selectedId }: PermitListProps) {
  const { t: _t, i18n } = useTranslation();
  const lang = i18n.language;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (permits.length === 0) {
    return (
      <div
        className="rounded-xl border border-[var(--border)] p-6 text-center"
        style={{ background: 'var(--bg2)' }}
      >
        <ClipboardList size={28} className="text-[var(--text3)] mx-auto mb-2" />
        <p className="text-xs text-[var(--text3)]">
          {lang === 'sv' ? 'Inga aktiva tillstånd' : 'No active permits'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* List header */}
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between" style={{ background: 'var(--bg3)' }}>
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-[var(--green)]" />
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {lang === 'sv' ? 'Tillstånd & tidsfrister' : 'Permits & Deadlines'}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg)] px-2 py-0.5 rounded-full">
          {permits.length} {lang === 'sv' ? 'st' : 'total'}
        </span>
      </div>

      {/* Column headers */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-1.5 border-b border-[var(--border)] text-[9px] font-mono uppercase tracking-wider text-[var(--text3)]">
        <div className="col-span-3">{lang === 'sv' ? 'Typ' : 'Type'}</div>
        <div className="col-span-3">{lang === 'sv' ? 'Skifte' : 'Parcel'}</div>
        <div className="col-span-2">{lang === 'sv' ? 'Status' : 'Status'}</div>
        <div className="col-span-2">{lang === 'sv' ? 'Frist' : 'Deadline'}</div>
        <div className="col-span-2 text-right">{lang === 'sv' ? 'Dagar kvar' : 'Days left'}</div>
      </div>

      {/* Permit rows */}
      <div className="divide-y divide-[var(--border)]">
        {permits.map((permit) => {
          const statusCfg = PERMIT_STATUS_CONFIG[permit.status];
          const fellingInfo = FELLING_TYPES.find((f) => f.id === permit.fellingType);
          const daysRemaining = computeDaysRemaining(permit.reviewDeadline);
          const isSelected = selectedId === permit.id;
          const TypeIcon = PERMIT_TYPE_ICONS[permit.fellingType] ?? Axe;

          return (
            <button
              key={permit.id}
              onClick={() => onSelect?.(permit)}
              className={`
                w-full text-left px-4 py-3 transition-all hover:bg-[var(--bg3)]/50
                ${isSelected ? 'bg-[var(--green)]/5 border-l-2 border-l-[var(--green)]' : ''}
              `}
            >
              {/* Mobile layout */}
              <div className="sm:hidden space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TypeIcon size={12} className="text-[var(--text3)]" />
                    <span className="text-xs font-medium text-[var(--text)]">
                      {fellingInfo ? (lang === 'sv' ? fellingInfo.label_sv : fellingInfo.label_en) : permit.fellingType}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: statusCfg.bgColor, color: statusCfg.color }}
                  >
                    {lang === 'sv' ? statusCfg.label_sv : statusCfg.label_en}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text3)]">
                  <span>{permit.parcelName} - {permit.areaHa} ha</span>
                  {daysRemaining !== null && (
                    <span className={`font-mono ${daysRemaining <= 7 ? 'text-amber-400' : daysRemaining === 0 ? 'text-[var(--green)]' : 'text-[var(--text2)]'}`}>
                      {daysRemaining === 0
                        ? (lang === 'sv' ? 'Utgången' : 'Expired')
                        : `${daysRemaining} ${lang === 'sv' ? 'd kvar' : 'd left'}`
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3 flex items-center gap-2">
                  <TypeIcon size={12} className="text-[var(--text3)] flex-shrink-0" />
                  <span className="text-[11px] font-medium text-[var(--text)] truncate">
                    {fellingInfo ? (lang === 'sv' ? fellingInfo.label_sv : fellingInfo.label_en) : permit.fellingType}
                  </span>
                </div>
                <div className="col-span-3">
                  <span className="text-[11px] text-[var(--text2)] truncate block">{permit.parcelName}</span>
                  <span className="text-[9px] text-[var(--text3)]">{permit.areaHa} ha</span>
                </div>
                <div className="col-span-2">
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded inline-block"
                    style={{ background: statusCfg.bgColor, color: statusCfg.color }}
                  >
                    {lang === 'sv' ? statusCfg.label_sv : statusCfg.label_en}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-mono text-[var(--text2)]">
                    {formatDate(permit.reviewDeadline)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  {daysRemaining !== null ? (
                    <span className={`text-[11px] font-mono font-semibold ${
                      daysRemaining === 0
                        ? 'text-[var(--green)]'
                        : daysRemaining <= 7
                          ? 'text-amber-400'
                          : daysRemaining <= 14
                            ? 'text-[var(--text2)]'
                            : 'text-[var(--text3)]'
                    }`}>
                      {daysRemaining === 0
                        ? (lang === 'sv' ? 'Klar' : 'Done')
                        : `${daysRemaining} ${lang === 'sv' ? 'dagar' : 'days'}`
                      }
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text3)]">—</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
