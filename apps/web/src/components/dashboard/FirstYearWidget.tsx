import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight, Check, ListChecks } from 'lucide-react';
import { useFirstYearStore } from '@/stores/firstYearStore';
import { FIRST_YEAR_TASKS } from '@/data/firstYearChecklistData';

export function FirstYearWidget() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { getCompletedCount, getTotalCount, getProgressPercent, getNextRecommendedTask, isCompleted, toggleTask } =
    useFirstYearStore();

  const completedCount = getCompletedCount();
  const totalCount = getTotalCount();
  const percent = getProgressPercent();
  const nextTaskId = getNextRecommendedTask();

  const nextTask = useMemo(
    () => (nextTaskId ? FIRST_YEAR_TASKS.find((t) => t.id === nextTaskId) : null),
    [nextTaskId],
  );

  const nextTitle = nextTask
    ? lang === 'sv'
      ? nextTask.title_sv
      : nextTask.title_en
    : null;

  const allDone = completedCount === totalCount;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('firstYear.widgetTitle')}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="w-full h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[10px] text-[var(--text3)] mt-1.5">
          {t('firstYear.progressLabel', { completed: completedCount, total: totalCount })}
        </p>
      </div>

      {/* Next task or all done */}
      {allDone ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20">
          <Check size={14} className="text-[var(--green)]" />
          <span className="text-[11px] font-medium text-[var(--green)]">
            {t('firstYear.allComplete')}
          </span>
        </div>
      ) : nextTask ? (
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <button
            onClick={() => toggleTask(nextTask.id)}
            className={`
              flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center
              transition-all duration-300 cursor-pointer
              ${isCompleted(nextTask.id)
                ? 'bg-[var(--green)] border-[var(--green)] text-forest-950'
                : 'border-[var(--border2)] hover:border-[var(--green)]'
              }
            `}
            aria-label={t('firstYear.markComplete')}
          >
            {isCompleted(nextTask.id) && <Check size={10} strokeWidth={3} />}
          </button>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-[var(--text)] block truncate">
              {nextTitle}
            </span>
            <span className="text-[9px] text-[var(--text3)]">
              {t('firstYear.nextRecommended')}
            </span>
          </div>
        </div>
      ) : null}

      {/* Link to full checklist */}
      <Link
        to="/owner/first-year"
        className="flex items-center justify-center gap-1.5 w-full py-2 mt-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        {t('firstYear.viewChecklist')}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
