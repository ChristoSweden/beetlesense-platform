import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Calculator,
  MapPin,
  Calendar,
  Fence,
  TreePine,
  CircleDollarSign,
  ChevronDown,
  ChevronUp,
  Info,
  Camera,
  Crosshair,
} from 'lucide-react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// ─── Types ───

interface BoarDamageRecord {
  month: string; // YYYY-MM
  rootingAreaPct: number;
  seedlingsDestroyed: number;
  rootDamageSeverity: 'none' | 'light' | 'moderate' | 'severe';
  estimatedCostSEK: number;
  sightings: number;
}

interface ParcelBoarAssessment {
  parcelId: string;
  parcelName: string;
  areaHa: number;
  municipality: string;
  elevationM: number;
  soilType: string;
  proximityToAgricultureKm: number;
  forestAge: 'newly_planted' | 'young' | 'middle_aged' | 'mature';
  riskScore: number; // 1-10
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  damageHistory: BoarDamageRecord[];
  currentDamage: {
    rootingAreaPct: number;
    seedlingsDestroyed: number;
    rootDamageSeverity: 'none' | 'light' | 'moderate' | 'severe';
  };
  estimatedAnnualDamageSEK: number;
  perimeterM: number;
  photoEvidence: { id: string; label: string; date: string }[];
}

type SeasonRisk = 'LOW' | 'MEDIUM' | 'MEDIUM-HIGH' | 'HIGH';

interface SeasonInfo {
  season: string;
  months: string;
  risk: SeasonRisk;
  description: string;
  recommendations: string[];
}

// ─── Risk calculation helpers ───

function computeRiskScore(
  soilSoftness: number,   // 0-1
  agriProximity: number,  // 0-1 (closer = higher)
  elevation: number,      // 0-1 (lower = higher risk)
  historicalDamage: number, // 0-1
  forestAge: number,      // 0-1 (younger = higher risk)
): number {
  const weighted =
    soilSoftness * 0.30 +
    agriProximity * 0.25 +
    elevation * 0.15 +
    historicalDamage * 0.20 +
    forestAge * 0.10;
  return Math.round(Math.min(10, Math.max(1, weighted * 10)));
}

function riskLevelFromScore(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score <= 3) return 'Low';
  if (score <= 5) return 'Medium';
  if (score <= 7) return 'High';
  return 'Critical';
}

function riskColor(level: string): string {
  switch (level) {
    case 'Low': return 'var(--green)';
    case 'Medium': return '#F9A825';
    case 'High': return '#E65100';
    case 'Critical': return '#C62828';
    default: return 'var(--text3)';
  }
}

function severityLabel(s: string): string {
  switch (s) {
    case 'none': return 'None';
    case 'light': return 'Light';
    case 'moderate': return 'Moderate';
    case 'severe': return 'Severe';
    default: return s;
  }
}

/** Approximate perimeter from hectares (assuming roughly square) */
function perimeterFromHa(ha: number): number {
  const areaM2 = ha * 10000;
  const side = Math.sqrt(areaM2);
  return Math.round(4 * side);
}

/** Format SEK with thousands separator */
function fmtSEK(n: number): string {
  return n.toLocaleString('sv-SE', { maximumFractionDigits: 0 });
}

// ─── Demo data generator ───

