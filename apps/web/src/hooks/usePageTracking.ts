/**
 * React hook for automatic page view tracking.
 *
 * Tracks page views on route changes and measures time-on-page duration.
 * Ignores rapid re-renders (debounced at 300ms).
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, trackTiming } from '@/lib/analytics';

const DEBOUNCE_MS = 300;

/**
 * Automatically tracks page views when the route changes.
 * Call once near the top of your component tree (inside a Router).
 *
 * @example
 * ```tsx
 * function App() {
 *   usePageTracking();
 *   return <Routes>...</Routes>;
 * }
 * ```
 */
export function usePageTracking(): void {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);
  const pageEnteredAtRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentPath = location.pathname;

    // Skip if same path (avoids duplicate tracking on re-renders)
    if (currentPath === prevPathRef.current) return;

    // Clear any pending debounce
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Record time-on-page for the previous path
      if (prevPathRef.current !== null) {
        const duration = Date.now() - pageEnteredAtRef.current;
        trackTiming('page', prevPathRef.current, duration);
      }

      // Track the new page view
      trackPageView(currentPath);

      prevPathRef.current = currentPath;
      pageEnteredAtRef.current = Date.now();
      debounceTimerRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [location.pathname]);
}
