/**
 * Reusable error display component.
 * Template: "[Human explanation]. ([ERROR-CODE]) [Specific next action]."
 *
 * Usage:
 *   <ErrorDisplay code="AUTH-001" onRetry={() => refetch()} />
 *   <ErrorDisplay code="MAP-003" />
 */

import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { getError } from '@/lib/errorCodes';

interface ErrorDisplayProps {
  /** Error code from the BeetleSense error code system, e.g. 'AUTH-001' */
  code: string;
  /** Optional retry callback — shows a "Try again" button */
  onRetry?: () => void;
  /** Optional dismiss callback — shows an X button */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function ErrorDisplay({ code, onRetry, onDismiss, className = '' }: ErrorDisplayProps) {
  const error = getError(code);

  const userMessage = error?.userMessage ?? 'Something went wrong.';
  const action = error?.action ?? 'Please try again or contact support.';
  const displayCode = error?.code ?? code ?? 'UNKNOWN';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4
        animate-[fadeIn_200ms_ease-out]
        ${className}
      `}
    >
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
        <AlertTriangle className="h-5 w-5 text-[var(--red)]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text)]">
          {userMessage}{' '}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--red)]">
            {displayCode}
          </code>
        </p>
        <p className="mt-1 text-xs text-[var(--text3)]">{action}</p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-all duration-200 hover:bg-[var(--bg3)] hover:text-[var(--green)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] active:scale-95"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        )}
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-[var(--text3)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default ErrorDisplay;
