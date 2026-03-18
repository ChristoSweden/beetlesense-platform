/**
 * Web Vitals tracking — measures LCP, FID, CLS, TTFB, and INP.
 *
 * In development: logs metrics to the console.
 * In production: sends metrics to an analytics endpoint (configurable).
 *
 * Uses the PerformanceObserver API directly to avoid adding
 * the web-vitals library to the bundle.
 */

interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

type ReportCallback = (metric: WebVitalMetric) => void;

const isDev = import.meta.env.DEV;

// Thresholds per https://web.dev/vitals/
const thresholds: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function rate(name: string, value: number): WebVitalMetric['rating'] {
  const [good, poor] = thresholds[name] ?? [Infinity, Infinity];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function report(metric: WebVitalMetric, callback?: ReportCallback) {
  if (callback) {
    callback(metric);
    return;
  }

  if (isDev) {
    const color =
      metric.rating === 'good'
        ? '#4ade80'
        : metric.rating === 'needs-improvement'
          ? '#fbbf24'
          : '#ef4444';
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      `color: ${color}; font-weight: bold;`,
    );
  }
}

function observeLCP(callback?: ReportCallback) {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry;
      if (last) {
        const value = last.startTime;
        report({ name: 'LCP', value, rating: rate('LCP', value) }, callback);
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Unsupported browser
  }
}

function observeFID(callback?: ReportCallback) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        const value = fidEntry.processingStart - fidEntry.startTime;
        report({ name: 'FID', value, rating: rate('FID', value) }, callback);
      }
    });
    observer.observe({ type: 'first-input', buffered: true });
  } catch {
    // Unsupported browser
  }
}

function observeCLS(callback?: ReportCallback) {
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(entry as any).hadRecentInput) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          clsValue += (entry as any).value;
        }
      }
      report({ name: 'CLS', value: clsValue, rating: rate('CLS', clsValue) }, callback);
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Unsupported browser
  }
}

function observeTTFB(callback?: ReportCallback) {
  try {
    const observer = new PerformanceObserver((list) => {
      const nav = list.getEntries()[0] as PerformanceNavigationTiming;
      if (nav) {
        const value = nav.responseStart - nav.requestStart;
        report({ name: 'TTFB', value, rating: rate('TTFB', value) }, callback);
      }
    });
    observer.observe({ type: 'navigation', buffered: true });
  } catch {
    // Unsupported browser
  }
}

function observeINP(callback?: ReportCallback) {
  try {
    let maxDuration = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        const duration = eventEntry.duration;
        if (duration > maxDuration) {
          maxDuration = duration;
          report({ name: 'INP', value: duration, rating: rate('INP', duration) }, callback);
        }
      }
    });
    observer.observe({ type: 'event', buffered: true });
  } catch {
    // Unsupported browser
  }
}

/**
 * Initialize all Web Vitals observers.
 * Call once at app startup (e.g., in main.tsx or App.tsx).
 *
 * @param callback Optional custom reporter. If omitted, logs to console in dev.
 */
export function initWebVitals(callback?: ReportCallback): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  observeLCP(callback);
  observeFID(callback);
  observeCLS(callback);
  observeTTFB(callback);
  observeINP(callback);
}

/**
 * Send a metric to an analytics endpoint.
 * Use this as the callback for initWebVitals in production.
 */
export function sendToAnalytics(endpoint: string): ReportCallback {
  return (metric) => {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(metric));
    } else {
      fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(metric),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {
        // Silently fail
      });
    }
  };
}
