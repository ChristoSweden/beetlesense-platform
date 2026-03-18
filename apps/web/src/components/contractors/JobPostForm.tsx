/**
 * JobPostForm — Post a forestry job to the open contractor marketplace.
 *
 * Multi-select services, parcel picker, area/volume, timeline, requirements,
 * budget range, and description.
 */

import { useState } from 'react';
import { X, Plus, TreePine, Calendar, DollarSign, FileText, CheckSquare } from 'lucide-react';
import { DEMO_PARCELS } from '@/lib/demoData';
import {
  ALL_FORESTRY_SERVICES,
  SERVICE_LABELS,
  type ForestryService,
  type JobPostFormData,
} from '@/hooks/useContractorMarketplace';

interface JobPostFormProps {
  onSubmit: (data: JobPostFormData) => void;
  onCancel: () => void;
}

const REQUIREMENT_OPTIONS = [
  'FSC-certifierad',
  'PEFC-certifierad',
  'ISO 14001',
  'Skördare med gallringsaggregat',
  'Markberedare krävs',
  'Erfarenhet av barkborreskadad skog',
  'Bandgående maskiner',
  'Skogsstyrelsen certifierad plantör',
];

export function JobPostForm({ onSubmit, onCancel }: JobPostFormProps) {
  const [services, setServices] = useState<ForestryService[]>([]);
  const [parcelId, setParcelId] = useState('');
  const [areaHa, setAreaHa] = useState('');
  const [volumeM3, setVolumeM3] = useState('');
  const [timeline, setTimeline] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [description, setDescription] = useState('');

  const toggleService = (s: ForestryService) => {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const toggleRequirement = (r: string) => {
    setRequirements((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  };

  const selectedParcel = DEMO_PARCELS.find((p) => p.id === parcelId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (services.length === 0 || !parcelId) return;

    onSubmit({
      services,
      parcel_id: parcelId,
      area_ha: Number(areaHa) || selectedParcel?.area_hectares || 0,
      estimated_volume_m3: volumeM3 ? Number(volumeM3) : null,
      preferred_timeline: timeline,
      requirements,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      description,
    });
  };

  const isValid = services.length > 0 && parcelId && (areaHa || selectedParcel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] p-5"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
              <Plus size={16} className="text-[var(--green)]" />
            </div>
            <h2 className="text-base font-serif font-bold text-[var(--text)]">Publicera jobb</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Service type (multi-select) */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text3)] uppercase mb-2">
              <TreePine size={11} />
              Tjänstetyp *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_FORESTRY_SERVICES.map((s) => {
                const active = services.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleService(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30'
                        : 'bg-[var(--bg)] text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)]'
                    }`}
                  >
                    {SERVICE_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parcel selector */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text3)] uppercase mb-2">
              <TreePine size={11} />
              Skifte *
            </label>
            <select
              value={parcelId}
              onChange={(e) => {
                setParcelId(e.target.value);
                const p = DEMO_PARCELS.find((x) => x.id === e.target.value);
                if (p && !areaHa) setAreaHa(String(p.area_hectares));
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)]"
            >
              <option value="">Välj skifte...</option>
              {DEMO_PARCELS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.area_hectares} ha ({p.municipality})
                </option>
              ))}
            </select>
          </div>

          {/* Area & Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                Areal (ha) *
              </label>
              <input
                type="number"
                value={areaHa}
                onChange={(e) => setAreaHa(e.target.value)}
                step="0.1"
                min="0"
                placeholder="42.5"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                Uppskattad volym (m³)
              </label>
              <input
                type="number"
                value={volumeM3}
                onChange={(e) => setVolumeM3(e.target.value)}
                step="1"
                min="0"
                placeholder="180"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
              />
            </div>
          </div>

          {/* Preferred timeline */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text3)] uppercase mb-2">
              <Calendar size={11} />
              Önskad tidsperiod
            </label>
            <input
              type="text"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="t.ex. April–Maj 2026"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text3)] uppercase mb-2">
              <CheckSquare size={11} />
              Krav
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REQUIREMENT_OPTIONS.map((r) => {
                const active = requirements.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRequirement(r)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                      active
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-[var(--bg)] text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)]'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget range (optional) */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text3)] uppercase mb-2">
              <DollarSign size={11} />
              Budgetintervall (SEK, valfritt)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                step="1000"
                min="0"
                placeholder="Min"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
              />
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                step="1000"
                min="0"
                placeholder="Max"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text3)] uppercase mb-2">
              <FileText size={11} />
              Beskrivning
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Beskriv jobbet, terrängen, tillgänglighet, speciella förutsättningar..."
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Publicera förfrågan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
