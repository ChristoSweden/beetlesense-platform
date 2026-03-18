/**
 * RequestQuoteModal — Request a quote from a professional, pre-filled with
 * the owner's parcel information.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, TreePine, Loader2, CheckCircle } from 'lucide-react';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Professional, ProfessionalCategory } from '@/hooks/useProfessionals';

interface RequestQuoteModalProps {
  professional: Professional;
  onClose: () => void;
}

const SERVICE_TYPE_I18N: Record<ProfessionalCategory, string> = {
  forest_inspector: 'professionals.categories.forestInspector',
  logging_contractor: 'professionals.categories.loggingContractor',
  planting_service: 'professionals.categories.plantingService',
  drone_pilot: 'professionals.categories.dronePilot',
  forest_advisor: 'professionals.categories.forestAdvisor',
  transport_company: 'professionals.categories.transportCompany',
};

interface ParcelOption {
  id: string;
  name: string;
  area: number;
  municipality: string;
  species: string;
}

export function RequestQuoteModal({ professional, onClose }: RequestQuoteModalProps) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [parcels, setParcels] = useState<ParcelOption[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [serviceType, setServiceType] = useState<ProfessionalCategory>(
    professional.categories[0] ?? 'forest_inspector',
  );
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load parcels for the dropdown
  useEffect(() => {
    if (isDemo() || !isSupabaseConfigured) {
      const mapped: ParcelOption[] = DEMO_PARCELS.map((p) => ({
        id: p.id,
        name: p.name,
        area: p.area_hectares,
        municipality: p.municipality,
        species: p.species_mix.map((s) => `${s.species} ${s.pct}%`).join(', '),
      }));
      setParcels(mapped);
      if (mapped.length > 0) setSelectedParcelId(mapped[0].id);
    } else {
      supabase
        .from('parcels')
        .select('id, name, area_ha, municipality')
        .order('name')
        .then(({ data }) => {
          if (data) {
            const mapped = data.map((row) => ({
              id: row.id,
              name: row.name,
              area: row.area_ha,
              municipality: row.municipality ?? '',
              species: '',
            }));
            setParcels(mapped);
            if (mapped.length > 0) setSelectedParcelId(mapped[0].id);
          }
        });
    }
  }, []);

  const selectedParcel = parcels.find((p) => p.id === selectedParcelId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      if (isDemo() || !isSupabaseConfigured) {
        // Simulate sending
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setSent(true);
      } else {
        // Call edge function
        const { error: fnError } = await supabase.functions.invoke('request-quote', {
          body: {
            professional_id: professional.id,
            professional_email: professional.email,
            parcel_id: selectedParcelId,
            service_type: serviceType,
            preferred_date: preferredDate || null,
            notes: notes.trim() || null,
            requester_name: profile?.full_name ?? profile?.email ?? '',
            requester_email: profile?.email ?? '',
          },
        });

        if (fnError) throw new Error(fnError.message);
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send quote request');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('professionals.requestQuote')}
    >
      <div
        className="relative w-full max-w-lg mx-4 my-8 bg-[var(--bg2)] border border-[var(--border)] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-serif font-bold text-[var(--text)]">
            {t('professionals.requestQuote')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {sent ? (
          /* Success state */
          <div className="p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-[var(--green)] mb-4" />
            <h3 className="text-sm font-medium text-[var(--text)] mb-2">
              {t('professionals.quote.sent')}
            </h3>
            <p className="text-xs text-[var(--text3)] mb-4">
              {t('professionals.quote.sentDesc', { name: professional.name })}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* To */}
            <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">
                {t('professionals.quote.to')}
              </p>
              <p className="text-sm font-medium text-[var(--text)]">
                {professional.name} &mdash; {professional.company}
              </p>
            </div>

            {/* Parcel selection */}
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                <TreePine size={12} className="inline mr-1" />
                {t('professionals.quote.parcel')}
              </label>
              <select
                value={selectedParcelId}
                onChange={(e) => setSelectedParcelId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)]
                  focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
              >
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.area.toFixed(1)} ha, {p.municipality}
                  </option>
                ))}
              </select>
              {selectedParcel?.species && (
                <p className="text-[10px] text-[var(--text3)] mt-1">
                  {selectedParcel.species}
                </p>
              )}
            </div>

            {/* Service type */}
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                {t('professionals.quote.serviceType')}
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ProfessionalCategory)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)]
                  focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
              >
                {professional.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(SERVICE_TYPE_I18N[cat])}
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred date */}
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                {t('professionals.quote.preferredDate')}
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)]
                  focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                {t('professionals.quote.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t('professionals.quote.notesPlaceholder')}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
                  focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={sending || !selectedParcelId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
                hover:bg-[var(--green2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('professionals.quote.sending')}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {t('professionals.quote.send')}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
