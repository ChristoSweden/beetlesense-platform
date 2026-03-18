import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bug, ArrowRight, Search, ArrowLeft, TreePine, Loader2 } from 'lucide-react';
import { ProgressLoader } from '@/components/onboarding/ProgressLoader';
import { ForestAtAGlance } from '@/components/onboarding/ForestAtAGlance';
import {
  isValidFastighetsId,
  loadParcelWithProgress,
  type LoadingStep,
  type OnboardingParcelData,
} from '@/services/fastighetsLookup';
import { useAuthStore } from '@/stores/authStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/components/common/Toast';

type Step = 'input' | 'loading' | 'result';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, user } = useAuthStore();

  const [step, setStep] = useState<Step>('input');
  const [fastighetsId, setFastighetsId] = useState('');
  const [completedSteps, setCompletedSteps] = useState<LoadingStep[]>([]);
  const [parcelData, setParcelData] = useState<OnboardingParcelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // If user already has parcels, skip onboarding and redirect to dashboard
  useEffect(() => {
    if (!user || !isSupabaseConfigured || user.id === 'demo-user') return;

    const checkExistingParcels = async () => {
      const { count } = await supabase
        .from('parcels')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if (count && count > 0) {
        navigate('/owner/dashboard', { replace: true });
      }
    };

    checkExistingParcels();
  }, [user, navigate]);

  // Register the parcel in Supabase and navigate to its detail page
  const handleConfirmParcel = useCallback(async () => {
    if (!parcelData || !profile || !user) return;
    if (!isSupabaseConfigured || user.id === 'demo-user') {
      // Demo mode: just navigate to dashboard
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

      toast('Skifte registrerat! Välkommen till BeetleSense.', 'success');
      navigate(`/owner/parcels/${newParcel.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunde inte registrera skiftet';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [parcelData, profile, user, navigate, toast]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!isValidFastighetsId(fastighetsId)) {
        setError(
          t('onboarding.invalidFormat', {
            defaultValue: 'Invalid format. Example: "Kronoberg Vaxjo 1:23"',
          }),
        );
        return;
      }

      // Move to loading step
      setStep('loading');
      setCompletedSteps([]);

      try {
        const result = await loadParcelWithProgress(fastighetsId, (loadingStep) => {
          setCompletedSteps((prev) => [...prev, loadingStep]);
        });
        setParcelData(result);
        // Small delay before showing result for smooth transition
        setTimeout(() => setStep('result'), 400);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setStep('input');
      }
    },
    [fastighetsId, t],
  );

  const handleReset = useCallback(() => {
    setStep('input');
    setCompletedSteps([]);
    setParcelData(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--green)]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-[var(--green)]/3 rounded-full blur-[96px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center">
            <Bug size={18} className="text-[var(--green)]" />
          </div>
          <span className="text-sm font-serif font-bold text-[var(--text)]">BeetleSense</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors"
          >
            {t('auth.signIn')}
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/15 transition-colors"
          >
            {t('auth.signUp')}
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* ─── Step 1: Input ─── */}
          {step === 'input' && (
            <div className="animate-in fade-in">
              {/* Hero */}
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center mb-5 glow-green">
                  <TreePine size={32} className="text-[var(--green)]" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text)] mb-3">
                  {t('onboarding.title')}
                </h1>
                <p className="text-sm text-[var(--text3)] max-w-sm mx-auto">
                  {t('onboarding.subtitle', {
                    defaultValue:
                      'Enter your Swedish property ID and instantly see your forest health, species composition, and risk assessment.',
                  })}
                </p>
              </div>

              {/* Input card */}
              <div
                className="rounded-2xl border border-[var(--border)] p-6 sm:p-8"
                style={{ background: 'var(--bg2)' }}
              >
                <form onSubmit={handleSubmit} noValidate>
                  <label htmlFor="fastighets-id" className="block text-sm font-medium text-[var(--text)] mb-2">
                    {t('onboarding.enterPropertyId')}
                  </label>

                  <div className="relative mb-3">
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
                      aria-required="true"
                      aria-invalid={error ? 'true' : undefined}
                      aria-describedby={error ? 'fastighets-error' : 'fastighets-hint'}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-base text-[var(--text)] placeholder-[var(--text3)]
                        focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/20 outline-none transition-all font-mono"
                    />
                  </div>

                  <p id="fastighets-hint" className="text-xs text-[var(--text3)] mb-5">
                    {t('onboarding.formatHint', {
                      defaultValue: 'Format: County Municipality Block:Unit (e.g. "Kronoberg Vaxjo 1:23")',
                    })}
                  </p>

                  {error && (
                    <div
                      id="fastighets-error"
                      role="alert"
                      className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!fastighetsId.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
                      hover:bg-[var(--green2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('onboarding.findMyForest', { defaultValue: 'Find My Forest' })}
                    <ArrowRight size={16} />
                  </button>
                </form>

                {/* Quick demo links */}
                <div className="mt-5 pt-5 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text3)] mb-3">
                    {t('onboarding.tryExample', { defaultValue: 'Try an example:' })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFastighetsId('Kronoberg Vaxjo 1:23')}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg3)] border border-[var(--border)] text-xs text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--green)] transition-colors font-mono"
                    >
                      Kronoberg Vaxjo 1:23
                    </button>
                    <button
                      onClick={() => setFastighetsId('Jonkoping Varnamo 5:12')}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg3)] border border-[var(--border)] text-xs text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--green)] transition-colors font-mono"
                    >
                      Jonkoping Varnamo 5:12
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Loading ─── */}
          {step === 'loading' && (
            <div
              className="rounded-2xl border border-[var(--border)] p-6 sm:p-8"
              style={{ background: 'var(--bg2)' }}
            >
              <ProgressLoader completedSteps={completedSteps} error={error} />
            </div>
          )}

          {/* ─── Step 3: Result ─── */}
          {step === 'result' && parcelData && (
            <div>
              <ForestAtAGlance data={parcelData} animate />

              {/* CTA */}
              <div className="mt-8 space-y-3">
                {user && user.id !== 'demo-user' ? (
                  /* Logged-in user: register parcel directly */
                  <button
                    onClick={handleConfirmParcel}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
                      hover:bg-[var(--green2)] disabled:opacity-50 disabled:cursor-wait transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Registrerar skifte…
                      </>
                    ) : (
                      <>
                        Registrera mitt skifte
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                ) : (
                  /* Not logged in: redirect to signup */
                  <Link
                    to="/signup"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
                      hover:bg-[var(--green2)] transition-colors"
                  >
                    {t('onboarding.createFreeAccount')}
                    <ArrowRight size={16} />
                  </Link>
                )}

                {error && (
                  <div
                    role="alert"
                    className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400"
                  >
                    {error}
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--text2)]
                    hover:border-[var(--border2)] hover:text-[var(--text)] transition-colors"
                >
                  <ArrowLeft size={14} />
                  {t('onboarding.tryAnother', { defaultValue: 'Prova en annan fastighet' })}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-[var(--text3)]">
        <p>
          BeetleSense &middot; {t('common.tagline')}
        </p>
      </footer>
    </div>
  );
}
