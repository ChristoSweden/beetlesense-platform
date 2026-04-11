import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, Sparkles } from 'lucide-react';

interface ComingSoonProps {
  /** The feature/page title to display */
  title: string;
  /** A brief description of what the feature will do */
  description?: string;
  /** Optional icon to show (defaults to Sparkles) */
  icon?: ReactNode;
}

/**
 * A polished "Coming Soon" card for features that are not yet available.
 * Includes an email notification signup form (UI-only for now).
 * Uses theme CSS custom properties and i18next for all strings.
 */
export function ComingSoon({ title, description, icon }: ComingSoonProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--green)]/10 border border-[var(--green)]/20">
          {icon ?? <Sparkles size={28} className="text-[var(--green)]" />}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          {title}
        </h1>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
          {t('comingSoon.badge')}
        </span>

        {/* Description */}
        <p className="text-sm text-[var(--text3)] leading-relaxed mb-8 max-w-sm mx-auto">
          {description ?? t('comingSoon.defaultDescription')}
        </p>

        {/* Email notification card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-2 animate-[fadeIn_300ms_ease-out]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--green)]/10">
                <CheckCircle2 size={20} className="text-[var(--green)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text)]">
                {t('comingSoon.thankYou')}
              </p>
              <p className="text-xs text-[var(--text3)]">
                {t('comingSoon.thankYouDesc')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} className="text-[var(--text3)]" />
                <span className="text-xs font-medium text-[var(--text2)]">
                  {t('comingSoon.notifyTitle')}
                </span>
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('comingSoon.emailPlaceholder')}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/30 focus:border-[var(--green)]/40 transition-colors"
                  aria-label={t('comingSoon.emailAriaLabel')}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--green)] text-sm font-medium text-white transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] active:scale-95 whitespace-nowrap"
                >
                  {t('comingSoon.notifyButton')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
