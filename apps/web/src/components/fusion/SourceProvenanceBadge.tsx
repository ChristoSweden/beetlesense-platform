import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { ChevronDown, Database } from 'lucide-react';

export interface SourceContribution {
  source: string;
  weight: number;
  confidence: number;
  lastUpdated: string;
  status: 'active' | 'stale' | 'offline';
}

interface Props {
  sources: SourceContribution[];
  activeSources: number;
  totalSources: number;
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_COLORS: Record<SourceContribution['status'], string> = {
  active: 'var(--risk-low)',
  stale: 'var(--risk-mid)',
  offline: 'var(--risk-high)',
};

export const SourceProvenanceBadge = memo(function SourceProvenanceBadge({
  sources,
  activeSources,
  totalSources,
}: Props) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [sources, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const allActive = activeSources === totalSources;

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Collapsed pill */}
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer"
        style={{
          background: 'var(--bg2)',
          color: 'var(--text2)',
          border: '1px solid var(--border)',
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: allActive ? 'var(--risk-low)' : 'var(--risk-mid)',
          }}
        />
        <Database size={12} style={{ color: 'var(--text3)' }} />
        <span>
          {activeSources}/{totalSources} sources
        </span>
        <ChevronDown
          size={12}
          className="transition-transform duration-200"
          style={{
            color: 'var(--text3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Expanded popover */}
      <div
        className="overflow-hidden transition-all duration-250 ease-in-out"
        style={{
          maxHeight: open ? `${contentHeight}px` : '0px',
          opacity: open ? 1 : 0,
        }}
      >
        <div
          ref={contentRef}
          className="mt-1.5 rounded-lg p-3 w-72 shadow-lg"
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--text3)', fontFamily: 'var(--font-main)' }}
          >
            Data source contributions
          </p>

          <ul className="flex flex-col gap-2">
            {sources.map((src) => (
              <li key={src.source} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: STATUS_COLORS[src.status] }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--text)', fontFamily: 'var(--font-main)' }}
                    >
                      {src.source}
                    </span>
                  </div>
                  <span
                    className="text-[10px]"
                    style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}
                  >
                    {formatRelativeTime(src.lastUpdated)}
                  </span>
                </div>

                {/* Weight bar with confidence as opacity */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full flex-1 overflow-hidden"
                    style={{ background: 'var(--bg3)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(src.weight * 100)}%`,
                        background: 'var(--green)',
                        opacity: 0.3 + src.confidence * 0.7,
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] tabular-nums w-8 text-right"
                    style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}
                  >
                    {Math.round(src.weight * 100)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});
