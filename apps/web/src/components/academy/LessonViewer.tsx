import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Clock,
  ChevronRight,
} from 'lucide-react';
import type { AcademyLesson, LessonSection, SectionQuiz } from '@/data/academyCoursesData';
import { getNextLesson, TOPIC_I18N_KEYS, DIFFICULTY_I18N_KEYS } from '@/data/academyCoursesData';
import { useAcademyStore } from '@/stores/academyStore';

// ─── Quiz Component ─────────────────────────────────────────────────────────────

function QuizBlock({ quiz, lang, onAnswer }: { quiz: SectionQuiz; lang: string; onAnswer: (correct: boolean) => void }) {
  const { t: _t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const question = lang === 'sv' ? quiz.question_sv : quiz.question_en;
  const explanation = lang === 'sv' ? quiz.explanation_sv : quiz.explanation_en;

  const handleSelect = (id: string) => {
    if (answered) return;
    setSelected(id);
    setAnswered(true);
    onAnswer(id === quiz.correctOptionId);
  };

  return (
    <div className="mt-4 rounded-xl border border-[var(--border2)] p-4" style={{ background: 'var(--bg)' }}>
      <p className="text-sm font-semibold text-[var(--text)] mb-3">{question}</p>
      <div className="space-y-2">
        {quiz.options.map((opt) => {
          const text = lang === 'sv' ? opt.text_sv : opt.text_en;
          const isCorrect = opt.id === quiz.correctOptionId;
          const isSelected = opt.id === selected;

          let borderColor = 'var(--border)';
          let bgColor = 'transparent';
          if (answered && isSelected && isCorrect) {
            borderColor = '#4ade80';
            bgColor = 'rgba(74, 222, 128, 0.1)';
          } else if (answered && isSelected && !isCorrect) {
            borderColor = '#ef4444';
            bgColor = 'rgba(239, 68, 68, 0.1)';
          } else if (answered && isCorrect) {
            borderColor = '#4ade80';
            bgColor = 'rgba(74, 222, 128, 0.05)';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={answered}
              className="w-full text-left p-3 rounded-lg border text-sm text-[var(--text)] transition-all hover:bg-[var(--bg3)] disabled:cursor-default"
              style={{ borderColor, background: bgColor }}
            >
              {text}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-3 p-3 rounded-lg bg-[var(--bg2)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text2)]">{explanation}</p>
        </div>
      )}
    </div>
  );
}

// ─── Section Renderer ────────────────────────────────────────────────────────────

function SectionContent({ section, lang }: { section: LessonSection; lang: string }) {
  const title = lang === 'sv' ? section.title_sv : section.title_en;
  const content = lang === 'sv' ? section.content_sv : section.content_en;
  const takeaway = lang === 'sv' ? section.keyTakeaway_sv : section.keyTakeaway_en;

  // Simple markdown-like rendering: bold, bullet lists
  const renderContent = (text: string) => {
    const paragraphs = text.split('\n\n');
    return paragraphs.map((para, i) => {
      const lines = para.split('\n');
      const isList = lines.some((l) => l.trimStart().startsWith('- '));

      if (isList) {
        return (
          <ul key={i} className="space-y-1.5 mb-4">
            {lines
              .filter((l) => l.trim())
              .map((line, j) => {
                const content = line.replace(/^[-•]\s*/, '');
                return (
                  <li key={j} className="flex gap-2 text-sm text-[var(--text2)] leading-relaxed">
                    <span className="text-[var(--green)] mt-1.5 flex-shrink-0">&#8226;</span>
                    <span dangerouslySetInnerHTML={{ __html: boldify(content) }} />
                  </li>
                );
              })}
          </ul>
        );
      }

      const isNumberedList = lines.some((l) => /^\d+\./.test(l.trimStart()));
      if (isNumberedList) {
        return (
          <ol key={i} className="space-y-1.5 mb-4 list-decimal list-inside">
            {lines
              .filter((l) => l.trim())
              .map((line, j) => {
                const content = line.replace(/^\d+\.\s*/, '');
                return (
                  <li key={j} className="text-sm text-[var(--text2)] leading-relaxed">
                    <span dangerouslySetInnerHTML={{ __html: boldify(content) }} />
                  </li>
                );
              })}
          </ol>
        );
      }

      return (
        <p
          key={i}
          className="text-sm text-[var(--text2)] leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: boldify(para) }}
        />
      );
    });
  };

  return (
    <div>
      <h2 className="text-lg font-serif font-bold text-[var(--text)] mb-4">{title}</h2>
      <div>{renderContent(content)}</div>

      {/* Key Takeaway Box */}
      <div className="flex gap-3 p-4 rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 mt-2">
        <Lightbulb size={18} className="text-[var(--green)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--green)] mb-1">
            Key Takeaway
          </p>
          <p className="text-sm text-[var(--text)] leading-relaxed">{takeaway}</p>
        </div>
      </div>
    </div>
  );
}

function boldify(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--text)] font-semibold">$1</strong>');
}

// ─── Main Lesson Viewer ──────────────────────────────────────────────────────────

interface LessonViewerProps {
  lesson: AcademyLesson;
}