function generateDemoData(parcels: DemoParcel[]): ParcelBoarAssessment[] {
  const configs: {
    parcelId: string;
    proximityKm: number;
    forestAge: ParcelBoarAssessment['forestAge'];
    soilSoftness: number;
    historicalDmg: number;
    avgSeedlings: number;
    avgRooting: number;
    avgCost: number;
    avgSightings: number;
    rootSeverity: 'none' | 'light' | 'moderate' | 'severe';
  }[] = [
    // p1 — Norra Skogen: heavy damage, newly planted area near agriculture
    { parcelId: 'p1', proximityKm: 0.3, forestAge: 'newly_planted', soilSoftness: 0.85, historicalDmg: 0.9, avgSeedlings: 320, avgRooting: 18, avgCost: 42000, avgSightings: 12, rootSeverity: 'severe' },
    // p4 — Granudden: heavy damage, young forest near farmland
    { parcelId: 'p4', proximityKm: 0.5, forestAge: 'young', soilSoftness: 0.75, historicalDmg: 0.85, avgSeedlings: 210, avgRooting: 14, avgCost: 35000, avgSightings: 9, rootSeverity: 'severe' },
    // p2 — Ekbacken: moderate damage (oak acorns attract boar)
    { parcelId: 'p2', proximityKm: 1.2, forestAge: 'middle_aged', soilSoftness: 0.65, historicalDmg: 0.55, avgSeedlings: 45, avgRooting: 8, avgCost: 18000, avgSightings: 6, rootSeverity: 'moderate' },
    // p5 — Björklund: moderate damage (peat soil)
    { parcelId: 'p5', proximityKm: 2.0, forestAge: 'middle_aged', soilSoftness: 0.80, historicalDmg: 0.45, avgSeedlings: 30, avgRooting: 6, avgCost: 14000, avgSightings: 4, rootSeverity: 'moderate' },
    // p3 — Tallmon: minimal damage (mature, high elevation, sandy soil)
    { parcelId: 'p3', proximityKm: 4.5, forestAge: 'mature', soilSoftness: 0.25, historicalDmg: 0.10, avgSeedlings: 5, avgRooting: 1, avgCost: 3200, avgSightings: 1, rootSeverity: 'light' },
  ];

  const months = [
    '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09',
    '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
  ];

  // Seasonal multipliers (spring/autumn high, summer lower, winter medium-high)
  const seasonalMult: Record<string, number> = {
    '2025-04': 1.4, '2025-05': 1.3, '2025-06': 0.6, '2025-07': 0.5,
    '2025-08': 0.7, '2025-09': 1.2, '2025-10': 1.5, '2025-11': 1.3,
    '2025-12': 1.0, '2026-01': 0.9, '2026-02': 0.8, '2026-03': 1.1,
  };

  return configs.map(cfg => {
    const parcel = parcels.find(p => p.id === cfg.parcelId)!;
    const elevNorm = 1 - Math.min(1, parcel.elevation_m / 400);
    const agriNorm = 1 - Math.min(1, cfg.proximityKm / 5);
    const ageNorm = cfg.forestAge === 'newly_planted' ? 1.0
      : cfg.forestAge === 'young' ? 0.7
      : cfg.forestAge === 'middle_aged' ? 0.4
      : 0.1;

    const score = computeRiskScore(
      cfg.soilSoftness, agriNorm, elevNorm, cfg.historicalDmg, ageNorm,
    );

    const damageHistory: BoarDamageRecord[] = months.map(m => {
      const mult = seasonalMult[m] || 1;
      const jitter = 0.8 + Math.random() * 0.4; // deterministic-ish spread
      return {
        month: m,
        rootingAreaPct: Math.round(cfg.avgRooting * mult * jitter * 10) / 10,
        seedlingsDestroyed: Math.round(cfg.avgSeedlings * mult * jitter / 12),
        rootDamageSeverity: mult > 1.2 ? cfg.rootSeverity : mult > 0.7 ? 'moderate' : 'light',
        estimatedCostSEK: Math.round(cfg.avgCost * mult * jitter / 12),
        sightings: Math.max(0, Math.round(cfg.avgSightings * mult * jitter / 3)),
      };
    });

    const annualDamage = damageHistory.reduce((s, d) => s + d.estimatedCostSEK, 0);
    const latestMonth = damageHistory[damageHistory.length - 1];
    const perim = perimeterFromHa(parcel.area_hectares);

    return {
      parcelId: cfg.parcelId,
      parcelName: parcel.name,
      areaHa: parcel.area_hectares,
      municipality: parcel.municipality,
      elevationM: parcel.elevation_m,
      soilType: parcel.soil_type,
      proximityToAgricultureKm: cfg.proximityKm,
      forestAge: cfg.forestAge,
      riskScore: score,
      riskLevel: riskLevelFromScore(score),
      damageHistory,
      currentDamage: {
        rootingAreaPct: latestMonth.rootingAreaPct,
        seedlingsDestroyed: latestMonth.seedlingsDestroyed,
        rootDamageSeverity: latestMonth.rootDamageSeverity,
      },
      estimatedAnnualDamageSEK: annualDamage,
      perimeterM: perim,
      photoEvidence: cfg.historicalDmg > 0.5 ? [
        { id: `${cfg.parcelId}-photo-1`, label: 'Rooting damage near planting site', date: '2026-03-15' },
        { id: `${cfg.parcelId}-photo-2`, label: 'Seedling destruction', date: '2026-03-10' },
        { id: `${cfg.parcelId}-photo-3`, label: 'Trail camera capture', date: '2026-02-28' },
      ] : [
        { id: `${cfg.parcelId}-photo-1`, label: 'Minor ground disturbance', date: '2026-02-20' },
      ],
    };
  });
}

