import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
  PartyPopper,
  TreePine,
  LayoutDashboard,
  Map,
  Satellite,
  Bot,
  FileBarChart,
  Compass,
  Users,
  BookOpen,
  Settings,
  CreditCard,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TourStepDef {
  id: string;
  target: string; // value for data-tour attribute
  title: string;
  description: string;
  icon: ReactNode;
  preferredPosition: TooltipPosition | 'auto';
  /** Optional pathname where this step is relevant */
  expectedPath?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'beetlesense-guided-tour-completed';
const PADDING = 10;
const TOOLTIP_GAP = 14;
const TOOLTIP_WIDTH = 340;

const OWNER_STEPS: TourStepDef[] = [
  {
    id: 'welcome',
    target: 'welcome',
    title: 'Welcome to BeetleSense',
    description:
      'Your AI-powered forest intelligence platform. Let us show you around — this tour takes about 2 minutes.',
    icon: <TreePine size={20} />,
    preferredPosition: 'bottom',
  },
  {
    id: 'dashboard-overview',
    target: 'dashboard-stats',
    title: 'Dashboard Overview',
    description:
      'Your command centre. See forest health scores, timber values, beetle risk levels, and weather alerts — all at a glance.',
    icon: <LayoutDashboard size={20} />,
    preferredPosition: 'bottom',
  },
  {
    id: 'parcels',
    target: 'parcels',
    title: 'Your Parcels',
    description:
      'Manage all your forest parcels here. Add new parcels, view boundaries on the map, and drill into per-parcel analytics.',
    icon: <Map size={20} />,
    preferredPosition: 'right',
  },
  {
    id: 'early-warning',
    target: 'early-warning',
    title: 'Satellite Monitoring',
    description:
      'Sentinel-2 satellite imagery is analysed weekly. Get automatic alerts when vegetation indices indicate stress or beetle activity.',
    icon: <Satellite size={20} />,
    preferredPosition: 'right',
  },
  {
    id: 'ai-companion',
    target: 'companion',
    title: 'AI Companion',
    description:
      'Ask anything about your forest. The AI companion uses your parcel data, Swedish forestry research, and satellite imagery to give expert answers.',
    icon: <Bot size={20} />,
    preferredPosition: 'bottom',
  },
  {
    id: 'reports',
    target: 'reports',
    title: 'Reports & Export',
    description:
      'Generate professional PDF reports for authorities, buyers, or your own records. Export data as CSV or GeoJSON.',
    icon: <FileBarChart size={20} />,
    preferredPosition: 'right',
  },
  {
    id: 'field-mode',
    target: 'field-mode',
    title: 'Field Mode',
    description:
      'Heading into the forest? Field Mode works offline with GPS navigation, photo capture, and voice notes synced when you return.',
    icon: <Compass size={20} />,
    preferredPosition: 'right',
  },
  {
    id: 'community',
    target: 'community',
    title: 'Community',
    description:
      'Connect with neighbouring forest owners, share observations, and coordinate beetle response across property boundaries.',
    icon: <Users size={20} />,
    preferredPosition: 'right',
  },
  {
    id: 'research-library',
    target: 'research-library',
    title: 'Knowledge Base',
    description:
      'Access curated forestry research, SLU publications, and Skogsstyrelsen guidelines — all searchable and linked to your parcels.',
    icon: <BookOpen size={20} />,
    preferredPosition: 'right',
  },
  {
    id: 'settings',
    target: 'settings',
    title: 'Settings & Preferences',
    description:
      'Customise notifications, language, map layers, and data sharing preferences. You can restart this tour from here anytime.',
    icon: <Settings size={20} />,
    preferredPosition: 'right',
  },
  {
    id: 'billing',
    target: 'billing',
    title: 'Billing',
    description:
      'Manage your subscription, view invoices, and upgrade your plan to unlock advanced satellite analysis and AI features.',
    icon: <CreditCard size={20} />,
    preferredPosition: 'right',
  },
  {
    id: 'tour-complete',
    target: 'welcome',
    title: "You're ready!",
    description:
      "That's the essentials. Explore at your own pace — the AI Companion is always here to help if you get stuck.",
    icon: <PartyPopper size={20} />,
    preferredPosition: 'bottom',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTargetElement(tourAttr: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${tourAttr}"]`);
}

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    bottom: r.bottom,
    right: r.right,
  };
}

function resolvePosition(
  preferred: TooltipPosition | 'auto',
  target: Rect,
  tw: number,
  th: number,
): TooltipPosition {
  if (preferred !== 'auto') {
    // Validate the preferred position actually fits
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    switch (preferred) {
      case 'bottom':
        if (target.bottom + TOOLTIP_GAP + th < vh) return 'bottom';
        break;
      case 'top':
        if (target.top - TOOLTIP_GAP - th > 0) return 'top';
        break;
      case 'right':
        if (target.right + TOOLTIP_GAP + tw < vw) return 'right';
        break;
      case 'left':
        if (target.left - TOOLTIP_GAP - tw > 0) return 'left';
        break;
    }
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (target.bottom + TOOLTIP_GAP + th < vh) return 'bottom';
  if (target.top - TOOLTIP_GAP - th > 0) return 'top';
  if (target.right + TOOLTIP_GAP + tw < vw) return 'right';
  if (target.left - TOOLTIP_GAP - tw > 0) return 'left';
  return 'bottom';
}

function computeTooltipStyle(
  position: TooltipPosition,
  target: Rect,
  tw: number,
  th: number,
): CSSProperties {
  const isMobile = window.innerWidth < 640;
  const width = isMobile ? Math.min(tw, window.innerWidth - 32) : tw;

  let top = 0;
  let left = 0;

  switch (position) {
    case 'bottom':
      top = target.bottom + TOOLTIP_GAP;
      left = target.left + target.width / 2 - width / 2;
      break;
    case 'top':
      top = target.top - TOOLTIP_GAP - th;
      left = target.left + target.width / 2 - width / 2;
      break;
    case 'right':
      top = target.top + target.height / 2 - th / 2;
      left = target.right + TOOLTIP_GAP;
      break;
    case 'left':
      top = target.top + target.height / 2 - th / 2;
      left = target.left - TOOLTIP_GAP - width;
      break;
  }

  // Clamp to viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (left < 16) left = 16;
  if (left + width > vw - 16) left = vw - 16 - width;
  if (top < 16) top = 16;
  if (top + th > vh - 16) top = vh - 16 - th;

  return { position: 'fixed', top, left, width, zIndex: 100002 };
}

function scrollToTarget(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const isVisible =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth;

  if (!isVisible) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }
}

function isCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

function resetCompleted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Confetti sub-component
// ---------------------------------------------------------------------------

function Confetti() {
  const [particles] = useState(() => {
    const colors = ['#4ade80', '#86efac', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa'];
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * -30 - 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.6,
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 6,
    }));
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
            animation: `guided-tour-confetti 1.6s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inject keyframes once
// ---------------------------------------------------------------------------

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes guided-tour-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5); }
      50% { opacity: 0.8; box-shadow: 0 0 0 8px rgba(74, 222, 128, 0); }
    }
    @keyframes guided-tour-confetti {
      0% { opacity: 1; transform: translateY(0) rotate(0deg); }
      100% { opacity: 0; transform: translateY(320px) rotate(720deg); }
    }
    @keyframes guided-tour-fade-in {
      from { opacity: 0; transform: scale(0.95) translateY(6px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// GuidedTour component
// ---------------------------------------------------------------------------

interface GuidedTourProps {
  /** Force the tour open externally (e.g. from a button). */
  forceOpen?: boolean;
  /** Called when the tour finishes or is skipped. */
  onClose?: () => void;
  /** Override the steps array (defaults to OWNER_STEPS). */
  steps?: TourStepDef[];
}

function GuidedTour({ forceOpen, onClose, steps = OWNER_STEPS }: GuidedTourProps) {
  const location = useLocation();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({});
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const totalSteps = steps.length;

  // Inject animation keyframes
  useEffect(() => {
    injectStyles();
  }, []);

  // ------ Auto-start on first login ------
  useEffect(() => {
    const isDashboard =
      location.pathname.endsWith('/dashboard') || location.pathname === '/';

    if (isDashboard && !isCompleted() && !isActive) {
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStep(0);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // ------ External trigger ------
  useEffect(() => {
    if (forceOpen) {
      setIsActive(true);
      setCurrentStep(0);
    }
  }, [forceOpen]);

  // ------ Pause if user navigates away from expected page ------
  useEffect(() => {
    if (!isActive || !step) return;
    if (step.expectedPath && !location.pathname.startsWith(step.expectedPath)) {
      setPaused(true);
    } else {
      setPaused(false);
    }
  }, [location.pathname, isActive, step]);

  // ------ Prevent body scroll when active ------
  useEffect(() => {
    if (isActive && !paused) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive, paused]);

  // ------ Measure & position ------
  const recalculate = useCallback(() => {
    if (!step) return;
    const el = getTargetElement(step.target);
    if (!el) {
      // No target found — show tooltip centred
      setTargetRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: TOOLTIP_WIDTH,
        zIndex: 100002,
      });
      return;
    }

    scrollToTarget(el);

    // Small delay for scroll to settle
    requestAnimationFrame(() => {
      const rect = getRect(el);
      setTargetRect(rect);

      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const tw = tooltipRect.width || TOOLTIP_WIDTH;
        const th = tooltipRect.height || 200;
        const pos = resolvePosition(step.preferredPosition, rect, tw, th);
        setTooltipStyle(computeTooltipStyle(pos, rect, tw, th));
      }
    });
  }, [step]);

  useEffect(() => {
    if (!isActive || paused) return;
    setVisible(false);
    const timer = setTimeout(() => {
      recalculate();
      setVisible(true);
    }, 80);

    const onResize = () => recalculate();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [recalculate, currentStep, isActive, paused]);

  // Re-measure after tooltip renders
  useEffect(() => {
    if (visible) {
      requestAnimationFrame(recalculate);
    }
  }, [visible, recalculate]);

  // ------ Keyboard navigation ------
  useEffect(() => {
    if (!isActive || paused) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleSkip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }); // intentionally no deps — uses latest closures

  // ------ Navigation handlers ------
  const handleNext = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      handleComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    markCompleted();
    onClose?.();
  }, [onClose]);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    markCompleted();
    onClose?.();
  }, [onClose]);

  // ------ Render nothing when inactive or paused ------
  if (!isActive || paused || !step) return null;

  const overlay = (
    <div
      className={`fixed inset-0 z-[100000] transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`Guided tour step ${currentStep + 1} of ${totalSteps}`}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 50) {
          if (delta < 0) handleNext();
          else handlePrev();
        }
      }}
    >
      {/* SVG overlay with spotlight cutout */}
      <svg
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 100000 }}
        onClick={handleSkip}
        aria-hidden="true"
      >
        <defs>
          <mask id="guided-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - PADDING}
                y={targetRect.top - PADDING}
                width={targetRect.width + PADDING * 2}
                height={targetRect.height + PADDING * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 13, 5, 0.82)"
          mask="url(#guided-tour-mask)"
        />
      </svg>

      {/* Pulse ring around target */}
      {targetRect && (
        <div
          className="fixed rounded-xl border-2 pointer-events-none"
          style={{
            top: targetRect.top - PADDING,
            left: targetRect.left - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
            zIndex: 100001,
            borderColor: '#4ade80',
            animation: 'guided-tour-pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          ...tooltipStyle,
          background: 'linear-gradient(145deg, #0a1f0e 0%, #061209 100%)',
          borderColor: 'rgba(74, 222, 128, 0.2)',
          animation: visible ? 'guided-tour-fade-in 0.35s ease-out' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti on final step */}
        {isLastStep && visible && <Confetti />}

        <div className="relative p-5 sm:p-6">
          {/* Skip button */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              aria-label="Skip tour"
            >
              <X size={16} />
            </button>
          )}

          {/* Icon badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              isLastStep ? 'mx-auto' : ''
            }`}
            style={{
              background: 'rgba(74, 222, 128, 0.12)',
              color: '#4ade80',
            }}
          >
            {step.icon}
          </div>

          {/* Title */}
          <h3
            className={`text-sm font-semibold mb-1.5 ${isLastStep ? 'text-center' : 'pr-8'}`}
            style={{ color: '#f0fdf4' }}
          >
            {step.title}
          </h3>

          {/* Description */}
          <p
            className={`text-xs leading-relaxed ${isLastStep ? 'text-center' : ''}`}
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {step.description}
          </p>

          {/* Step counter */}
          <p
            className="text-[11px] font-mono mt-3 mb-3"
            style={{ color: 'rgba(255,255,255,0.35)', textAlign: isLastStep ? 'center' : 'left' }}
          >
            {currentStep + 1} of {totalSteps}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1 mb-4" style={{ justifyContent: isLastStep ? 'center' : 'flex-start' }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === currentStep ? 16 : 6,
                  backgroundColor:
                    i === currentStep
                      ? '#4ade80'
                      : i < currentStep
                        ? 'rgba(74, 222, 128, 0.4)'
                        : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div
            className="flex items-center gap-2 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', justifyContent: 'flex-end' }}
          >
            {/* Skip text button */}
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="mr-auto px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                Skip tour
              </button>
            )}

            {/* Previous */}
            {currentStep > 0 && !isLastStep && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)';
                  e.currentTarget.style.color = '#4ade80';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                }}
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}

            {/* Next / Finish */}
            <button
              onClick={isLastStep ? handleComplete : handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: '#4ade80',
                color: '#030d05',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#86efac')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#4ade80')}
            >
              {isLastStep ? (
                <>
                  <Sparkles size={14} />
                  Start exploring
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

// ---------------------------------------------------------------------------
// Static helpers for external use
// ---------------------------------------------------------------------------

/** Check if the guided tour has been completed. */
GuidedTour.isCompleted = isCompleted;

/** Mark the guided tour as completed (useful for testing). */
GuidedTour.markCompleted = markCompleted;

/** Reset tour completion so it triggers again on next login. */
GuidedTour.resetCompleted = resetCompleted;

/** The default owner tour steps — useful for reference or overriding. */
GuidedTour.OWNER_STEPS = OWNER_STEPS;

export default GuidedTour;
