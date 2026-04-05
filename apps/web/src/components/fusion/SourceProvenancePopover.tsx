import { useState, useRef, useEffect, useCallback } from 'react';
import { Info, Clock, CheckCircle, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface SourceEntry {
  name: string;
  weight: number;
  confidence: number;
  lastUpdated: string;
  active: boolean;
}

interface SourceProvenancePopoverProps {
  sources: SourceEntry[];
  overallConfidence: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'var(--risk-low)';
  if (confidence >= 0.4) return 'var(--risk-mid)';
  return 'var(--risk-high)';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.4) return 'Medium';
  return 'Low';
}

function timeAgo(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatConfidencePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function SourceProvenancePopover({
  sources,
  overallConfidence,
}: SourceProvenancePopoverProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      panelRef.current &&
      !panelRef.current.contains(e.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(e.target as Node)
    ) {
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

  const maxWeight = Math.max(...sources.map((s) => s.weight), 0.01);
  const activeSources = sources.filter((s) => s.active);
  const inactiveSources = sources.filter((s) => !s.active);

  return (
    <div className="relative" style={{ fontFamily: 'var(--font-main)' }}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Show data source provenance"
        className="flex items-center justify-center rounded-full transition-colors duration-200"
        style={{
          width: 28,
          height: 28,
          minWidth: 28,
          minHeight: 28,
          background: open ? 'var(--green-light)' : 'transparent',
          color: open ? 'var(--green-deep)' : 'var(--text3)',
        }}
      >
        <Info size={16} />
      </button>

      {/* Expandable panel */}
      <div
        ref={panelRef}
        role="region"
        aria-label="Data source provenance"
        style={{
          maxHeight: open ? 500 : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
          position: 'absolute',
          top: '100%',
          right: 0,
          zIndex: 50,
          width: '100%',
          minWidth: 280,
        }}
      >
        <div
          style={{
            marginTop: 8,
            background: 'var(--bg)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-xl)',
            padding: 16,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Header */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text3)',
              marginBottom: 12,
            }}
          >
            Data Sources ({activeSources.length} active)
          </p>

          {/* Source rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeSources.map((source) => (
              <SourceRow
                key={source.name}
                source={source}
                maxWeight={maxWeight}
              />
            ))}

            {inactiveSources.length > 0 && (
              <>
                <div
                  style={{
                    height: 1,
                    background: 'var(--border)',
                    margin: '4px 0',
                  }}
                />
                {inactiveSources.map((source) => (
                  <SourceRow
                    key={source.name}
                    source={source}
                    maxWeight={maxWeight}
                  />
                ))}
              </>
            )}
          </div>

          {/* Overall confidence badge */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text2)',
              }}
            >
              Overall Confidence
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: getConfidenceColor(overallConfidence),
                background: 'var(--bg3)',
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              {formatConfidencePercent(overallConfidence)} {getConfidenceLabel(overallConfidence)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Source Row ────────────────────────────────────────────────────────────

interface SourceRowProps {
  source: SourceEntry;
  maxWeight: number;
}

function SourceRow({ source, maxWeight }: SourceRowProps) {
  const barWidthPercent = maxWeight > 0 ? (source.weight / maxWeight) * 100 : 0;
  const confidenceColor = getConfidenceColor(source.confidence);

  const ConfidenceIcon =
    source.confidence >= 0.7 ? CheckCircle : AlertCircle;

  return (
    <div
      style={{
        opacity: source.active ? 1 : 0.45,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Name + confidence dot + time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <ConfidenceIcon
            size={14}
            style={{ color: confidenceColor, flexShrink: 0 }}
            aria-label={`Confidence: ${getConfidenceLabel(source.confidence)}`}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {source.name}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <Clock size={11} style={{ color: 'var(--text3)' }} aria-hidden="true" />
          <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            {timeAgo(source.lastUpdated)}
          </span>
        </div>
      </div>

      {/* Weight bar */}
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: 'var(--bg3)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidthPercent}%`,
            borderRadius: 2,
            background: source.active ? 'var(--green)' : 'var(--text3)',
            transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* Weight label */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>
          Weight: {Math.round(source.weight * 100)}%
        </span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>
          Conf: {formatConfidencePercent(source.confidence)}
        </span>
      </div>
    </div>
  );
}
