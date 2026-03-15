import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { Bug, Mail, Lock, User, ArrowRight, TreePine, Plane, ClipboardCheck, Check } from 'lucide-react';

const ROLES: { value: UserRole; icon: typeof TreePine; labelKey: string; descKey: string }[] = [
  { value: 'owner', icon: TreePine, labelKey: 'auth.roleOwner', descKey: 'auth.roleOwnerDesc' },
  { value: 'pilot', icon: Plane, labelKey: 'auth.rolePilot', descKey: 'auth.rolePilotDesc' },
  { value: 'inspector', icon: ClipboardCheck, labelKey: 'auth.roleInspector', descKey: 'auth.roleInspectorDesc' },
];

export default function SignupPage() {
  const { session, profile, signUp, isLoading, error, clearError } = useAuthStore();
  const { t } = useTranslation();
  const [step, setStep] = useState<'role' | 'details' | 'done'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  if (session && profile) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setPasswordError('');

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (!selectedRole) return;

    try {
      await signUp(email, password, selectedRole, fullName);
      setStep('done');
    } catch {
      // error is set in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[var(--green)]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--green)]/10 border border-[var(--border2)] mb-4 glow-green">
            <Bug size={28} className="text-[var(--green)]" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text)]">BeetleSense</h1>
          <p className="text-sm text-[var(--text3)] mt-1">{t('auth.signUp')}</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] p-6 sm:p-8" style={{ background: 'var(--bg2)' }}>
          {/* Step: Role Selection */}
          {step === 'role' && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)] mb-2">{t('auth.selectRole')}</h2>
              <p className="text-xs text-[var(--text3)] mb-6">Choose your primary role on the platform</p>

              <div className="space-y-3">
                {ROLES.map(({ value, icon: Icon, labelKey, descKey }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedRole(value)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                      selectedRole === value
                        ? 'border-[var(--green)] bg-[var(--green)]/5'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border2)]'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedRole === value
                          ? 'bg-[var(--green)]/15 text-[var(--green)]'
                          : 'bg-[var(--bg3)] text-[var(--text3)]'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${selectedRole === value ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                        {t(labelKey)}
                      </p>
                      <p className="text-xs text-[var(--text3)] mt-0.5">{t(descKey)}</p>
                    </div>
                    {selectedRole === value && (
                      <Check size={18} className="text-[var(--green)] flex-shrink-0 mt-1" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => selectedRole && setStep('details')}
                disabled={!selectedRole}
                className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
                  hover:bg-[var(--green2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {t('common.next')}
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step: Account Details */}
          {step === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setStep('role')}
                  className="text-xs text-[var(--text3)] hover:text-[var(--text2)]"
                >
                  {t('common.back')}
                </button>
                <span className="text-[var(--text3)]">/</span>
                <span className="text-xs text-[var(--text2)]">{t('auth.signUp')}</span>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">{t('auth.fullName')}</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Anna Lindgren"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
                      focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">{t('auth.email')}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="anna@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
                      focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">{t('auth.password')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
                      focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
                      focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
                  />
                </div>
                {passwordError && <p className="mt-1 text-xs text-red-400">{passwordError}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
                  hover:bg-[var(--green2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? t('auth.processing') : t('auth.signUp')}
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4">
                <Check size={24} className="text-[var(--green)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Account created</h2>
              <p className="text-sm text-[var(--text2)]">{t('auth.accountCreated')}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg bg-[var(--green)]/10 text-[var(--green)] border border-[var(--border2)] text-sm font-medium hover:bg-[var(--green)]/15 transition-colors"
              >
                {t('auth.signIn')}
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-[var(--text3)] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--green)] hover:text-[var(--green2)] font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
