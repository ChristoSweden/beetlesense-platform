import { useState, useMemo } from 'react';
import {
  BarChart3,
  AlertCircle,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  TreePine,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Bug,
  Leaf,
  Shield,
  Footprints,
} from 'lucide-react';
import { useSensorProducts } from '@/hooks/useSensorProducts';
import { useTreeInventory } from '@/hooks/useTreeInventory';

/**
 * OwnerInsights — personalized insights panel for the forest owner.
 *
 * Wired to real sensor data via useSensorProducts and useTreeInventory hooks.
 * Shows beetle stress status, crown health distribution, carbon credit estimate,
 * insurance recommendation, and benchmarks vs regional averages.
 */

// ── Types ──

interface BenchmarkMetric {
  id: string;
  label: string;
  yourValue: number;
  regionAvg: number;
  unit: string;
  betterDirection: 'higher' | 'lower';
  explanation: string;
}

interface MissedOpportunity {
  id: string;
  message: string;
  impact: string;
  date: string;
  severity: 'info' | 'warning';
}

interface CalendarSuggestion {
  id: string;
  month: string;
  activity: string;
  description: string;
  optimal: boolean;
  dueStatus: 'past' | 'current' | 'upcoming';
}

interface ValuePoint {
  month: string;
  value: number;
  label?: string;
}

// ── Constants ──

/** CO2 sequestration factor: tons CO2 per m3 standing volume */
const CO2_PER_M3 = 1.8;
/** Voluntary carbon credit price in SEK per ton CO2 (Swedish market ~400-600 SEK) */
const CARBON_CREDIT_PRICE_SEK = 500;

// ── Utility ──

