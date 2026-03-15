import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { Bug, Mail, Lock, ArrowRight, Check } from 'lucide-react';

type Tab = 'magic' | 'password';

export default function LoginPage() {
  const { session, profile, signInWithMagicLink, signInWithPassword, isLoading, error, clearError } =
    useAuthStore();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Redirect if already logged in
  if (session && profile) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
    } catch {
      // error is set in store
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await signInWithPassword(email, password);
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
          <h2 className="text-lg font-semibold text-[var(--text)] mb-6">{t('auth.signIn')}</h2>

          {/* Tabs */}
          <div className="flex rounded-lg bg-[var(--bg)] p-1 mb-6">
            <button
              onClick={() => { setTab('magic'); clearError(); }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                tab === 'magic'
                  ? 'bg-[var(--surface)] text-[var(--green)] shadow-sm'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {t('auth.magicLinkTab')}
            </button>
            <button
              onClick={() => { setTab('password'); clearError(); }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                tab === 'password'
                  ? 'bg-[var(--surface)] text-[var(--green)] shadow-sm'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {t('auth.passwordTab')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Magic Link Form */}
          {tab === 'magic' && (
            <>
              {magicLinkSent ? (
                <div className="text-center py-6">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4">
                    <Check size={24} className="text-[var(--green)]" />
                  </div>
                  <p className="text-sm text-[var(--text)]">{t('auth.magicLinkSent')}</p>
                  <p className="text-xs text-[var(--text3)] mt-2">{email}</p>
                  <button
                    onClick={() => setMagicLinkSent(false)}
                    className="mt-4 text-xs text-[var(--green)] hover:underline"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
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
                    {isLoading ? t('auth.processing') : t('auth.magicLink')}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                  <p className="text-xs text-[var(--text3)] text-center">
                    Recommended for forest owners
                  </p>
                </form>
              )}
            </>
          )}

          {/* Password Form */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
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
              <p className="text-xs text-[var(--text3)] text-center">
                For pilots and inspectors
              </p>
            </form>
          )}
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-[var(--text3)] mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[var(--green)] hover:text-[var(--green2)] font-medium">
            {t('auth.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
