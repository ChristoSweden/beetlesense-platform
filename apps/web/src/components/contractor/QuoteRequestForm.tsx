import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, MapPin, TreePine, Mountain } from 'lucide-react';
import { DEMO_PARCELS } from '@/lib/demoData';
import type { Contractor, ServiceType } from '@/hooks/useContractors';

interface QuoteRequestFormProps {
  contractor: Contractor;
  onClose: () => void;
  onSubmit: (data: QuoteFormData) => void;
}

export interface QuoteFormData {
  contractor_id: string;
  parcel_id: string;
  service_type: ServiceType;
  preferred_start: string;
  preferred_end: string;
  volume_estimate: number;
  terrain_slope: string;
  soil_conditions: string;
  access_road: string;
  notes: string;
}

const SERVICE_OPTIONS: ServiceType[] = [
  'avverkning',
  'gallring',
  'markberedning',
  'plantering',
  'transport',
];

const SLOPE_OPTIONS = ['flat', 'gentle', 'moderate', 'steep'] as const;
const SOIL_OPTIONS = ['dry_firm', 'normal', 'moist_soft', 'wet'] as const;
const ACCESS_OPTIONS = ['good', 'limited', 'none'] as const;

export function QuoteRequestForm({ contractor, onClose, onSubmit }: QuoteRequestFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<QuoteFormData>({
    contractor_id: contractor.id,
    parcel_id: '',
    service_type: contractor.service_types[0] ?? 'avverkning',
    preferred_start: '',
    preferred_end: '',
    volume_estimate: 0,
    terrain_slope: 'gentle',
    soil_conditions: 'normal',
    access_road: 'good',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof QuoteFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div
          className="w-full max-w-md rounded-2xl border border-[var(--border)] p-8 text-center"
          style={{ background: 'var(--bg)' }}
        >
          <div className="w-14 h-14 rounded-full bg-[var(--green)]/15 flex items-center justify-center mx-auto mb-4">
            <Send size={24} className="text-[var(--green)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">
            {t('contractor.quote.sent')}
          </h2>
          <p className="text-sm text-[var(--text3)] mb-6">
            {t('contractor.quote.sentDesc', { company: contractor.company_name })}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-lg max-h-[90vh] rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col"
        style={{ background: 'var(--bg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">{t('contractor.quote.title')}</h2>
            <p className="text-xs text-[var(--text3)]">{contractor.company_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Parcel selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text)] mb-1.5">
              <TreePine size={13} className="text-[var(--green)]" />
              {t('contractor.quote.selectParcel')}
            </label>
            <select
              value={form.parcel_id}
              onChange={(e) => handleChange('parcel_id', e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
            >
              <option value="">{t('contractor.quote.chooseParcels')}</option>
              {DEMO_PARCELS.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.area_hectares} ha)</option>
              ))}
            </select>
          </div>

          {/* Service type */}
          <div>
            <label className="text-xs font-medium text-[var(--text)] mb-1.5 block">
              {t('contractor.quote.serviceType')}
            </label>
            <select
              value={form.service_type}
              onChange={(e) => handleChange('service_type', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
            >
              {SERVICE_OPTIONS.filter((s) => contractor.service_types.includes(s)).map((s) => (
                <option key={s} value={s}>{t(`contractor.serviceType.${s}`)}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text)] mb-1.5 block">
                {t('contractor.quote.preferredStart')}
              </label>
              <input
                type="date"
                value={form.preferred_start}
                onChange={(e) => handleChange('preferred_start', e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text)] mb-1.5 block">
                {t('contractor.quote.preferredEnd')}
              </label>
              <input
                type="date"
                value={form.preferred_end}
                onChange={(e) => handleChange('preferred_end', e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
              />
            </div>
          </div>

          {/* Volume estimate */}
          <div>
            <label className="text-xs font-medium text-[var(--text)] mb-1.5 block">
              {t('contractor.quote.volumeEstimate')}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={form.volume_estimate || ''}
                onChange={(e) => handleChange('volume_estimate', Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)] pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text3)] font-mono">
                m&sup3;fub
              </span>
            </div>
          </div>

          {/* Terrain notes */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-1.5 text-xs font-medium text-[var(--text)]">
              <Mountain size={13} className="text-[var(--green)]" />
              {t('contractor.quote.terrainInfo')}
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono text-[var(--text3)] mb-1 block uppercase">
                  {t('contractor.quote.slope')}
                </label>
                <select
                  value={form.terrain_slope}
                  onChange={(e) => handleChange('terrain_slope', e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                >
                  {SLOPE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{t(`contractor.quote.slopeOption.${s}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[var(--text3)] mb-1 block uppercase">
                  {t('contractor.quote.soilConditions')}
                </label>
                <select
                  value={form.soil_conditions}
                  onChange={(e) => handleChange('soil_conditions', e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                >
                  {SOIL_OPTIONS.map((s) => (
                    <option key={s} value={s}>{t(`contractor.quote.soilOption.${s}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[var(--text3)] mb-1 block uppercase">
                  {t('contractor.quote.accessRoad')}
                </label>
                <select
                  value={form.access_road}
                  onChange={(e) => handleChange('access_road', e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                >
                  {ACCESS_OPTIONS.map((a) => (
                    <option key={a} value={a}>{t(`contractor.quote.accessOption.${a}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Additional notes */}
          <div>
            <label className="text-xs font-medium text-[var(--text)] mb-1.5 block">
              {t('contractor.quote.notes')}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder={t('contractor.quote.notesPlaceholder')}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)] resize-none"
            />
          </div>

          {/* Auto-attach note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/15">
            <MapPin size={14} className="text-[var(--green)] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--text3)] leading-relaxed">
              {t('contractor.quote.autoAttach')}
            </p>
          </div>
        </form>

        {/* Submit */}
        <div className="px-5 py-4 border-t border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <button
            type="submit"
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            <Send size={15} />
            {t('contractor.quote.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
