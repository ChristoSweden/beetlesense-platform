import { useRef, useEffect, useState, useCallback } from 'react';

interface ScrollRevealOptions {
  /** Threshold for triggering (0-1). Default: 0.15 */
  threshold?: number;
  /** Root margin for early/late trigger. Default: '0px 0px -40px 0px' */
  rootMargin?: string;
  /** Only trigger once. Default: true */
  once?: boolean;
}

/**
 * Hook that returns a ref and a boolean indicating whether the element
 * is in the viewport. Used for scroll-triggered entrance animations.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
) {
  const { threshold = 0.15, rootMargin = '0px 0px -40px 0px', once = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip animation if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}

/**
 * Hook for staggered children animations within a container.
 * Returns a ref for the container and visibility + delay calculator.
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>(
  itemCount: number,
  options: ScrollRevealOptions & { staggerMs?: number } = {},
) {
  const { staggerMs = 60, ...revealOptions } = options;
  const { ref, isVisible } = useScrollReveal<T>(revealOptions);

  const getDelay = useCallback(
    (index: number) => `${index * staggerMs}ms`,
    [staggerMs],
  );

  return { ref, isVisible, getDelay };
}