// ─── Seasonal calendar data ───

const SEASONAL_DATA: SeasonInfo[] = [
  {
    season: 'Spring',
    months: 'March - May',
    risk: 'HIGH',
    description: 'Soft ground after snowmelt makes rooting easy. Newly planted seedlings are extremely vulnerable.',
    recommendations: [
      'Inspect all newly planted areas weekly',
      'Deploy temporary electric fencing around recent plantings',
      'Coordinate with local hunting teams (jaktlag) for spring drives',
      'Report damage to Länsstyrelsen within 2 weeks for compensation eligibility',
    ],
  },
  {
    season: 'Summer',
    months: 'June - August',
    risk: 'MEDIUM',
    description: 'Food is abundant in agricultural fields, reducing forest pressure. Damage usually limited to shaded areas.',
    recommendations: [
      'Maintain fence lines — vegetation growth can short-circuit electric fences',
      'Monitor edges adjacent to crop fields',
      'Document any damage with photos for autumn reporting',
    ],
  },
  {
    season: 'Autumn',
    months: 'September - November',
    risk: 'HIGH',
    description: 'Acorn and beechnut foraging drives intense activity. Root systems of established trees can be damaged.',
    recommendations: [
      'Intensify monitoring in oak/beech stands',
      'Coordinate autumn hunting drives with neighbors',
      'Install or reactivate electric fencing before September',
      'Apply for Viltskadeersättning (wildlife damage compensation) if thresholds met',
    ],
  },
  {
    season: 'Winter',
    months: 'December - February',
    risk: 'MEDIUM-HIGH',
    description: 'Limited natural food pushes boar into forests. Frozen ground reduces rooting but root damage can still occur.',
    recommendations: [
      'Maintain supplemental feeding stations away from valuable stands',
      'Check fences for snow/ice damage monthly',
      'Plan spring protection measures — order seedling tubes/mesh in advance',
    ],
  },
];

// ─── Fence ROI Calculator logic ───

interface FenceCalcInputs {
  perimeterM: number;
  annualDamageSEK: number;
  fenceType: 'standard' | 'electric';
}

interface FenceCalcResult {
  installCost: number;
  annualMaintenance: number;
  paybackYears: number;
  fiveYearWithFence: number;
  fiveYearWithout: number;
  fiveYearSavings: number;
}

function calculateFenceROI(inputs: FenceCalcInputs): FenceCalcResult {
  const costPerM = inputs.fenceType === 'electric' ? 60 : 32; // SEK/m (mid-range)
  const laborMultiplier = 1.4; // 40% labor on top of materials
  const installCost = Math.round(inputs.perimeterM * costPerM * laborMultiplier);
  const annualMaintenance = inputs.fenceType === 'electric'
    ? Math.round(inputs.perimeterM * 3.5) // ~3.5 SEK/m/year for electric
    : Math.round(inputs.perimeterM * 1.5); // ~1.5 SEK/m/year for standard

  const annualSaved = inputs.annualDamageSEK * 0.85; // fencing prevents ~85% of damage
  const netAnnualBenefit = annualSaved - annualMaintenance;
  const paybackYears = netAnnualBenefit > 0
    ? Math.round((installCost / netAnnualBenefit) * 10) / 10
    : 99;

  const fiveYearWithout = inputs.annualDamageSEK * 5;
  const fiveYearWithFence = installCost + (annualMaintenance * 5) + (inputs.annualDamageSEK * 0.15 * 5);
  const fiveYearSavings = fiveYearWithout - fiveYearWithFence;

  return { installCost, annualMaintenance, paybackYears, fiveYearWithFence, fiveYearWithout, fiveYearSavings };
}

