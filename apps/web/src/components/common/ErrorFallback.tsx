/**
 * Enhanced error fallback component for BeetleSense.ai
 *
 * Provides a user-friendly error UI with:
 * - BeetleSense branding
 * - "Report this error" button (sends to error tracking)
 * - Collapsible developer details
 * - "Try again" and "Go to dashboard" actions
 * - Different messaging for network vs. app errors
 */

import { useState } from 'react';
import { captureError } from '@/lib/errorTracking';

/* ─── Props ─── */

export interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
}

/* ─── Helpers ─── */

function isNetworkError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('offline') ||
    msg.includes('net::') ||
    error.name === 'TypeError' && msg.includes('fetch')
  );
}

/* ─── Component ─── */

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const [reported, setReported] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const network = isNetworkError(error);

  const handleReport = () => {
    captureError(error, { source: 'user-report' });
    setReported(true);
  };

  const handleGoToDashboard = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border2)] bg-[var(--bg2)] p-8 text-center shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          {network ? (
            <svg
              className="h-8 w-8 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          ) : (
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0 3.75h.007v.008H12v-.008zM21.721 12.752a9.721 9.721 0 1 1-19.442 0 9.721 9.721 0 0 1 19.442 0z"
              />
            </svg>
          )}
        </div>

        {/* Heading */}
        <h2 className="mb-2 text-xl font-bold text-[var(--text)]">
          {network ? 'Connection Problem' : 'Something Went Wrong'}
        </h2>

        {/* Description */}
        <p className="mb-6 text-sm leading-relaxed text-[var(--text3)]">
          {network
            ? 'We could not reach the server. Please check your internet connection and try again.'
            : 'An unexpected error occurred in the application. The BeetleSense team has been notified. You can try again or return to the dashboard.'}
        </p>

        {/* Actions */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          {resetError && (
            <button
              onClick={resetError}
              className="rounded-lg bg-[var(--green)] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg2)]"
            >
              Try Again
            </button>
          )}

          <button
            onClick={handleGoToDashboard}
            className="rounded-lg border border-[var(--border2)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--bg3)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg2)]"
          >
            Go to Dashboard
          </button>

          <button
            onClick={handleReport}
            disabled={reported}
            className="rounded-lg border border-[var(--border2)] px-5 py-2.5 text-sm font-medium text-[var(--text3)] transition hover:bg-[var(--bg3)] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg2)]"
          >
            {reported ? 'Error Reported' : 'Report This Error'}
          </button>
        </div>

        {/* Collapsible error details */}
        <div className="mt-4 text-left">
          <button
            onClick={() => setDetailsOpen((prev) => !prev)}
            className="text-xs text-[var(--text3)] underline underline-offset-2 transition hover:text-[var(--text)]"
          >
            {detailsOpen ? 'Hide technical details' : 'Show technical details'}
          </button>

          {detailsOpen && (
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-black/30 p-4 text-xs leading-relaxed text-red-300">
              <strong>Error:</strong> {error.message}
              {'\n\n'}
              <strong>Stack:</strong>
              {'\n'}
              {error.stack ?? 'No stack trace available'}
            </pre>
          )}
        </div>

        {/* Branding */}
        <p className="mt-6 text-xs text-[var(--text3)]/50">
          BeetleSense.ai — Forest Intelligence Platform
        </p>
      </div>
    </div>
  );
}
