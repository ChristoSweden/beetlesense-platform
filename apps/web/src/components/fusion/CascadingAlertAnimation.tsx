import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Satellite,
  Thermometer,
  Bug,
  Flame,
  Globe,
  Users,
  TreePine,
  Radio,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Shield,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CascadingAlertAnimationProps {
  steps: Array<{
    source: string;
    signal: string;
    timestamp: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
  alertLevel: 'possible' | 'probable' | 'confirmed';
  isAnimating?: boolean;
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<string, typeof Satellite> = {
  'Sentinel-2': Satellite,
  'Sentinel': Satellite,
  'SMHI': Thermometer,
  'Skogsstyrelsen': Bug,
  'NASA FIRMS': Flame,
  'FIRMS': Flame,
  'ForestWard': Globe,
  'Community': Users,
  'LiDAR': TreePine,
  'Radio': Radio,
};

function getSourceIcon(source: string) {
  return SOURCE_ICONS[source] ?? Satellite;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(c: 'low' | 'medium' | 'high'): string {
  switch (c) {
    case 'high': return 'var(--risk-low)';
    case 'medium': return 'var(--banana)';
    case 'low': return 'var(--text3)';
  }
}

function confidenceLabel(c: 'low' | 'medium' | 'high'): string {
  switch (c) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
  }
}

function alertConfig(level: 'possible' | 'probable' | 'confirmed') {
  switch (level) {
    case 'confirmed':
      return {
        label: 'Confirmed',
        color: 'var(--risk-high)',
        bg: 'rgba(239, 68, 68, 0.12)',
        borderColor: 'var(--risk-high)',
        glow: true,
        shake: true,
        Icon: ShieldAlert,
      };
    case 'probable':
      return {
        label: 'Probable',
        color: '#ea580c',
        bg: 'rgba(234, 88, 12, 0.10)',
        borderColor: '#ea580c',
        glow: false,
        shake: false,
        Icon: ShieldCheck,
      };
    default:
      return {
        label: 'Possible',
        color: 'var(--banana)',
        bg: 'rgba(251, 191, 36, 0.10)',
        borderColor: 'var(--banana)',
        glow: false,
        shake: false,
        Icon: Shield,
      };
  }
}

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes caa-step-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes caa-line-draw {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
@keyframes caa-badge-pop {
  0% { opacity: 0; transform: scale(0.3); }
  60% { transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes caa-pulse-border {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(234, 88, 12, 0); }
}
@keyframes caa-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
  50% { box-shadow: 0 0 14px 4px rgba(239, 68, 68, 0.25); }
}
@keyframes caa-shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-3px); }
  30% { transform: translateX(3px); }
  45% { transform: translateX(-2px); }
  60% { transform: translateX(2px); }
  75% { transform: translateX(-1px); }
  90% { transform: translateX(1px); }
}
@keyframes caa-dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--dot-color); }
  50% { box-shadow: 0 0 0 6px transparent; }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CascadingAlertAnimation({
  steps,
  alertLevel,
  isAnimating = true,
}: CascadingAlertAnimationProps) {
  const STEP_DELAY = 600; // ms between step reveals

  // Track which steps are visible during animation
  const [visibleCount, setVisibleCount] = useState(isAnimating ? 0 : steps.length);
  const [alertVisible, setAlertVisible] = useState(!isAnimating);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!isAnimating) {
      setVisibleCount(steps.length);
      setAlertVisible(true);
      return;
    }

    // Reset
    setVisibleCount(0);
    setAlertVisible(false);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Stagger step reveals
    steps.forEach((_, i) => {
      const t = setTimeout(() => setVisibleCount(i + 1), (i + 1) * STEP_DELAY);
      timersRef.current.push(t);
    });

    // Show alert after all steps
    const alertTimer = setTimeout(
      () => setAlertVisible(true),
      (steps.length + 1) * STEP_DELAY,
    );
    timersRef.current.push(alertTimer);

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [isAnimating, steps.length]);

  const alert = useMemo(() => alertConfig(alertLevel), [alertLevel]);

  return (
    <div
      className="w-full"
      style={{
        background: 'var(--bg2)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem 1rem',
        fontFamily: 'var(--font-main)',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Vertical timeline */}
      <div className="relative ml-4">
        {/* Vertical rail line */}
        <div
          className="absolute left-[7px] top-0 bottom-0 w-[2px]"
          style={{ background: 'var(--border)' }}
          aria-hidden
        />

        {steps.map((step, i) => {
          const isVisible = i < visibleCount;
          const isFirst = i === 0;
          const Icon = getSourceIcon(step.source);
          const dotColor = isFirst ? 'var(--banana)' : 'var(--risk-low)';

          return (
            <div key={i} className="relative pb-4 last:pb-0">
              {/* Animated connection line segment (draws downward) */}
              {i > 0 && (
                <div
                  className="absolute left-[7px] w-[2px]"
                  style={{
                    top: -16,
                    height: 16,
                    background: isVisible ? 'var(--risk-low)' : 'var(--border)',
                    transformOrigin: 'top',
                    animation: isVisible
                      ? `caa-line-draw 300ms ease-out ${i * STEP_DELAY}ms both`
                      : 'none',
                    transform: isVisible ? undefined : 'scaleY(0)',
                  }}
                  aria-hidden
                />
              )}

              {/* Dot on rail */}
              <div
                className="absolute left-0 top-3 w-4 h-4 rounded-full z-10 flex items-center justify-center"
                style={{
                  background: isVisible ? dotColor : 'var(--bg3)',
                  border: `2px solid ${isVisible ? dotColor : 'var(--border)'}`,
                  ['--dot-color' as string]: `${dotColor}55`,
                  animation: isVisible ? 'caa-dot-pulse 2s ease-in-out infinite' : 'none',
                  transition: 'background 0.3s ease, border-color 0.3s ease',
                }}
              />

              {/* Horizontal connector line */}
              <div
                className="absolute left-4 top-[18px] h-[2px]"
                style={{
                  width: 16,
                  background: isVisible ? dotColor : 'var(--border)',
                  transformOrigin: 'left',
                  transition: 'background 0.3s ease',
                }}
                aria-hidden
              />

              {/* Step card */}
              <div
                className="ml-9"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
                  animation: isVisible
                    ? `caa-step-in 400ms ease-out ${i * STEP_DELAY}ms both`
                    : 'none',
                }}
              >
                <div
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Source icon */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: isFirst
                        ? 'rgba(251, 191, 36, 0.12)'
                        : 'rgba(16, 185, 129, 0.10)',
                      color: isFirst ? 'var(--banana)' : 'var(--risk-low)',
                    }}
                  >
                    <Icon size={16} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text)' }}
                      >
                        {step.source}
                      </span>
                      {/* Confidence badge */}
                      <span
                        className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          color: confidenceColor(step.confidence),
                          background: `color-mix(in srgb, ${confidenceColor(step.confidence)} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${confidenceColor(step.confidence)} 25%, transparent)`,
                        }}
                      >
                        {confidenceLabel(step.confidence)}
                      </span>
                    </div>

                    {/* Signal text */}
                    <p
                      className="text-xs mt-1 mb-0 leading-snug"
                      style={{ color: 'var(--text2)' }}
                    >
                      {step.signal}
                    </p>

                    {/* Relative time */}
                    <span
                      className="text-[0.65rem] mt-1 block"
                      style={{ color: 'var(--text3)' }}
                    >
                      {step.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Alert level badge at bottom */}
        <div className="relative pt-2 pb-1">
          {/* Final dot on rail */}
          <div
            className="absolute left-0 top-5 w-4 h-4 rounded-full z-10"
            style={{
              background: alertVisible ? alert.color : 'var(--bg3)',
              border: `2px solid ${alertVisible ? alert.color : 'var(--border)'}`,
              transition: 'all 0.3s ease',
            }}
          />
          <div
            className="absolute left-4 top-[26px] h-[2px]"
            style={{
              width: 16,
              background: alertVisible ? alert.color : 'var(--border)',
              transition: 'background 0.3s ease',
            }}
            aria-hidden
          />

          <div className="ml-9">
            {alertVisible ? (
              <div
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg"
                style={{
                  background: alert.bg,
                  border: `2px solid ${alert.borderColor}`,
                  animation: [
                    'caa-badge-pop 400ms ease-out',
                    alert.glow ? 'caa-glow 2s ease-in-out infinite' : '',
                    alert.shake ? 'caa-shake 0.5s ease-in-out' : '',
                    alertLevel === 'probable' ? 'caa-pulse-border 2s ease-in-out infinite' : '',
                  ]
                    .filter(Boolean)
                    .join(', '),
                }}
              >
                <alert.Icon
                  size={18}
                  style={{ color: alert.color }}
                />
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: alert.color }}
                  >
                    {alert.label}
                  </div>
                  <div
                    className="text-[0.65rem]"
                    style={{ color: 'var(--text2)' }}
                  >
                    {steps.length} source{steps.length !== 1 ? 's' : ''} corroborated
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg"
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  opacity: 0.4,
                }}
              >
                <Shield size={18} style={{ color: 'var(--text3)' }} />
                <span className="text-xs" style={{ color: 'var(--text3)' }}>
                  Awaiting classification...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
