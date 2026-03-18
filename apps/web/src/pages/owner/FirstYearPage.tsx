import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ListChecks,
  RotateCcw,
  Trophy,
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useFirstYearStore } from '@/stores/firstYearStore';
import { getTasksForMonth } from '@/data/firstYearChecklistData';
import { ChecklistItem } from '@/components/firstyear/ChecklistItem';
import type { ChecklistTask } from '@/data/firstYearChecklistData';

const MONTH_KEYS = [
  'calendar.months.january',
  'calendar.months.february',
  'calendar.months.march',
  'calendar.months.april',
  'calendar.months.may',
  'calendar.months.june',
  'calendar.months.july',
  'calendar.months.august',
  'calendar.months.september',
  'calendar.months.october',
  'calendar.months.november',
  'calendar.months.december',
];

export default function FirstYearPage() {
  const { t, i18n } = useTranslation();
  const {
    getCompletedCount,
    getTotalCount,
    getProgressPercent,
    completedTasks,
    resetProgress,
    getCurrentMonth,
  } = useFirstYearStore();

  const currentMonth = getCurrentMonth();
  const completedCount = getCompletedCount();
  const totalCount = getTotalCount();
  const percent = getProgressPercent();
  const allDone = completedCount === totalCount;

  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(() => {
    // Auto-expand the current month and adjacent months
    const initial = new Set<number>();
    initial.add(currentMonth);
    if (currentMonth > 1) initial.add(currentMonth - 1);
    if (currentMonth < 12) initial.add(currentMonth + 1);
    return initial;
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const monthData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const tasks = getTasksForMonth(month);
      const completedInMonth = tasks.filter((t) => completedTasks.has(t.id)).length;
      return { month, tasks, completedInMonth, total: tasks.length };
    });
  }, [completedTasks]);

  function toggleMonth(month: number) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  }

  function handleAskAi(task: ChecklistTask) {
    const title = i18n.language === 'sv' ? task.title_sv : task.title_en;
    // Navigate to companion or open companion panel -- for now, open in a new search
    const query = encodeURIComponent(title);
    window.location.href = `/owner/dashboard?companion=${query}`;
  }

  function handleReset() {
    resetProgress();
    setShowResetConfirm(false);
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <ListChecks size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                {t('firstYear.pageTitle')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('firstYear.pageSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar section */}
        <div className="rounded-xl border border-[var(--border)] p-5 mb-6" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {allDone ? (
                <Trophy size={18} className="text-[var(--green)]" />
              ) : (
                <ListChecks size={18} className="text-[var(--green)]" />
              )}
              <span className="text-sm font-semibold text-[var(--text)]">
                {allDone
                  ? t('firstYear.congratulations')
                  : t('firstYear.progressLabel', { completed: completedCount, total: totalCount })}
              </span>
            </div>
            <span className="text-lg font-mono font-bold text-[var(--green)]">{percent}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${percent}%`,
                background: allDone
                  ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                  : 'linear-gradient(90deg, #4ade80, #86efac)',
              }}
            />
          </div>

          {allDone && (
            <p className="text-xs text-[var(--green)] mt-2">
              {t('firstYear.allCompleteMessage')}
            </p>
          )}

          {/* Reset button */}
          <div className="flex justify-end mt-2">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
              >
                <RotateCcw size={10} />
                {t('firstYear.reset')}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text3)]">{t('firstYear.resetConfirm')}</span>
                <button
                  onClick={handleReset}
                  className="text-[10px] text-red-400 hover:text-red-300 font-medium"
                >
                  {t('common.confirm')}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="text-[10px] text-[var(--text3)] hover:text-[var(--text2)]"
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--border)]" />

          {monthData.map(({ month, tasks, completedInMonth, total }) => {
            const isCurrentMonth = month === currentMonth;
            const isExpanded = expandedMonths.has(month);
            const allMonthDone = completedInMonth === total;
            const isFuture = month > currentMonth;

            return (
              <div key={month} className="relative mb-4">
                {/* Month header */}
                <button
                  onClick={() => toggleMonth(month)}
                  className={`
                    relative flex items-center gap-3 w-full text-left p-3 rounded-xl
                    transition-all duration-200
                    ${isCurrentMonth
                      ? 'bg-[var(--green)]/10 border border-[var(--green)]/20'
                      : 'hover:bg-[var(--bg2)] border border-transparent'
                    }
                  `}
                >
                  {/* Timeline dot */}
                  <div
                    className={`
                      relative z-10 w-[38px] h-[38px] rounded-full flex items-center justify-center
                      flex-shrink-0 text-xs font-mono font-bold border-2 transition-colors
                      ${allMonthDone
                        ? 'bg-[var(--green)] border-[var(--green)] text-forest-950'
                        : isCurrentMonth
                          ? 'bg-[var(--green)]/20 border-[var(--green)] text-[var(--green)]'
                          : isFuture
                            ? 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text3)]'
                            : 'bg-[var(--bg2)] border-[var(--border2)] text-[var(--text2)]'
                      }
                    `}
                  >
                    {allMonthDone ? (
                      <Trophy size={16} />
                    ) : (
                      month
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isCurrentMonth ? 'text-[var(--green)]' : 'text-[var(--text)]'
                        }`}
                      >
                        {t(MONTH_KEYS[month - 1])}
                      </span>
                      {isCurrentMonth && (
                        <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--green)]/20 text-[var(--green)]">
                          <MapPin size={8} />
                          {t('firstYear.youAreHere')}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[var(--text3)] ml-auto">
                        {completedInMonth}/{total}
                      </span>
                    </div>

                    {/* Mini progress for this month */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            completedTasks.has(task.id)
                              ? 'bg-[var(--green)]'
                              : 'bg-[var(--bg3)]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-[var(--text3)]" />
                    ) : (
                      <ChevronRight size={16} className="text-[var(--text3)]" />
                    )}
                  </div>
                </button>

                {/* Tasks (expanded) */}
                {isExpanded && (
                  <div className="ml-[50px] mt-2 space-y-2 animate-in">
                    {tasks.map((task) => (
                      <ChecklistItem
                        key={task.id}
                        task={task}
                        onAskAi={handleAskAi}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
