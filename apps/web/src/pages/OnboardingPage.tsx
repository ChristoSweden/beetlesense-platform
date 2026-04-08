import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bug,
  ArrowRight,
  ArrowLeft,
  Search,
  TreePine,
  Loader2,
  type User,
  Plane,
  ClipboardCheck,
  Check,
  ChevronRight,
  Sparkles,
  PartyPopper,
  MapPin,
  SkipForward,
} from 'lucide-react';
import { ProgressLoader } from '@/components/onboarding/ProgressLoader';
import { ForestAtAGlance } from '@/components/onboarding/ForestAtAGlance';
import {
  isValidFastighetsId,
  loadParcelWithProgress,
  type LoadingStep,
  type OnboardingParcelData,
} from '@/services/fastighetsLookup';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/components/common/Toast';
import { trackOnboardingCompleted } from '@/lib/posthog';

// ─── Types ───────────────────────────────────────────────────────────────────

type OnboardingStep = 'welcome' | 'register' | 'firstwin';

interface WelcomeData {
  role: UserRole | null;
  name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEP_ORDER: OnboardingStep[] = ['welcome', 'register', 'firstwin'];

const ROLE_OPTIONS: { role: UserRole; icon: typeof User; labelKey: string; descKey: string }[] = [
  {
    role: 'owner',
    icon: TreePine,
    labelKey: 'onboarding.roleOwner',
    descKey: 'onboarding.roleOwnerDesc',
  },
  {
    role: 'pilot',
    icon: Plane,
    labelKey: 'onboarding.rolePilot',
    descKey: 'onboarding.rolePilotDesc',
  },
  {
    role: 'inspector',
    icon: ClipboardCheck,
    labelKey: 'onboarding.roleInspector',
    descKey: 'onboarding.roleInspectorDesc',
  },
];

const EXAMPLE_IDS = ['Kronoberg Vaxjo 1:23', 'Jonkoping Varnamo 5:12'];

// ─── Error code helper ───────────────────────────────────────────────────────

let errorCounter = 0;
function makeErrorCode(): string {
  errorCounter += 1;
  return `OB-${Date.now().toString(36).slice(-4).toUpperCase()}-${errorCounter}`;
}

// ─── Confetti animation (CSS keyframes injected once) ────────────────────────

const CONFETTI_INJECTED = { current: false };

function injectConfettiStyles() {
  if (CONFETTI_INJECTED.current) return;
  CONFETTI_INJECTED.current = true;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes ob-confetti-fall {
      0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
    .ob-confetti-piece {
      position: fixed;
      top: 0;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      animation: ob-confetti-fall var(--dur) ease-in forwards;
      animation-delay: var(--delay);
      z-index: 50;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function ConfettiEffect() {
  const pieces = useMemo(() => {
    injectConfettiStyles();
    const colors = ['#4ade80', '#86efac', '#fbbf24', '#22d3ee', '#a78bfa', '#f472b6'];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[i % colors.length],
      dur: `${1.5 + Math.random() * 2}s`,
      delay: `${Math.random() * 0.8}s`,
      size: `${6 + Math.random() * 6}px`,
    }));
  }, []);

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="ob-confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            '--dur': p.dur,
            '--delay': p.delay,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function StepSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-6 w-48 mx-auto rounded bg-[var(--bg3)]" />
      <div className="h-4 w-64 mx-auto rounded bg-[var(--bg3)]" />
      <div className="space-y-3">
        <div className="h-16 rounded-xl bg-[var(--bg3)]" />
        <div className="h-16 rounded-xl bg-[var(--bg3)]" />
        <div className="h-16 rounded-xl bg-[var(--bg3)]" />
      </div>
      <div className="h-12 rounded-xl bg-[var(--bg3)]" />
    </div>
  );
}

// ─── Progress stepper ────────────────────────────────────────────────────────

