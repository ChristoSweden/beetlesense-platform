import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';

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
  resetError,
}: {
  error: Error;
  featureName: string;
  featureNameKey?: string;
  resetError: () => void;
}) {
  return (
    <ErrorDisplay code="UI-001" onRetry={resetError} />
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
