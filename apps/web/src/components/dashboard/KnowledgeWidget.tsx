import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MessageSquareQuote, ChevronRight } from 'lucide-react';
import { useKnowledgeCapture } from '@/hooks/useKnowledgeCapture';
import { NoteCard } from '@/components/knowledge/NoteCard';

export function KnowledgeWidget() {
  const { t, i18n } = useTranslation();
  const _lang = i18n.language;
  const { notes, totalCount, isLoading } = useKnowledgeCapture();

  const latestNote = notes[0] ?? null;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquareQuote size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('knowledge.widgetTitle')}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
          {totalCount} {t('knowledge.notes')}
        </span>
      </div>

      {/* Latest note preview */}
      {isLoading ? (
        <div className="h-16 rounded-lg bg-[var(--bg)] animate-pulse" />
      ) : latestNote ? (
        <div className="mb-3">
          <NoteCard note={latestNote} compact />
        </div>
      ) : (
        <p className="text-xs text-[var(--text3)] mb-3">{t('knowledge.noNotes')}</p>
      )}

      {/* Actions */}
      <div className="space-y-1.5">
        <Link
          to="/owner/knowledge"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
        >
          {t('knowledge.viewAll')}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