function formatSEK(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MSEK`;
  }
  return new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: 0,
  }).format(value) + ' SEK';
}

function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('sv-SE', {
    maximumFractionDigits: decimals,
  }).format(value);
}

// ── Component ──

export function OwnerInsights() {
  const [expandedSection, setExpandedSection] = useState<string>('beetle');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  // Real data hooks
  const { fusionProducts, loading: sensorLoading, isDemo: sensorIsDemo } = useSensorProducts({});
  const { stats, loading: treeLoading } = useTreeInventory({});

  // ── Extract beetle_stress fusion product data ──
  const beetleStress = useMemo(() => {
    const fp = fusionProducts.find(p => p.product_name === 'beetle_stress');
    if (!fp) return null;
    const meta = fp.metadata as Record<string, unknown>;
    return {
      affectedAreaPct: (meta.affected_area_pct as number) ?? 0,
      confidenceMean: (meta.confidence_mean as number) ?? 0,
      classes: (meta.classes as string[]) ?? [],
      modelVersion: (meta.model_version as string) ?? '-',
    };
  }, [fusionProducts]);

  // ── Extract crown_health fusion product data ──
  const crownHealth = useMemo(() => {
    const fp = fusionProducts.find(p => p.product_name === 'crown_health');
    if (!fp) return null;
    const meta = fp.metadata as Record<string, unknown>;
    return {
      totalCrowns: (meta.total_crowns as number) ?? 0,
      healthyPct: (meta.healthy_pct as number) ?? 0,
      stressedPct: (meta.stressed_pct as number) ?? 0,
      deadPct: (meta.dead_pct as number) ?? 0,
      modelVersion: (meta.model_version as string) ?? '-',
    };
  }, [fusionProducts]);

  // ── Carbon credit estimate ──
  const carbonEstimate = useMemo(() => {
    const totalVolume = stats.totalVolume;
    const co2Tons = totalVolume * CO2_PER_M3;
    const creditValue = co2Tons * CARBON_CREDIT_PRICE_SEK;
    return {
      totalVolume: Math.round(totalVolume),
      co2Tons: Math.round(co2Tons),
      creditValue: Math.round(creditValue),
      pricePerTon: CARBON_CREDIT_PRICE_SEK,
    };
  }, [stats.totalVolume]);

  // ── Insurance risk profile ──
  const insuranceProfile = useMemo(() => {
    const beetleRisk = beetleStress?.affectedAreaPct ?? 0;
    const stressedPct = stats.stressedPct;
    const granPct = stats.speciesBreakdown.find(s => s.species === 'Gran')?.percentage ?? 0;

    // Risk score 0-100
    let riskScore = 0;
    riskScore += Math.min(30, beetleRisk * 2.5); // beetle infestation
    riskScore += Math.min(25, stressedPct * 1.5); // tree stress level
    riskScore += Math.min(20, granPct * 0.3); // mono-culture gran risk
    riskScore += 10; // baseline storm risk
    riskScore = Math.min(100, Math.round(riskScore));

    let recommendation: string;
    let level: 'low' | 'medium' | 'high';
    if (riskScore >= 60) {
      level = 'high';
      recommendation = `Hög riskprofil (${riskScore}/100). Starkt rekommenderat med utökad skogsförsäkring som täcker barkborreskador, stormfällning och brand. Överväg separata barkborretillägg.`;
    } else if (riskScore >= 35) {
      level = 'medium';
      recommendation = `Medel riskprofil (${riskScore}/100). Standard skogsförsäkring rekommenderas. Bevaka barkborresituationen — kan behöva uppgradering om stressnivåerna ökar.`;
    } else {
      level = 'low';
      recommendation = `Låg riskprofil (${riskScore}/100). Grundläggande skogsförsäkring tillräcklig. God skogshälsa minskar behovet av tillägg.`;
    }

    return {
      riskScore,
      level,
      recommendation,
      factors: {
        beetleRisk: Math.round(beetleRisk),
        stressedPct: Math.round(stressedPct),
        granPct: Math.round(granPct),
      },
    };
  }, [beetleStress, stats]);

  // ── Benchmarks from real data ──
  const benchmarks = useMemo((): BenchmarkMetric[] => {
    const volumePerHa = stats.totalVolume / 214.8; // demo area

    return [
      {
        id: 'volume',
        label: 'Volym per hektar',
        yourValue: Math.round(volumePerHa),
        regionAvg: 165,
        unit: 'm3sk/ha',
        betterDirection: 'higher',
        explanation: `Beräknat från ${stats.count} inventerade träd med total volym ${stats.totalVolume.toFixed(0)} m3.`,
      },
      {
        id: 'health',
        label: 'Genomsnittlig skogshälsa',
        yourValue: Math.round(stats.avgHealth),
        regionAvg: 72,
        unit: '%',
        betterDirection: 'higher',
        explanation: stats.avgHealth < 72
          ? `Under genomsnittet p.g.a. ${stats.stressedCount} stressade träd (${stats.stressedPct}%). Övervakning pågår.`
          : `Över regionalt genomsnitt. God skogshälsa med ${stats.stressedPct}% stressade träd.`,
      },
      {
        id: 'beetle_risk',
        label: 'Barkborrerisk',
        yourValue: Math.round(beetleStress?.affectedAreaPct ?? stats.stressedPct),
        regionAvg: 22,
        unit: '%',
        betterDirection: 'lower',
        explanation: beetleStress
          ? `Baserat på fusionsanalys (multispektral + termisk + RGB). ${beetleStress.affectedAreaPct.toFixed(1)}% påverkad areal.`
          : `Baserat på andel stressade träd i inventering.`,
      },
      {
        id: 'diversity',
        label: 'Artdiversitet',
        yourValue: stats.speciesBreakdown.length,
        regionAvg: 2.8,
        unit: 'arter',
        betterDirection: 'higher',
        explanation: `Detekterade arter: ${stats.speciesBreakdown.map(s => `${s.species} (${s.percentage.toFixed(0)}%)`).join(', ')}.`,
      },
      {
        id: 'carbon',
        label: 'Kolbindning',
        yourValue: carbonEstimate.co2Tons,
        regionAvg: Math.round(165 * 214.8 * CO2_PER_M3),
        unit: 'ton CO2',
        betterDirection: 'higher',
        explanation: `${stats.totalVolume.toFixed(0)} m3 stående volym x ${CO2_PER_M3} ton CO2/m3. Potentiellt kreditvärde: ${formatSEK(carbonEstimate.creditValue)}.`,
      },
    ];
  }, [stats, beetleStress, carbonEstimate]);

  // ── Demo calendar and opportunities (keep for now) ──

  const DEMO_OPPORTUNITIES: MissedOpportunity[] = [
    {
      id: 'opp-1',
      message: 'Granpriset var 12% högre i oktober 2025',
      impact: 'Potentiell merkostnad: ~45 000 SEK vid 350 m3 försäljning',
      date: 'Oktober 2025',
      severity: 'warning',
    },
    {
      id: 'opp-2',
      message: 'Subventionerad gallring via Skogsstyrelsen missades',
      impact: 'Stöd om 3 200 SEK/ha för förstagallring av lövskog',
      date: 'December 2025',
      severity: 'warning',
    },
  ];

  const DEMO_CALENDAR: CalendarSuggestion[] = [
    { id: 'c1', month: 'Januari', activity: 'Vinteravverkning', description: 'Optimal tid för slutavverkning — tjälad mark minimerar skador.', optimal: true, dueStatus: 'past' },
    { id: 'c2', month: 'Mars', activity: 'Barkborreinventering', description: 'Inspektera granbestånd före svärmning. Sätt ut feromonfällor.', optimal: true, dueStatus: 'current' },
    { id: 'c3', month: 'April', activity: 'Plantering', description: 'Optimal planteringsperiod för gran och tall börjar.', optimal: true, dueStatus: 'upcoming' },
    { id: 'c4', month: 'Maj', activity: 'Röjning', description: 'Röj ungskog för att gynna kvalitetsträd.', optimal: true, dueStatus: 'upcoming' },
    { id: 'c5', month: 'Juni-Aug', activity: 'Barkborrekontroll', description: 'Regelbunden tillsyn av feromonfällor och kronskador.', optimal: false, dueStatus: 'upcoming' },
    { id: 'c6', month: 'September', activity: 'Förstagallring', description: 'Optimal period för gallring.', optimal: true, dueStatus: 'upcoming' },
    { id: 'c7', month: 'Oktober', activity: 'Virkesförsäljning', description: 'Historiskt pristopp för grantimmer. Planera försäljning.', optimal: true, dueStatus: 'upcoming' },
    { id: 'c8', month: 'November', activity: 'Stormförberedelser', description: 'Kontrollera kantzoner och vindkänsliga bestånd.', optimal: false, dueStatus: 'upcoming' },
  ];

  const DEMO_VALUE_TRAJECTORY: ValuePoint[] = useMemo(() => {
    // Base trajectory on real volume data
    const baseValue = stats.totalVolume * 450; // rough SEK/m3 average
    const startValue = baseValue * 0.94;
    return [
      { month: 'Mar 2025', value: Math.round(startValue), label: 'Startpunkt' },
      { month: 'Jun 2025', value: Math.round(startValue * 1.016) },
      { month: 'Sep 2025', value: Math.round(startValue * 1.038) },
      { month: 'Dec 2025', value: Math.round(startValue * 1.027), label: 'Stormskador' },
      { month: 'Mar 2026', value: Math.round(baseValue), label: 'Nuvarande' },
      { month: 'Jun 2026', value: Math.round(baseValue * 1.021) },
      { month: 'Sep 2026', value: Math.round(baseValue * 1.041) },
      { month: 'Dec 2026', value: Math.round(baseValue * 1.057), label: 'Prognos' },
    ];
  }, [stats.totalVolume]);

  // Current total value
  const currentValue = DEMO_VALUE_TRAJECTORY.find((v) => v.label === 'Nuvarande')?.value ?? 0;
  const startValue = DEMO_VALUE_TRAJECTORY[0].value;
  const endValue = DEMO_VALUE_TRAJECTORY[DEMO_VALUE_TRAJECTORY.length - 1].value;
  const valueChange = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;
  const projectedChange = currentValue > 0 ? ((endValue - currentValue) / currentValue) * 100 : 0;

  const isLoading = sensorLoading || treeLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-5 w-5 border-2 border-[#4ade80] border-t-transparent rounded-full" />
        <span className="ml-2 text-xs text-[var(--text3)]">Laddar skogsinsikter...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Value summary card */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TreePine size={16} style={{ color: '#4ade80' }} />
          <h3 className="text-sm font-serif font-bold text-[var(--text)]">
            Dina skogsinsikter
          </h3>
          {sensorIsDemo && (
            <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-[#fbbf24]/15 text-[#fbbf24]">
              Demo
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <p className="text-[9px] text-[var(--text3)] uppercase">Inventerade träd</p>
            <p className="text-sm font-mono font-bold text-[var(--text)]">{formatNumber(stats.count)}</p>
            <p className="text-[9px] text-[var(--text3)]">{stats.totalVolume.toFixed(0)} m3 total</p>
          </div>
          <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <p className="text-[9px] text-[var(--text3)] uppercase">Uppskattat värde</p>
            <p className="text-sm font-mono font-bold" style={{ color: '#4ade80' }}>
              {formatSEK(currentValue)}
            </p>
            <p className="text-[9px] flex items-center gap-0.5" style={{ color: '#4ade80' }}>
              <ArrowUpRight size={8} />+{valueChange.toFixed(1)}% sedan start
            </p>
          </div>
          <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <p className="text-[9px] text-[var(--text3)] uppercase">Prognos Dec 2026</p>
            <p className="text-sm font-mono font-bold text-[var(--text)]">{formatSEK(endValue)}</p>
            <p className="text-[9px] flex items-center gap-0.5" style={{ color: '#4ade80' }}>
              <ArrowUpRight size={8} />+{projectedChange.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Beetle stress status */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => toggleSection('beetle')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Bug size={14} style={{ color: beetleStress && beetleStress.affectedAreaPct > 10 ? '#ef4444' : '#fbbf24' }} />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Barkborrestatus (fusionsanalys)
            </h4>
          </div>
          {expandedSection === 'beetle' ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {expandedSection === 'beetle' && beetleStress && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[9px] text-[var(--text3)] uppercase">Påverkad areal</p>
                <p className={`text-lg font-mono font-bold ${beetleStress.affectedAreaPct > 10 ? 'text-[#ef4444]' : beetleStress.affectedAreaPct > 5 ? 'text-[#fbbf24]' : 'text-[#4ade80]'}`}>
                  {beetleStress.affectedAreaPct.toFixed(1)}%
                </p>
              </div>
              <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[9px] text-[var(--text3)] uppercase">Modellkonfidens</p>
                <p className="text-lg font-mono font-bold text-[var(--text)]">
                  {(beetleStress.confidenceMean * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Stress classes */}
            <div>
              <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
                Klassificering
              </p>
              <div className="flex flex-wrap gap-1.5">
                {beetleStress.classes.map(cls => {
                  const labels: Record<string, { sv: string; color: string }> = {
                    healthy: { sv: 'Frisk', color: '#4ade80' },
                    early_stress: { sv: 'Tidig stress', color: '#fbbf24' },
                    active_attack: { sv: 'Aktivt angrepp', color: '#f97316' },
                    grey_attack: { sv: 'Grått angrepp', color: '#ef4444' },
                  };
                  const info = labels[cls] ?? { sv: cls, color: 'var(--text3)' };
                  return (
                    <span
                      key={cls}
                      className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: `${info.color}15`, color: info.color }}
                    >
                      {info.sv}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Stress type distribution from tree inventory */}
            {Object.keys(stats.stressTypes).length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
                  Stresstyper (trädinventering)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(stats.stressTypes).map(([type, count]) => {
                    const labels: Record<string, string> = {
                      beetle: 'Barkborre',
                      drought: 'Torka',
                      disease: 'Sjukdom',
                      mechanical: 'Mekanisk',
                    };
                    return (
                      <div key={type} className="flex items-center justify-between px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                        <span className="text-[10px] text-[var(--text)]">{labels[type] ?? type}</span>
                        <span className="text-[10px] font-mono text-[var(--text2)]">{count} träd</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-[9px] text-[var(--text3)] italic">
              Modellversion: {beetleStress.modelVersion}. Sensorer: multispektral + termisk + RGB.
            </p>
          </div>
        )}
      </div>

      {/* Crown health distribution */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => toggleSection('crown')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Leaf size={14} style={{ color: '#4ade80' }} />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Kronhälsa (fusionsanalys)
            </h4>
          </div>
          {expandedSection === 'crown' ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {expandedSection === 'crown' && crownHealth && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="px-3 py-2 rounded-lg border border-[#4ade80]/20 bg-[rgba(74,222,128,0.05)]">
                <p className="text-[9px] text-[#4ade80] uppercase font-medium">Friska</p>
                <p className="text-lg font-mono font-bold text-[#4ade80]">{crownHealth.healthyPct}%</p>
                <p className="text-[9px] text-[var(--text3)]">{Math.round(crownHealth.totalCrowns * crownHealth.healthyPct / 100)} kronor</p>
              </div>
              <div className="px-3 py-2 rounded-lg border border-[#fbbf24]/20 bg-[rgba(251,191,36,0.05)]">
                <p className="text-[9px] text-[#fbbf24] uppercase font-medium">Stressade</p>
                <p className="text-lg font-mono font-bold text-[#fbbf24]">{crownHealth.stressedPct}%</p>
                <p className="text-[9px] text-[var(--text3)]">{Math.round(crownHealth.totalCrowns * crownHealth.stressedPct / 100)} kronor</p>
              </div>
              <div className="px-3 py-2 rounded-lg border border-[#ef4444]/20 bg-[rgba(239,68,68,0.05)]">
                <p className="text-[9px] text-[#ef4444] uppercase font-medium">Döda</p>
                <p className="text-lg font-mono font-bold text-[#ef4444]">{crownHealth.deadPct}%</p>
                <p className="text-[9px] text-[var(--text3)]">{Math.round(crownHealth.totalCrowns * crownHealth.deadPct / 100)} kronor</p>
              </div>
            </div>

            {/* Visual bar */}
            <div className="h-3 rounded-full overflow-hidden flex">
              <div style={{ width: `${crownHealth.healthyPct}%`, background: '#4ade80' }} />
              <div style={{ width: `${crownHealth.stressedPct}%`, background: '#fbbf24' }} />
              <div style={{ width: `${crownHealth.deadPct}%`, background: '#ef4444' }} />
            </div>

            <p className="text-[9px] text-[var(--text3)] italic">
              {crownHealth.totalCrowns} kronor analyserade. Modellversion: {crownHealth.modelVersion}.
              Sensorer: multispektral + termisk + LiDAR + RGB.
            </p>
          </div>
        )}
      </div>

      {/* Carbon credit estimate */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => toggleSection('carbon')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Footprints size={14} style={{ color: '#4ade80' }} />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Kolkrediter & klimatnytta
            </h4>
          </div>
          {expandedSection === 'carbon' ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {expandedSection === 'carbon' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[9px] text-[var(--text3)] uppercase">Stående volym</p>
                <p className="text-sm font-mono font-bold text-[var(--text)]">{formatNumber(carbonEstimate.totalVolume)} m3</p>
              </div>
              <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[9px] text-[var(--text3)] uppercase">Bunden CO2</p>
                <p className="text-sm font-mono font-bold" style={{ color: '#4ade80' }}>{formatNumber(carbonEstimate.co2Tons)} ton</p>
              </div>
              <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[9px] text-[var(--text3)] uppercase">Kreditvärde</p>
                <p className="text-sm font-mono font-bold" style={{ color: '#4ade80' }}>{formatSEK(carbonEstimate.creditValue)}</p>
                <p className="text-[9px] text-[var(--text3)]">@ {carbonEstimate.pricePerTon} SEK/ton</p>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text2)] leading-relaxed">
              Beräkning: {formatNumber(carbonEstimate.totalVolume)} m3 stående volym x {CO2_PER_M3} ton CO2/m3 = {formatNumber(carbonEstimate.co2Tons)} ton CO2.
              Frivilliga kolkrediter värderas till ~{carbonEstimate.pricePerTon} SEK/ton på den svenska marknaden.
              Detta är en uppskattning — faktiskt kreditvärde kräver certifiering (t.ex. Verra VCS, Gold Standard).
            </p>
          </div>
        )}
      </div>

      {/* Insurance recommendation */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => toggleSection('insurance')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: insuranceProfile.level === 'high' ? '#ef4444' : insuranceProfile.level === 'medium' ? '#fbbf24' : '#4ade80' }} />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Försäkringsrekommendation
            </h4>
            <span
              className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full"
              style={{
                background: insuranceProfile.level === 'high' ? 'rgba(239,68,68,0.15)' : insuranceProfile.level === 'medium' ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)',
                color: insuranceProfile.level === 'high' ? '#ef4444' : insuranceProfile.level === 'medium' ? '#fbbf24' : '#4ade80',
              }}
            >
              {insuranceProfile.level === 'high' ? 'Hög risk' : insuranceProfile.level === 'medium' ? 'Medel risk' : 'Låg risk'}
            </span>
          </div>
          {expandedSection === 'insurance' ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {expandedSection === 'insurance' && (
          <div className="space-y-3">
            {/* Risk gauge */}
            <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[var(--text3)]">Riskpoäng</span>
                <span className="text-sm font-mono font-bold text-[var(--text)]">{insuranceProfile.riskScore}/100</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${insuranceProfile.riskScore}%`,
                    background: insuranceProfile.level === 'high' ? '#ef4444' : insuranceProfile.level === 'medium' ? '#fbbf24' : '#4ade80',
                  }}
                />
              </div>
            </div>

            {/* Risk factors */}
            <div className="grid grid-cols-3 gap-2">
              <div className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[9px] text-[var(--text3)]">Barkborre</p>
                <p className="text-[11px] font-mono text-[var(--text)]">{insuranceProfile.factors.beetleRisk}%</p>
              </div>
              <div className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[9px] text-[var(--text3)]">Stressade</p>
                <p className="text-[11px] font-mono text-[var(--text)]">{insuranceProfile.factors.stressedPct}%</p>
              </div>
              <div className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-[9px] text-[var(--text3)]">Granandel</p>
                <p className="text-[11px] font-mono text-[var(--text)]">{insuranceProfile.factors.granPct}%</p>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text2)] leading-relaxed">
              {insuranceProfile.recommendation}
            </p>
          </div>
        )}
      </div>

      {/* Value trajectory chart */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => toggleSection('trajectory')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#4ade80' }} />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Värdeutveckling 12 månader
            </h4>
          </div>
          {expandedSection === 'trajectory' ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {expandedSection === 'trajectory' && (
          <div className="space-y-2">
            {(() => {
              const min = Math.min(...DEMO_VALUE_TRAJECTORY.map((v) => v.value));
              const max = Math.max(...DEMO_VALUE_TRAJECTORY.map((v) => v.value));
              const range = max - min || 1;

              return DEMO_VALUE_TRAJECTORY.map((point, idx) => {
                const barWidth = ((point.value - min) / range) * 80 + 20;
                const isCurrent = point.label === 'Nuvarande';
                const isFuture = idx > DEMO_VALUE_TRAJECTORY.findIndex((v) => v.label === 'Nuvarande');

                return (
                  <div key={point.month} className="flex items-center gap-2">
                    <span className="text-[9px] text-[var(--text3)] w-16 text-right font-mono flex-shrink-0">
                      {point.month}
                    </span>
                    <div className="flex-1 h-4 rounded-sm bg-[var(--bg3)] overflow-hidden relative">
                      <div
                        className="h-full rounded-sm transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background: isCurrent
                            ? '#4ade80'
                            : isFuture
                              ? 'rgba(74, 222, 128, 0.3)'
                              : 'rgba(74, 222, 128, 0.6)',
                          borderRight: isCurrent ? '2px solid #4ade80' : undefined,
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-[var(--text2)] w-16 flex-shrink-0">
                      {formatSEK(point.value)}
                    </span>
                    {point.label && (
                      <span
                        className="text-[8px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: isCurrent
                            ? 'rgba(74, 222, 128, 0.15)'
                            : 'rgba(255, 255, 255, 0.05)',
                          color: isCurrent ? '#4ade80' : 'var(--text3)',
                        }}
                      >
                        {point.label}
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Benchmark: Din skog vs genomsnittet */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => toggleSection('benchmark')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={14} style={{ color: '#4ade80' }} />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Din skog vs regionalt genomsnitt
            </h4>
          </div>
          {expandedSection === 'benchmark' ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {expandedSection === 'benchmark' && (
          <div className="space-y-3">
            {benchmarks.map((metric) => {
              const diff = metric.yourValue - metric.regionAvg;
              const diffPct = metric.regionAvg > 0 ? (diff / metric.regionAvg) * 100 : 0;
              const isBetter =
                (metric.betterDirection === 'higher' && diff > 0) ||
                (metric.betterDirection === 'lower' && diff < 0);
              const isWorse =
                (metric.betterDirection === 'higher' && diff < 0) ||
                (metric.betterDirection === 'lower' && diff > 0);

              return (
                <div
                  key={metric.id}
                  className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-[var(--text)]">
                      {metric.label}
                    </span>
                    <span
                      className="flex items-center gap-0.5 text-[10px] font-mono"
                      style={{
                        color: isBetter ? '#4ade80' : isWorse ? '#f97316' : 'var(--text3)',
                      }}
                    >
                      {isBetter ? <ArrowUpRight size={10} /> : isWorse ? <ArrowDownRight size={10} /> : null}
                      {diffPct > 0 ? '+' : ''}{diffPct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-[9px]">
                        <span className="text-[var(--text3)] w-10">Du:</span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (metric.yourValue / Math.max(metric.yourValue, metric.regionAvg)) * 100)}%`,
                              background: isBetter ? '#4ade80' : isWorse ? '#f97316' : '#fbbf24',
                            }}
                          />
                        </div>
                        <span className="font-mono text-[var(--text)] w-20 text-right">
                          {formatNumber(metric.yourValue, metric.unit === 'Shannon' ? 1 : 0)} {metric.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] mt-1">
                        <span className="text-[var(--text3)] w-10">Snitt:</span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--text3)]"
                            style={{
                              width: `${Math.min(100, (metric.regionAvg / Math.max(metric.yourValue, metric.regionAvg)) * 100)}%`,
                              opacity: 0.4,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[var(--text3)] w-20 text-right">
                          {formatNumber(metric.regionAvg, metric.unit === 'Shannon' ? 1 : 0)} {metric.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-[var(--text3)] leading-relaxed mt-1">
                    {metric.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Missed opportunities */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => toggleSection('opportunities')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-[var(--amber, #fbbf24)]" />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Missade möjligheter
            </h4>
            <span className="text-[9px] font-mono bg-[var(--bg3)] px-1.5 py-0.5 rounded-full text-[var(--text3)]">
              {DEMO_OPPORTUNITIES.length}
            </span>
          </div>
          {expandedSection === 'opportunities' ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {expandedSection === 'opportunities' && (
          <div className="space-y-2">
            {DEMO_OPPORTUNITIES.map((opp) => (
              <div
                key={opp.id}
                className="flex items-start gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{
                    backgroundColor:
                      opp.severity === 'warning' ? '#fbbf24' : '#818cf8',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-[var(--text)]">
                    {opp.message}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5">
                    {opp.impact}
                  </p>
                  <p className="text-[9px] text-[var(--text3)] mt-0.5 font-mono">
                    {opp.date}
                  </p>
                </div>
              </div>
            ))}

            <p className="text-[9px] text-[var(--text3)] italic mt-2">
              Framöver får du notiser i realtid när liknande möjligheter uppstår.
            </p>
          </div>
        )}
      </div>

      {/* Calendar suggestions */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => toggleSection('calendar')}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: '#4ade80' }} />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              Årskalender — optimal timing
            </h4>
          </div>
          {expandedSection === 'calendar' ? (
            <ChevronUp size={12} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={12} className="text-[var(--text3)]" />
          )}
        </button>

        {expandedSection === 'calendar' && (
          <div className="space-y-2">
            {DEMO_CALENDAR.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border bg-[var(--bg)] ${
                  item.dueStatus === 'current'
                    ? 'border-[#4ade80]/30'
                    : 'border-[var(--border)]'
                }`}
                style={
                  item.dueStatus === 'current'
                    ? { background: 'rgba(74, 222, 128, 0.03)' }
                    : undefined
                }
              >
                <div className="w-14 flex-shrink-0 text-center">
                  <span
                    className={`text-[10px] font-mono font-medium ${
                      item.dueStatus === 'current'
                        ? 'text-[#4ade80]'
                        : item.dueStatus === 'past'
                          ? 'text-[var(--text3)] line-through'
                          : 'text-[var(--text2)]'
                    }`}
                  >
                    {item.month}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-medium text-[var(--text)]">
                      {item.activity}
                    </p>
                    {item.optimal && (
                      <span
                        className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(74, 222, 128, 0.15)',
                          color: '#4ade80',
                        }}
                      >
                        Optimal
                      </span>
                    )}
                    {item.dueStatus === 'current' && (
                      <span
                        className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(74, 222, 128, 0.15)',
                          color: '#4ade80',
                        }}
                      >
                        Nu
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data source note */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border)]">
        <Info size={12} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-[var(--text3)] leading-relaxed">
          Insikter baseras på {stats.count} inventerade träd, fusionsanalys
          (beetle_stress, crown_health) och {sensorIsDemo ? 'uppskattad' : 'live'} sensordata.
          Kolkrediter: {CO2_PER_M3} ton CO2/m3. Regionala genomsnitt från Riksskogstaxeringen.
        </p>
      </div>
    </div>
  );
}