function ProgressStepper({ currentStep }: { currentStep: OnboardingStep }) {
  const { t } = useTranslation();
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  const labels = [
    t('onboarding.stepWelcome', { defaultValue: 'Welcome' }),
    t('onboarding.stepRegister', { defaultValue: 'Register' }),
    t('onboarding.stepFirstWin', { defaultValue: 'Your Forest' }),
  ];

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {STEP_ORDER.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-1 sm:gap-2">
            {idx > 0 && (
              <div
                className={`w-6 sm:w-10 h-px transition-colors duration-300 ${
                  isCompleted ? 'bg-[var(--green)]' : 'bg-[var(--border)]'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[var(--green)] text-[var(--bg)]'
                    : isCurrent
                      ? 'bg-[var(--green)]/15 border-2 border-[var(--green)] text-[var(--green)]'
                      : 'bg-[var(--bg3)] border border-[var(--border)] text-[var(--text3)]'
                }`}
              >
                {isCompleted ? <Check size={14} /> : idx + 1}
              </div>
              <span
                className={`hidden sm:block text-xs transition-colors duration-300 ${
                  isCurrent
                    ? 'text-[var(--green)] font-medium'
                    : isCompleted
                      ? 'text-[var(--text2)]'
                      : 'text-[var(--text3)]'
                }`}
              >
                {labels[idx]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, user } = useAuthStore();

  // ── Core state ──
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // ── Step 1: Welcome ──
  const [welcomeData, setWelcomeData] = useState<WelcomeData>({
    role: profile?.role ?? null,
    name: profile?.full_name ?? '',
  });

  // ── Step 2: Register ──
  const [fastighetsId, setFastighetsId] = useState('');
  const [registerSubStep, setRegisterSubStep] = useState<'input' | 'loading' | 'done'>('input');
  const [completedSteps, setCompletedSteps] = useState<LoadingStep[]>([]);
  const [parcelData, setParcelData] = useState<OnboardingParcelData | null>(null);

  // ── Step 3: First Win ──
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Shared ──
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const onboardingStartedAt = useRef<number>(Date.now());

  // ── Initialization: check if user already has parcels ──
  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!user || !isSupabaseConfigured || user.id === 'demo-user') {
        if (!cancelled) setIsInitializing(false);
        return;
      }

      try {
        const { count } = await supabase
          .from('parcels')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        if (!cancelled && count && count > 0) {
          navigate('/owner/dashboard', { replace: true });
          return;
        }
      } catch {
        // Non-blocking — continue with onboarding
      }

      if (!cancelled) setIsInitializing(false);
    }

    check();
    return () => { cancelled = true; };
  }, [user, navigate]);

  // Pre-fill from profile when available
  useEffect(() => {
    if (profile) {
      setWelcomeData((prev) => ({
        role: prev.role ?? profile.role ?? null,
        name: prev.name || profile.full_name || '',
      }));
    }
  }, [profile]);

  // ── Step transitions ──
  const goToStep = useCallback((next: OnboardingStep) => {
    setIsTransitioning(true);
    setError(null);

    // Wait for exit animation, then switch
    setTimeout(() => {
      setStep(next);
      setIsTransitioning(false);
      // Scroll to top on mobile
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 250);
  }, []);

  // ── Step 1 handlers ──
  const handleWelcomeNext = useCallback(() => {
    if (!welcomeData.role) {
      setError({
        message: t('onboarding.selectRoleError', { defaultValue: 'Please select your role to continue.' }),
        code: makeErrorCode(),
      });
      return;
    }
    if (!welcomeData.name.trim()) {
      setError({
        message: t('onboarding.enterNameError', { defaultValue: 'Please enter your name.' }),
        code: makeErrorCode(),
      });
      return;
    }
    goToStep('register');
  }, [welcomeData, goToStep, t]);

  const handleWelcomeSkip = useCallback(() => {
    // Default to owner role if skipping
    setWelcomeData((prev) => ({
      role: prev.role || 'owner',
      name: prev.name || 'Forest Friend',
    }));
    goToStep('register');
  }, [goToStep]);

  // ── Step 2 handlers ──
  const handleParcelSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!isValidFastighetsId(fastighetsId)) {
        setError({
          message: t('onboarding.invalidFormat', {
            defaultValue: 'Invalid format. Example: "Kronoberg Vaxjo 1:23"',
          }),
          code: makeErrorCode(),
        });
        return;
      }

      setRegisterSubStep('loading');
      setCompletedSteps([]);

      try {
        const result = await loadParcelWithProgress(fastighetsId, (loadingStep) => {
          setCompletedSteps((prev) => [...prev, loadingStep]);
        });
        setParcelData(result);
        setRegisterSubStep('done');

        // Brief pause then advance to celebration
        setTimeout(() => goToStep('firstwin'), 600);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError({ message: msg, code: makeErrorCode() });
        setRegisterSubStep('input');
      }
    },
    [fastighetsId, goToStep, t],
  );

  const handleRegisterSkip = useCallback(() => {
    // Skip parcel registration — go to dashboard directly
    if (user && user.id !== 'demo-user') {
      navigate('/owner/dashboard');
    } else {
      navigate('/signup');
    }
  }, [user, navigate]);

  // ── Step 3 handlers ──
  // Show confetti when entering first win
  useEffect(() => {
    if (step === 'firstwin') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleConfirmParcel = useCallback(async () => {
    if (!parcelData || !profile || !user) return;
    if (!isSupabaseConfigured || user.id === 'demo-user') {
      toast(
        t('onboarding.welcomeSuccess', { defaultValue: 'Welcome to BeetleSense!' }),
        'success',
      );
      trackOnboardingCompleted(Date.now() - onboardingStartedAt.current);
      navigate('/owner/dashboard');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { lookup, analysis } = parcelData;

      const { data: newParcel, error: insertError } = await supabase
        .from('parcels')
        .insert({
          owner_id: user.id,
          organization_id: profile.organization_id,
          name: lookup.tract
            ? `${lookup.tract} ${lookup.block}:${lookup.unit}`
            : lookup.fastighetId,
          fastighets_id: lookup.fastighetId,
          boundary_geojson: lookup.boundaryGeoJSON,
          area_ha: lookup.areaHa,
          county: lookup.county,
          municipality: lookup.municipality,
          status: 'active',
          metadata: {
            source: 'onboarding',
            species_mix: analysis.speciesMix,
            ndvi: analysis.ndvi,
            risk_level: analysis.riskLevel,
            registered_at: new Date().toISOString(),
          },
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      toast(
        t('onboarding.parcelRegistered', { defaultValue: 'Parcel registered! Welcome to BeetleSense.' }),
        'success',
      );
      trackOnboardingCompleted(Date.now() - onboardingStartedAt.current);
      navigate(`/owner/parcels/${newParcel.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not register parcel';
      setError({ message: msg, code: makeErrorCode() });
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [parcelData, profile, user, navigate, toast, t]);

  const handleFirstWinSkip = useCallback(() => {
    if (user && user.id !== 'demo-user') {
      navigate('/owner/dashboard');
    } else {
      navigate('/signup');
    }
  }, [user, navigate]);

  // ── Computed ──
  const displayName = welcomeData.name.trim().split(' ')[0] || '';

  // ── Render ──
  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] flex flex-col">
      {/* Background ambiance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--green)]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-[var(--green)]/3 rounded-full blur-[96px]" />
      </div>

      {/* Confetti */}
      {showConfetti && <ConfettiEffect />}

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center">
            <Bug size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-sm font-serif font-bold text-[var(--text)]">BeetleSense</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {!user && (
            <>
              <Link
                to="/login"
                className="text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors"
              >
                {t('auth.signIn')}
              </Link>
              <Link
                to="/signup"
                className="px-3 sm:px-4 py-2 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/15 transition-colors"
              >
                {t('auth.signUp')}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main scrollable area */}
      <main
        ref={mainRef}
        className="relative z-10 flex-1 flex flex-col items-center px-4 pb-8 pt-2 sm:pt-4 overflow-y-auto"
      >
        <div className="w-full max-w-lg">
          {/* Progress stepper */}
          <ProgressStepper currentStep={step} />

          {/* Loading state */}
          {isInitializing ? (
            <StepSkeleton />
          ) : (
            <div
              className={`transition-all duration-250 ease-out ${
                isTransitioning
                  ? 'opacity-0 translate-y-4'
                  : 'opacity-100 translate-y-0'
              }`}
            >
              {/* ═══ STEP 1: Welcome ═══ */}
              {step === 'welcome' && (
                <div className="flex flex-col min-h-[60dvh]">
                  {/* Top section */}
                  <div className="flex-1">
                    <div className="text-center mb-6 sm:mb-8">
                      <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center mb-4 sm:mb-5">
                        <TreePine size={28} className="text-[var(--green)]" />
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text)] mb-2">
                        {t('onboarding.welcomeTitle', { defaultValue: 'Welcome to BeetleSense' })}
                      </h1>
                      <p className="text-sm text-[var(--text3)] max-w-sm mx-auto">
                        {t('onboarding.welcomeSubtitle', {
                          defaultValue: "Let's set up your account in under 2 minutes.",
                        })}
                      </p>
                    </div>

                    {/* Role selection */}
                    <div className="mb-5 sm:mb-6">
                      <label className="block text-sm font-medium text-[var(--text)] mb-3">
                        {t('onboarding.whatsYourRole', { defaultValue: "What's your role?" })}
                      </label>
                      <div className="space-y-2">
                        {ROLE_OPTIONS.map(({ role, icon: Icon, labelKey, descKey }) => {
                          const isSelected = welcomeData.role === role;
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setWelcomeData((prev) => ({ ...prev, role }));
                                setError(null);
                              }}
                              className={`w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 ease-out ${
                                isSelected
                                  ? 'border-[var(--green)] bg-[var(--green)]/8'
                                  : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]'
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                                  isSelected
                                    ? 'bg-[var(--green)]/15 text-[var(--green)]'
                                    : 'bg-[var(--bg3)] text-[var(--text3)]'
                                }`}
                              >
                                <Icon size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium transition-colors duration-200 ${
                                    isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'
                                  }`}
                                >
                                  {t(labelKey, { defaultValue: role.charAt(0).toUpperCase() + role.slice(1) })}
                                </p>
                                <p className="text-xs text-[var(--text3)] mt-0.5">
                                  {t(descKey, {
                                    defaultValue:
                                      role === 'owner'
                                        ? 'Monitor your forest health and risks'
                                        : role === 'pilot'
                                          ? 'Fly drone surveys for forest owners'
                                          : 'Inspect and verify forest conditions',
                                  })}
                                </p>
                              </div>
                              {isSelected && (
                                <Check size={18} className="text-[var(--green)] flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Name input */}
                    <div className="mb-5">
                      <label
                        htmlFor="onb-name"
                        className="block text-sm font-medium text-[var(--text)] mb-2"
                      >
                        {t('onboarding.yourName', { defaultValue: 'Your name' })}
                      </label>
                      <input
                        id="onb-name"
                        type="text"
                        value={welcomeData.name}
                        onChange={(e) => {
                          setWelcomeData((prev) => ({ ...prev, name: e.target.value }));
                          setError(null);
                        }}
                        placeholder={t('onboarding.namePlaceholder', { defaultValue: 'e.g. Erik Svensson' })}
                        autoComplete="name"
                        className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)] focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/20 outline-none transition-all duration-200"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <ErrorAlert message={error.message} code={error.code} onDismiss={() => setError(null)} />
                    )}
                  </div>

                  {/* Bottom actions — pinned to bottom half of screen */}
                  <div className="mt-auto pt-4 space-y-3">
                    <button
                      type="button"
                      onClick={handleWelcomeNext}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:brightness-110 transition-all duration-200"
                    >
                      {t('onboarding.continue', { defaultValue: 'Continue' })}
                      <ArrowRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleWelcomeSkip}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--text3)] hover:text-[var(--text2)] transition-colors duration-200"
                    >
                      <SkipForward size={14} />
                      {t('onboarding.skipForNow', { defaultValue: 'Skip for now' })}
                    </button>
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: Register Parcel ═══ */}
              {step === 'register' && (
                <div className="flex flex-col min-h-[60dvh]">
                  <div className="flex-1">
                    {/* Sub-step: Input */}
                    {registerSubStep === 'input' && (
                      <>
                        <div className="text-center mb-6">
                          <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center mb-4">
                            <MapPin size={26} className="text-[var(--green)]" />
                          </div>
                          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text)] mb-2">
                            {displayName
                              ? t('onboarding.findForestPersonal', {
                                  defaultValue: `Find your forest, ${displayName}`,
                                  name: displayName,
                                })
                              : t('onboarding.title')}
                          </h2>
                          <p className="text-sm text-[var(--text3)] max-w-sm mx-auto">
                            {t('onboarding.registerSubtitle', {
                              defaultValue:
                                'Enter your Swedish property ID to instantly see your forest on the map with health data.',
                            })}
                          </p>
                        </div>

                        <div
                          className="rounded-2xl border border-[var(--border)] p-5 sm:p-6"
                          style={{ background: 'var(--bg2)' }}
                        >
                          <form onSubmit={handleParcelSubmit} noValidate>
                            <label
                              htmlFor="fastighets-id"
                              className="block text-sm font-medium text-[var(--text)] mb-2"
                            >
                              {t('onboarding.enterPropertyId', {
                                defaultValue: 'Fastighets-ID (Property ID)',
                              })}
                            </label>

                            <div className="relative mb-2">
                              <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text3)]"
                                aria-hidden="true"
                              />
                              <input
                                id="fastighets-id"
                                type="text"
                                value={fastighetsId}
                                onChange={(e) => {
                                  setFastighetsId(e.target.value);
                                  setError(null);
                                }}
                                placeholder="Kronoberg Vaxjo 1:23"
                                autoFocus
                                autoComplete="off"
                                aria-required="true"
                                aria-invalid={error ? 'true' : undefined}
                                aria-describedby={error ? 'fastighets-error' : 'fastighets-hint'}
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)] focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/20 outline-none transition-all duration-200 font-mono"
                              />
                            </div>

                            <p id="fastighets-hint" className="text-xs text-[var(--text3)] mb-4">
                              {t('onboarding.formatHint', {
                                defaultValue:
                                  'Format: County Municipality Block:Unit (e.g. "Kronoberg Vaxjo 1:23")',
                              })}
                            </p>

                            {error && (
                              <ErrorAlert
                                message={error.message}
                                code={error.code}
                                onDismiss={() => setError(null)}
                                id="fastighets-error"
                              />
                            )}

                            <button
                              type="submit"
                              disabled={!fastighetsId.trim()}
                              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                            >
                              {t('onboarding.findMyForest', { defaultValue: 'Find My Forest' })}
                              <ArrowRight size={16} />
                            </button>
                          </form>

                          {/* Example IDs */}
                          <div className="mt-4 pt-4 border-t border-[var(--border)]">
                            <p className="text-xs text-[var(--text3)] mb-2">
                              {t('onboarding.tryExample', { defaultValue: 'Try an example:' })}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {EXAMPLE_IDS.map((id) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => {
                                    setFastighetsId(id);
                                    setError(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[var(--bg3)] border border-[var(--border)] text-xs text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--green)] transition-colors duration-200 font-mono"
                                >
                                  {id}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Sub-step: Loading */}
                    {registerSubStep === 'loading' && (
                      <div
                        className="rounded-2xl border border-[var(--border)] p-5 sm:p-8"
                        style={{ background: 'var(--bg2)' }}
                      >
                        <ProgressLoader completedSteps={completedSteps} error={error?.message} />
                      </div>
                    )}

                    {/* Sub-step: Done (brief flash before advancing) */}
                    {registerSubStep === 'done' && (
                      <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-[var(--green)]/15 flex items-center justify-center">
                            <Check size={28} className="text-[var(--green)]" />
                          </div>
                          <p className="text-sm font-medium text-[var(--green)]">
                            {t('onboarding.forestFound', { defaultValue: 'Forest found!' })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom actions */}
                  <div className="mt-auto pt-4 space-y-3">
                    {registerSubStep === 'input' && (
                      <>
                        <button
                          type="button"
                          onClick={() => goToStep('welcome')}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] text-xs text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)] transition-colors duration-200"
                        >
                          <ArrowLeft size={14} />
                          {t('common.back', { defaultValue: 'Back' })}
                        </button>
                        <button
                          type="button"
                          onClick={handleRegisterSkip}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--text3)] hover:text-[var(--text2)] transition-colors duration-200"
                        >
                          <SkipForward size={14} />
                          {t('onboarding.skipForNow', { defaultValue: 'Skip for now' })}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ STEP 3: First Win ═══ */}
              {step === 'firstwin' && parcelData && (
                <div className="flex flex-col">
                  {/* Celebration header */}
                  <div className="text-center mb-5">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--green)]/15 border border-[var(--green)]/30 flex items-center justify-center mb-4 animate-bounce">
                      <PartyPopper size={26} className="text-[var(--green)]" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text)] mb-1">
                      {displayName
                        ? t('onboarding.congratsPersonal', {
                            defaultValue: `Here's your forest, ${displayName}!`,
                            name: displayName,
                          })
                        : t('onboarding.congrats', { defaultValue: "Here's your forest!" })}
                    </h2>
                    <p className="text-sm text-[var(--text3)]">
                      {t('onboarding.firstWinSubtitle', {
                        defaultValue: 'Your parcel is ready with live satellite data.',
                      })}
                    </p>
                  </div>

                  {/* Forest at a glance (includes map + stats) */}
                  <ForestAtAGlance data={parcelData} animate />

                  {/* CTA area — in the bottom half */}
                  <div className="mt-6 space-y-3">
                    {user && user.id !== 'demo-user' ? (
                      <button
                        type="button"
                        onClick={handleConfirmParcel}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-wait transition-all duration-200"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {t('onboarding.saving', { defaultValue: 'Saving...' })}
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            {t('onboarding.goToDashboard', {
                              defaultValue: 'Save & Go to Dashboard',
                            })}
                            <ChevronRight size={16} />
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        to="/signup"
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:brightness-110 transition-all duration-200"
                      >
                        {t('onboarding.createFreeAccount', {
                          defaultValue: 'Create Free Account',
                        })}
                        <ArrowRight size={16} />
                      </Link>
                    )}

                    {error && (
                      <ErrorAlert
                        message={error.message}
                        code={error.code}
                        onDismiss={() => setError(null)}
                      />
                    )}

                    <button
                      type="button"
                      onClick={handleFirstWinSkip}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--text3)] hover:text-[var(--text2)] transition-colors duration-200"
                    >
                      <SkipForward size={14} />
                      {t('onboarding.skipToDashboard', {
                        defaultValue: 'Skip to dashboard',
                      })}
                    </button>
                  </div>
                </div>
              )}

              {/* First win but no parcel data (edge case — user somehow got here) */}
              {step === 'firstwin' && !parcelData && (
                <EmptyState
                  message={t('onboarding.noParcelData', {
                    defaultValue: 'No parcel data available. Please go back and register a parcel.',
                  })}
                  onAction={() => goToStep('register')}
                  actionLabel={t('onboarding.goBack', { defaultValue: 'Go Back' })}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-3 sm:py-4 text-xs text-[var(--text3)]">
        <p>BeetleSense &middot; {t('common.tagline', { defaultValue: 'AI-powered forest intelligence' })}</p>
      </footer>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function ErrorAlert({
  message,
  code,
  onDismiss,
  id,
}: {
  message: string;
  code: string;
  onDismiss: () => void;
  id?: string;
}) {
  return (
    <div
      id={id}
      role="alert"
      className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3"
    >
      <div className="flex-1">
        <p className="text-sm text-red-400">{message}</p>
        <p className="text-[10px] text-red-400/60 font-mono mt-1">Error: {code}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-400/60 hover:text-red-400 transition-colors p-0.5"
        aria-label="Dismiss error"
      >
        <span className="text-xs">&times;</span>
      </button>
    </div>
  );
}

function EmptyState({
  message,
  onAction,
  actionLabel,
}: {
  message: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center mb-4">
        <TreePine size={28} className="text-[var(--text3)]" />
      </div>
      <p className="text-sm text-[var(--text3)] mb-6 max-w-xs">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--green)]/10 border border-[var(--border2)] text-sm font-medium text-[var(--green)] hover:bg-[var(--green)]/15 transition-colors duration-200"
      >
        <ArrowLeft size={14} />
        {actionLabel}
      </button>
    </div>
  );
}
