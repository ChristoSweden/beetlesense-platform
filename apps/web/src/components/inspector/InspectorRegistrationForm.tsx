import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Check, Clock, Loader2, Shield, MapPin, Briefcase } from 'lucide-react';

// ─── Constants ───

const SPECIALIZATIONS = [
  'Timber Valuation',
  'Pest Assessment',
  'Biodiversity',
  'Carbon Accounting',
  'Insurance',
  'Forest Management Planning',
  'Environmental Impact',
];

const SWEDISH_COUNTIES = [
  'Blekinge', 'Dalarna', 'Gotland', 'Gävleborg', 'Halland',
  'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten',
  'Skåne', 'Stockholm', 'Södermanland', 'Uppsala', 'Värmland',
  'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland',
  'Örebro', 'Östergötland',
];

// ─── Component ───

export function InspectorRegistrationForm() {
  const { profile } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [company, setCompany] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field-level validation errors
  const [certNumberError, setCertNumberError] = useState<string | null>(null);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [certNumberTouched, setCertNumberTouched] = useState(false);

  const validateCertNumber = (val: string) => {
    if (!val.trim()) return 'Certification number is required';
    if (val.trim().length < 5) return 'Certification number must be at least 5 characters';
    return null;
  };

  const handleCertNumberBlur = () => {
    setCertNumberTouched(true);
    setCertNumberError(validateCertNumber(certNumber));
  };

  const toggleSpecialization = (s: string) => {
    setSpecializations((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const toggleRegion = (r: string) => {
    const newRegions = regions.includes(r) ? regions.filter((x) => x !== r) : [...regions, r];
    setRegions(newRegions);
    if (newRegions.length > 0) setRegionsError(null);
  };

  const certErr = certNumberTouched ? validateCertNumber(certNumber) : null;
  const canSubmit =
    fullName &&
    !validateCertNumber(certNumber) &&
    specializations.length > 0 &&
    regions.length > 0;

  const handleSubmit = async () => {
    // Trigger field-level validation on submit
    setCertNumberTouched(true);
    setCertNumberError(validateCertNumber(certNumber));
    if (regions.length === 0) setRegionsError('Please select at least one region');

    if (!profile || !canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const { error: dbError } = await supabase.from('inspector_profiles').insert({
        user_id: profile.id,
        full_name: fullName,
        company,
        certification_number: certNumber,
        specializations,
        regions_served: regions,
        status: 'pending',
      });

      if (dbError) throw dbError;

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/20 flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-[var(--amber)]" />
          </div>
          <h2 className="text-lg font-serif font-bold text-[var(--text)] mb-2">
            Registration Submitted
          </h2>
          <p className="text-sm text-[var(--text2)] mb-1">
            Your inspector registration is pending review.
          </p>
          <p className="text-xs text-[var(--text3)]">
            We will notify you once your account has been approved. This typically takes 1-2 business days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center mx-auto mb-3">
          <Shield size={24} className="text-[var(--green)]" />
        </div>
        <h1 className="text-xl font-serif font-bold text-[var(--text)]">Inspector Registration</h1>
        <p className="text-xs text-[var(--text3)] mt-1">
          Register as a forest inspector to provide valuation reports and assessments.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 space-y-5">
        {/* ─── Personal ─── */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider flex items-center gap-2">
            <Briefcase size={12} className="text-[var(--green)]" />
            Professional Details
          </h3>

          <label className="block">
            <span className="text-xs font-medium text-[var(--text2)] mb-1 block">Full Name *</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Anna Lindberg"
              className="input-field"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-[var(--text2)] mb-1 block">Company</span>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Skogskonsult AB"
              className="input-field"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-[var(--text2)] mb-1 block">
              Certification Number *
            </span>
            <input
              type="text"
              value={certNumber}
              onChange={(e) => {
                setCertNumber(e.target.value);
                if (certNumberTouched) setCertNumberError(validateCertNumber(e.target.value));
              }}
              onBlur={handleCertNumberBlur}
              placeholder="CERT-XXXX-XXXX"
              className={`input-field ${certErr ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {certErr && (
              <p className="text-red-600 text-sm mt-1">{certErr}</p>
            )}
          </label>
        </div>

        {/* ─── Specializations ─── */}
        <div>
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 flex items-center gap-2">
            <Shield size={12} className="text-[var(--green)]" />
            Specializations *
          </h3>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((s) => {
              const isSelected = specializations.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSpecialization(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-[var(--green)]/15 border-[var(--green)]/40 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)] hover:border-[var(--text3)]'
                  }`}
                >
                  {isSelected && <Check size={10} className="inline mr-1" />}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Regions ─── */}
        <div>
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 flex items-center gap-2">
            <MapPin size={12} className="text-[var(--green)]" />
            Regions Served *
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {SWEDISH_COUNTIES.map((r) => {
              const isSelected = regions.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleRegion(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                    isSelected
                      ? 'bg-[var(--green)]/15 border-[var(--green)]/40 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)] hover:border-[var(--text3)]'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          {regionsError && (
            <p className="text-red-600 text-sm mt-1">{regionsError}</p>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* ─── Submit ─── */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <Check size={16} />
              Complete Registration
            </>
          )}
        </button>

        <p className="text-[10px] text-[var(--text3)] text-center">
          Your registration will be reviewed before activation.
        </p>
      </div>
    </div>
  );
}
