import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AlertStage {
  source: string;
  event: string;
  timestamp: string;
  status: 'trigger' | 'corroborate' | 'confirm';
  confidence: number;
}

interface CascadingAlertTimelineProps {
  stages?: AlertStage[];
  alertLevel?: 'possible' | 'probable' | 'confirmed';
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const DEMO_STAGES: AlertStage[] = [
  {
    source: 'Sentinel-2 NDVI',
    event: 'NDVI dropped -0.12 below parcel baseline',
    timestamp: '14:23',
    status: 'trigger',
    confidence: 0.62,
  },
  {
    source: 'SMHI Weather',
    event: 'Accumulated 487 DD — approaching swarming threshold',
    timestamp: '14:25',
    status: 'corroborate',
    confidence: 0.78,
  },
  {
    source: 'Community Report',
    event: 'Beetle sighting reported 3.2 km NE by verified observer',
    timestamp: '14:28',
    status: 'corroborate',
    confidence: 0.85,
  },
  {
    source: 'Skogsstyrelsen',
    event: 'Trap count 2.4\u00d7 above seasonal average',
    timestamp: '14:31',
    status: 'confirm',
    confidence: 0.93,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getNodeColor(status: AlertStage['status']): string {
  switch (status) {
    case 'trigger':
      return 'var(--banana)';
    case 'corroborate':
      return '#3b82f6'; // blue-500
    case 'confirm':
      return 'var(--risk-high)';
  }
}

function getNodeBg(status: AlertStage['status']): string {
  switch (status) {
    case 'trigger':
      return 'rgba(251, 191, 36, 0.12)';
    case 'corroborate':
      return 'rgba(59, 130, 246, 0.10)';
    case 'confirm':
      return 'rgba(239, 68, 68, 0.10)';
  }
}

function getStatusLabel(status: AlertStage['status']): string {
  switch (status) {
    case 'trigger':
      return 'Trigger';
    case 'corroborate':
      return 'Corroborate';
    case 'confirm':
      return 'Confirm';
  }
}

function getBannerConfig(level: CascadingAlertTimelineProps['alertLevel']) {
  switch (level) {
    case 'confirmed':
      return {
        label: 'Confirmed Threat',
        bg: 'var(--risk-high)',
        text: '#fff',
        animClass: 'cat-pulse-strong',
      };
    case 'probable':
      return {
        label: 'Probable Threat',
        bg: '#ea580c',
        text: '#fff',
        animClass: 'cat-pulse-medium',
      };
    case 'possible':
    default:
      return {
        label: 'Possible Threat',
        bg: 'var(--banana)',
        text: 'var(--text)',
        animClass: 'cat-pulse-soft',
      };
  }
}

/* ------------------------------------------------------------------ */
/*  CSS-in-JS keyframes (injected once)                                */
/* ------------------------------------------------------------------ */

const STYLE_ID = 'cascading-alert-timeline-styles';

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes cat-grow-line {
      from { transform: scaleY(0); }
      to   { transform: scaleY(1); }
    }
    @keyframes cat-pop-in {
      0%   { opacity: 0; transform: scale(0.4); }
      60%  { transform: scale(1.15); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes cat-slide-in {
      from { opacity: 0; transform: translateX(12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes cat-pulse-soft {
      0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.35); }
      50%      { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
    }
    @keyframes cat-pulse-medium {
      0%, 100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.4); }
      50%      { box-shadow: 0 0 0 10px rgba(234, 88, 12, 0); }
    }
    @keyframes cat-pulse-strong {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
      50%      { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
    }
    @keyframes cat-banner-in {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CascadingAlertTimeline({
  stages,
  alertLevel,
  className = '',
}: CascadingAlertTimelineProps) {
  const { t } = useTranslation();
  const data = stages ?? DEMO_STAGES;

  // Derive alert level from stages if not explicitly provided
  const computedLevel = useMemo<'possible' | 'probable' | 'confirmed'>(() => {
    if (alertLevel) return alertLevel;
    const count = data.length;
    if (count >= 4) return 'confirmed';
    if (count >= 2) return 'probable';
    return 'possible';
  }, [alertLevel, data.length]);

  // Progressive reveal state
  const [visibleCount, setVisibleCount] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<'possible' | 'probable' | 'confirmed'>('possible');

  useEffect(() => {
    ensureStyles();
  }, []);

  // Auto-play animation: reveal stages one at a time
  useEffect(() => {
    setVisibleCount(0);
    setCurrentLevel('possible');

    const timers: ReturnType<typeof setTimeout>[] = [];

    data.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleCount(i + 1);
          // Update level as stages appear
          const revealed = i + 1;
          if (revealed >= 4) setCurrentLevel('confirmed');
          else if (revealed >= 2) setCurrentLevel('probable');
          else setCurrentLevel('possible');
        }, 500 + i * 600),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [data]);

  const banner = getBannerConfig(
    alertLevel ? computedLevel : currentLevel,
  );

  return (
    <div
      className={`premium-card ${className}`}
      style={{
        padding: '1.5rem',
        fontFamily: 'var(--font-main)',
      }}
    >
      {/* ---------- Alert Level Banner ---------- */}
      <div
        style={{
          background: banner.bg,
          color: banner.text,
          borderRadius: 'var(--radius-xl)',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'cat-banner-in 400ms ease-out, ' + banner.animClass + ' 2s ease-in-out infinite',
          transition: 'background 500ms ease, color 500ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
            {banner.label}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.8rem',
            opacity: 0.85,
            fontWeight: 500,
          }}
        >
          {visibleCount} / {data.length} {t('sources', 'sources')}
        </span>
      </div>

      {/* ---------- Section title ---------- */}
      <h3
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.15rem',
          fontWeight: 600,
          color: 'var(--text)',
          margin: '0 0 1.25rem 0',
        }}
      >
        {t('cascadingAlert.title', 'Threat Escalation Timeline')}
      </h3>

      {/* ---------- Timeline ---------- */}
      <div
        style={{
          position: 'relative',
          paddingLeft: '2rem',
        }}
      >
        {/* Vertical line */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '0.6875rem',
            top: '0.25rem',
            bottom: '0.25rem',
            width: '2px',
            background: 'var(--border2)',
            transformOrigin: 'top',
          }}
        />

        {data.map((stage, i) => {
          const isVisible = i < visibleCount;
          const color = getNodeColor(stage.status);

          return (
            <div
              key={`${stage.source}-${i}`}
              style={{
                position: 'relative',
                paddingBottom: i < data.length - 1 ? '1.75rem' : '0',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(12px)',
                transition: 'opacity 500ms ease, transform 500ms ease',
              }}
            >
              {/* Node circle */}
              <div
                style={{
                  position: 'absolute',
                  left: '-1.375rem',
                  top: '0.15rem',
                  width: '1.125rem',
                  height: '1.125rem',
                  borderRadius: '50%',
                  background: isVisible ? color : 'var(--border2)',
                  border: '3px solid var(--bg)',
                  boxShadow: isVisible
                    ? `0 0 0 2px ${color}, 0 0 8px ${color}40`
                    : 'none',
                  transition: 'all 500ms ease',
                  zIndex: 2,
                  animation: isVisible ? 'cat-pop-in 400ms ease-out' : 'none',
                }}
              />

              {/* Animated connector segment */}
              {i < data.length - 1 && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: '-0.8125rem',
                    top: '1.375rem',
                    width: '2px',
                    height: 'calc(100% - 1rem)',
                    background: isVisible ? color : 'transparent',
                    transformOrigin: 'top',
                    transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
                    transition: 'transform 500ms ease 200ms, background 300ms ease',
                    zIndex: 1,
                  }}
                />
              )}

              {/* Content card */}
              <div
                style={{
                  background: isVisible ? getNodeBg(stage.status) : 'transparent',
                  border: `1px solid ${isVisible ? color + '30' : 'transparent'}`,
                  borderRadius: '0.75rem',
                  padding: '0.875rem 1rem',
                  transition: 'all 500ms ease',
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '0.375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'var(--text)',
                      }}
                    >
                      {stage.source}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color,
                        background: color + '18',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {getStatusLabel(stage.status)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text3)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {stage.timestamp}
                  </span>
                </div>

                {/* Event description */}
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text2)',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.5,
                  }}
                >
                  {stage.event}
                </p>

                {/* Confidence bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '4px',
                      background: 'var(--border)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: isVisible ? `${stage.confidence * 100}%` : '0%',
                        background: color,
                        borderRadius: '2px',
                        transition: 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color,
                      minWidth: '2.5rem',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {Math.round(stage.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Footer summary ---------- */}
      {visibleCount === data.length && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg3)',
            borderRadius: '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--text2)',
            lineHeight: 1.5,
            animation: 'cat-slide-in 400ms ease-out',
          }}
        >
          <strong style={{ color: 'var(--text)' }}>
            {data.length} {t('cascadingAlert.sourcesCorroborated', 'sources corroborated')}
          </strong>{' '}
          — {t(
            'cascadingAlert.summaryText',
            'Multi-sensor fusion reached high confidence. Recommended action: dispatch ground inspection within 48 hours.',
          )}
        </div>
      )}
    </div>
  );
}

export default CascadingAlertTimeline;
