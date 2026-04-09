import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'cookie_consent';

export type CookieConsentValue = 'all' | 'essential' | null;

export function getCookieConsent(): CookieConsentValue {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === 'all' || val === 'essential') return val;
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
  return null;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner only if no decision has been made yet
    if (getCookieConsent() === null) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(CONSENT_KEY, 'all');
    } catch { /* ignore */ }
    setVisible(false);
    // Reload so posthog.ts can re-check consent and initialise
    window.location.reload();
  }

  function handleEssential() {
    try {
      localStorage.setItem(CONSENT_KEY, 'essential');
    } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#1B5E20]/20 shadow-lg"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm text-[#374151] leading-relaxed flex-1">
          We use analytics (PostHog) to improve BeetleSense and error tracking (Sentry) for reliability.
          Your forest data stays in the EU (Supabase Frankfurt).{' '}
          <Link
            to="/privacy"
            className="text-[#1B5E20] underline underline-offset-2 hover:text-[#145016] transition-colors"
          >
            Privacy Policy
          </Link>
        </p>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleEssential}
            className="rounded px-4 py-2 text-sm font-medium border border-[#1B5E20]/40 text-[#1B5E20] hover:bg-[#1B5E20]/5 transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={handleAccept}
            className="rounded px-4 py-2 text-sm font-medium bg-[#1B5E20] text-white hover:bg-[#145016] transition-colors"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
