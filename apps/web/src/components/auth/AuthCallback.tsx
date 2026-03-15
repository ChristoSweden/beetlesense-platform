import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Bug, AlertCircle } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const { error: authError } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );

        if (authError) {
          setError(authError.message);
          return;
        }

        // Re-initialize auth store with new session
        await initialize();

        const { profile } = useAuthStore.getState();
        if (profile) {
          navigate(`/${profile.role}/dashboard`, { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try again.');
      }
    }

    handleCallback();
  }, [navigate, initialize]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--text)] mb-2">Authentication Failed</h1>
          <p className="text-sm text-[var(--text2)] mb-6">{error}</p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--green)]/10 text-[var(--green)] border border-[var(--border2)] text-sm font-medium hover:bg-[var(--green)]/15 transition-colors"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center animate-pulse">
            <Bug size={28} className="text-[var(--green)]" />
          </div>
        </div>
        <p className="text-sm text-[var(--text2)] font-mono">Verifying your identity...</p>
      </div>
    </div>
  );
}
