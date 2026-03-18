import { useState, useCallback, type ReactNode } from 'react';
import { SignalStrip, type SignalDot } from './SignalStrip';

export type PulseStatus = 'good' | 'warning' | 'critical';

export interface ForestPulseBarProps {
  forestName: string;
  status: PulseStatus;
  summary: string;
  lastUpdated: string;
  signals?: SignalDot[];
  expandedContent?: ReactNode;
  className?: string;
}

const STATUS_LABEL: Record<PulseStatus, string> = {
  good: 'bra',
  warning: 'acceptabelt',
  critical: 'oroande',
};

const STATUS_BG: Record<PulseStatus, string> = {
  good: 'bg-green-950/80',
  warning: 'bg-amber-950/60',
  critical: 'bg-red-950/50',
};

const STATUS_BORDER: Record<PulseStatus, string> = {
  good: 'border-green-800/30',
  warning: 'border-amber-800/30',
  critical: 'border-red-800/30',
};

const STATUS_ICON: Record<PulseStatus, string> = {
  good: '\uD83C\uDF32',
  warning: '\u26A0\uFE0F',
  critical: '\uD83D\uDEA8',
};

const STATUS_TEXT_COLOR: Record<PulseStatus, string> = {
  good: 'text-green-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
};

export function ForestPulseBar({
  forestName,
  status,
  summary,
  lastUpdated,
  signals,
  expandedContent,
  className = '',
}: ForestPulseBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div
      className={`
        w-full rounded-xl border ${STATUS_BORDER[status]}
        ${STATUS_BG[status]} backdrop-blur-sm
        transition-all duration-300
        ${className}
      `}
    >
      {/* Main bar */}
      <button
        type="button"
        onClick={toggle}
        className="
          w-full flex items-center justify-between gap-4
          px-4 py-3 text-left
          transition-colors hover:brightness-110
        "
        aria-expanded={isExpanded}
      >
        {/* Left: forest name + icon */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <span className="text-lg" role="img" aria-label={status}>
            {STATUS_ICON[status]}
          </span>
          <span className="font-semibold text-green-100 text-sm truncate">
            {forestName}
          </span>
        </div>

        {/* Center: status message */}
        <div className="flex-1 text-center min-w-0 hidden sm:block">
          <span className="text-sm text-green-200/80">
            Din skog m&aring;r{' '}
            <span className={`font-semibold ${STATUS_TEXT_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            {' \u2014 '}
            <span className="text-green-300/60">{summary}</span>
          </span>
        </div>

        {/* Right: last updated + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-green-600/50 hidden md:inline whitespace-nowrap">
            Senast uppdaterad: {lastUpdated}
          </span>
          <svg
            className={`w-4 h-4 text-green-600 transition-transform duration-300
              ${isExpanded ? 'rotate-180' : ''}
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

      {/* Mobile summary (visible only on small screens) */}
      <div className="sm:hidden px-4 pb-2">
        <span className="text-xs text-green-200/60">
          Din skog m&aring;r{' '}
          <span className={`font-medium ${STATUS_TEXT_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </span>
      </div>

      {/* Expanded: SignalStrip + additional content */}
      <div
        className={`
          overflow-hidden transition-all duration-400 ease-out
          ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {/* Signal strip */}
        {signals && signals.length > 0 && (
          <SignalStrip signals={signals} sticky={false} className="border-t border-green-800/20" />
        )}

        {/* Additional expanded content (e.g. DataDensityGrid) */}
        {expandedContent && (
          <div className="px-4 py-3 border-t border-green-800/20">
            {expandedContent}
          </div>
        )}

        {/* Last updated on mobile */}
        <div className="md:hidden px-4 py-2 text-[10px] text-green-600/40 text-right border-t border-green-800/10">
          Senast uppdaterad: {lastUpdated}
        </div>
      </div>
    </div>
  );
}
export default ForestPulseBar;
