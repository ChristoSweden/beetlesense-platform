import { ExternalLink } from 'lucide-react';
import type { Citation } from './useChatStore';

const SOURCE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  research: { label: 'Research', color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10' },
  regulatory: { label: 'Regulatory', color: 'text-amber', bg: 'bg-amber/10' },
  your_data: { label: 'Your Data', color: 'text-canopy-400', bg: 'bg-canopy-400/10' },
};

interface CitationCardProps {
  citation: Citation;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CitationCard({ citation, isExpanded, onToggle }: CitationCardProps) {
  const sourceConfig = SOURCE_TYPE_CONFIG[citation.sourceType] ?? SOURCE_TYPE_CONFIG.research;

  return (
    <div className="group">
      {/* Inline marker */}
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold transition-colors ${
          isExpanded
            ? 'text-[var(--green)]'
            : 'text-[var(--text3)] hover:text-[var(--green)]'
        }`}
      >
        [{citation.id}]
        <span className="text-[9px] font-sans font-normal text-[var(--text3)] group-hover:text-[var(--text2)]">
          {citation.title.length > 40 ? citation.title.slice(0, 40) + '...' : citation.title}
        </span>
      </button>

      {/* Expanded card */}
      {isExpanded && (
        <div className="mt-1.5 rounded-lg border-l-2 border-[var(--green-dim,var(--green))] bg-forest-900 p-3 ml-2">
          {/* Source type badge */}
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${sourceConfig.color} ${sourceConfig.bg}`}
            >
              {sourceConfig.label}
            </span>
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text3)] hover:text-[var(--green)] transition-colors"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Title */}
          <h4 className="text-[11px] font-semibold text-[var(--text)] mb-1">
            {citation.title}
          </h4>

          {/* Excerpt */}
          <p className="text-[10px] text-[var(--text3)] leading-relaxed italic">
            "{citation.excerpt}"
          </p>
        </div>
      )}
    </div>
  );
}
