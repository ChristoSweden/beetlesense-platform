import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Search, GraduationCap } from 'lucide-react';
import {
  academyLessons,
  getLessonById,
  ALL_TOPICS,
  ALL_DIFFICULTIES,
  TOPIC_I18N_KEYS,
  DIFFICULTY_I18N_KEYS,
  type AcademyTopic,
  type DifficultyLevel,
} from '@/data/academyCoursesData';
import { LessonCard } from '@/components/academy/LessonCard';
import { LessonViewer } from '@/components/academy/LessonViewer';
import { useAcademyStore } from '@/stores/academyStore';

function AcademyListView() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<AcademyTopic | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');

  const { lessonProgress: _lessonProgress, completedCount, inProgressLessonIds } = useAcademyStore();
  const completed = completedCount();
  const inProgressIds = inProgressLessonIds();
  const total = academyLessons.length;

  // Continue where you left off
  const continueLesson = useMemo(() => {
    if (inProgressIds.length === 0) return null;
    const lastId = inProgressIds[inProgressIds.length - 1];
    return academyLessons.find((l) => l.id === lastId) ?? null;
  }, [inProgressIds]);

  // Filter lessons
  const filteredLessons = useMemo(() => {
    return academyLessons.filter((lesson) => {
      // Topic filter
      if (selectedTopic !== 'all' && lesson.topic !== selectedTopic) return false;
      // Difficulty filter
      if (selectedDifficulty !== 'all' && lesson.difficulty !== selectedDifficulty) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (lang === 'sv' ? lesson.title_sv : lesson.title_en).toLowerCase();
        const desc = (lang === 'sv' ? lesson.description_sv : lesson.description_en).toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [selectedTopic, selectedDifficulty, searchQuery, lang]);

  return (
    <div className="p-5 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
            <GraduationCap size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold text-[var(--text)]">
              {t('academy.title')}
            </h1>
            <p className="text-xs text-[var(--text3)]">{t('academy.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Overall progress */}
      <div
        className="rounded-xl border border-[var(--border)] p-4 mb-6"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text)]">
            {t('academy.overallProgress', { completed, total })}
          </span>
          <span className="text-[10px] font-mono text-[var(--green)]">
            {total > 0 ? Math.round((completed / total) * 100) : 0}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Continue where you left off */}
      {continueLesson && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
            {t('academy.continueWhereYouLeftOff')}
          </h2>
          <div className="max-w-sm">
            <LessonCard lesson={continueLesson} />
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-sm text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40"
          />
        </div>

        {/* Topic filter */}
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value as AcademyTopic | 'all')}
          className="px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/40"
        >
          <option value="all">{t('academy.allTopics')}</option>
          {ALL_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {t(TOPIC_I18N_KEYS[topic])}
            </option>
          ))}
        </select>

        {/* Difficulty filter */}
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel | 'all')}
          className="px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/40"
        >
          <option value="all">{t('academy.allLevels')}</option>
          {ALL_DIFFICULTIES.map((diff) => (
            <option key={diff} value={diff}>
              {t(DIFFICULTY_I18N_KEYS[diff])}
            </option>
          ))}
        </select>
      </div>

      {/* Lessons grid */}
      {filteredLessons.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text3)]">{t('common.noResults')}</p>
        </div>
      )}
    </div>
  );
}

export default function AcademyPage() {
  const { lessonId } = useParams<{ lessonId?: string }>();

  if (lessonId) {
    const lesson = getLessonById(lessonId);
    if (!lesson) {
      return (
        <div className="p-5 text-center">
          <p className="text-sm text-[var(--text3)]">Lesson not found.</p>
        </div>
      );
    }
    return (
      <div className="p-5 overflow-y-auto h-full">
        <LessonViewer lesson={lesson} />
      </div>
    );
  }

  return <AcademyListView />;
}
