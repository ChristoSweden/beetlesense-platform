/**
 * CreatePool — Form to create a new timber pool for collective selling.
 */

import { useState } from 'react';
import { X, Users, Sparkles } from 'lucide-react';
import type { CreatePoolForm, TimberAssortment } from '@/hooks/useGroupSelling';

interface CreatePoolProps {
  onSubmit: (form: CreatePoolForm) => Promise<void>;
  onClose: () => void;
  estimatedEligibleOwners: (region: string) => number;
}

const ASSORTMENTS: { id: TimberAssortment; label: string }[] = [
  { id: 'grantimmer', label: 'Grantimmer (spruce sawlog)' },
  { id: 'talltimmer', label: 'Talltimmer (pine sawlog)' },
  { id: 'massaved', label: 'Massaved (pulpwood)' },
  { id: 'bjorkmassa', label: 'Björkmassa (birch pulpwood)' },
  { id: 'contorta', label: 'Contorta (lodgepole pine)' },
];

const REGIONS = ['Värnamo', 'Jönköping', 'Gislaved', 'Nässjö', 'Vaggeryd', 'Tranås', 'Vetlanda'];
const QUARTERS = ['Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027'];

export function CreatePool({ onSubmit, onClose, estimatedEligibleOwners }: CreatePoolProps) {
  const [form, setForm] = useState<CreatePoolForm>({
    name: '',
    assortment: 'grantimmer',
    targetVolumeM3: 2000,
    region: 'Värnamo',
    deliveryQuarter: 'Q3 2026',
    minQuality: 'B',
    autoInviteNearby: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const eligibleCount = estimatedEligibleOwners(form.region);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const labelCls = 'block text-xs font-medium text-[var(--text2)] mb-1.5';
  const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] transition-colors';
  const selectCls = inputCls + ' appearance-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text)]">Skapa ny timmerool</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} className="text-[var(--text3)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Pool name */}
          <div>
            <label className={labelCls}>Poolnamn</label>
            <input
              type="text"
              className={inputCls}
              placeholder="t.ex. Värnamo Grantimmer Q3 2026"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Assortment */}
          <div>
            <label className={labelCls}>Sortiment</label>
            <select
              className={selectCls}
              value={form.assortment}
              onChange={(e) => setForm({ ...form, assortment: e.target.value as TimberAssortment })}
            >
              {ASSORTMENTS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Target volume & Region */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Målvolym (m³)</label>
              <input
                type="number"
                className={inputCls}
                min={100}
                max={50000}
                step={100}
                value={form.targetVolumeM3}
                onChange={(e) => setForm({ ...form, targetVolumeM3: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>Kommun</label>
              <select
                className={selectCls}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Delivery quarter & Quality */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Leveranskvartal</label>
              <select
                className={selectCls}
                value={form.deliveryQuarter}
                onChange={(e) => setForm({ ...form, deliveryQuarter: e.target.value })}
              >
                {QUARTERS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Minimikvalitet</label>
              <select
                className={selectCls}
                value={form.minQuality}
                onChange={(e) => setForm({ ...form, minQuality: e.target.value as 'A' | 'B' | 'C' })}
              >
                <option value="A">Klass A — Premium</option>
                <option value="B">Klass B — Standard</option>
                <option value="C">Klass C — Lägre</option>
              </select>
            </div>
          </div>

          {/* Auto invite */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <input
              type="checkbox"
              id="auto-invite"
              checked={form.autoInviteNearby}
              onChange={(e) => setForm({ ...form, autoInviteNearby: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--border)] accent-[var(--green)]"
            />
            <label htmlFor="auto-invite" className="text-xs text-[var(--text2)] select-none">
              Bjud automatiskt in närliggande BeetleSense-användare med matchande virke
            </label>
          </div>

          {/* Eligible owners preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--green)]/8 border border-[var(--green)]/15">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/15">
              <Users size={14} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--green)]">
                ~{eligibleCount} potentiella deltagare i {form.region}
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                Skogsägare med matchande sortiment och leveransperiod
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-[#030d05] hover:brightness-110 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              {submitting ? 'Skapar...' : 'Skapa pool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
