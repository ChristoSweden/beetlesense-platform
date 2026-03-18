import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface RetryBoundaryProps {
  children: ReactNode;
  /** The async fetch function to call. Must throw on failure. */
  onFetch: () => Promise<void>;
  /** Enable auto-retry with exponential backoff */
  autoRetry?: boolean;
  /** Max auto-retry attempts (default 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default 1000) */
  baseDelay?: number;
  /** Timeout in ms (default 30000) */
  timeout?: number;
  /** Custom loading fallback */
  loadingFallback?: ReactNode;
}

type Status = 'idle' | 'loading' | 'success' | 'error' | 'offline' | 'timeout';

export function RetryBoundary({
  children,
  onFetch,
  autoRetry = false,
  maxRetries = 3,
  baseDelay = 1000,
  timeout = 30_000,
  loadingFallback,
}: RetryBoundaryProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const isOnline = useOnlineStatus();

  const execute = useCallback(async () => {
    // Check connectivity first
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      await Promise.race([
        onFetch(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeout),
        ),
      ]);
      setStatus('success');
      setRetryCount(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message === 'TIMEOUT') {
        setStatus('timeout');
      } else {
        setStatus('error');
        setErrorMessage(message);
      }
    }
  }, [onFetch, timeout]);

  // Initial fetch
  useEffect(() => {
    execute();
  }, [execute]);

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (!autoRetry) return;
    if (status !== 'error' && status !== 'timeout') return;
    if (retryCount >= maxRetries) return;

    const delay = baseDelay * 2 ** retryCount;
    const timer = setTimeout(() => {
      setRetryCount((c) => c + 1);
      execute();
    }, delay);

    return () => clearTimeout(timer);
  }, [status, retryCount, autoRetry, maxRetries, baseDelay, execute]);

  // When coming back online, retry automatically
  useEffect(() => {
    if (isOnline && status === 'offline') {
      execute();
    }
  }, [isOnline, status, execute]);

  const handleManualRetry = () => {
    setRetryCount(0);
    execute();
  };

  // Success — render children
  if (status === 'success') {
    return <>{children}</>;
  }

  // Loading
  if (status === 'loading' || status === 'idle') {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex items-center justify-center py-12" role="status">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border2)] border-t-[var(--green)]" />
              <span className="text-xs text-[var(--text3)] font-mono uppercase tracking-widest">
                {t('common.loading')}
              </span>
            </div>
          </div>
        )}
      </>
    );
  }

  // Offline
  if (status === 'offline' || !isOnline) {
    return (
      <StatusCard
        icon={
          <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
          </svg>
        }
        title={t('errors.offline')}
        description={t('errors.offlineDesc')}
      />
    );
  }

  // Timeout
  if (status === 'timeout') {
    return (
      <StatusCard
        icon={
          <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title={t('errors.timeout')}
        description={t('errors.timeoutDesc')}
        onRetry={handleManualRetry}
        retryLabel={t('errors.tryAgain')}
      />
    );
  }

  // Error
  return (
    <StatusCard
      icon={
        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      }
      title={t('errors.fetchFailed')}
      description={errorMessage || t('errors.fetchFailedDesc')}
      onRetry={handleManualRetry}
      retryLabel={t('errors.tryAgain')}
      retryCount={autoRetry ? retryCount : undefined}
      maxRetries={autoRetry ? maxRetries : undefined}
    />
  );
}

/* ─── Helpers ─── */

function StatusCard({
  icon,
  title,
  description,
  onRetry,
  retryLabel,
  retryCount,
  maxRetries,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryCount?: number;
  maxRetries?: number;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-8 text-center"
    >
      {icon}
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      <p className="max-w-sm text-sm text-[var(--text3)]">{description}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          {retryLabel ?? t('errors.tryAgain')}
        </button>
      )}

      {retryCount != null && maxRetries != null && retryCount >= maxRetries && (
        <p className="text-xs text-[var(--text3)]">
          {t('errors.maxRetriesReached')}
        </p>
      )}
    </div>
  );
}

/** Hook: tracks navigator.onLine with event listeners */
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
