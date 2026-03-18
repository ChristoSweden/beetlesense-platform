interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
