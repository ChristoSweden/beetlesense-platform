import { memo, useMemo } from 'react';
import {
  Database,
  Satellite,
  Bug,
  Flame,
  Globe,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { DataSource } from '../../services/fusionEngine';

// ─── Types ────────────────────────────────────────────────────────────────

interface DataFreshnessStripProps {
  sources: Array<{
    source: DataSource;
    label: string;
    lastUpdated: string;
    expectedIntervalMinutes: number;
  }>;
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

// ─── Short Names ─────────────────────────────────────────────────────────

const SOURCE_SHORT_NAMES: Record<DataSource, string> = {
  SMHI: 'SMHI',
  SENTINEL: 'Sentinel',
  SKOGSSTYRELSEN: 'Skogsstyrelsen',
  NASA_FIRMS: 'FIRMS',
  FORESTWARD: 'ForestWard',
  COMMUNITY: 'Community',
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const diffMs = now - then;
  if (diffMs < 0) return 'now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

type FreshnessLevel = 'fresh' | 'stale' | 'overdue';

function getFreshnessLevel(iso: string, expectedIntervalMinutes: number): FreshnessLevel {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'overdue';

  const elapsedMinutes = (now - then) / 60_000;
  const ratio = elapsedMinutes / Math.max(expectedIntervalMinutes, 1);

  if (ratio <= 1) return 'fresh';
  if (ratio <= 2) return 'stale';
  return 'overdue';
}

const FRESHNESS_COLORS: Record<FreshnessLevel, string> = {
  fresh: 'var(--risk-low)',
  stale: 'var(--risk-mid)',
  overdue: 'var(--risk-high)',
};

// ─── Freshness Chip ──────────────────────────────────────────────────────

const FreshnessChip = memo(function FreshnessChip({
  source,
}: {
  source: DataFreshnessStripProps['sources'][number];
}) {
  const Icon = SOURCE_ICONS[source.source];
  const shortName = SOURCE_SHORT_NAMES[source.source];
  const level = getFreshnessLevel(source.lastUpdated, source.expectedIntervalMinutes);
  const color = FRESHNESS_COLORS[level];

  const relativeTime = useMemo(
    () => formatRelativeTime(source.lastUpdated),
    [source.lastUpdated],
  );

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
      style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
      }}
      title={`${source.label} — last updated ${relativeTime} ago`}
    >
      <Icon size={12} style={{ color: 'var(--text2)' }} />
      <span
        className="text-[11px] font-medium whitespace-nowrap"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-main)' }}
      >
        {shortName}
      </span>
      <span
        className="text-[10px] tabular-nums whitespace-nowrap"
        style={{ color: 'var(--text3)', fontFamily: 'var(--font-main)' }}
      >
        {relativeTime}
      </span>
      <span className="relative inline-flex shrink-0">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
        {level === 'fresh' && (
          <span
            className="absolute inset-0 w-1.5 h-1.5 rounded-full"
            style={{
              background: color,
              animation: 'freshness-pulse 2s ease-in-out infinite',
            }}
          />
        )}
      </span>
    </div>
  );
});

// ─── Component ───────────────────────────────────────────────────────────

export default function DataFreshnessStrip({ sources }: DataFreshnessStripProps) {
  return (
    <>
      <style>{`
        @keyframes freshness-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(2.2); }
        }
      `}</style>
      <div
        className="sticky bottom-0 w-full py-2 px-4 overflow-x-auto"
        style={{
          background: 'var(--bg2)',
          borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font-main)',
        }}
      >
        <div className="flex gap-2 flex-nowrap md:flex-wrap">
          {sources.map((source) => (
            <FreshnessChip key={source.source} source={source} />
          ))}
        </div>
      </div>
    </>
  );
}