// ─── Main Page Component ───

export default function WildBoarDamagePage() {
  const assessments = useMemo(() => generateDemoData(DEMO_PARCELS), []);
  const [expandedParcel, setExpandedParcel] = useState<string | null>(null);
  const [calcParcelId, setCalcParcelId] = useState(assessments[0].parcelId);
  const [fenceType, setFenceType] = useState<'standard' | 'electric'>('electric');

  // ─── Dashboard summaries ───
  const totalDamage = assessments.reduce((s, a) => s + a.estimatedAnnualDamageSEK, 0);
  const affectedHa = assessments.filter(a => a.riskScore >= 4).reduce((s, a) => s + a.areaHa, 0);
  const criticalCount = assessments.filter(a => a.riskLevel === 'Critical' || a.riskLevel === 'High').length;

  // Damage trend: compare last 3 months to preceding 3 months
  const trend = useMemo(() => {
    let recent = 0, earlier = 0;
    assessments.forEach(a => {
      a.damageHistory.slice(-3).forEach(d => (recent += d.estimatedCostSEK));
      a.damageHistory.slice(-6, -3).forEach(d => (earlier += d.estimatedCostSEK));
    });
    if (recent > earlier * 1.1) return 'increasing';
    if (recent < earlier * 0.9) return 'decreasing';
    return 'stable';
  }, [assessments]);

  // ROI calculator
  const calcParcel = assessments.find(a => a.parcelId === calcParcelId)!;
  const roiResult = calculateFenceROI({
    perimeterM: calcParcel.perimeterM,
    annualDamageSEK: calcParcel.estimatedAnnualDamageSEK,
    fenceType,
  });

  // Current month for seasonal calendar highlight
  const currentMonthIdx = new Date().getMonth(); // 0-11
  const currentSeasonIdx = currentMonthIdx < 2 ? 3 : currentMonthIdx < 5 ? 0 : currentMonthIdx < 8 ? 1 : currentMonthIdx < 11 ? 2 : 3;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-5 lg:p-8">

        {/* ═══ Header ═══ */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#E65100]/10 border border-[#E65100]/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-[#E65100]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Vildsvinsskador — Wild Boar Damage Assessment
              </h1>
              <p className="text-xs text-[var(--text3)]">
                Risk analysis, damage estimates, and mitigation planning for wild boar (Sus scrofa)
              </p>
            </div>
          </div>
        </div>

        {/* ═══ 1. DAMAGE OVERVIEW DASHBOARD ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {/* Total damage */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
              Total Annual Damage
            </p>
            <p className="text-2xl font-bold font-mono text-[#C62828]">
              {fmtSEK(totalDamage)}
            </p>
            <p className="text-[10px] text-[var(--text3)]">SEK estimated</p>
          </div>

          {/* Affected area */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
              Affected Area
            </p>
            <p className="text-2xl font-bold font-mono text-[#E65100]">
              {affectedHa.toFixed(1)}
            </p>
            <p className="text-[10px] text-[var(--text3)]">hectares at risk</p>
          </div>

          {/* High/Critical parcels */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
              High/Critical Parcels
            </p>
            <p className="text-2xl font-bold font-mono" style={{ color: criticalCount > 0 ? '#C62828' : 'var(--green)' }}>
              {criticalCount} / {assessments.length}
            </p>
            <p className="text-[10px] text-[var(--text3)]">require action</p>
          </div>

          {/* Damage trend */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
              Damage Trend
            </p>
            <div className="flex items-center gap-2">
              {trend === 'increasing' && <TrendingUp size={20} className="text-[#C62828]" />}
              {trend === 'decreasing' && <TrendingDown size={20} className="text-[var(--green)]" />}
              {trend === 'stable' && <Minus size={20} className="text-[#F9A825]" />}
              <p className="text-lg font-bold capitalize text-[var(--text)]">{trend}</p>
            </div>
            <p className="text-[10px] text-[var(--text3)]">vs. previous quarter</p>
          </div>
        </div>

        {/* ═══ 2. PER-PARCEL RISK ASSESSMENT ═══ */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin size={14} />
            Per-Parcel Risk Assessment
          </h2>
          <div className="space-y-3">
            {assessments.map(a => {
              const isExpanded = expandedParcel === a.parcelId;
              return (
                <div
                  key={a.parcelId}
                  className="rounded-xl border border-[var(--border)] overflow-hidden"
                  style={{ background: 'var(--bg2)' }}
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedParcel(isExpanded ? null : a.parcelId)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg3)] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: riskColor(a.riskLevel) }}
                      >
                        {a.riskScore}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text)] truncate">
                          {a.parcelName}
                        </p>
                        <p className="text-[10px] text-[var(--text3)]">
                          {a.areaHa} ha &middot; {a.municipality} &middot; {a.elevationM}m
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: riskColor(a.riskLevel),
                          background: `${riskColor(a.riskLevel)}15`,
                          border: `1px solid ${riskColor(a.riskLevel)}30`,
                        }}
                      >
                        {a.riskLevel}
                      </span>
                      <span className="text-sm font-mono font-bold text-[var(--text)]">
                        {fmtSEK(a.estimatedAnnualDamageSEK)} SEK/yr
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Risk factors */}
                        <div>
                          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">Risk Factors</p>
                          <ul className="text-xs text-[var(--text2)] space-y-1">
                            <li>Soil: {a.soilType} (softness factor: {a.soilType === 'Peat' ? 'high' : a.soilType === 'Clay' ? 'high' : a.soilType === 'Moraine' ? 'medium-high' : 'low'})</li>
                            <li>Agriculture proximity: {a.proximityToAgricultureKm} km</li>
                            <li>Forest age: {a.forestAge.replace('_', ' ')}</li>
                            <li>Elevation: {a.elevationM}m</li>
                            <li>Perimeter: {fmtSEK(a.perimeterM)}m</li>
                          </ul>
                        </div>

                        {/* Current damage */}
                        <div>
                          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">Current Damage</p>
                          <ul className="text-xs text-[var(--text2)] space-y-1">
                            <li>Rooting: <span className="font-mono font-bold">{a.currentDamage.rootingAreaPct}%</span> of area</li>
                            <li>Seedlings destroyed: <span className="font-mono font-bold">{a.currentDamage.seedlingsDestroyed}</span> this month</li>
                            <li>Root damage: <span className="font-bold" style={{ color: a.currentDamage.rootDamageSeverity === 'severe' ? '#C62828' : a.currentDamage.rootDamageSeverity === 'moderate' ? '#E65100' : 'var(--text2)' }}>{severityLabel(a.currentDamage.rootDamageSeverity)}</span></li>
                          </ul>
                        </div>

                        {/* Cost breakdown */}
                        <div>
                          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">Cost Estimate Basis</p>
                          <ul className="text-xs text-[var(--text2)] space-y-1">
                            <li>Seedling replacement: 15-25 SEK/plant</li>
                            <li>Replanting labor: 3-5 SEK/plant</li>
                            <li>Site prep: 2,000-4,000 SEK/ha</li>
                            <li className="font-bold text-[var(--text)]">Annual total: {fmtSEK(a.estimatedAnnualDamageSEK)} SEK</li>
                          </ul>
                        </div>
                      </div>

                      {/* 12-month damage chart (text-based bar) */}
                      <div className="mb-4">
                        <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">12-Month Damage History</p>
                        <div className="grid grid-cols-12 gap-1">
                          {a.damageHistory.map(d => {
                            const maxCost = Math.max(...a.damageHistory.map(x => x.estimatedCostSEK));
                            const heightPct = maxCost > 0 ? (d.estimatedCostSEK / maxCost) * 100 : 0;
                            const barColor = heightPct > 70 ? '#C62828' : heightPct > 40 ? '#E65100' : '#F9A825';
                            return (
                              <div key={d.month} className="flex flex-col items-center">
                                <div className="w-full h-16 flex items-end justify-center">
                                  <div
                                    className="w-full max-w-[20px] rounded-t"
                                    style={{ height: `${Math.max(4, heightPct)}%`, background: barColor }}
                                    title={`${d.month}: ${fmtSEK(d.estimatedCostSEK)} SEK`}
                                  />
                                </div>
                                <p className="text-[8px] text-[var(--text3)] mt-1">
                                  {d.month.slice(5)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Photo evidence */}
                      <div>
                        <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Camera size={10} /> Photo Evidence
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {a.photoEvidence.map(photo => (
                            <div
                              key={photo.id}
                              className="w-24 h-20 rounded-lg border border-[var(--border)] flex flex-col items-center justify-center text-center p-1"
                              style={{ background: 'var(--bg)' }}
                            >
                              <Camera size={16} className="text-[var(--text3)] mb-1" />
                              <p className="text-[7px] text-[var(--text3)] leading-tight">{photo.label}</p>
                              <p className="text-[7px] text-[var(--text3)]">{photo.date}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ 3. SEASONAL RISK CALENDAR ═══ */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} />
            Seasonal Risk Calendar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {SEASONAL_DATA.map((s, idx) => {
              const isCurrent = idx === currentSeasonIdx;
              const rColor = s.risk === 'HIGH' ? '#C62828' : s.risk === 'MEDIUM-HIGH' ? '#E65100' : '#F9A825';
              return (
                <div
                  key={s.season}
                  className="rounded-xl border p-4"
                  style={{
                    background: isCurrent ? `${rColor}08` : 'var(--bg2)',
                    borderColor: isCurrent ? `${rColor}40` : 'var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-[var(--text)]">{s.season}</p>
                    <div className="flex items-center gap-1">
                      {isCurrent && (
                        <span className="text-[8px] font-bold bg-[var(--green)] text-white px-1.5 py-0.5 rounded-full uppercase">
                          Now
                        </span>
                      )}
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: rColor, background: `${rColor}15`, border: `1px solid ${rColor}30` }}
                      >
                        {s.risk}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mb-1">{s.months}</p>
                  <p className="text-xs text-[var(--text2)] mb-3">{s.description}</p>
                  <ul className="space-y-1">
                    {s.recommendations.map((r, i) => (
                      <li key={i} className="text-[10px] text-[var(--text2)] flex gap-1.5">
                        <span className="text-[var(--green)] flex-shrink-0 mt-0.5">&#x2022;</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ 4. MITIGATION RECOMMENDATIONS ═══ */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield size={14} />
            Mitigation Recommendations
          </h2>
          <div className="space-y-3">
            {assessments.filter(a => a.riskScore >= 4).map(a => (
              <div
                key={a.parcelId}
                className="rounded-xl border border-[var(--border)] p-4"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: riskColor(a.riskLevel) }}
                  >
                    {a.riskScore}
                  </div>
                  <p className="text-sm font-semibold text-[var(--text)]">{a.parcelName}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Physical barriers */}
                  <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
                    <p className="text-xs font-semibold text-[var(--text)] mb-1 flex items-center gap-1.5">
                      <Fence size={12} /> Physical Barriers
                    </p>
                    <p className="text-[10px] text-[var(--text2)] mb-1">
                      Standard wildlife fence: ~{fmtSEK(a.perimeterM * 32)} SEK ({a.perimeterM}m @ 25-40 SEK/m)
                    </p>
                    <p className="text-[10px] text-[var(--text2)]">
                      Electric fence: ~{fmtSEK(a.perimeterM * 60)} SEK ({a.perimeterM}m @ 50-70 SEK/m)
                    </p>
                  </div>

                  {/* Hunting coordination */}
                  <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
                    <p className="text-xs font-semibold text-[var(--text)] mb-1 flex items-center gap-1.5">
                      <Crosshair size={12} /> Hunting Coordination
                    </p>
                    <p className="text-[10px] text-[var(--text2)]">
                      Contact local jaktlag (hunting team) in {a.municipality}. Wild boar can be hunted year-round
                      in Sweden. Coordinate driven hunts during peak damage periods (spring/autumn).
                    </p>
                  </div>

                  {/* Seedling protection */}
                  <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
                    <p className="text-xs font-semibold text-[var(--text)] mb-1 flex items-center gap-1.5">
                      <TreePine size={12} /> Seedling Protection
                    </p>
                    <p className="text-[10px] text-[var(--text2)]">
                      Individual tree tubes: 8-15 SEK/unit. Wire mesh guards: 12-20 SEK/unit.
                      Estimated for {a.parcelName}: {fmtSEK(Math.round(a.areaHa * 2000 * 12))} SEK
                      ({Math.round(a.areaHa * 2000)} seedlings @ ~12 SEK/guard).
                    </p>
                  </div>

                  {/* Compensation */}
                  <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
                    <p className="text-xs font-semibold text-[var(--text)] mb-1 flex items-center gap-1.5">
                      <CircleDollarSign size={12} /> Damage Compensation
                    </p>
                    <p className="text-[10px] text-[var(--text2)]">
                      Report to Länsstyrelsen {a.municipality} within 14 days of discovery.
                      Viltskadeersättning available when damage exceeds 1/20 of expected yield.
                      Estimated eligible: {fmtSEK(Math.round(a.estimatedAnnualDamageSEK * 0.6))} SEK.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 5. ELECTRIC FENCE ROI CALCULATOR ═══ */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calculator size={14} />
            Electric Fence ROI Calculator
          </h2>
          <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
                  Parcel
                </label>
                <select
                  value={calcParcelId}
                  onChange={e => setCalcParcelId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm px-3 py-2"
                >
                  {assessments.map(a => (
                    <option key={a.parcelId} value={a.parcelId}>
                      {a.parcelName} ({a.areaHa} ha)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
                  Perimeter (auto-calculated)
                </label>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm px-3 py-2 font-mono">
                  {fmtSEK(calcParcel.perimeterM)} m
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
                  Fence Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFenceType('standard')}
                    className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                      fenceType === 'standard'
                        ? 'bg-[var(--green)] text-white border-[var(--green)]'
                        : 'border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]'
                    }`}
                  >
                    Standard (25-40 SEK/m)
                  </button>
                  <button
                    onClick={() => setFenceType('electric')}
                    className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                      fenceType === 'electric'
                        ? 'bg-[var(--green)] text-white border-[var(--green)]'
                        : 'border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]'
                    }`}
                  >
                    Electric (50-70 SEK/m)
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="rounded-lg border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
                <p className="text-[10px] font-semibold text-[var(--text3)] uppercase mb-1">Installation Cost</p>
                <p className="text-lg font-bold font-mono text-[var(--text)]">{fmtSEK(roiResult.installCost)}</p>
                <p className="text-[10px] text-[var(--text3)]">SEK one-time</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
                <p className="text-[10px] font-semibold text-[var(--text3)] uppercase mb-1">Annual Maintenance</p>
                <p className="text-lg font-bold font-mono text-[var(--text)]">{fmtSEK(roiResult.annualMaintenance)}</p>
                <p className="text-[10px] text-[var(--text3)]">SEK / year</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
                <p className="text-[10px] font-semibold text-[var(--text3)] uppercase mb-1">Payback Period</p>
                <p className="text-lg font-bold font-mono" style={{ color: roiResult.paybackYears <= 3 ? 'var(--green)' : roiResult.paybackYears <= 6 ? '#F9A825' : '#C62828' }}>
                  {roiResult.paybackYears < 99 ? `${roiResult.paybackYears} yr` : 'N/A'}
                </p>
                <p className="text-[10px] text-[var(--text3)]">to break even</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
                <p className="text-[10px] font-semibold text-[var(--text3)] uppercase mb-1">5-Year Savings</p>
                <p className="text-lg font-bold font-mono" style={{ color: roiResult.fiveYearSavings > 0 ? 'var(--green)' : '#C62828' }}>
                  {roiResult.fiveYearSavings > 0 ? '+' : ''}{fmtSEK(roiResult.fiveYearSavings)}
                </p>
                <p className="text-[10px] text-[var(--text3)]">SEK net benefit</p>
              </div>
            </div>

            {/* 5-year comparison */}
            <div className="rounded-lg border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
              <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-3">5-Year Cost Comparison</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#C62828] font-semibold">Without fence (damage only)</span>
                    <span className="font-mono font-bold text-[var(--text)]">{fmtSEK(roiResult.fiveYearWithout)} SEK</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--bg2)] overflow-hidden">
                    <div className="h-full rounded-full bg-[#C62828]" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--green)] font-semibold">With fence (install + maintain + residual)</span>
                    <span className="font-mono font-bold text-[var(--text)]">{fmtSEK(roiResult.fiveYearWithFence)} SEK</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--bg2)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--green)]"
                      style={{ width: `${Math.min(100, (roiResult.fiveYearWithFence / roiResult.fiveYearWithout) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text3)] mt-2 flex items-center gap-1">
                <Info size={10} />
                Assumes fencing prevents ~85% of wild boar damage. Actual results vary by terrain and maintenance.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 6. POPULATION HEATMAP ═══ */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Crosshair size={14} />
            Population Density Indicator
          </h2>
          <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
            <p className="text-xs text-[var(--text3)] mb-4">
              Relative wild boar density based on sighting frequency, damage indicators, and proximity to agricultural areas.
            </p>
            <div className="space-y-2">
              {assessments
                .sort((a, b) => b.riskScore - a.riskScore)
                .map(a => {
                  const totalSightings = a.damageHistory.reduce((s, d) => s + d.sightings, 0);
                  const maxSightings = Math.max(...assessments.map(x => x.damageHistory.reduce((s, d) => s + d.sightings, 0)));
                  const densityPct = maxSightings > 0 ? (totalSightings / maxSightings) * 100 : 0;
                  const barColor = densityPct > 70 ? '#C62828' : densityPct > 40 ? '#E65100' : densityPct > 20 ? '#F9A825' : 'var(--green)';
                  return (
                    <div key={a.parcelId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text2)]">
                          {a.parcelName}
                          <span className="text-[var(--text3)] ml-2">
                            {totalSightings} sightings (12 mo)
                          </span>
                        </span>
                        <span className="font-mono font-bold" style={{ color: barColor }}>
                          {a.riskScore}/10
                        </span>
                      </div>
                      <div className="h-4 rounded-full bg-[var(--bg)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, densityPct)}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[var(--green)]" />
                <span className="text-[10px] text-[var(--text3)]">Low</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#F9A825]" />
                <span className="text-[10px] text-[var(--text3)]">Moderate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#E65100]" />
                <span className="text-[10px] text-[var(--text3)]">High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#C62828]" />
                <span className="text-[10px] text-[var(--text3)]">Critical</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Context / Sources ═══ */}
        <section className="mb-8">
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Info size={10} /> Data Sources & Methodology
            </p>
            <ul className="text-[10px] text-[var(--text3)] space-y-1">
              <li>Damage costs based on Skogsstyrelsen rates: seedling replacement 15-25 SEK, replanting labor 3-5 SEK/plant, site preparation 2,000-4,000 SEK/ha.</li>
              <li>Fencing costs: standard wildlife fence 25-40 SEK/m, electric fence 50-70 SEK/m (Swedish market 2025-2026 pricing).</li>
              <li>Risk scoring: weighted factors — soil softness (30%), proximity to agriculture (25%), historical damage (20%), elevation (15%), forest age (10%).</li>
              <li>Swedish wild boar population estimated at 300,000+ (Naturvårdsverket). Southern Sweden (Götaland) has highest density.</li>
              <li>Compensation programs: Viltskadeersättning via Länsstyrelsen, requires documentation within 14 days.</li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}
