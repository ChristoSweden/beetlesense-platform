import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/* ─── Props ─── */
interface FeatureErrorBoundaryProps {
  /** Human-readable feature name shown in the fallback UI */
  featureName: string;
  /** Optional i18n key override for the feature name */
  featureNameKey?: string;
  /** Optional custom fallback — receives reset callback */
  fallback?: (props: { error: Error; resetError: () => void }) => ReactNode;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/* ─── Fallback (function component so we can use hooks) ─── */
function DefaultFallback({
  error,
  featureName,
  featureNameKey,
  resetError,
}: {
  error: Error;
  featureName: string;
  featureNameKey?: string;
  resetError: () => void;
}) {
  const { t } = useTranslation();
  const displayName = featureNameKey ? t(featureNameKey) : featureName;

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-8 text-center"
    >
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <svg
          className="h-6 w-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--text)]">
          {t('errors.featureCrash', { feature: displayName })}
        </h3>
        <p className="text-sm text-[var(--text3)]">
          {t('errors.featureCrashDescription')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={resetError}
          className="rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          {t('errors.tryAgain')}
        </button>
        <a
          href="mailto:support@beetlesense.ai?subject=Bug%20Report"
          className="text-sm text-[var(--text3)] underline underline-offset-2 transition hover:text-[var(--text)]"
        >
          {t('errors.reportIssue')}
        </a>
      </div>

      {/* Error detail (dev only) */}
      {import.meta.env.DEV && (
        <details className="mt-2 w-full max-w-lg text-left">
          <summary className="cursor-pointer text-xs text-[var(--text3)]">
            {t('errors.technicalDetails')}
          </summary>
          <pre className="mt-2 overflow-auto rounded-md bg-black/30 p-3 text-xs text-red-300">
            {error.message}
            {'\n'}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

/* ─── Error Boundary (class component) ─── */
export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[FeatureErrorBoundary] Error in "${this.props.featureName}":`,
      error,
      errorInfo,
    );
    // Production: send to monitoring service (Sentry, etc.)
  }

  resetError = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, featureName, featureNameKey, fallback } = this.props;

    if (error) {
      if (fallback) {
        return fallback({ error, resetError: this.resetError });
      }
      return (
        <DefaultFallback
          error={error}
          featureName={featureName}
          featureNameKey={featureNameKey}
          resetError={this.resetError}
        />
      );
    }

    return children;
  }
}