export function LessonViewer({ lesson }: LessonViewerProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const _navigate = useNavigate();

  const {
    startLesson,
    completeSection,
    completeLesson,
    lessonProgress,
  } = useAcademyStore();

  const progress = lessonProgress[lesson.id];
  const currentSectionIdx = progress?.currentSection ?? 0;
  const [viewSection, setViewSection] = useState(
    Math.min(currentSectionIdx, lesson.sections.length - 1),
  );

  // Start the lesson on first view
  if (!progress?.started) {
    startLesson(lesson.id, lesson.sections.length);
  }

  const section = lesson.sections[viewSection];
  const isLastSection = viewSection === lesson.sections.length - 1;
  const isFirstSection = viewSection === 0;
  const _allSectionsCompleted = lesson.sections.every(
    (_, i) => progress?.sections[i]?.completed,
  );
  const isSectionCompleted = progress?.sections[viewSection]?.completed ?? false;
  const isLessonCompleted = progress?.completed ?? false;

  const totalSections = lesson.sections.length;
  const completedSections = progress
    ? Object.values(progress.sections).filter((s) => s.completed).length
    : 0;
  const progressPct = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  const title = lang === 'sv' ? lesson.title_sv : lesson.title_en;
  const nextLesson = getNextLesson(lesson.id);
  const nextTitle = nextLesson
    ? lang === 'sv' ? nextLesson.title_sv : nextLesson.title_en
    : null;

  const handleCompleteSection = useCallback(() => {
    completeSection(lesson.id, viewSection);
  }, [completeSection, lesson.id, viewSection]);

  const handleQuizAnswer = useCallback(
    (correct: boolean) => {
      completeSection(lesson.id, viewSection, { answered: true, correct });
    },
    [completeSection, lesson.id, viewSection],
  );

  const handleNext = () => {
    if (!isSectionCompleted) {
      handleCompleteSection();
    }
    if (isLastSection) return;
    setViewSection((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (isFirstSection) return;
    setViewSection((prev) => prev - 1);
  };

  const handleMarkComplete = () => {
    if (!isSectionCompleted) {
      handleCompleteSection();
    }
    completeLesson(lesson.id);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/owner/academy"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          {t('academy.backToAcademy')}
        </Link>

        <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-2">{title}</h1>

        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-[9px] font-mono px-2 py-0.5 rounded-full"
            style={{
              background: `${lesson.difficulty === 'beginner' ? '#4ade80' : lesson.difficulty === 'intermediate' ? '#f59e0b' : '#ef4444'}15`,
              color: lesson.difficulty === 'beginner' ? '#4ade80' : lesson.difficulty === 'intermediate' ? '#f59e0b' : '#ef4444',
            }}
          >
            {t(DIFFICULTY_I18N_KEYS[lesson.difficulty])}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
            <Clock size={10} />
            {lesson.estimatedMinutes} min
          </span>
          <span className="text-[10px] text-[var(--text3)]">
            {t(TOPIC_I18N_KEYS[lesson.topic])}
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
              style={{ width: `${isLessonCompleted ? 100 : progressPct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-[var(--text3)]">
            {completedSections}/{totalSections}
          </span>
        </div>
      </div>

      {/* Section navigation dots */}
      <div className="flex items-center gap-2 mb-6">
        {lesson.sections.map((sec, i) => {
          const secTitle = lang === 'sv' ? sec.title_sv : sec.title_en;
          const done = progress?.sections[i]?.completed ?? false;
          const active = i === viewSection;
          return (
            <button
              key={i}
              onClick={() => setViewSection(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                active
                  ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20'
                  : done
                    ? 'bg-[var(--bg3)] text-[var(--green)] border border-transparent'
                    : 'bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]'
              }`}
              title={secTitle}
            >
              {done && <CheckCircle2 size={10} />}
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div
        className="rounded-xl border border-[var(--border)] p-6 md:p-8 mb-6"
        style={{ background: 'var(--bg2)' }}
      >
        <SectionContent section={section} lang={lang} />

        {/* Quiz */}
        {section.quiz && (
          <QuizBlock quiz={section.quiz} lang={lang} onAnswer={handleQuizAnswer} />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handlePrev}
          disabled={isFirstSection}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={14} />
          {t('common.back')}
        </button>

        <div className="flex items-center gap-2">
          {/* Ask AI button */}
          <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors">
            <Sparkles size={14} />
            {t('academy.askAi')}
          </button>

          {isLastSection ? (
            isLessonCompleted ? (
              nextLesson ? (
                <Link
                  to={`/owner/academy/${nextLesson.id}`}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
                >
                  {t('academy.nextLesson')}
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <Link
                  to="/owner/academy"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
                >
                  {t('academy.backToAcademy')}
                </Link>
              )
            ) : (
              <button
                onClick={handleMarkComplete}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
              >
                <CheckCircle2 size={14} />
                {t('academy.markComplete')}
              </button>
            )
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
            >
              {t('common.next')}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Next lesson suggestion */}
      {isLessonCompleted && nextLesson && (
        <Link
          to={`/owner/academy/${nextLesson.id}`}
          className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-[var(--green)]/30 transition-colors"
          style={{ background: 'var(--bg2)' }}
        >
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-1">
              {t('academy.upNext')}
            </p>
            <p className="text-sm font-semibold text-[var(--text)]">{nextTitle}</p>
          </div>
          <ChevronRight size={18} className="text-[var(--green)]" />
        </Link>
      )}
    </div>
  );
}
