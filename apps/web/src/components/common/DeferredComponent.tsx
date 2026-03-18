import { useState, useRef, useEffect, type ReactNode } from 'react';

interface DeferredComponentProps {
  /** Content to render when visible or idle */
  children: ReactNode;
  /** Placeholder shown before the component is rendered */
  fallback?: ReactNode;
  /** Use IntersectionObserver instead of requestIdleCallback */
  strategy?: 'idle' | 'visible';
  /** IntersectionObserver root margin (only for 'visible' strategy) */
  rootMargin?: string;
  /** Minimum height for the placeholder to prevent CLS */
  minHeight?: number | string;
  /** Optional CSS class for the wrapper */
  className?: string;
}

/**
 * Defers rendering of below-fold content until the browser is idle
 * or the element becomes visible in the viewport.
 *
 * - `strategy="idle"` (default): uses requestIdleCallback to render
 *   when the main thread is free, keeping initial paint fast.
 * - `strategy="visible"`: uses IntersectionObserver to only render
 *   when the user scrolls near the component.
 */
export function DeferredComponent({
  children,
  fallback,
  strategy = 'idle',
  rootMargin = '200px',
  minHeight,
  className,
}: DeferredComponentProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (strategy === 'idle') {
      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(
          () => setShouldRender(true),
          { timeout: 2000 },
        );
        return () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(() => setShouldRender(true), 100);
        return () => clearTimeout(id);
      }
    }

    // strategy === 'visible'
    const el = containerRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [strategy, rootMargin]);

  if (shouldRender) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: minHeight ?? 200 }}
    >
      {fallback ?? null}
    </div>
  );
}
