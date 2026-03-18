import { useTranslation } from 'react-i18next';
import {
  Mountain,
  Droplets,
  Bird,
  Landmark,
  Wrench,
  AlertTriangle,
  Heart,
  MapPin,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import {
  CATEGORY_CONFIG,
  IMPORTANCE_CONFIG,
  SEASON_CONFIG,
  type KnowledgeNote,
  type KnowledgeCategory,
} from '@/hooks/useKnowledgeCapture';

const CATEGORY_ICONS: Record<KnowledgeCategory, React.ReactNode> = {
  terrain: <Mountain size={14} />,
  water: <Droplets size={14} />,
  wildlife: <Bird size={14} />,
  history: <Landmark size={14} />,
  operations: <Wrench size={14} />,
  warnings: <AlertTriangle size={14} />,
  traditions: <Heart size={14} />,
};

interface NoteCardProps {
  note: KnowledgeNote;
  compact?: boolean;
}

export function NoteCard({ note, compact }: NoteCardProps) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;
  const cat = CATEGORY_CONFIG[note.category];
  const imp = IMPORTANCE_CONFIG[note.importance];
  const seasonLabel = lang === 'sv' ? SEASON_CONFIG[note.season].labelSv : SEASON_CONFIG[note.season].labelEn;
  const categoryLabel = lang === 'sv' ? cat.labelSv : cat.labelEn;
  const importanceLabel = lang === 'sv' ? imp.labelSv : imp.labelEn;

  if (compact) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border2)] transition-colors">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: cat.colorBg, color: cat.color }}
        >
          {CATEGORY_ICONS[note.category]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text)] line-clamp-2">{note.text}</p>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            {note.standName ?? `${note.lat.toFixed(4)}, ${note.lng.toFixed(4)}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-colors"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: cat.colorBg, color: cat.color }}
          >
            {CATEGORY_ICONS[note.category]}
          </div>
          <div>
            <span
              className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: cat.colorBg, color: cat.color }}
            >
              {categoryLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {note.season !== 'all' && (
            <span className="text-[9px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-1.5 py-0.5 rounded-full">
              {seasonLabel}
            </span>
          )}
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: `${imp.color}15`, color: imp.color }}
          >
            {importanceLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-[var(--text)] leading-relaxed mb-3">{note.text}</p>

      {/* Audio player */}
      {note.audioUrl && (
        <div className="mb-3">
          <AudioPlayer src={note.audioUrl} />
        </div>
      )}

      {/* Photo thumbnail */}
      {note.photoUrl && (
        <div className="mb-3">
          <img
            src={note.photoUrl}
            alt={t('knowledge.photoAlt')}
            className="w-full h-32 object-cover rounded-lg border border-[var(--border)]"
          />
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--text3)]">
        {note.standName && (
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {note.standName}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          {new Date(note.createdAt).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <span className="flex items-center gap-1">
          <User size={10} />
          {note.recordedBy}
        </span>
      </div>

      {/* AI link */}
      <button className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
        <Sparkles size={10} />
        {t('knowledge.askAi')}
      </button>
    </div>
  );
}

export { CATEGORY_ICONS };
