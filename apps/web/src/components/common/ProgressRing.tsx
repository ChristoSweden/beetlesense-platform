import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ProgressRingProps {
  /** Progress value 0-100 */
  value: number;
  /** Diameter in px (default 80) */
  size?: number;
  /** Stroke width in px (default 6) */
  strokeWidth?: number;
  /** Stroke color (CSS value, default var(--green)) */
  color?: string;
  /** Track color (CSS value) */
  trackColor?: string;
  /** Label shown below center value */
  label?: string;
  /** Optional icon rendered at center instead of value text */
  icon?: ReactNode;
  /** Animation duration in ms (default 600) */
  duration?: number;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  color = 'var(--green)',
  trackColor = 'rgba(74, 222, 128, 0.12)',
  label,
  icon,
  duration = 600,
  className,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const prevValue = useRef(0);
  const rafId = useRef<number>(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  const center = size / 2;

  useEffect(() => {
    const from = prevValue.current;
    const to = Math.max(0, Math.min(100, value));
    prevValue.current = to;

    if (from === to) {
      setAnimatedValue(to);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      setAnimatedValue(from + (to - from) * eased);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        setAnimatedValue(to);
      }
    }

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [value, duration]);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${Math.round(value)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {icon ? (
          icon
        ) : (
          <>
            <span
              className="tabular-nums font-semibold leading-none text-[var(--text)]"
              style={{ fontSize: size * 0.22 }}
            >
              {Math.round(animatedValue)}%
            </span>
            {label && (
              <span
                className="text-[var(--text3)] leading-none mt-0.5"
                style={{ fontSize: Math.max(9, size * 0.12) }}
              >
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
