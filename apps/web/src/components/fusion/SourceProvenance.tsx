import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Database,
  Satellite,
  Bug,
  Flame,
  Globe,
  Users,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import type { DataSource } from '../../services/fusionEngine';

// ─── Types ────────────────────────────────────────────────────────────────

interface SourceProvenanceProps {
  sources: Array<{
    source: DataSource;
    label: string;
    weight: number;
    confidence: number;
    lastUpdated: string;
  }>;
  activeSources: number;
  totalSources: number;
}

// ─── Source Icon Map ─────────────────────────────────────────────────────

const SOURCE_ICONS: Record<DataSource, LucideIcon> = {
  SMHI: Database,
  SENTINEL: Satellite,
  SKOGSSTYRELSEN: Bug,
  NASA_FIRMS: Flame,
  FORESTWARD: Globe,
  COMMUNITY: Users,
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function getConfidenceDotColor(confidence: number): string {
  if (confidence > 0.8) return 'var(--risk-low)';
  if (confidence >= 0.5) return 'var(--risk-mid)';
  return 'var(--risk-high)';
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

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

// ─── Component ───────────────────────────────────────────────────────────

export default function SourceProvenance({
  sources,
  activeSources,
  totalSources,
}: SourceProvenanceProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Find max weight for proportional bar widths
  const maxWeight = sources.length > 0
    ? Math.max(...sources.map((s) => s.weight))
    : 1;

  return (
    <div ref={containerRef} className="relative inline-flex" style={{ fontFamily: 'var(--font-main)' }}>
      {/* Compact pill trigger */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Show data source provenance"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200"
        style={{
          background: 'var(--bg3)',
          color: 'var(--text2)',
          border: '1px solid var(--border)',
        }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ background: 'var(--risk-low)' }}
        />
        <span>{activeSources}/{totalSources} sources</span>
      </button>

      {/* Expandable inline panel */}
      <div
        role="region"
        aria-label="Data source provenance"
        className="absolute top-full right-0 z-50 w-80"
        style={{
          maxHeight: open ? 600 : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div
          className="mt-2 p-4"
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Header */}
          <p
            className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text3)' }}
          >
            Source Provenance
          </p>

          {/* Source rows */}
          <div className="flex flex-col gap-3">
            {sources.map((source) => {
              const Icon = SOURCE_ICONS[source.source];
              const confidenceColor = getConfidenceDotColor(source.confidence);
              const barPercent = maxWeight > 0
                ? Math.max((source.weight / maxWeight) * 100, 4)
                : 4;

              return (
                <div key={source.source} className="flex flex-col gap-1.5">
                  {/* Top row: icon + label + confidence dot + time */}
                  <div className="flex items-center gap-2">
                    <Icon
                      size={14}
                      className="shrink-0"
                      style={{ color: 'var(--text2)' }}
                    />
                    <span
                      className="flex-1 text-[13px] font-medium truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {source.label}
                    </span>
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ background: confidenceColor }}
                      title={`Confidence: ${Math.round(source.confidence * 100)}%`}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock size={10} style={{ color: 'var(--text3)' }} aria-hidden="true" />
                      <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                        {formatRelativeTime(source.lastUpdated)}
                      </span>
                    </div>
                  </div>

                  {/* Weight bar */}
                  <div
                    className="h-1 rounded-sm overflow-hidden"
                    style={{ background: 'var(--border)' }}
                  >
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${barPercent}%`,
                        background: 'var(--green)',
                        transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="mt-3 pt-3 flex items-center justify-between text-xs"
            style={{ borderTop: '1px solid var(--border)', color: 'var(--text3)' }}
          >
            <span>{activeSources} of {totalSources} sources active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
