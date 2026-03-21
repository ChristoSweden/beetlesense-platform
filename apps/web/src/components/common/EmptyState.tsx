import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/* ─── Variant icons ─── */

const icons: Record<EmptyStateVariant, ReactNode> = {
  'no-data': (
    <svg className="h-10 w-10 text-[var(--text3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  'no-results': (
    <svg className="h-10 w-10 text-[var(--text3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  error: (
    <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  'coming-soon': (
    <svg className="h-10 w-10 text-[var(--green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  ),
};

/* ─── Public API ─── */

export type EmptyStateVariant = 'no-data' | 'no-results' | 'error' | 'coming-soon';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  /** Override the default icon */
  icon?: ReactNode;
  /** i18n key or plain string for the title */
  title?: string;
  /** i18n key or plain string for the description */
  description?: string;
  /** Optional call-to-action */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  variant = 'no-data',
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const { t } = useTranslation();

  const defaultTitles: Record<EmptyStateVariant, string> = {
    'no-data': t('errors.emptyNoData'),
    'no-results': t('errors.emptyNoResults'),
    error: t('errors.emptyError'),
    'coming-soon': t('errors.emptyComingSoon'),
  };

  const defaultDescriptions: Record<EmptyStateVariant, string> = {
    'no-data': t('errors.emptyNoDataDesc'),
    'no-results': t('errors.emptyNoResultsDesc'),
    error: t('errors.emptyErrorDesc'),
    'coming-soon': t('errors.emptyComingSoonDesc'),
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center animate-[fadeIn_200ms_ease-out]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--green)]/5 border border-[var(--border)]">
        {icon ?? icons[variant]}
      </div>

      <h3 className="text-base font-semibold text-[var(--text)]">
        {title ?? defaultTitles[variant]}
      </h3>

      <p className="max-w-sm text-sm text-[var(--text3)]">
        {description ?? defaultDescriptions[variant]}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
