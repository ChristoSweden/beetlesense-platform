import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import './i18n';

// Lazy-load Vercel Analytics — not needed for initial render
const Analytics = lazy(() =>
  import('@vercel/analytics/react').then(m => ({ default: m.Analytics }))
);

// Lazy-load analytics & error tracking — defer until after first paint
const initAnalytics = () => {
  import('./lib/posthog').then(m => m.initPostHog());
  import('./lib/sentry').then(m => m.initSentry());
  import('./lib/errorTracking').then(m => m.initErrorTracking());
};

if ('requestIdleCallback' in window) {
  (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(initAnalytics);
} else {
  setTimeout(initAnalytics, 1);
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
    <Suspense fallback={null}>
      <Analytics />
    </Suspense>
  </StrictMode>,
);
