import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Truck } from 'lucide-react';
import {
  MILLS,
  ASSORTMENTS,
  calculateMillRevenue,
  formatSEK,
  type Assortment,
  type RevenueEstimate,
} from '@/services/timberMarketService';

const VOLUME_ASSORTMENTS: Assortment[] = [
  'gran_timmer',
  'gran_massa',
  'tall_timmer',
  'tall_massa',
  'bjork_massa',
];

export function RevenueCalculator() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;

  const [volumes, setVolumes] = useState<Partial<Record<Assortment, number>>>({
    gran_timmer: 150,
    gran_massa: 80,
    tall_timmer: 60,
  });
  const [distanceKm, setDistanceKm] = useState(65);
  const [selectedMills, setSelectedMills] = useState<string[]>([
    MILLS[0].id,
    MILLS[7].id,
    MILLS[6].id,
  ]);

  const handleVolumeChange = (assortment: Assortment, val: string) => {
    const num = parseInt(val, 10);
    setVolumes((prev) => ({
      ...prev,
      [assortment]: isNaN(num) ? 0 : num,
    }));
  };

  const toggleMill = (millId: string) => {
    setSelectedMills((prev) => {
      if (prev.includes(millId)) {
        return prev.filter((id) => id !== millId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, millId];
    });
  };

  const estimates: RevenueEstimate[] = useMemo(() => {
    return selectedMills
      .map((id) => {
        const mill = MILLS.find((m) => m.id === id);
        if (!mill) return null;
        return calculateMillRevenue(volumes, mill, distanceKm);
      })
      .filter(Boolean) as RevenueEstimate[];
  }, [volumes, distanceKm, selectedMills]);

  const bestEstimate = estimates.reduce<RevenueEstimate | null>(
    (best, e) => (!best || e.netRevenue > best.netRevenue ? e : best),
    null,
  );

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={18} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('market.calculator.title')}
        </h3>
      </div>

      {/* Volume inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {VOLUME_ASSORTMENTS.map((a) => {
          const info = ASSORTMENTS.find((x) => x.id === a)!;
          return (
            <div key={a}>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-1">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: info.color }} />
                {lang === 'sv' ? info.nameSv : info.nameEn}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={volumes[a] ?? 0}
                  onChange={(e) => handleVolumeChange(a, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] font-mono focus:outline-none focus:border-[var(--green)]/50 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text3)] font-mono">
                  m³fub
                </span>
              </div>
            </div>
          );
        })}

        {/* Distance input */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-1">
            <Truck size={10} className="inline mr-1" />
            {t('market.calculator.distance')}
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={500}
              value={distanceKm}
              onChange={(e) => setDistanceKm(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] font-mono focus:outline-none focus:border-[var(--green)]/50 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text3)] font-mono">
              km
            </span>
          </div>
        </div>
      </div>

      {/* Mill selector */}
      <div className="mb-4">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-2">
          {t('market.calculator.compareMills')} ({selectedMills.length}/3)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MILLS.map((mill) => {
            const active = selectedMills.includes(mill.id);
            return (
              <button
                key={mill.id}
                onClick={() => toggleMill(mill.id)}
                className={`
                  px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all
                  ${active
                    ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                    : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                  }
                `}
              >
                {mill.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results comparison */}
      {estimates.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {estimates.map((est) => {
              const isBest = bestEstimate && est.millId === bestEstimate.millId && estimates.length > 1;
              return (
                <div
                  key={est.millId}
                  className={`rounded-lg border p-3 relative ${
                    isBest
                      ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                      : 'border-[var(--border)]'
                  }`}
                  style={!isBest ? { background: 'var(--bg)' } : undefined}
                >
                  {isBest && (
                    <span className="absolute -top-2 right-3 text-[9px] font-mono bg-[var(--green)] text-[#030d05] px-2 py-0.5 rounded-full font-semibold">
                      {t('market.calculator.best')}
                    </span>
                  )}
                  <p className="text-xs font-semibold text-[var(--text)] mb-0.5">
                    {est.millName}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] mb-3">
                    {est.company} &middot; {est.distanceKm} km
                  </p>

                  {/* Breakdown */}
                  <div className="space-y-1 mb-3">
                    {est.breakdown.map((b) => {
                      const info = ASSORTMENTS.find((x) => x.id === b.assortment);
                      return (
                        <div key={b.assortment} className="flex justify-between text-[10px]">
                          <span className="text-[var(--text3)]">
                            {lang === 'sv' ? info?.nameSv : info?.nameEn} ({b.volume} m³)
                          </span>
                          <span className="font-mono text-[var(--text2)]">{formatSEK(b.revenue)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-[var(--border)] pt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--text3)]">{t('market.calculator.gross')}</span>
                      <span className="font-mono text-[var(--text)]">{formatSEK(est.grossRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--text3)]">{t('market.calculator.transport')}</span>
                      <span className="font-mono text-red-400">-{formatSEK(est.transportCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold pt-1 border-t border-[var(--border)]">
                      <span className="text-[var(--text)]">{t('market.calculator.net')}</span>
                      <span className="font-mono text-[var(--green)]">{formatSEK(est.netRevenue)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
