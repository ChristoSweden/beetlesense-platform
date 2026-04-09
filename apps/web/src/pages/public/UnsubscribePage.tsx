/**
 * UnsubscribePage — One-click email digest unsubscribe
 *
 * Linked from the footer of weekly digest emails:
 *   https://beetlesense.ai/unsubscribe?user_id=<uuid>
 *
 * Flow:
 *   1. If user is logged in and their user_id matches, update directly.
 *   2. If user is not logged in, show a prompt to sign in then redirect back.
 *   3. If no user_id param, show a plain "manage settings" landing.
 *
 * Note: A fully token-gated unsubscribe (no login required) needs the
 * digest-unsubscribe edge function with HMAC verification. Until that is
 * deployed, this page handles the logged-in case and gracefully degrades.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type State = 'loading' | 'success' | 'error' | 'not_logged_in' | 'no_params';

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');

  const [state, setState] = useState<State>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!userId) {
      setState('no_params');
      return;
    }

    async function doUnsubscribe() {
      try {
        // Check if user is currently signed in
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Not logged in — can't update without service role
          setState('not_logged_in');
          return;
        }

        // Verify the URL user_id matches the logged-in user (security check)
        if (user.id !== userId) {
          setState('not_logged_in');
          return;
        }

        // Directly update the user_preferences row
        const { error } = await supabase
          .from('user_preferences')
          .update({ digest_enabled: false })
          .eq('user_id', user.id);

        if (error) throw error;

        setState('success');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Något gick fel';
        setErrorMessage(message);
        setState('error');
      }
    }

    doUnsubscribe();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-8 text-center">
        {/* Branding */}
        <div className="mb-6">
          <div className="w-12 h-12 bg-[var(--green)]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Mail size={24} className="text-[var(--green)]" />
          </div>
          <p className="text-xs font-semibold text-[var(--green)] tracking-widest uppercase">
            BeetleSense.ai
          </p>
        </div>

        {state === 'loading' && (
          <div>
            <Loader2 size={32} className="animate-spin text-[var(--green)] mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-[var(--text)] mb-2">
              Avregistrerar dig...
            </h1>
            <p className="text-sm text-[var(--text2)]">
              Ett ögonblick, vi uppdaterar dina inställningar.
            </p>
          </div>
        )}

        {state === 'success' && (
          <div>
            <CheckCircle size={40} className="text-emerald-500 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-[var(--text)] mb-2">
              Du är avregistrerad
            </h1>
            <p className="text-sm text-[var(--text2)] mb-6">
              Du kommer inte längre att få veckosammanfattningar från BeetleSense.
              Du kan när som helst aktivera dem igen i dina aviseringsinställningar.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/owner/notification-settings"
                className="block w-full py-2.5 rounded-xl bg-[var(--green)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Hantera aviseringsinställningar
              </Link>
              <Link
                to="/owner/dashboard"
                className="block w-full py-2.5 rounded-xl bg-[var(--bg3)] text-[var(--text2)] text-sm font-medium hover:bg-[var(--border)] transition-colors border border-[var(--border)]"
              >
                Gå till dashboard
              </Link>
            </div>
          </div>
        )}

        {state === 'not_logged_in' && (
          <div>
            <Mail size={40} className="text-[var(--green)] mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-[var(--text)] mb-2">
              Logga in för att avregistrera
            </h1>
            <p className="text-sm text-[var(--text2)] mb-6">
              Du behöver vara inloggad för att hantera dina aviseringsinställningar.
              Klicka nedan för att logga in — du skickas sedan automatiskt till inställningssidan.
            </p>
            <Link
              to={`/login?redirect=/owner/notification-settings`}
              className="block w-full py-2.5 rounded-xl bg-[var(--green)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Logga in och avregistrera
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div>
            <XCircle size={40} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-[var(--text)] mb-2">
              Något gick fel
            </h1>
            <p className="text-sm text-[var(--text2)] mb-2">
              Vi kunde inte avregistrera dig just nu.
            </p>
            {errorMessage && (
              <p className="text-xs text-[var(--text3)] mb-4 font-mono bg-[var(--bg3)] rounded-lg p-2 text-left">
                {errorMessage}
              </p>
            )}
            <p className="text-sm text-[var(--text2)] mb-6">
              Du kan stänga av veckosammanfattningar manuellt i dina inställningar.
            </p>
            <Link
              to="/owner/notification-settings"
              className="block w-full py-2.5 rounded-xl bg-[var(--green)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Hantera aviseringsinställningar
            </Link>
          </div>
        )}

        {state === 'no_params' && (
          <div>
            <Mail size={40} className="text-[var(--green)] mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-[var(--text)] mb-2">
              Hantera aviseringar
            </h1>
            <p className="text-sm text-[var(--text2)] mb-6">
              Logga in för att hantera dina aviseringsinställningar, inklusive veckosammanfattningar.
            </p>
            <Link
              to="/owner/notification-settings"
              className="block w-full py-2.5 rounded-xl bg-[var(--green)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Aviseringsinställningar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
