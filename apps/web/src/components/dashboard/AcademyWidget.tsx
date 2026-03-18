import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { academyLessons } from '@/data/academyCoursesData';
import { useAcademyStore } from '@/stores/academyStore';

export function AcademyWidget() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { completedCount, inProgressLessonIds, lessonProgress } = useAcademyStore();
  const completed = completedCount();
  const total = academyLessons.length;
  const inProgressIds = inProgressLessonIds();

  // Determine next recommended lesson: first in-progress, or first not-started
  const nextLesson = useMemo(() => {
    // Resume in-progress
    if (inProgressIds.length > 0) {
      return academyLessons.find((l) => l.id === inProgressIds[0]) ?? null;
    }
    // First not-started
    return academyLessons.find((l) => !lessonProgress[l.id]?.completed && !lessonProgress[l.id]?.started) ?? null;
  }, [inProgressIds, lessonProgress]);

  const nextTitle = nextLesson
    ? lang === 'sv' ? nextLesson.title_sv : nextLesson.title_en
    : null;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('academy.widgetTitle')}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
        />
      </div>

      {/* Next lesson */}
      {nextLesson && (
        <div
          className="flex items-center gap-2.5 p-2 rounded-lg border border-[var(--border)] mb-3"
          style={{ background: 'var(--bg)' }}
        >
          <div className="w-7 h-7 rounded-md bg-[var(--green)]/10 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={14} className="text-[var(--green)]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-mono uppercase text-[var(--text3)] block">
              {t('academy.upNext')}
            </span>
            <span className="text-[11px] font-medium text-[var(--text)] block truncate">
              {nextTitle}
            </span>
          </div>
        </div>
      )}

      {/* Link to academy */}
      <Link
        to="/owner/academy"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        {t('academy.continueLearning')}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
