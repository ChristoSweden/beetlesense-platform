import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  Circle,
  FileText,
  TreePine,
  Bug,
  Axe,
  Receipt,
  Satellite,
  Scale,
  ClipboardList,
  TrendingUp,
  Leaf,
  Thermometer,
  Plane,
  Shield,
  GitBranch,
  Award,
} from 'lucide-react';
import type { AcademyLesson } from '@/data/academyCoursesData';
import { TOPIC_COLORS, TOPIC_I18N_KEYS, DIFFICULTY_I18N_KEYS } from '@/data/academyCoursesData';
import { useAcademyStore } from '@/stores/academyStore';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  FileText, TreePine, Bug, Axe, Receipt, Satellite, Scale,
  ClipboardList, TrendingUp, Leaf, Thermometer, Plane, Shield, GitBranch, Award,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#4ade80',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

interface LessonCardProps {
  lesson: AcademyLesson;
}

export function LessonCard({ lesson }: LessonCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [hovered, setHovered] = useState(false);

  const progress = useAcademyStore((s) => s.lessonProgress[lesson.id]);
  const isCompleted = progress?.completed ?? false;
  const isStarted = progress?.started ?? false;

  const title = lang === 'sv' ? lesson.title_sv : lesson.title_en;
  const description = lang === 'sv' ? lesson.description_sv : lesson.description_en;
  const topicColor = TOPIC_COLORS[lesson.topic];
  const diffColor = DIFFICULTY_COLORS[lesson.difficulty];
  const IconComp = ICON_MAP[lesson.icon] ?? FileText;

  const sectionsDone = progress
    ? Object.values(progress.sections).filter((s) => s.completed).length
    : 0;
  const totalSections = lesson.sections.length;
  const progressPct = totalSections > 0 ? (sectionsDone / totalSections) * 100 : 0;

  // Preview text from first section
  const previewText = lang === 'sv'
    ? lesson.sections[0]?.content_sv.slice(0, 120)
    : lesson.sections[0]?.content_en.slice(0, 120);

  return (
    <Link
      to={`/owner/academy/${lesson.id}`}
      className="group block rounded-xl border border-[var(--border)] hover:border-[var(--border2)] transition-all duration-200 overflow-hidden"
      style={{ background: 'var(--bg2)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top color bar */}
      <div className="h-1" style={{ background: topicColor }} />

      <div className="p-4">
        {/* Icon + badges row */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${topicColor}15`, color: topicColor }}
          >
            <IconComp size={20} />
          </div>

          {/* Status icon */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <CheckCircle2 size={20} className="text-[var(--green)]" />
            ) : isStarted ? (
              <PlayCircle size={20} className="text-amber-400" />
            ) : (
              <Circle size={16} className="text-[var(--text3)]" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-[var(--text)] mb-1.5 line-clamp-2 group-hover:text-[var(--green)] transition-colors">
          {title}
        </h3>

        {/* Description (shown on non-hover) or Preview (shown on hover) */}
        <p className="text-[11px] text-[var(--text3)] mb-3 line-clamp-2">
          {hovered && previewText ? `${previewText}...` : description}
        </p>

        {/* Meta: difficulty + time + topic */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span
            className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: `${diffColor}15`, color: diffColor }}
          >
            {t(DIFFICULTY_I18N_KEYS[lesson.difficulty])}
          </span>
          <span className="flex items-center gap-0.5 text-[9px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-1.5 py-0.5 rounded-full">
            <Clock size={9} />
            {lesson.estimatedMinutes} min
          </span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: `${topicColor}10`, color: topicColor }}
          >
            {t(TOPIC_I18N_KEYS[lesson.topic])}
          </span>
        </div>

        {/* Progress bar */}
        {isStarted && !isCompleted && (
          <div className="w-full h-1 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
        {isCompleted && (
          <div className="text-[10px] font-mono text-[var(--green)]">
            {t('academy.completed')}
          </div>
        )}
      </div>
    </Link>
  );
}
