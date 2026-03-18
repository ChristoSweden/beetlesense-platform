import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X, PartyPopper } from 'lucide-react';
import { OWNER_TOUR_STEPS } from '@/stores/tourStore';

interface TourStepProps {
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

type Position = 'top' | 'bottom' | 'left' | 'right';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
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
  preferred: Position | 'auto',
  target: Rect,
  tooltipWidth: number,
  tooltipHeight: number,
): Position {
  if (preferred !== 'auto') {
    return preferred;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer bottom, then top, then right, then left
  if (target.bottom + TOOLTIP_GAP + tooltipHeight < vh) return 'bottom';
  if (target.top - TOOLTIP_GAP - tooltipHeight > 0) return 'top';
  if (target.right + TOOLTIP_GAP + tooltipWidth < vw) return 'right';
  if (target.left - TOOLTIP_GAP - tooltipWidth > 0) return 'left';
  return 'bottom';
}

function getTooltipStyle(
  position: Position,
  target: Rect,
  tooltipWidth: number,
  tooltipHeight: number,
): CSSProperties {
  const isMobile = window.innerWidth < 640;
  const tw = isMobile ? Math.min(tooltipWidth, window.innerWidth - 32) : tooltipWidth;

  let top = 0;
  let left = 0;

  switch (position) {
    case 'bottom':
      top = target.bottom + TOOLTIP_GAP;
      left = target.left + target.width / 2 - tw / 2;
      break;
    case 'top':
      top = target.top - TOOLTIP_GAP - tooltipHeight;
      left = target.left + target.width / 2 - tw / 2;
      break;
    case 'right':
      top = target.top + target.height / 2 - tooltipHeight / 2;
      left = target.right + TOOLTIP_GAP;
      break;
    case 'left':
      top = target.top + target.height / 2 - tooltipHeight / 2;
      left = target.left - TOOLTIP_GAP - tw;
      break;
  }

  // Clamp to viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (left < 16) left = 16;
  if (left + tw > vw - 16) left = vw - 16 - tw;
  if (top < 16) top = 16;
  if (top + tooltipHeight > vh - 16) top = vh - 16 - tooltipHeight;

  return {
    position: 'fixed',
    top,
    left,
    width: tw,
    zIndex: 100002,
  };
}

function Confetti() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; delay: number; rotation: number }[]
  >([]);

  useEffect(() => {
    const colors = ['#4ade80', '#86efac', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa'];
    const items = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * -20 - 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360,
    }));
    setParticles(items);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-sm animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function TourStep({ stepIndex, totalSteps, onNext, onPrev, onSkip }: TourStepProps) {
  const { t } = useTranslation();
  const step = OWNER_TOUR_STEPS[stepIndex];
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const isLastStep = stepIndex === totalSteps - 1;

  // Touch swipe handling
  const touchStartX = useRef(0);

  const recalculate = useCallback(() => {
    if (!step) return;

    const rect = getTargetRect(step.targetSelector);
    setTargetRect(rect);

    if (rect && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const pos = resolvePosition(
        step.position ?? 'auto',
        rect,
        tooltipRect.width || 320,
        tooltipRect.height || 180,
      );
      setTooltipPos(
        getTooltipStyle(pos, rect, tooltipRect.width || 320, tooltipRect.height || 180),
      );
    }
  }, [step]);

  // Recalculate on step change and resize
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => {
      recalculate();
      setIsVisible(true);
    }, 50);

    window.addEventListener('resize', recalculate);
    window.addEventListener('scroll', recalculate, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', recalculate);
      window.removeEventListener('scroll', recalculate, true);
    };
  }, [recalculate, stepIndex]);

  // Re-measure after tooltip renders
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(recalculate);
    }
  }, [isVisible, recalculate]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onNext, onPrev, onSkip]);

  if (!step) return null;

  const spotlightPadding = PADDING;

  // SVG mask for spotlight cutout
  const overlayContent = (
    <div
      className={`fixed inset-0 z-[100000] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 50) {
          if (delta < 0) onNext();
          else onPrev();
        }
      }}
    >
      {/* SVG overlay with cutout */}
      <svg
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 100000 }}
        onClick={onSkip}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
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
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Pulse ring around target */}
      {targetRect && (
        <div
          className="fixed rounded-xl border-2 border-[var(--green)] animate-tour-pulse pointer-events-none"
          style={{
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
            zIndex: 100001,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          ...tooltipPos,
          background: 'var(--surface)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti for final step */}
        {isLastStep && isVisible && <Confetti />}

        <div className="relative p-4 sm:p-5">
          {/* Skip button */}
          {!isLastStep && (
            <button
              onClick={onSkip}
              className="absolute top-3 right-3 p-1 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              aria-label={t('tour.skip')}
            >
              <X size={14} />
            </button>
          )}

          {/* Celebration icon for last step */}
          {isLastStep && (
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-[var(--green)]/15 flex items-center justify-center">
                <PartyPopper size={24} className="text-[var(--green)]" />
              </div>
            </div>
          )}

          {/* Title */}
          <h3
            className={`text-sm font-semibold text-[var(--text)] ${
              isLastStep ? 'text-center' : 'pr-6'
            }`}
          >
            {t(step.i18nTitleKey)}
          </h3>

          {/* Description */}
          <p
            className={`text-xs text-[var(--text2)] mt-1.5 leading-relaxed ${
              isLastStep ? 'text-center' : ''
            }`}
          >
            {t(step.i18nDescKey)}
          </p>

          {/* Footer: step indicator + nav buttons */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
            {/* Step counter */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === stepIndex
                      ? 'w-4 bg-[var(--green)]'
                      : i < stepIndex
                        ? 'w-1.5 bg-[var(--green)]/40'
                        : 'w-1.5 bg-[var(--text3)]/30'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {stepIndex > 0 && !isLastStep && (
                <button
                  onClick={onPrev}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <ChevronLeft size={12} />
                  <span className="hidden sm:inline">{t('tour.back')}</span>
                </button>
              )}

              {!isLastStep ? (
                <button
                  onClick={onNext}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-forest-900 hover:bg-[var(--green2)] transition-colors"
                >
                  {t('tour.next')}
                  <ChevronRight size={12} />
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-forest-900 hover:bg-[var(--green2)] transition-colors"
                >
                  {t('tour.finish')}
                </button>
              )}
            </div>
          </div>

          {/* Step number text */}
          <p className="text-[10px] text-[var(--text3)] mt-2 text-center font-mono">
            {stepIndex + 1} / {totalSteps}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
