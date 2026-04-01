import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { Bug, Mail, Lock, ArrowRight, Check } from 'lucide-react';

type View = 'signin' | 'forgot' | 'forgot-sent';

export default function LoginPage() {
  const { session, profile, signInWithPassword, resetPassword, skipAuth, isLoading, error, clearError } =
    useAuthStore();
  const { t } = useTranslation();
  const [view, setView] = useState<View>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (session && profile) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await signInWithPassword(email, password);
    } catch {
      // error is set in store
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await resetPassword(email);
      setView('forgot-sent');
    } catch {
      // error is set in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--green)]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[var(--green)]/3 rounded-full blur-[96px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--green)]/10 border border-[var(--border2)] mb-4 glow-green">
            <Bug size={28} className="text-[var(--green)]" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text)]">BeetleSense</h1>
          <p className="text-sm text-[var(--text3)] mt-1">{t('common.tagline')}</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-[var(--border)] p-6 sm:p-8"
          style={{ background: 'var(--bg2)' }}
        >
          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Sign In View */}
          {view === 'signin' && (
            <>
              <h2 className="text-lg font-semibold text-[var(--text)] mb-6">{t('auth.signIn')}</h2>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
                        focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="********"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
                        focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
                    hover:bg-[var(--green2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? t('auth.processing') : t('auth.signIn')}
                  {!isLoading && <ArrowRight size={16} />}
                </button>
              </form>

              <button
                onClick={() => { setView('forgot'); clearError(); }}
                className="block w-full text-center text-xs text-[var(--text3)] hover:text-[var(--green)] mt-4 transition-colors"
              >
                {t('auth.forgotPassword')}
              </button>
            </>
          )}

          {/* Forgot Password View */}
          {view === 'forgot' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setView('signin'); clearError(); }}
                  className="text-xs text-[var(--text3)] hover:text-[var(--text2)]"
                >
                  {t('common.back')}
                </button>
                <span className="text-[var(--text3)]">/</span>
                <span className="text-xs text-[var(--text2)]">{t('auth.forgotPassword')}</span>
              </div>

              <h2 className="text-lg font-semibold text-[var(--text)] mb-2">{t('auth.resetPassword')}</h2>
              <p className="text-xs text-[var(--text3)] mb-6">{t('auth.resetPasswordDesc')}</p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
                        focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
                    hover:bg-[var(--green2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? t('auth.processing') : t('auth.sendResetLink')}
                  {!isLoading && <ArrowRight size={16} />}
                </button>
              </form>
            </>
          )}

          {/* Forgot Password Sent */}
          {view === 'forgot-sent' && (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4">
                <Check size={24} className="text-[var(--green)]" />
              </div>
              <p className="text-sm text-[var(--text)]">{t('auth.resetLinkSent')}</p>
              <p className="text-xs text-[var(--text3)] mt-2">{email}</p>
              <button
                onClick={() => { setView('signin'); clearError(); }}
                className="mt-4 text-xs text-[var(--green)] hover:underline"
              >
                {t('auth.backToSignIn')}
              </button>
            </div>
          )}
        </div>

        {/* Demo mode CTA */}
        <button
          onClick={skipAuth}
          className="w-full mt-4 flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30 hover:bg-[var(--green)]/20 hover:border-[var(--green)]/50 transition-colors group"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--green)]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--green)]/20 group-hover:bg-[var(--green)]/30 transition-colors">
              <Check size={12} className="text-[var(--green)]" />
            </span>
            {t('auth.exploreDemo')}
            <ArrowRight size={14} className="text-[var(--green)]" />
          </span>
          <span className="text-xs text-[var(--text3)]">
            {t('auth.exploreDemoDesc')}
          </span>
        </button>

        {/* Sign up link */}
        <p className="text-center text-sm text-[var(--text3)] mt-4">
          {t('auth.noAccount')}{' '}
          <Link to="/signup" className="text-[var(--green)] hover:text-[var(--green2)] font-medium">
            {t('auth.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
