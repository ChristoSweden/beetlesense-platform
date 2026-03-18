/**
 * VolumeCommitment — Modal form to join a timber pool by committing volume.
 */

import { useState, useMemo } from 'react';
import { X, TreePine, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { DEMO_PARCELS } from '@/lib/demoData';
import type { TimberPool, VolumeCommitmentForm } from '@/hooks/useGroupSelling';

interface VolumeCommitmentProps {
  pool: TimberPool;
  onSubmit: (form: VolumeCommitmentForm) => Promise<void>;
  onClose: () => void;
}

export function VolumeCommitment({ pool, onSubmit, onClose }: VolumeCommitmentProps) {
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [volumeM3, setVolumeM3] = useState(100);
  const [qualityGrade, setQualityGrade] = useState<'A' | 'B' | 'C'>('B');
  const [deliveryFlex, setDeliveryFlex] = useState<'strict' | 'flexible' | 'very_flexible'>('flexible');
  const [deliveryEarliestDate, setDeliveryEarliestDate] = useState('2026-07-01');
  const [deliveryLatestDate, setDeliveryLatestDate] = useState('2026-09-30');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const parcels = DEMO_PARCELS;
  const remaining = pool.targetVolumeM3 - pool.currentVolumeM3;

  // Estimated share of pool premium
  const estimatedPremium = useMemo(() => {
    const midPremiumPct = (pool.expectedPremiumMin + pool.expectedPremiumMax) / 2 / 100;
    const avgPriceM3 = pool.assortment === 'grantimmer' ? 710 : pool.assortment === 'talltimmer' ? 665 : pool.assortment === 'massaved' ? 340 : 280;
    return Math.round(volumeM3 * avgPriceM3 * midPremiumPct);
  }, [volumeM3, pool]);

  const toggleParcel = (id: string) => {
    setSelectedParcels((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted || !confirmed || volumeM3 <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        poolId: pool.id,
        selectedParcels,
        volumeM3,
        qualityGrade,
        deliveryFlexibility: deliveryFlex,
        deliveryEarliestDate,
        deliveryLatestDate,
        termsAccepted,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const labelCls = 'block text-xs font-medium text-[var(--text2)] mb-1.5';
  const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Gå med i pool</h2>
            <p className="text-xs text-[var(--text3)]">{pool.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} className="text-[var(--text3)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Select parcels */}
          <div>
            <label className={labelCls}>Välj skiften att inkludera</label>
            <div className="space-y-1.5">
              {parcels.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleParcel(p.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                    selectedParcels.includes(p.id)
                      ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                      : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedParcels.includes(p.id)
                      ? 'bg-[var(--green)] border-[var(--green)]'
                      : 'border-[var(--border)]'
                  }`}>
                    {selectedParcels.includes(p.id) && <CheckCircle size={10} className="text-[#030d05]" />}
                  </div>
                  <TreePine size={14} className="text-[var(--green)]" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[var(--text)]">{p.name}</p>
                    <p className="text-[10px] text-[var(--text3)]">{p.area_hectares} ha — {p.municipality}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div>
            <label className={labelCls}>Volym att förbinda (m³)</label>
            <input
              type="number"
              className={inputCls}
              min={10}
              max={remaining}
              step={10}
              value={volumeM3}
              onChange={(e) => setVolumeM3(Number(e.target.value))}
            />
            <p className="text-[10px] text-[var(--text3)] mt-1">
              Kvarvarande i poolen: {remaining.toLocaleString('sv-SE')} m³
            </p>
          </div>

          {/* Quality & Delivery flex */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kvalitetsklass</label>
              <select
                className={inputCls + ' appearance-none'}
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value as 'A' | 'B' | 'C')}
              >
                <option value="A">Klass A — Premium</option>
                <option value="B">Klass B — Standard</option>
                <option value="C">Klass C — Lägre</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Leveransflexibilitet</label>
              <select
                className={inputCls + ' appearance-none'}
                value={deliveryFlex}
                onChange={(e) => setDeliveryFlex(e.target.value as any)}
              >
                <option value="strict">Strikt (exakt datum)</option>
                <option value="flexible">Flexibel (+/- 2 veckor)</option>
                <option value="very_flexible">Mycket flexibel (+/- 1 mån)</option>
              </select>
            </div>
          </div>

          {/* Delivery dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tidigaste leverans</label>
              <input
                type="date"
                className={inputCls}
                value={deliveryEarliestDate}
                onChange={(e) => setDeliveryEarliestDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Senaste leverans</label>
              <input
                type="date"
                className={inputCls}
                value={deliveryLatestDate}
                onChange={(e) => setDeliveryLatestDate(e.target.value)}
              />
            </div>
          </div>

          {/* Estimated premium */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--green)]/8 border border-[var(--green)]/15">
            <TrendingUp size={16} className="text-[var(--green)]" />
            <div>
              <p className="text-xs font-medium text-[var(--green)]">
                Uppskattad premiumandel: ~{estimatedPremium.toLocaleString('sv-SE')} SEK
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                Baserat på +{pool.expectedPremiumMin}–{pool.expectedPremiumMax}% vs individuellt pris
              </p>
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[var(--border)] accent-[var(--green)]"
              />
              <label htmlFor="terms" className="text-xs text-[var(--text2)] select-none leading-relaxed">
                Jag godkänner poolvillkoren och BeetleSense plattformsavtal inkl. 2% förmedlingsavgift.
              </label>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--yellow)]/30 bg-[var(--yellow)]/5">
              <input
                type="checkbox"
                id="confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[var(--border)] accent-[var(--yellow)]"
              />
              <label htmlFor="confirm" className="text-xs text-[var(--text)] select-none leading-relaxed">
                <span className="font-semibold">Jag förbinder mig att leverera</span> {volumeM3} m³ {pool.assortmentLabel.split(' ')[0].toLowerCase()} enligt angivna villkor.
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-[10px] text-[var(--text3)]">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5 text-[var(--yellow)]" />
            <p>Att bryta en volymförbindelse kan påverka ditt förtroenderating i framtida pooler.</p>
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
              disabled={submitting || !termsAccepted || !confirmed || volumeM3 <= 0}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-[#030d05] hover:brightness-110 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Ansluter...' : 'Förbind volym'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
