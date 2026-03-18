import { useTranslation } from 'react-i18next';
import { BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Citation } from '@/services/advisorService';

interface CitationPanelProps {
  citations: Citation[];
}

export function CitationPanel({ citations }: CitationPanelProps) {
  const { t } = useTranslation();

  if (citations.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={16} className="text-[var(--text3)]" />
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            {t('advisor.citations')}
          </h3>
        </div>
        <p className="text-xs text-[var(--text3)]">
          {t('advisor.noCitations')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-[var(--green)]" />
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            {t('advisor.citations')}
          </h3>
          <span className="text-[9px] font-mono text-[var(--text3)]">
            ({citations.length})
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-[var(--green)]">
          <ShieldCheck size={10} />
          {t('advisor.peerReviewed')}
        </div>
      </div>

      <div className="space-y-3">
        {citations.map((citation, index) => (
          <div
            key={citation.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border2)] transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-[var(--bg3)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[9px] font-mono text-[var(--text3)]">{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[var(--text)] font-medium leading-relaxed">
                {citation.authors} ({citation.year})
              </p>
              <p className="text-[10px] text-[var(--text2)] mt-0.5 italic leading-relaxed">
                {citation.title}
              </p>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">
                {citation.journal}
              </p>
              {citation.doi && (
                <a
                  href={`https://doi.org/${citation.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-[var(--green)] hover:text-[var(--green2)] mt-1 inline-flex items-center gap-1"
                >
                  DOI: {citation.doi}
                  <ExternalLink size={8} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View in Research Explorer link */}
      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <Link
          to="/owner/research"
          className="flex items-center gap-2 text-xs text-[var(--green)] hover:text-[var(--green2)] transition-colors"
        >
          <BookOpen size={12} />
          {t('advisor.viewInResearch')}
          <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  );
}
