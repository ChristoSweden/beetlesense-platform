import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { Sparkline } from './Sparkline';

export type DisclosureStatus = 'good' | 'warning' | 'critical';

export interface DisclosureMetric {
  label: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  sparkData?: number[];
}

export interface DisclosureCardProps {
  title: string;
  status: DisclosureStatus;
  summary: string;
  metrics: DisclosureMetric[];
  detailContent: ReactNode;
  deepDiveUrl?: string;
  onDeepDive?: () => void;
  compact?: boolean;
  className?: string;
}

const STATUS_INDICATOR: Record<DisclosureStatus, string> = {
  good: '\uD83D\uDFE2',
  warning: '\uD83D\uDFE1',
  critical: '\uD83D\uDD34',
};

const STATUS_BORDER: Record<DisclosureStatus, string> = {
  good: 'border-green-800/40',
  warning: 'border-amber-700/40',
  critical: 'border-red-800/40',
};

const STATUS_GLOW: Record<DisclosureStatus, string> = {
  good: '',
  warning: 'shadow-amber-900/10',
  critical: 'shadow-red-900/20 shadow-lg',
};

const TREND_ARROW: Record<'up' | 'down' | 'stable', string> = {
  up: '\u2191',
  down: '\u2193',
  stable: '\u2192',
};

export function DisclosureCard({
  title,
  status,
  summary,
  metrics,
  detailContent,
  deepDiveUrl,
  onDeepDive,
  compact = false,
  className = '',
}: DisclosureCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const [detailHeight, setDetailHeight] = useState(0);

  // Measure detail content height for animation
  useEffect(() => {
    if (detailRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setDetailHeight(entry.contentRect.height);
        }
      });
      observer.observe(detailRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleDeepDive = useCallback(() => {
    if (onDeepDive) {
      onDeepDive();
    } else if (deepDiveUrl) {
      window.location.href = deepDiveUrl;
    }
  }, [onDeepDive, deepDiveUrl]);

  // Show max 3 metrics in hover preview
  const previewMetrics = metrics.slice(0, 3);

  return (
    <div
      className={`
        rounded-xl border ${STATUS_BORDER[status]} ${STATUS_GLOW[status]}
        bg-green-950/40 backdrop-blur-sm
        transition-all duration-300 ease-out
        ${compact ? 'p-3' : 'p-4'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* LAYER 1: Always visible — headline + traffic light */}
      <button
        type="button"
        onClick={toggleExpand}
        className="w-full flex items-center justify-between gap-3 text-left group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0" role="img" aria-label={status}>
            {STATUS_INDICATOR[status]}
          </span>
          <h3
            className={`
              font-semibold text-green-100 truncate
              ${compact ? 'text-sm' : 'text-base'}
            `}
          >
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!compact && (
            <span className="text-xs text-green-400/50 hidden sm:inline">
              {summary}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-green-600 transition-transform duration-300
              ${isExpanded ? 'rotate-180' : ''}
              group-hover:text-green-400
            `}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* LAYER 2: Visible on hover/tap — key stats with sparklines */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-out
          ${isHovered || isExpanded ? 'max-h-24 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}
        `}
      >
        <div
          className={`
            grid gap-2
            ${compact ? 'grid-cols-1' : 'grid-cols-3'}
          `}
        >
          {previewMetrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-green-900/20"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-green-500/60 uppercase tracking-wide truncate">
                  {metric.label}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono text-green-200 tabular-nums">
                    {metric.value}
                  </span>
                  <span
                    className={`text-xs ${
                      metric.trend === 'up'
                        ? 'text-green-400'
                        : metric.trend === 'down'
                          ? 'text-red-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {TREND_ARROW[metric.trend]}
                  </span>
                </div>
              </div>
              {metric.sparkData && metric.sparkData.length > 2 && (
                <Sparkline
                  data={metric.sparkData}
                  width={48}
                  height={16}
                  showCurrentValue
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* LAYER 3: Visible on click "Visa mer" — full detail panel */}
      <div
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{ maxHeight: isExpanded ? detailHeight + 60 : 0 }}
      >
        <div ref={detailRef} className="pt-4">
          {/* Summary line in compact mode */}
          {compact && (
            <p className="text-xs text-green-300/70 mb-3">{summary}</p>
          )}

          {/* Full detail content */}
          <div className="rounded-lg bg-green-900/15 border border-green-800/20 p-4">
            {detailContent}
          </div>

          {/* LAYER 4: "Alla data" link to deep dive */}
          {(deepDiveUrl || onDeepDive) && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleDeepDive}
                className="
                  text-xs font-medium text-green-400 hover:text-green-300
                  flex items-center gap-1 transition-colors
                  px-2 py-1 rounded hover:bg-green-900/30
                "
              >
                Alla data
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default DisclosureCard;
