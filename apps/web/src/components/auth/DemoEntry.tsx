import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/**
 * Public entry point for "Try Demo" flow.
 *
 * When a visitor arrives at /demo (e.g. from the landing page CTA),
 * this component activates demo mode via skipAuth() and immediately
 * redirects to the real owner dashboard at /owner/dashboard.
 *
 * If the user is already authenticated, it redirects based on their role.
 */
export default function DemoEntry() {
  const { session, profile, skipAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Already logged in with a real account — send to their dashboard
    if (session && profile && !profile.id.startsWith('demo-user')) {
      const dest =
        profile.role === 'pilot'
          ? '/pilot/dashboard'
          : profile.role === 'inspector'
            ? '/inspector/dashboard'
            : profile.role === 'admin'
              ? '/admin/dashboard'
              : '/owner/dashboard';
      navigate(dest, { replace: true });
      return;
    }

    // Activate demo mode (sets a demo profile in the auth store)
    if (!profile?.id?.startsWith('demo-user')) {
      skipAuth();
    }

    // Redirect to the real owner dashboard
    navigate('/owner/dashboard', { replace: true });
  }, [session, profile, skipAuth, navigate]);

  // Brief loading state while the redirect happens
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
        <span className="text-sm text-[var(--text2)] font-mono tracking-wider uppercase">
          Loading demo
        </span>
      </div>
    </div>
  );
}
