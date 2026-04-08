/**
 * InsuranceDataConsent — Toggle for insurance partner data sharing.
 *
 * When enabled, certified insurance partners can query the owner's
 * forest health data via the BeetleSense Insurance Data API for
 * risk assessment and underwriting purposes.
 */

import { useState, useEffect } from 'react';
import { Shield, Check, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isDemo } from '@/lib/demoData';

export function InsuranceDataConsent() {
  const { profile } = useAuthStore();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load current consent value
  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    if (isDemo()) {
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('insurance_data_consent')
      .eq('id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEnabled(!!(data as { insurance_data_consent: boolean }).insurance_data_consent);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [profile?.id]);

  const handleToggle = async () => {
    if (saving) return;

    const next = !enabled;

    // Demo: just update local state
    if (isDemo()) {
      setEnabled(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ insurance_data_consent: next })
      .eq('id', profile!.id);

    setSaving(false);

    if (!error) {
      setEnabled(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-[var(--green)]" />
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            Insurance Partnership
          </h3>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-[var(--text)] mb-1">
              Allow certified insurance partners to access my forest health data
            </p>
            <p className="text-[11px] text-[var(--text3)] leading-relaxed">
              When enabled, BeetleSense shares your forest health score, beetle risk level, and storm risk data with verified insurance underwriters for risk assessment and policy pricing. Data is anonymised where possible and access is logged for transparency.
            </p>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[var(--green)] hover:underline mt-2"
            >
              Privacy policy
              <ExternalLink size={10} />
            </a>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            {loading ? (
              <Loader2 size={20} className="animate-spin text-[var(--text3)]" />
            ) : (
              <button
                onClick={handleToggle}
                disabled={saving}
                role="switch"
                aria-checked={enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 disabled:opacity-60 ${
                  enabled ? 'bg-[var(--green)]' : 'bg-[var(--border2)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}

            {saving && <Loader2 size={12} className="animate-spin text-[var(--text3)]" />}
            {saved && !saving && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--green)]">
                <Check size={10} />
                Saved
              </span>
            )}
          </div>
        </div>

        {enabled && (
          <div className="mt-4 p-3 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5">
            <p className="text-[11px] text-[var(--green)]">
              Data sharing is active. Your forest health metrics are accessible to certified insurance partners. You can withdraw consent at any time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
