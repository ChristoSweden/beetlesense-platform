import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import { useFirstYearStore } from '@/stores/firstYearStore';
import type { ChecklistTask } from '@/data/firstYearChecklistData';
import { CATEGORY_COLORS, CATEGORY_I18N_KEYS } from '@/data/firstYearChecklistData';

interface ChecklistItemProps {
  task: ChecklistTask;
  onAskAi?: (task: ChecklistTask) => void;
}

export function ChecklistItem({ task, onAskAi }: ChecklistItemProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { isCompleted, toggleTask } = useFirstYearStore();
  const completed = isCompleted(task.id);
  const [expanded, setExpanded] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const title = lang === 'sv' ? task.title_sv : task.title_en;
  const description = lang === 'sv' ? task.description_sv : task.description_en;
  const why = lang === 'sv' ? task.why_sv : task.why_en;
  const categoryColor = CATEGORY_COLORS[task.category];

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleToggle() {
    const wasCompleted = completed;
    toggleTask(task.id);

    if (!wasCompleted) {
      setCelebrating(true);
      timeoutRef.current = setTimeout(() => setCelebrating(false), 1200);
    }
  }

  const estimatedTimeStr =
    task.estimatedMinutes >= 60
      ? `~${Math.floor(task.estimatedMinutes / 60)}${t('firstYear.hours')} ${task.estimatedMinutes % 60 > 0 ? `${task.estimatedMinutes % 60} ${t('firstYear.minutes')}` : ''}`
      : `~${task.estimatedMinutes} ${t('firstYear.minutes')}`;

  return (
    <div
      className={`
        relative rounded-xl border transition-all duration-300
        ${completed
          ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
          : 'border-[var(--border)] bg-[var(--bg2)]'
        }
        ${celebrating ? 'ring-2 ring-[var(--green)]/50 scale-[1.01]' : ''}
      `}
    >
      {/* Celebration overlay */}
      {celebrating && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-[var(--green)]/5 animate-pulse" />
          {/* Confetti dots */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full animate-confetti"
              style={{
                backgroundColor: ['#4ade80', '#fbbf24', '#60a5fa', '#a78bfa', '#f97316'][i % 5],
                left: `${10 + Math.random() * 80}%`,
                top: `${Math.random() * 40}%`,
                animationDelay: `${i * 80}ms`,
                animationDuration: `${800 + Math.random() * 400}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className="p-4">
        {/* Main row: checkbox + title + expand */}
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggle}
            className={`
              flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center
              transition-all duration-300 cursor-pointer
              ${completed
                ? 'bg-[var(--green)] border-[var(--green)] text-forest-950'
                : 'border-[var(--border2)] hover:border-[var(--green)] bg-transparent'
              }
            `}
            aria-label={completed ? t('firstYear.markIncomplete') : t('firstYear.markComplete')}
          >
            {completed && <Check size={14} strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={`text-sm font-medium transition-colors ${
                  completed ? 'text-[var(--text3)] line-through' : 'text-[var(--text)]'
                }`}
              >
                {title}
              </h4>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                style={{
                  color: categoryColor,
                  backgroundColor: `${categoryColor}15`,
                }}
              >
                {t(CATEGORY_I18N_KEYS[task.category])}
              </span>
            </div>
            <p className="text-xs text-[var(--text3)] mt-1 leading-relaxed">{description}</p>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                <Clock size={10} />
                {estimatedTimeStr}
              </span>
              {task.link && (
                <Link
                  to={task.link}
                  className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
                >
                  <ExternalLink size={10} />
                  {t('firstYear.goToFeature')}
                </Link>
              )}
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg hover:bg-[var(--bg3)] flex items-center justify-center transition-colors"
            aria-label={expanded ? t('common.close') : t('firstYear.showDetails')}
          >
            {expanded ? (
              <ChevronUp size={14} className="text-[var(--text3)]" />
            ) : (
              <ChevronDown size={14} className="text-[var(--text3)]" />
            )}
          </button>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 animate-in">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <Info size={14} className="text-[var(--green)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold text-[var(--text)] mb-1">
                  {t('firstYear.whyThisMatters')}
                </p>
                <p className="text-[11px] text-[var(--text2)] leading-relaxed">{why}</p>
              </div>
            </div>

            {onAskAi && (
              <button
                onClick={() => onAskAi(task)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors w-full justify-center"
              >
                <Sparkles size={14} />
                {t('firstYear.askAiAbout')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
