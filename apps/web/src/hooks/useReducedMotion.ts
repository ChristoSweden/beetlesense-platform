import { useState, useEffect } from 'react';

/**
 * Detects whether the user has requested reduced motion via their OS settings.
 * Returns `true` when `prefers-reduced-motion: reduce` matches.
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 * const duration = prefersReducedMotion ? 0 : 300;
 * ```
 *
 * WCAG 2.1 AA — Success Criterion 2.3.3 (Animation from Interactions)
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleChange(e: MediaQueryListEvent) {
      setPrefersReducedMotion(e.matches);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
