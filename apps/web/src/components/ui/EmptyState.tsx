import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '🌲', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-5xl mb-4" role="img" aria-hidden="true">{icon}</span>
      <h3 className="text-xl font-semibold text-[var(--text,#EAEAEC)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text,#EAEAEC)]/60 mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="px-6 py-2.5 bg-[var(--green,#00F2FF)] text-[var(--bg,#0A0E14)] font-medium rounded-lg hover:opacity-90 transition-opacity">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
