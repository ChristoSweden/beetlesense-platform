import React from 'react';

interface ErrorMessageProps {
  message: string;
  code?: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, code, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-red-500/20 rounded-xl bg-red-500/5">
      <span className="text-3xl mb-3" role="img" aria-hidden="true">⚠️</span>
      <p className="text-sm text-[var(--text,#EAEAEC)] mb-1">{message}</p>
      {code && <p className="text-xs text-[var(--text,#EAEAEC)]/40 font-mono mb-4">({code})</p>}
      {onRetry && (
        <button onClick={onRetry} className="px-5 py-2 text-sm bg-[var(--green,#00F2FF)] text-[var(--bg,#0A0E14)] font-medium rounded-lg hover:opacity-90 transition-opacity">
          Try again
        </button>
      )}
    </div>
  );
}
