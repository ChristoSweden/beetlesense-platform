import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { App } from './App';
import { initPostHog } from './lib/posthog';
import { initSentry } from './lib/sentry';
import { initErrorTracking } from './lib/errorTracking';
import './index.css';
import './i18n';

// Initialize analytics & error tracking before rendering
initPostHog();
initSentry();
initErrorTracking();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
