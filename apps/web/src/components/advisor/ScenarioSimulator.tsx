import { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Plus,
  Trash2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * ScenarioSimulator — "What-if" side-by-side comparison for timber sale decisions.
 *
 * Compares options like "Sell to Södra now" vs "Sell to SCA in 3 months" vs "Wait 1 year"
 * with projected revenue, holding costs, risk factors, and AI recommendation.
 *
 * Fully functional with demo data. Uses realistic Swedish timber market parameters.
 */

// ── Types ──

interface BuyerScenario {
  id: string;
  buyerName: string;
  offerPerM3: number;
  deliveryMonths: number; // months from now
  species: 'gran' | 'tall' | 'björk' | 'ek';
  volumeM3: number;
  notes: string;
}

interface ScenarioResult {
  id: string;
  buyerName: string;
  immediateRevenue: number;
  projectedRevenue: number;
  holdingCost: number;
  netOutcome: number;
  riskScore: number; // 0-100
  riskFactors: string[];
  priceTrendPct: number;
  timeToRevenue: string;
}

// ── Constants ──

const SPECIES_OPTIONS = [
  { value: 'gran' as const, label: 'Gran (Spruce)', priceBase: 580, trend: 0.02 },
  { value: 'tall' as const, label: 'Tall (Pine)', priceBase: 540, trend: 0.015 },
  { value: 'björk' as const, label: 'Björk (Birch)', priceBase: 420, trend: 0.01 },
  { value: 'ek' as const, label: 'Ek (Oak)', priceBase: 1200, trend: 0.025 },
];

const HOLDING_COST_PER_M3_MONTH = 2.5; // SEK/m3/month storage/insurance
const BEETLE_RISK_PER_MONTH = 1.5; // % per month risk increase for spruce
const STORM_RISK_FACTOR = 8; // base % risk

// ── Demo scenarios ──

const DEMO_SCENARIOS: BuyerScenario[] = [
  {
    id: 'demo-1',
    buyerName: 'Södra',
    offerPerM3: 565,
    deliveryMonths: 0,
    species: 'gran',
    volumeM3: 350,
    notes: 'Aktuellt avtal, omedelbar leverans',
  },
  {
    id: 'demo-2',
    buyerName: 'SCA',
    offerPerM3: 590,
    deliveryMonths: 3,
    species: 'gran',
    volumeM3: 350,
    notes: 'Villkorat på leverans Q3 2026',
  },
  {
    id: 'demo-3',
    buyerName: 'Vänta 1 år',
    offerPerM3: 0,
    deliveryMonths: 12,
    species: 'gran',
    volumeM3: 350,
    notes: 'Marknadsprognosbaserad försäljning',
  },
];

// ── Utility ──

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateScenario(scenario: BuyerScenario): ScenarioResult {
  const speciesData = SPECIES_OPTIONS.find((s) => s.value === scenario.species)!;
  const months = scenario.deliveryMonths;

  // Price projection using monthly compound growth
  const monthlyTrend = speciesData.trend / 12;
  const projectedPrice =
    scenario.offerPerM3 > 0
      ? scenario.offerPerM3
      : speciesData.priceBase * Math.pow(1 + monthlyTrend, months);

  const immediateRevenue = scenario.volumeM3 * speciesData.priceBase;
  const projectedRevenue = scenario.volumeM3 * projectedPrice;
  const holdingCost = scenario.volumeM3 * HOLDING_COST_PER_M3_MONTH * months;

  // Risk scoring
  const riskFactors: string[] = [];
  let riskScore = STORM_RISK_FACTOR;

  if (months > 0 && scenario.species === 'gran') {
    const beetleRisk = months * BEETLE_RISK_PER_MONTH;
    riskScore += beetleRisk;
    riskFactors.push(
      `Barkborrerisk: +${beetleRisk.toFixed(0)}% (${months} mån exponering)`
    );
  }

  if (months >= 6) {
    riskScore += 12;
    riskFactors.push('Prisvolatilitet: hög osäkerhet vid +6 mån');
  }

  if (months >= 12) {
    riskScore += 8;
    riskFactors.push('Stormrisk: hela vintersäsongen inkluderad');
  }

  if (months === 0) {
    riskFactors.push('Minimal risk: omedelbar leverans');
  }

  riskScore = Math.min(95, riskScore);

  const priceTrendPct =
    months > 0
      ? ((projectedPrice - speciesData.priceBase) / speciesData.priceBase) * 100
      : 0;

  const netOutcome = projectedRevenue - holdingCost;
  const timeToRevenue =
    months === 0 ? 'Omedelbart' : `${months} månader`;

  return {
    id: scenario.id,
    buyerName: scenario.buyerName,
    immediateRevenue,
    projectedRevenue,
    holdingCost,
    netOutcome,
    riskScore,
    riskFactors,
    priceTrendPct,
    timeToRevenue,
  };
}

function generateAIRecommendation(
  results: ScenarioResult[],
  scenarios: BuyerScenario[],
): string {
  if (results.length === 0) return '';

  const best = [...results].sort(
    (a, b) => b.netOutcome / (1 + b.riskScore / 100) - a.netOutcome / (1 + a.riskScore / 100)
  )[0];

  const bestScenario = scenarios.find((s) => s.id === best.id);
  const riskAdjNote =
    best.riskScore > 30
      ? ' Observera dock den förhöjda risknivån — framför allt barkborrerisken bör beaktas.'
      : '';

  if (best.riskScore < 15 && bestScenario?.deliveryMonths === 0) {
    return `Rekommendation: Sälj till ${best.buyerName} nu. Nettoutfallet ${formatSEK(best.netOutcome)} med minimal risk (${best.riskScore}%) ger den bästa riskjusterade avkastningen. Marknaden är stabil och omedelbar leverans eliminerar exponering mot barkborre och stormskador.`;
  }

  const runner = results.find((r) => r.id !== best.id && r.riskScore < 20);
  if (runner && best.netOutcome - runner.netOutcome < best.netOutcome * 0.03) {
    return `Rekommendation: Överväg ${best.buyerName} (${formatSEK(best.netOutcome)} netto) framför ${runner.buyerName} (${formatSEK(runner.netOutcome)} netto). Skillnaden är dock marginell — den lägre risken med ${runner.buyerName} kan vara värd att prioritera.${riskAdjNote}`;
  }

  return `Rekommendation: ${best.buyerName} ger det bästa riskjusterade utfallet med ${formatSEK(best.netOutcome)} netto (risk: ${best.riskScore}%). Den högre förväntade intäkten kompenserar för väntetiden och hållkostnaderna.${riskAdjNote} Denna rekommendation utgår enbart från dina intressen som skogsägare — BeetleSense har inga avtal med virkesköpare.`;
}

// ── Component ──

export function ScenarioSimulator() {
  const [scenarios, setScenarios] = useState<BuyerScenario[]>(DEMO_SCENARIOS);
  const [showResults, _setShowResults] = useState(true);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const results = useMemo(
    () => scenarios.map(calculateScenario),
    [scenarios]
  );

  const recommendation = useMemo(
    () => generateAIRecommendation(results, scenarios),
    [results, scenarios]
  );

  const maxNet = Math.max(...results.map((r) => r.netOutcome), 1);

  const updateScenario = useCallback(
    (id: string, updates: Partial<BuyerScenario>) => {
      setScenarios((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const addScenario = useCallback(() => {
    const newId = `scenario-${Date.now()}`;
    setScenarios((prev) => [
      ...prev,
      {
        id: newId,
        buyerName: '',
        offerPerM3: 550,
        deliveryMonths: 0,
        species: 'gran',
        volumeM3: prev[0]?.volumeM3 ?? 200,
        notes: '',
      },
    ]);
  }, []);

  const removeScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} style={{ color: '#4ade80' }} />
          <h3 className="text-sm font-serif font-bold text-[var(--text)]">
            Scenariosimulering
          </h3>
          <span className="text-[10px] text-[var(--text3)]">
            &mdash; Jämför försäljningsalternativ
          </span>
        </div>
        <button
          onClick={addScenario}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]"
        >
          <Plus size={12} />
          Lägg till scenario
        </button>
      </div>

      {/* Scenario input cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {scenarios.map((scenario, idx) => (
          <div
            key={scenario.id}
            className="rounded-xl border border-[var(--border)] p-4 space-y-3"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider">
                Alternativ {idx + 1}
              </span>
              {scenarios.length > 1 && (
                <button
                  onClick={() => removeScenario(scenario.id)}
                  className="text-[var(--text3)] hover:text-red-400 transition-colors"
                  aria-label="Ta bort scenario"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">
                Köpare / Strategi
              </label>
              <input
                type="text"
                value={scenario.buyerName}
                onChange={(e) =>
                  updateScenario(scenario.id, { buyerName: e.target.value })
                }
                placeholder="T.ex. Södra, SCA, Holmen..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[#4ade80]/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--text3)] block mb-1">
                  Pris (SEK/m3)
                </label>
                <input
                  type="number"
                  value={scenario.offerPerM3}
                  onChange={(e) =>
                    updateScenario(scenario.id, {
                      offerPerM3: Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#4ade80]/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text3)] block mb-1">
                  Leverans (mån)
                </label>
                <input
                  type="number"
                  min={0}
                  max={36}
                  value={scenario.deliveryMonths}
                  onChange={(e) =>
                    updateScenario(scenario.id, {
                      deliveryMonths: Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#4ade80]/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--text3)] block mb-1">
                  Trädslag
                </label>
                <select
                  value={scenario.species}
                  onChange={(e) =>
                    updateScenario(scenario.id, {
                      species: e.target.value as BuyerScenario['species'],
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[#4ade80]/50"
                >
                  {SPECIES_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--text3)] block mb-1">
                  Volym (m3)
                </label>
                <input
                  type="number"
                  min={1}
                  value={scenario.volumeM3}
                  onChange={(e) =>
                    updateScenario(scenario.id, {
                      volumeM3: Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#4ade80]/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">
                Anteckning
              </label>
              <input
                type="text"
                value={scenario.notes}
                onChange={(e) =>
                  updateScenario(scenario.id, { notes: e.target.value })
                }
                placeholder="Valfri notering..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[#4ade80]/50"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Results comparison */}
      {results.length > 0 && showResults && (
        <div className="space-y-4">
          {/* Bar chart comparison */}
          <div
            className="rounded-xl border border-[var(--border)] p-5"
            style={{ background: 'var(--bg2)' }}
          >
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-4">
              Nettoutfall jämförelse
            </h4>
            <div className="space-y-3">
              {results.map((result) => {
                const barWidth = Math.max(5, (result.netOutcome / maxNet) * 100);
                const isBest =
                  result.netOutcome === Math.max(...results.map((r) => r.netOutcome));
                return (
                  <div key={result.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-medium ${
                          isBest ? 'text-[#4ade80]' : 'text-[var(--text)]'
                        }`}
                      >
                        {result.buyerName || 'Namnlöst alternativ'}
                        {isBest && (
                          <span className="ml-2 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-[#4ade80]/15 text-[#4ade80]">
                            Bäst
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-semibold text-[var(--text)]">
                        {formatSEK(result.netOutcome)}
                      </span>
                    </div>
                    <div className="h-5 rounded-md bg-[var(--bg3)] overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background: isBest
                            ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                            : 'linear-gradient(90deg, var(--text3), var(--text3))',
                          opacity: isBest ? 1 : 0.5,
                        }}
                      />
                      {/* Risk overlay */}
                      <div
                        className="absolute right-0 top-0 h-full flex items-center pr-2 text-[9px] font-mono"
                        style={{
                          color: result.riskScore > 40 ? '#f97316' : 'var(--text3)',
                        }}
                      >
                        Risk {result.riskScore}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail comparison table */}
          <div
            className="rounded-xl border border-[var(--border)] overflow-hidden"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-3 text-[var(--text3)] uppercase tracking-wider font-medium text-[10px]">
                      Faktor
                    </th>
                    {results.map((r) => (
                      <th
                        key={r.id}
                        className="text-right p-3 text-[var(--text3)] uppercase tracking-wider font-medium text-[10px]"
                      >
                        {r.buyerName || '—'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border)]">
                    <td className="p-3 text-[var(--text2)]">Omedelbart intäktsvärde</td>
                    {results.map((r) => (
                      <td key={r.id} className="p-3 text-right font-mono text-[var(--text)]">
                        {formatSEK(r.immediateRevenue)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="p-3 text-[var(--text2)]">
                      <div className="flex items-center gap-1">
                        Beräknad intäkt
                        <TrendingUp size={10} className="text-[#4ade80]" />
                      </div>
                    </td>
                    {results.map((r) => (
                      <td key={r.id} className="p-3 text-right font-mono text-[var(--text)]">
                        {formatSEK(r.projectedRevenue)}
                        {r.priceTrendPct !== 0 && (
                          <span
                            className="ml-1 text-[9px]"
                            style={{
                              color: r.priceTrendPct > 0 ? '#4ade80' : '#f97316',
                            }}
                          >
                            {r.priceTrendPct > 0 ? '+' : ''}
                            {r.priceTrendPct.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="p-3 text-[var(--text2)]">Hållkostnad</td>
                    {results.map((r) => (
                      <td
                        key={r.id}
                        className="p-3 text-right font-mono"
                        style={{
                          color: r.holdingCost > 0 ? '#f97316' : 'var(--text3)',
                        }}
                      >
                        {r.holdingCost > 0 ? `-${formatSEK(r.holdingCost)}` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg3)]">
                    <td className="p-3 font-semibold text-[var(--text)]">Nettoutfall</td>
                    {results.map((r) => {
                      const isBest =
                        r.netOutcome === Math.max(...results.map((x) => x.netOutcome));
                      return (
                        <td
                          key={r.id}
                          className="p-3 text-right font-mono font-semibold"
                          style={{ color: isBest ? '#4ade80' : 'var(--text)' }}
                        >
                          {formatSEK(r.netOutcome)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="p-3 text-[var(--text2)]">Tid till intäkt</td>
                    {results.map((r) => (
                      <td key={r.id} className="p-3 text-right text-[var(--text2)]">
                        <div className="flex items-center justify-end gap-1">
                          <Clock size={10} />
                          {r.timeToRevenue}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-[var(--text2)]">
                      <div className="flex items-center gap-1">
                        <AlertTriangle size={10} className="text-[var(--amber, #fbbf24)]" />
                        Risk
                      </div>
                    </td>
                    {results.map((r) => (
                      <td key={r.id} className="p-3 text-right">
                        <button
                          onClick={() =>
                            setExpandedRisk(expandedRisk === r.id ? null : r.id)
                          }
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              r.riskScore > 40
                                ? 'rgba(249, 115, 22, 0.15)'
                                : r.riskScore > 20
                                  ? 'rgba(251, 191, 36, 0.15)'
                                  : 'rgba(74, 222, 128, 0.15)',
                            color:
                              r.riskScore > 40
                                ? '#f97316'
                                : r.riskScore > 20
                                  ? '#fbbf24'
                                  : '#4ade80',
                          }}
                        >
                          {r.riskScore}%
                          {expandedRisk === r.id ? (
                            <ChevronUp size={8} />
                          ) : (
                            <ChevronDown size={8} />
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Risk factor expansion */}
            {expandedRisk && (
              <div className="border-t border-[var(--border)] p-4">
                <p className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-2">
                  Riskfaktorer: {results.find((r) => r.id === expandedRisk)?.buyerName}
                </p>
                <ul className="space-y-1">
                  {results
                    .find((r) => r.id === expandedRisk)
                    ?.riskFactors.map((factor, i) => (
                      <li
                        key={i}
                        className="text-[10px] text-[var(--text2)] flex items-start gap-1.5"
                      >
                        <span className="mt-0.5 text-[var(--amber, #fbbf24)]">&#9679;</span>
                        {factor}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {/* AI Recommendation */}
          {recommendation && (
            <div
              className="rounded-xl border p-4"
              style={{
                background: 'rgba(74, 222, 128, 0.05)',
                borderColor: 'rgba(74, 222, 128, 0.2)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(74, 222, 128, 0.15)' }}
                >
                  <Sparkles size={14} style={{ color: '#4ade80' }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4ade80' }}>
                    AI-rekommendation (fiduciär)
                  </p>
                  <p className="text-xs text-[var(--text2)] leading-relaxed">
                    {recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[9px] text-[var(--text3)] italic">
            Beräkningar baseras på aktuella marknadstrender och historiska data.
            Verkliga priser kan avvika. Hållkostnad inkluderar lagring, försäkring
            och risktillägg. Alla beräkningar sker lokalt — ingen köpardata delas.
          </p>
        </div>
      )}
    </div>
  );
}
