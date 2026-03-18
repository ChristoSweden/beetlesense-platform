import { useState, useCallback, useRef, useEffect } from 'react';

export type SignalStatus = 'good' | 'warning' | 'critical';

export interface SignalDot {
  id: string;
  label: string;
  status: SignalStatus;
  summary: string;
  sectionId?: string;
}

export interface SignalStripProps {
  signals: SignalDot[];
  sticky?: boolean;
  onDotClick?: (signal: SignalDot) => void;
  className?: string;
}

const STATUS_COLOR: Record<SignalStatus, string> = {
  good: 'bg-green-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

const STATUS_RING: Record<SignalStatus, string> = {
  good: 'ring-green-500/30',
  warning: 'ring-amber-500/30',
  critical: 'ring-red-500/30',
};

const STATUS_PULSE: Record<SignalStatus, string> = {
  good: '',
  warning: '',
  critical: 'animate-pulse',
};

export function SignalStrip({
  signals,
  sticky = true,
  onDotClick,
  className = '',
}: SignalStripProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback((id: string) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setHoveredId(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setHoveredId(null), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    };
  }, []);

  const handleClick = useCallback(
    (signal: SignalDot) => {
      if (onDotClick) {
        onDotClick(signal);
        return;
      }
      // Default: scroll to section
      if (signal.sectionId) {
        const el = document.getElementById(signal.sectionId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [onDotClick],
  );

  return (
    <div
      className={`
        ${sticky ? 'sticky top-0 z-40' : ''}
        w-full h-10 flex items-center justify-center gap-1
        bg-[#030d05]/95 backdrop-blur-sm border-b border-green-900/30
        ${className}
      `}
      role="navigation"
      aria-label="Signalöversikt"
    >
      <div className="flex items-center gap-3 px-4">
        {signals.map((signal) => (
          <div key={signal.id} className="relative">
            <button
              type="button"
              onClick={() => handleClick(signal)}
              onMouseEnter={() => handleMouseEnter(signal.id)}
              onMouseLeave={handleMouseLeave}
              onFocus={() => handleMouseEnter(signal.id)}
              onBlur={handleMouseLeave}
              className={`
                w-3.5 h-3.5 rounded-full
                ${STATUS_COLOR[signal.status]}
                ${STATUS_PULSE[signal.status]}
                ring-2 ${STATUS_RING[signal.status]}
                transition-transform duration-150
                hover:scale-125 focus:scale-125
                focus:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-[#030d05]
              `}
              aria-label={`${signal.label}: ${signal.summary}`}
              title={signal.label}
            />

            {/* Tooltip */}
            {hoveredId === signal.id && (
              <div
                className="
                  absolute top-full left-1/2 -translate-x-1/2 mt-2
                  px-3 py-1.5 rounded-lg
                  bg-green-950 border border-green-800/40
                  text-xs text-green-100 whitespace-nowrap
                  shadow-lg shadow-black/40
                  animate-fade-in
                  z-50
                "
                role="tooltip"
              >
                <div className="font-medium text-green-300 mb-0.5">
                  {signal.label}
                </div>
                <div className="text-green-200/70">{signal.summary}</div>
                {/* Arrow */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-green-950 border-l border-t border-green-800/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Separator labels - subtle domain names between dots */}
      <div className="hidden md:flex items-center gap-3 ml-4 text-[10px] text-green-600/50 uppercase tracking-wider">
        {signals.map((s) => (
          <span key={s.id} className="min-w-[40px] text-center">
            {s.label.slice(0, 4)}
          </span>
        ))}
      </div>
    </div>
  );
}
export default SignalStrip;
