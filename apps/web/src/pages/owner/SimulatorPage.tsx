import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calculator,
  TreePine,
  Mountain,
  Truck,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { formatSEK, TIMBER_PRICES } from '@/services/timberPriceService';
import {
  calculateOperation,
  type SimulatorInput,
  type SpeciesMix,
  type SimulatorResult,
} from '@/services/operationCostCalculator';
import type { OperationType, TerrainType } from '@/data/swedishForestryEconomics';
import { ResultsBreakdown } from '@/components/simulator/ResultsBreakdown';
import { TaxHelper } from '@/components/simulator/TaxHelper';

// ─── Default Species Mix ───

const DEFAULT_SPECIES_MIX: SpeciesMix[] = [
  { species: 'spruce', proportion: 0.55, sawlogRatio: 0.65, pulpRatio: 0.35 },
  { species: 'pine', proportion: 0.30, sawlogRatio: 0.55, pulpRatio: 0.45 },
  { species: 'birch', proportion: 0.15, sawlogRatio: 0.30, pulpRatio: 0.70 },
];

// ─── Component ───

export default function SimulatorPage() {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';

  // ─── Form State ───
  const [operationType, setOperationType] = useState<OperationType>('finalHarvest');
  const [areaHa, setAreaHa] = useState(25);
  const [terrain, setTerrain] = useState<TerrainType>('flat');
  const [distanceToRoadKm, setDistanceToRoadKm] = useState(1.0);
  const [distanceToMillKm, setDistanceToMillKm] = useState(60);
  const [speciesMix, setSpeciesMix] = useState<SpeciesMix[]>(DEFAULT_SPECIES_MIX);
  const [otherAnnualIncome, setOtherAnnualIncome] = useState(400000);
  const [skogskontoPercent, setSkogskontoPercent] = useState(0);

  const isHarvestOp = operationType === 'thinning' || operationType === 'finalHarvest';

  // ─── Calculation ───
  const result: SimulatorResult = useMemo(() => {
    const input: SimulatorInput = {
      operationType,
      areaHa,
      speciesMix,
      terrain,
      distanceToRoadKm,
      distanceToMillKm,
      otherAnnualIncome,
      skogskontoPercent,
      region: 'south',
    };
    return calculateOperation(input);
  }, [operationType, areaHa, speciesMix, terrain, distanceToRoadKm, distanceToMillKm, otherAnnualIncome, skogskontoPercent]);

  // ─── Species Mix Handlers ───
  const updateSpeciesProportion = useCallback(
    (index: number, newProportion: number) => {
      setSpeciesMix((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], proportion: newProportion };

        // Normalize so all proportions sum to 1
        const total = updated.reduce((s, m) => s + m.proportion, 0);
        if (total > 0) {
          return updated.map((m) => ({ ...m, proportion: Math.round((m.proportion / total) * 100) / 100 }));
        }
        return updated;
      });
    },
    [],
  );

  // ─── Operation Types ───
  const operationOptions: { value: OperationType; label: string }[] = [
    { value: 'finalHarvest', label: t('simulator.operations.finalHarvest') },
    { value: 'thinning', label: t('simulator.operations.thinning') },
    { value: 'preCommercialThinning', label: t('simulator.operations.preCommercialThinning') },
    { value: 'planting', label: t('simulator.operations.planting') },
  ];

  const terrainOptions: { value: TerrainType; label: string }[] = [
    { value: 'flat', label: t('simulator.terrain.flat') },
    { value: 'hilly', label: t('simulator.terrain.hilly') },
    { value: 'steep', label: t('simulator.terrain.steep') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ─── Page Header ─── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--green)' }}
          >
            <Calculator size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">
              {t('simulator.title')}
            </h1>
            <p className="text-xs text-[var(--text3)]">
              {t('simulator.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ═══════════════════════════════════════════ */}
        {/* LEFT: Input Panel                          */}
        {/* ═══════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          {/* Operation Type */}
          <section
            className="rounded-xl border border-[var(--border)] p-4"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal size={14} className="text-[var(--text3)]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                {t('simulator.operationType')}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {operationOptions.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setOperationType(op.value)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                    operationType === op.value
                      ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </section>

          {/* Area */}
          <section
            className="rounded-xl border border-[var(--border)] p-4"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--text)]" htmlFor="area-slider">
                {t('simulator.area')}
              </label>
              <span className="text-sm font-mono font-semibold text-[var(--green)]">
                {areaHa} ha
              </span>
            </div>
            <input
              id="area-slider"
              type="range"
              min={1}
              max={100}
              step={1}
              value={areaHa}
              onChange={(e) => setAreaHa(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-[var(--green)]
                [&::-webkit-slider-thumb]:bg-[var(--bg2)]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(74,222,128,0.4)]
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-[var(--green)]
                [&::-moz-range-thumb]:bg-[var(--bg2)]
                [&::-moz-range-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--green) 0%, var(--green) ${areaHa}%, var(--bg3) ${areaHa}%, var(--bg3) 100%)`,
              }}
              aria-label={t('simulator.area')}
              aria-valuetext={`${areaHa} hectares`}
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-[var(--text3)]">1 ha</span>
              <span className="text-[10px] text-[var(--text3)]">100 ha</span>
            </div>
          </section>

          {/* Species Mix (only for harvest ops) */}
          {isHarvestOp && (
            <section
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TreePine size={14} className="text-[var(--text3)]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  {t('simulator.speciesMix')}
                </h2>
              </div>
              <div className="space-y-3">
                {speciesMix.map((mix, idx) => {
                  const prices = TIMBER_PRICES[mix.species];
                  const name = isSv ? prices?.nameSv : prices?.nameEn;
                  return (
                    <div key={mix.species}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text)]">{name}</span>
                        <span className="text-xs font-mono font-semibold text-[var(--text)]">
                          {Math.round(mix.proportion * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(mix.proportion * 100)}
                        onChange={(e) => updateSpeciesProportion(idx, Number(e.target.value) / 100)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-3
                          [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:border-2
                          [&::-webkit-slider-thumb]:border-[var(--green)]
                          [&::-webkit-slider-thumb]:bg-[var(--bg2)]
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:w-3
                          [&::-moz-range-thumb]:h-3
                          [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:border-2
                          [&::-moz-range-thumb]:border-[var(--green)]
                          [&::-moz-range-thumb]:bg-[var(--bg2)]
                          [&::-moz-range-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, var(--green) 0%, var(--green) ${mix.proportion * 100}%, var(--bg3) ${mix.proportion * 100}%, var(--bg3) 100%)`,
                        }}
                        aria-label={`${name} proportion`}
                      />
                      <div className="flex justify-between mt-0.5 text-[9px] text-[var(--text3)]">
                        <span>
                          {t('simulator.sawlog')}: {formatSEK(prices?.sawlogPrice ?? 0)}/m&sup3;fub
                        </span>
                        <span>
                          {t('simulator.pulp')}: {formatSEK(prices?.pulpPrice ?? 0)}/m&sup3;fub
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Terrain */}
          <section
            className="rounded-xl border border-[var(--border)] p-4"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Mountain size={14} className="text-[var(--text3)]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                {t('simulator.terrainLabel')}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {terrainOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTerrain(opt.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    terrain === opt.value
                      ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Distance to Road */}
          {isHarvestOp && (
            <section
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Truck size={14} className="text-[var(--text3)]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)]">
                  {t('simulator.distances')}
                </h2>
              </div>

              {/* Distance to road */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--text)]" htmlFor="road-distance">
                    {t('simulator.distanceToRoad')}
                  </label>
                  <span className="text-xs font-mono font-semibold text-[var(--text)]">
                    {distanceToRoadKm.toFixed(1)} km
                  </span>
                </div>
                <input
                  id="road-distance"
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={distanceToRoadKm}
                  onChange={(e) => setDistanceToRoadKm(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3.5
                    [&::-webkit-slider-thumb]:h-3.5
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-[var(--green)]
                    [&::-webkit-slider-thumb]:bg-[var(--bg2)]
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-3.5
                    [&::-moz-range-thumb]:h-3.5
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-[var(--green)]
                    [&::-moz-range-thumb]:bg-[var(--bg2)]
                    [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--green) 0%, var(--green) ${(distanceToRoadKm / 5) * 100}%, var(--bg3) ${(distanceToRoadKm / 5) * 100}%, var(--bg3) 100%)`,
                  }}
                  aria-label={t('simulator.distanceToRoad')}
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-[var(--text3)]">0 km</span>
                  <span className="text-[10px] text-[var(--text3)]">5 km</span>
                </div>
              </div>

              {/* Distance to mill */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[var(--text)]" htmlFor="mill-distance">
                    {t('simulator.distanceToMill')}
                  </label>
                  <span className="text-xs font-mono font-semibold text-[var(--text)]">
                    {distanceToMillKm} km
                  </span>
                </div>
                <input
                  id="mill-distance"
                  type="range"
                  min={10}
                  max={200}
                  step={10}
                  value={distanceToMillKm}
                  onChange={(e) => setDistanceToMillKm(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3.5
                    [&::-webkit-slider-thumb]:h-3.5
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-[var(--green)]
                    [&::-webkit-slider-thumb]:bg-[var(--bg2)]
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:w-3.5
                    [&::-moz-range-thumb]:h-3.5
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-[var(--green)]
                    [&::-moz-range-thumb]:bg-[var(--bg2)]
                    [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--green) 0%, var(--green) ${((distanceToMillKm - 10) / 190) * 100}%, var(--bg3) ${((distanceToMillKm - 10) / 190) * 100}%, var(--bg3) 100%)`,
                  }}
                  aria-label={t('simulator.distanceToMill')}
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-[var(--text3)]">10 km</span>
                  <span className="text-[10px] text-[var(--text3)]">200 km</span>
                </div>
              </div>
            </section>
          )}

          {/* Other Annual Income */}
          {isHarvestOp && (
            <section
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[var(--text)]" htmlFor="income-input">
                  {t('simulator.otherIncome')}
                </label>
              </div>
              <div className="relative">
                <input
                  id="income-input"
                  type="number"
                  min={0}
                  max={2000000}
                  step={50000}
                  value={otherAnnualIncome}
                  onChange={(e) => setOtherAnnualIncome(Number(e.target.value))}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm font-mono text-[var(--text)] focus:outline-none focus:border-[var(--green)] transition-colors"
                  aria-label={t('simulator.otherIncome')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text3)]">
                  kr
                </span>
              </div>
              <p className="text-[9px] text-[var(--text3)] mt-1">
                {t('simulator.otherIncomeHint')}
              </p>
            </section>
          )}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* RIGHT: Results Panel                       */}
        {/* ═══════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-4">
          {/* Volume info bar */}
          {isHarvestOp && (
            <div
              className="rounded-lg border border-[var(--border)] px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-[var(--text3)]">{t('simulator.results.totalVolume')}</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {new Intl.NumberFormat('sv-SE').format(result.totalVolumeM3fub)} m&sup3;fub
                  </p>
                </div>
                <div className="w-px h-8 bg-[var(--border)]" />
                <div>
                  <p className="text-[10px] text-[var(--text3)]">{t('simulator.results.volumePerHa')}</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {Math.round(result.totalVolumeM3fub / result.areaHa)} m&sup3;fub/ha
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results Breakdown */}
          <ResultsBreakdown result={result} />

          {/* Tax Helper (only for harvest with positive net) */}
          {isHarvestOp && result.netBeforeTax > 0 && (
            <TaxHelper
              netBeforeTax={result.netBeforeTax}
              tax={result.tax}
              skogskontoPercent={skogskontoPercent}
              onSkogskontoChange={setSkogskontoPercent}
            />
          )}

          {/* Price disclaimer */}
          <div className="flex items-start gap-1.5 px-1">
            <Info size={11} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-[var(--text3)] leading-relaxed">
              {t('simulator.disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
