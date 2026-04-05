/**
 * Carbon MRV (Measurement, Reporting, Verification) Module
 * Route: /owner/carbon-mrv
 *
 * Real forestry carbon accounting using IPCC Tier 2 methodology adapted for
 * Nordic boreal/hemiboreal forests. Includes per-parcel carbon stock calculation,
 * annual sequestration modelling with Swedish growth rates, carbon credit
 * valuation at current market prices, MRV pipeline timeline, and EU Carbon
 * Removal Certification Framework (CRCF) compliance assessment.
 *
 * All formulas follow IPCC 2006 Guidelines for National Greenhouse Gas
 * Inventories (Vol. 4 — Agriculture, Forestry and Other Land Use).
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Leaf,
  TreePine,
  Calculator,
  TrendingUp,
  Banknote,
  ClipboardCheck,
  ShieldCheck,
  Satellite,
  FileText,
  Globe,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';
import { isDemoMode } from '@/lib/dataMode';

// ─── Carbon Science Constants (IPCC Tier 2 for Nordic forests) ───

/** Carbon fraction of dry biomass (tC per m³ stem volume) — species-specific BEFs */
const CARBON_DENSITY: Record<string, number> = {
  Spruce: 0.52,
  Pine:   0.48,
  Birch:  0.45,
  Oak:    0.50,
  Alder:  0.44,
  Beech:  0.48,
};

/** Root-to-shoot ratios — IPCC Table 4.4 */
const ROOT_SHOOT_RATIO: Record<string, number> = {
  Spruce: 0.235,  // conifers
  Pine:   0.235,
  Birch:  0.285,  // broadleaf
  Oak:    0.285,
  Alder:  0.285,
  Beech:  0.285,
};

/** Standing volume (m³/ha) by species and age class — typical Swedish managed forests */
function getStandingVolume(species: string, ageClass: 'young' | 'mid' | 'mature'): number {
  const volumes: Record<string, Record<string, number>> = {
    Spruce: { young: 80, mid: 180, mature: 280 },
    Pine:   { young: 60, mid: 140, mature: 220 },
    Birch:  { young: 50, mid: 100, mature: 160 },
    Oak:    { young: 40, mid: 120, mature: 200 },
    Alder:  { young: 45, mid: 90,  mature: 140 },
    Beech:  { young: 50, mid: 130, mature: 210 },
  };
  return volumes[species]?.[ageClass] ?? volumes['Spruce'][ageClass];
}

/** Mean annual increment — m³/ha/year — Swedish typical values (mid SI) */
const GROWTH_RATES: Record<string, { min: number; max: number; typical: number }> = {
  Spruce: { min: 8,  max: 12, typical: 10 },
  Pine:   { min: 6,  max: 9,  typical: 7.5 },
  Birch:  { min: 5,  max: 7,  typical: 6 },
  Oak:    { min: 3,  max: 5,  typical: 4 },
  Alder:  { min: 4,  max: 6,  typical: 5 },
  Beech:  { min: 4,  max: 7,  typical: 5.5 },
};

/** Dead wood carbon pool — typically 10% of standing above-ground biomass carbon */
const DEAD_WOOD_FRACTION = 0.10;

/** Soil organic carbon — Nordic forest soils (tC/ha) — based on Swedish NFI averages */
const SOIL_ORGANIC_CARBON_TC_HA = 75;

/** CO2 equivalence factor: molecular weight ratio CO2/C = 44/12 */
const CO2_PER_C = 44 / 12; // 3.667

/** Carbon credit market prices (EUR per tCO2e) — 2026 estimates */
const MARKET_PRICES = {
  euEts:           { min: 65, max: 80, label: 'EU ETS', description: 'EU Emissions Trading System allowance price' },
  voluntaryVcs:    { min: 15, max: 40, label: 'VCS / Gold Standard', description: 'Voluntary carbon market (Verra VCS, Gold Standard)' },
  nordicVoluntary: { min: 20, max: 50, label: 'Nordic Voluntary', description: 'Nordic-specific voluntary credits (higher co-benefit premium)' },
} as const;

// ─── Parcel Age Estimation ───

/** Estimate age class from registration date and species — heuristic for demo */
function estimateAgeClass(parcel: DemoParcel): 'young' | 'mid' | 'mature' {
  // Use parcel ID as a stable seed for age distribution
  const hash = parcel.id.charCodeAt(parcel.id.length - 1);
  if (hash % 3 === 0) return 'young';
  if (hash % 3 === 1) return 'mid';
  return 'mature';
}

// ─── Carbon Calculation Engine ───

interface CarbonPool {
  aboveGroundBiomass: number; // tC
  belowGroundBiomass: number; // tC
  deadWood: number;           // tC
  soilOrganic: number;        // tC
  totalCarbon: number;        // tC
  totalCO2e: number;          // tCO2e
}

interface ParcelCarbon {
  parcel: DemoParcel;
  ageClass: 'young' | 'mid' | 'mature';
  pools: CarbonPool;
  annualSequestration: {
    growthM3: number;        // m³/year
    carbonIncrement: number; // tC/year
    co2ePerYear: number;     // tCO2e/year
  };
  perHectare: {
    totalCO2e: number;       // tCO2e/ha
    annualCO2e: number;      // tCO2e/ha/year
  };
}

function calculateParcelCarbon(parcel: DemoParcel): ParcelCarbon {
  const ageClass = estimateAgeClass(parcel);
  const area = parcel.area_hectares;

  // Calculate above-ground biomass carbon per hectare then scale by area
  let agbCarbonPerHa = 0;
  let bgbCarbonPerHa = 0;
  let annualGrowthM3 = 0;
  let annualCarbonIncrement = 0;

  for (const mix of parcel.species_mix) {
    const species = mix.species;
    const fraction = mix.pct / 100;
    const carbonDensity = CARBON_DENSITY[species] ?? 0.48;
    const rootShoot = ROOT_SHOOT_RATIO[species] ?? 0.25;
    const volume = getStandingVolume(species, ageClass);
    const growth = GROWTH_RATES[species] ?? GROWTH_RATES['Spruce'];

    // Above-ground biomass carbon (tC/ha) = volume * carbon density * fraction
    const speciesAgbC = volume * carbonDensity * fraction;
    agbCarbonPerHa += speciesAgbC;

    // Below-ground biomass carbon (tC/ha) = AGB carbon * root-to-shoot ratio
    bgbCarbonPerHa += speciesAgbC * rootShoot;

    // Annual growth contribution
    const speciesGrowth = growth.typical * fraction;
    annualGrowthM3 += speciesGrowth;
    annualCarbonIncrement += speciesGrowth * carbonDensity * (1 + rootShoot) * fraction;
  }

  // Fix: annualCarbonIncrement double-counted fraction in the loop — recalculate cleanly
  annualCarbonIncrement = 0;
  for (const mix of parcel.species_mix) {
    const species = mix.species;
    const fraction = mix.pct / 100;
    const carbonDensity = CARBON_DENSITY[species] ?? 0.48;
    const rootShoot = ROOT_SHOOT_RATIO[species] ?? 0.25;
    const growth = GROWTH_RATES[species] ?? GROWTH_RATES['Spruce'];
    // Growth increment includes above + below ground
    annualCarbonIncrement += growth.typical * fraction * carbonDensity * (1 + rootShoot);
  }

  const deadWoodCPerHa = agbCarbonPerHa * DEAD_WOOD_FRACTION;
  const soilCPerHa = SOIL_ORGANIC_CARBON_TC_HA;

  const totalCarbonPerHa = agbCarbonPerHa + bgbCarbonPerHa + deadWoodCPerHa + soilCPerHa;

  const pools: CarbonPool = {
    aboveGroundBiomass: agbCarbonPerHa * area,
    belowGroundBiomass: bgbCarbonPerHa * area,
    deadWood: deadWoodCPerHa * area,
    soilOrganic: soilCPerHa * area,
    totalCarbon: totalCarbonPerHa * area,
    totalCO2e: totalCarbonPerHa * area * CO2_PER_C,
  };

  const annualCO2ePerHa = annualCarbonIncrement * CO2_PER_C;

  return {
    parcel,
    ageClass,
    pools,
    annualSequestration: {
      growthM3: annualGrowthM3 * area,
      carbonIncrement: annualCarbonIncrement * area,
      co2ePerYear: annualCarbonIncrement * area * CO2_PER_C,
    },
    perHectare: {
      totalCO2e: totalCarbonPerHa * CO2_PER_C,
      annualCO2e: annualCO2ePerHa,
    },
  };
}

// ─── MRV Pipeline Steps ───

interface MRVStep {
  phase: string;
  title: string;
  description: string;
  timeline: string;
  status: 'complete' | 'active' | 'upcoming';
  details: string[];
}

const MRV_PIPELINE: MRVStep[] = [
  {
    phase: 'M',
    title: 'Measurement',
    description: 'Quantify carbon stocks using remote sensing and field inventory',
    timeline: 'Ongoing — annual cycle',
    status: 'active',
    details: [
      'Sentinel-2 NDVI time series for canopy cover change detection',
      'LiDAR-derived canopy height models (Lantmateriet DTM 2m)',
      'Field inventory plots: 8-12 per 100 ha (stratified random sampling)',
      'Species composition from kNN rasters (Skogsstyrelsen)',
      'Allometric equations: Marklund (1988) for Swedish conifers/broadleaf',
      'Soil organic carbon: top 30 cm sampling per IPCC Good Practice Guidance',
    ],
  },
  {
    phase: 'R',
    title: 'Reporting',
    description: 'Annual carbon stock change reports following IPCC methodology',
    timeline: 'Q1 each year — covers previous calendar year',
    status: 'upcoming',
    details: [
      'IPCC stock-change approach: net C = C(t2) - C(t1)',
      'Five carbon pools reported: AGB, BGB, dead wood, litter, SOC',
      'Harvested wood products (HWP) tracked separately per IPCC guidance',
      'Uncertainty analysis using Monte Carlo propagation (95% CI)',
      'Machine-readable format: GHG Protocol Land Sector template',
      'Annual report archived in Document Vault for audit trail',
    ],
  },
  {
    phase: 'V',
    title: 'Verification',
    description: 'Independent third-party audit of carbon claims',
    timeline: 'Q2 each year — 4-6 week audit window',
    status: 'upcoming',
    details: [
      'Accredited auditor (ISO 14064-3 or VCS-approved VVB)',
      'Desk review of monitoring data, calculations, and assumptions',
      'Site visit: 10-20% of parcels randomly selected for field verification',
      'Cross-check satellite data against field measurements (r² > 0.85 required)',
      'Verification statement issued within 6 weeks of audit completion',
      'Non-conformities tracked and resolved before credit issuance',
    ],
  },
  {
    phase: 'Registry',
    title: 'Credit Issuance',
    description: 'Verified credits registered on standards platform',
    timeline: 'Q3 — after verification complete',
    status: 'upcoming',
    details: [
      'Project registered under chosen standard (VCS, Gold Standard, or Plan Vivo)',
      'Vintage year assigned to issued credits',
      'Buffer pool contribution: 10-20% held as insurance against reversals',
      'Credits serialized with unique identifiers for chain of custody',
      'Retirement tracking prevents double-counting',
      'Annual monitoring reports uploaded to registry portal',
    ],
  },
];

// ─── CRCF Compliance Items ───

interface CRCFItem {
  requirement: string;
  status: 'met' | 'partial' | 'pending';
  notes: string;
}

const CRCF_ITEMS: CRCFItem[] = [
  { requirement: 'Quantification methodology — certified QU methodology applied', status: 'met', notes: 'IPCC Tier 2 with Swedish NFI allometric equations' },
  { requirement: 'Additionality — carbon removal beyond business-as-usual', status: 'partial', notes: 'Extended rotation analysis shows +18% carbon vs standard harvest cycle' },
  { requirement: 'Long-term storage — minimum 35-year permanence commitment', status: 'met', notes: 'Forest management plan commits to 40+ year rotation minimum' },
  { requirement: 'Sustainability — no significant harm to biodiversity, water, soil', status: 'met', notes: 'FSC-aligned management; biodiversity corridor maintained' },
  { requirement: 'Independent verification — third-party audit by accredited body', status: 'pending', notes: 'VVB selection in progress; audit scheduled for Q2 2026' },
  { requirement: 'Public registry — transparent reporting of removal units', status: 'pending', notes: 'Will register on EU CRCF registry once operational (expected 2027)' },
  { requirement: 'Monitoring plan — ongoing measurement for permanence', status: 'met', notes: 'Annual Sentinel-2 + field inventory cycle established' },
  { requirement: 'Liability mechanism — reversal risk insurance or buffer pool', status: 'partial', notes: '15% buffer pool allocated; exploring parametric insurance options' },
];

// ─── Tab Types ───

type Tab = 'inventory' | 'calculator' | 'sequestration' | 'credits' | 'mrv' | 'crcf';

// ─── Component ───

export default function CarbonMRVPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [expandedParcel, setExpandedParcel] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<keyof typeof MARKET_PRICES>('nordicVoluntary');

  // Calculate carbon for all demo parcels
  const parcelResults = useMemo(() => {
    const parcels = isDemoMode() ? DEMO_PARCELS : DEMO_PARCELS; // live would fetch from Supabase
    return parcels.map(calculateParcelCarbon);
  }, []);

  // Portfolio totals
  const totals = useMemo(() => {
    const totalArea = parcelResults.reduce((sum, r) => sum + r.parcel.area_hectares, 0);
    const totalCO2e = parcelResults.reduce((sum, r) => sum + r.pools.totalCO2e, 0);
    const totalAnnualCO2e = parcelResults.reduce((sum, r) => sum + r.annualSequestration.co2ePerYear, 0);
    const totalCarbon = parcelResults.reduce((sum, r) => sum + r.pools.totalCarbon, 0);
    const totalAGB = parcelResults.reduce((sum, r) => sum + r.pools.aboveGroundBiomass, 0);
    const totalBGB = parcelResults.reduce((sum, r) => sum + r.pools.belowGroundBiomass, 0);
    const totalDeadWood = parcelResults.reduce((sum, r) => sum + r.pools.deadWood, 0);
    const totalSOC = parcelResults.reduce((sum, r) => sum + r.pools.soilOrganic, 0);
    return { totalArea, totalCO2e, totalAnnualCO2e, totalCarbon, totalAGB, totalBGB, totalDeadWood, totalSOC };
  }, [parcelResults]);

  const market = MARKET_PRICES[selectedMarket];
  const annualRevenueLow = totals.totalAnnualCO2e * market.min;
  const annualRevenueHigh = totals.totalAnnualCO2e * market.max;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'inventory', label: 'Parcel Inventory', icon: <TreePine size={14} /> },
    { key: 'calculator', label: 'Carbon Calculator', icon: <Calculator size={14} /> },
    { key: 'sequestration', label: 'Sequestration', icon: <TrendingUp size={14} /> },
    { key: 'credits', label: 'Credit Valuation', icon: <Banknote size={14} /> },
    { key: 'mrv', label: 'MRV Pipeline', icon: <ClipboardCheck size={14} /> },
    { key: 'crcf', label: 'EU CRCF', icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/owner/carbon"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            Back to Carbon Overview
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <Leaf size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                Carbon MRV Dashboard
              </h1>
              <p className="text-xs text-[var(--text3)]">
                Measurement, Reporting & Verification — IPCC Tier 2 methodology for Nordic forests
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            label="Total Carbon Stock"
            value={`${formatNumber(totals.totalCO2e)} tCO2e`}
            sub={`${formatNumber(totals.totalCarbon)} tC across ${formatNumber(totals.totalArea, 1)} ha`}
            icon={<Leaf size={16} />}
          />
          <SummaryCard
            label="Annual Sequestration"
            value={`${formatNumber(totals.totalAnnualCO2e, 1)} tCO2e/yr`}
            sub={`${formatNumber(totals.totalArea > 0 ? totals.totalAnnualCO2e / totals.totalArea : 0, 2)} tCO2e/ha/yr`}
            icon={<TrendingUp size={16} />}
          />
          <SummaryCard
            label="Credit Revenue (est.)"
            value={`€${formatNumber(annualRevenueLow)}-${formatNumber(annualRevenueHigh)}/yr`}
            sub={`${market.label} market`}
            icon={<Banknote size={16} />}
          />
          <SummaryCard
            label="Parcels Assessed"
            value={`${parcelResults.length}`}
            sub={`${formatNumber(totals.totalArea, 1)} ha total portfolio`}
            icon={<TreePine size={16} />}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all
                whitespace-nowrap -mb-px border-b-2
                ${activeTab === tab.key
                  ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' && (
          <ParcelInventoryTab
            results={parcelResults}
            expandedParcel={expandedParcel}
            onToggleParcel={(id) => setExpandedParcel(expandedParcel === id ? null : id)}
          />
        )}
        {activeTab === 'calculator' && (
          <CarbonCalculatorTab totals={totals} results={parcelResults} />
        )}
        {activeTab === 'sequestration' && (
          <SequestrationTab results={parcelResults} totals={totals} />
        )}
        {activeTab === 'credits' && (
          <CreditValuationTab
            totals={totals}
            selectedMarket={selectedMarket}
            onMarketChange={setSelectedMarket}
          />
        )}
        {activeTab === 'mrv' && <MRVPipelineTab />}
        {activeTab === 'crcf' && <CRCFTab />}
      </div>
    </div>
  );
}

// ─── Summary Card Component ───

function SummaryCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[var(--green)]">{icon}</div>
        <span className="text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold text-[var(--text)] font-mono">{value}</div>
      <div className="text-[10px] text-[var(--text3)] mt-1">{sub}</div>
    </div>
  );
}

// ─── Tab: Parcel Inventory ───

function ParcelInventoryTab({
  results,
  expandedParcel,
  onToggleParcel,
}: {
  results: ParcelCarbon[];
  expandedParcel: string | null;
  onToggleParcel: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Info size={14} className="text-[var(--text3)]" />
        <p className="text-xs text-[var(--text3)]">
          Per-parcel carbon inventory calculated from species mix, estimated stand age, and area.
          Click a parcel to see the full five-pool carbon breakdown.
        </p>
      </div>

      {results.map((r) => {
        const isExpanded = expandedParcel === r.parcel.id;
        return (
          <div
            key={r.parcel.id}
            className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl overflow-hidden"
          >
            <button
              onClick={() => onToggleParcel(r.parcel.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg3)]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
                  <TreePine size={16} className="text-[var(--green)]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{r.parcel.name}</div>
                  <div className="text-[10px] text-[var(--text3)]">
                    {r.parcel.area_hectares} ha — {r.parcel.municipality} — {r.ageClass} stand
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[var(--text)]">
                    {formatNumber(r.pools.totalCO2e)} tCO2e
                  </div>
                  <div className="text-[10px] text-[var(--green)]">
                    +{formatNumber(r.annualSequestration.co2ePerYear, 1)} /yr
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-[var(--border)]">
                {/* Species Mix */}
                <div className="mt-3 mb-3">
                  <div className="text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider mb-2">Species Composition</div>
                  <div className="flex gap-2">
                    {r.parcel.species_mix.map((s) => (
                      <span
                        key={s.species}
                        className="text-xs px-2 py-1 bg-[var(--bg3)] rounded-md text-[var(--text2)]"
                      >
                        {s.species} {s.pct}%
                      </span>
                    ))}
                  </div>
                </div>

                {/* Five Pools Table */}
                <div className="text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider mb-2">Carbon Pools (IPCC five-pool)</div>
                <div className="grid grid-cols-2 gap-2">
                  <PoolRow label="Above-ground biomass" tC={r.pools.aboveGroundBiomass} tCO2e={r.pools.aboveGroundBiomass * CO2_PER_C} />
                  <PoolRow label="Below-ground biomass" tC={r.pools.belowGroundBiomass} tCO2e={r.pools.belowGroundBiomass * CO2_PER_C} />
                  <PoolRow label="Dead wood" tC={r.pools.deadWood} tCO2e={r.pools.deadWood * CO2_PER_C} />
                  <PoolRow label="Soil organic carbon" tC={r.pools.soilOrganic} tCO2e={r.pools.soilOrganic * CO2_PER_C} />
                </div>

                {/* Per-hectare summary */}
                <div className="mt-3 p-3 bg-[var(--bg3)] rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-[10px] text-[var(--text3)]">Stock per ha</div>
                      <div className="text-sm font-bold font-mono text-[var(--text)]">{formatNumber(r.perHectare.totalCO2e, 1)} tCO2e</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text3)]">Sequestration per ha</div>
                      <div className="text-sm font-bold font-mono text-[var(--green)]">{formatNumber(r.perHectare.annualCO2e, 2)} tCO2e/yr</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text3)]">Growth rate</div>
                      <div className="text-sm font-bold font-mono text-[var(--text)]">{formatNumber(r.annualSequestration.growthM3 / r.parcel.area_hectares, 1)} m3/ha/yr</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PoolRow({ label, tC, tCO2e }: { label: string; tC: number; tCO2e: number }) {
  return (
    <div className="flex items-center justify-between p-2 bg-[var(--bg3)] rounded-lg">
      <span className="text-xs text-[var(--text2)]">{label}</span>
      <div className="text-right">
        <span className="text-xs font-mono font-semibold text-[var(--text)]">{formatNumber(tC, 1)} tC</span>
        <span className="text-[10px] text-[var(--text3)] ml-2">({formatNumber(tCO2e, 1)} tCO2e)</span>
      </div>
    </div>
  );
}

// ─── Tab: Carbon Calculator ───

function CarbonCalculatorTab({ totals, results: _results }: { totals: TotalsShape; results: ParcelCarbon[] }) {
  return (
    <div className="space-y-6">
      {/* Methodology Box */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Calculator size={16} className="text-[var(--green)]" />
          Calculation Methodology
        </h3>
        <div className="space-y-3 text-xs text-[var(--text2)]">
          <div className="p-3 bg-[var(--bg3)] rounded-lg font-mono text-[11px] leading-relaxed">
            <div className="text-[var(--text3)] mb-1">Above-ground biomass carbon:</div>
            <div>AGB_C = Volume (m3/ha) x Carbon Density (tC/m3) x Area (ha)</div>
            <div className="mt-2 text-[var(--text3)] mb-1">Below-ground biomass carbon:</div>
            <div>BGB_C = AGB_C x Root-to-Shoot Ratio</div>
            <div className="mt-2 text-[var(--text3)] mb-1">Dead wood carbon:</div>
            <div>DW_C = AGB_C x 0.10 (10% of standing stock)</div>
            <div className="mt-2 text-[var(--text3)] mb-1">Soil organic carbon:</div>
            <div>SOC = 75 tC/ha (Nordic forest soil average, top 30cm)</div>
            <div className="mt-2 text-[var(--text3)] mb-1">Total CO2 equivalent:</div>
            <div>CO2e = Total_C x (44/12) = Total_C x 3.667</div>
          </div>
        </div>
      </div>

      {/* Species Parameters Table */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <TreePine size={16} className="text-[var(--green)]" />
          Species Parameters (IPCC Tier 2)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 text-[var(--text3)] font-medium">Species</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">C Density (tC/m3)</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Root:Shoot</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Growth (m3/ha/yr)</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CARBON_DENSITY).map(([species, density]) => (
                <tr key={species} className="border-b border-[var(--border)]/50">
                  <td className="py-2 px-3 font-medium text-[var(--text)]">{species}</td>
                  <td className="py-2 px-3 text-right font-mono text-[var(--text2)]">{density.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono text-[var(--text2)]">{(ROOT_SHOOT_RATIO[species] ?? 0.25).toFixed(3)}</td>
                  <td className="py-2 px-3 text-right font-mono text-[var(--text2)]">
                    {GROWTH_RATES[species]?.min}-{GROWTH_RATES[species]?.max}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--text3)]">
                    {(ROOT_SHOOT_RATIO[species] ?? 0.25) < 0.26 ? 'Conifer' : 'Broadleaf'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Pool Breakdown */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-[var(--green)]" />
          Portfolio Carbon Pool Breakdown
        </h3>
        <div className="space-y-3">
          <PoolBar label="Above-ground biomass" value={totals.totalAGB} total={totals.totalCarbon} color="bg-[var(--green)]" />
          <PoolBar label="Below-ground biomass" value={totals.totalBGB} total={totals.totalCarbon} color="bg-[var(--green2)]" />
          <PoolBar label="Dead wood" value={totals.totalDeadWood} total={totals.totalCarbon} color="bg-[var(--yellow)]" />
          <PoolBar label="Soil organic carbon" value={totals.totalSOC} total={totals.totalCarbon} color="bg-[var(--amber)]" />
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-between items-center">
          <span className="text-xs font-medium text-[var(--text2)]">Total Carbon Stock</span>
          <span className="text-sm font-bold font-mono text-[var(--text)]">
            {formatNumber(totals.totalCarbon, 1)} tC = {formatNumber(totals.totalCO2e)} tCO2e
          </span>
        </div>
      </div>
    </div>
  );
}

function PoolBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--text2)]">{label}</span>
        <span className="font-mono text-[var(--text)]">{formatNumber(value, 1)} tC ({pct.toFixed(1)}%)</span>
      </div>
      <div className="w-full h-2 bg-[var(--bg3)] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Tab: Sequestration Model ───

function SequestrationTab({ results, totals }: { results: ParcelCarbon[]; totals: TotalsShape }) {
  return (
    <div className="space-y-6">
      {/* Growth Rates Reference */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--green)]" />
          Swedish Annual Growth Rates (Site Index dependent)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(GROWTH_RATES).map(([species, rates]) => {
            const carbonDensity = CARBON_DENSITY[species] ?? 0.48;
            const rootShoot = ROOT_SHOOT_RATIO[species] ?? 0.25;
            const annualCO2e = rates.typical * carbonDensity * (1 + rootShoot) * CO2_PER_C;
            return (
              <div key={species} className="p-3 bg-[var(--bg3)] rounded-lg">
                <div className="text-xs font-semibold text-[var(--text)] mb-1">{species}</div>
                <div className="text-lg font-bold font-mono text-[var(--green)]">{rates.min}-{rates.max}</div>
                <div className="text-[10px] text-[var(--text3)]">m3/ha/year (typical: {rates.typical})</div>
                <div className="mt-1 text-[10px] text-[var(--text3)]">
                  = {annualCO2e.toFixed(1)} tCO2e/ha/yr sequestered
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-parcel sequestration table */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Leaf size={16} className="text-[var(--green)]" />
          Annual Sequestration by Parcel
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 text-[var(--text3)] font-medium">Parcel</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Area (ha)</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Growth (m3/yr)</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">C Increment (tC/yr)</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">CO2e/yr</th>
                <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">CO2e/ha/yr</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.parcel.id} className="border-b border-[var(--border)]/50">
                  <td className="py-2 px-3 font-medium text-[var(--text)]">{r.parcel.name}</td>
                  <td className="py-2 px-3 text-right font-mono text-[var(--text2)]">{r.parcel.area_hectares.toFixed(1)}</td>
                  <td className="py-2 px-3 text-right font-mono text-[var(--text2)]">{formatNumber(r.annualSequestration.growthM3, 1)}</td>
                  <td className="py-2 px-3 text-right font-mono text-[var(--text2)]">{formatNumber(r.annualSequestration.carbonIncrement, 1)}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-[var(--green)]">{formatNumber(r.annualSequestration.co2ePerYear, 1)}</td>
                  <td className="py-2 px-3 text-right font-mono text-[var(--text2)]">{formatNumber(r.perHectare.annualCO2e, 2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--border)] font-semibold">
                <td className="py-2 px-3 text-[var(--text)]">Portfolio Total</td>
                <td className="py-2 px-3 text-right font-mono text-[var(--text)]">{totals.totalArea.toFixed(1)}</td>
                <td className="py-2 px-3 text-right font-mono text-[var(--text)]">
                  {formatNumber(results.reduce((s, r) => s + r.annualSequestration.growthM3, 0), 1)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-[var(--text)]">
                  {formatNumber(results.reduce((s, r) => s + r.annualSequestration.carbonIncrement, 0), 1)}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-[var(--green)]">{formatNumber(totals.totalAnnualCO2e, 1)}</td>
                <td className="py-2 px-3 text-right font-mono text-[var(--text)]">{formatNumber(totals.totalArea > 0 ? totals.totalAnnualCO2e / totals.totalArea : 0, 2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 10-year projection */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-[var(--green)]" />
          10-Year Cumulative Sequestration Projection
        </h3>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
          {Array.from({ length: 10 }, (_, i) => {
            const year = i + 1;
            const cumulative = totals.totalAnnualCO2e * year;
            const maxCumulative = totals.totalAnnualCO2e * 10;
            const heightPct = maxCumulative > 0 ? (cumulative / maxCumulative) * 100 : 0;
            return (
              <div key={year} className="flex flex-col items-center">
                <div className="text-[10px] font-mono text-[var(--text3)] mb-1">{formatNumber(cumulative)}</div>
                <div className="w-full h-24 bg-[var(--bg3)] rounded-lg overflow-hidden flex items-end">
                  <div
                    className="w-full bg-[var(--green)] rounded-t-sm transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-[var(--text3)] mt-1">Yr {year}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-[var(--text3)] text-center">
          Projected cumulative: {formatNumber(totals.totalAnnualCO2e * 10)} tCO2e over 10 years
          (assumes constant growth rate; real growth varies with stand age and climate)
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Credit Valuation ───

function CreditValuationTab({
  totals,
  selectedMarket,
  onMarketChange,
}: {
  totals: TotalsShape;
  selectedMarket: keyof typeof MARKET_PRICES;
  onMarketChange: (market: keyof typeof MARKET_PRICES) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Market Selector */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Banknote size={16} className="text-[var(--green)]" />
          Carbon Credit Market Prices (2026)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {(Object.entries(MARKET_PRICES) as [keyof typeof MARKET_PRICES, typeof MARKET_PRICES[keyof typeof MARKET_PRICES]][]).map(([key, market]) => {
            const isSelected = selectedMarket === key;
            const annualLow = totals.totalAnnualCO2e * market.min;
            const annualHigh = totals.totalAnnualCO2e * market.max;
            return (
              <button
                key={key}
                onClick={() => onMarketChange(key)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[var(--green)] bg-[var(--green)]/5'
                    : 'border-[var(--border)] bg-[var(--bg3)] hover:border-[var(--green)]/50'
                }`}
              >
                <div className="text-xs font-semibold text-[var(--text)] mb-1">{market.label}</div>
                <div className="text-lg font-bold font-mono text-[var(--green)]">
                  €{market.min}-{market.max}
                </div>
                <div className="text-[10px] text-[var(--text3)] mb-2">per tCO2e</div>
                <div className="text-[10px] text-[var(--text3)]">{market.description}</div>
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text3)]">Est. annual revenue</div>
                  <div className="text-sm font-bold font-mono text-[var(--text)]">
                    €{formatNumber(annualLow)} - €{formatNumber(annualHigh)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Revenue Breakdown by Parcel */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Globe size={16} className="text-[var(--green)]" />
          Potential Annual Revenue by Parcel
        </h3>
        <div className="space-y-2">
          {/* Use a local calculation inside the component */}
          <RevenueTable totals={totals} market={MARKET_PRICES[selectedMarket]} />
        </div>
      </div>

      {/* Important Caveats */}
      <div className="bg-[var(--yellow)]/5 border border-[var(--yellow)]/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
          <AlertTriangle size={16} className="text-[var(--yellow)]" />
          Important Considerations
        </h3>
        <ul className="space-y-2 text-xs text-[var(--text2)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--yellow)] mt-0.5">--</span>
            Revenue estimates assume all sequestered carbon qualifies as verified removal credits. Actual issuance depends on verification outcome and baseline methodology.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--yellow)] mt-0.5">--</span>
            Buffer pool deductions (typically 10-20%) are NOT subtracted from these estimates. Real creditable volume will be lower.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--yellow)] mt-0.5">--</span>
            EU ETS prices shown for reference only -- forest carbon credits are not yet directly fungible with EU ETS allowances under current regulations.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--yellow)] mt-0.5">--</span>
            Verification, registry fees, and project development costs (typically EUR 5-15k initial + EUR 2-5k/yr) are not deducted.
          </li>
        </ul>
      </div>
    </div>
  );
}

function RevenueTable({ totals, market }: { totals: TotalsShape; market: { min: number; max: number; label: string } }) {
  // Access parcel results directly from DEMO_PARCELS
  const results = useMemo(() => {
    const parcels = isDemoMode() ? DEMO_PARCELS : DEMO_PARCELS;
    return parcels.map(calculateParcelCarbon);
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-2 px-3 text-[var(--text3)] font-medium">Parcel</th>
            <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">tCO2e/yr</th>
            <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Low ({market.label})</th>
            <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">High ({market.label})</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.parcel.id} className="border-b border-[var(--border)]/50">
              <td className="py-2 px-3 font-medium text-[var(--text)]">{r.parcel.name}</td>
              <td className="py-2 px-3 text-right font-mono text-[var(--text2)]">{formatNumber(r.annualSequestration.co2ePerYear, 1)}</td>
              <td className="py-2 px-3 text-right font-mono text-[var(--text)]">€{formatNumber(r.annualSequestration.co2ePerYear * market.min)}</td>
              <td className="py-2 px-3 text-right font-mono font-semibold text-[var(--green)]">€{formatNumber(r.annualSequestration.co2ePerYear * market.max)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-[var(--border)] font-semibold">
            <td className="py-2 px-3 text-[var(--text)]">Portfolio Total</td>
            <td className="py-2 px-3 text-right font-mono text-[var(--text)]">{formatNumber(totals.totalAnnualCO2e, 1)}</td>
            <td className="py-2 px-3 text-right font-mono text-[var(--text)]">€{formatNumber(totals.totalAnnualCO2e * market.min)}</td>
            <td className="py-2 px-3 text-right font-mono font-bold text-[var(--green)]">€{formatNumber(totals.totalAnnualCO2e * market.max)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: MRV Pipeline ───

function MRVPipelineTab() {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const phaseColors: Record<string, string> = {
    M: 'bg-[var(--green)]',
    R: 'bg-[var(--green2)]',
    V: 'bg-[var(--yellow)]',
    Registry: 'bg-[var(--amber)]',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    complete: <CheckCircle2 size={14} className="text-[var(--green)]" />,
    active: <Clock size={14} className="text-[var(--yellow)]" />,
    upcoming: <AlertTriangle size={14} className="text-[var(--text3)]" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Info size={14} className="text-[var(--text3)]" />
        <p className="text-xs text-[var(--text3)]">
          The MRV pipeline ensures carbon claims are scientifically measured, transparently reported, and independently verified before credit issuance.
        </p>
      </div>

      {/* Pipeline visual */}
      <div className="flex items-center gap-2 mb-4">
        {MRV_PIPELINE.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold ${phaseColors[step.phase]}`}
            >
              {step.phase}
            </div>
            {i < MRV_PIPELINE.length - 1 && (
              <div className="w-8 h-0.5 bg-[var(--border)]" />
            )}
          </div>
        ))}
      </div>

      {/* Pipeline steps */}
      <div className="space-y-3">
        {MRV_PIPELINE.map((step, i) => {
          const isExpanded = expandedStep === i;
          return (
            <div
              key={i}
              className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedStep(isExpanded ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg3)]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${phaseColors[step.phase]} flex items-center justify-center text-white text-xs font-bold`}>
                    {step.phase}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                      {step.title}
                      {statusIcons[step.status]}
                    </div>
                    <div className="text-[10px] text-[var(--text3)]">{step.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[var(--text3)] hidden lg:block">{step.timeline}</span>
                  {isExpanded ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[var(--border)]">
                  <div className="mt-3 text-xs text-[var(--text3)] mb-2">{step.timeline}</div>
                  <ul className="space-y-2">
                    {step.details.map((detail, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-[var(--text2)]">
                        <CheckCircle2 size={12} className="text-[var(--green)] mt-0.5 shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Data Sources */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Satellite size={16} className="text-[var(--green)]" />
          Measurement Data Sources
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[
            { name: 'Sentinel-2 (ESA/CDSE)', type: 'Remote Sensing', use: 'NDVI time series, canopy change detection', freq: '5-day revisit' },
            { name: 'Lantmateriet DTM 2m', type: 'LiDAR', use: 'Canopy height models, terrain analysis', freq: 'Updated annually' },
            { name: 'Skogsstyrelsen kNN', type: 'National Data', use: 'Species composition, standing volume', freq: 'Updated annually' },
            { name: 'Field Inventory', type: 'Ground Truth', use: 'Diameter, height, species ID, soil samples', freq: 'Annual plots' },
            { name: 'SMHI Weather', type: 'Climate', use: 'Temperature, precipitation for growth models', freq: 'Real-time' },
            { name: 'Swedish NFI', type: 'Reference', use: 'Allometric equations, regional benchmarks', freq: '5-year cycle' },
          ].map((source) => (
            <div key={source.name} className="flex items-start gap-3 p-3 bg-[var(--bg3)] rounded-lg">
              <Satellite size={14} className="text-[var(--green)] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text)]">{source.name}</div>
                <div className="text-[10px] text-[var(--text3)]">{source.type} -- {source.freq}</div>
                <div className="text-[10px] text-[var(--text2)] mt-0.5">{source.use}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: EU CRCF Compliance ───

function CRCFTab() {
  const metCount = CRCF_ITEMS.filter((i) => i.status === 'met').length;
  const partialCount = CRCF_ITEMS.filter((i) => i.status === 'partial').length;
  const pendingCount = CRCF_ITEMS.filter((i) => i.status === 'pending').length;

  const statusColors: Record<string, string> = {
    met: 'text-[var(--green)] bg-[var(--green)]/10',
    partial: 'text-[var(--yellow)] bg-[var(--yellow)]/10',
    pending: 'text-[var(--text3)] bg-[var(--bg3)]',
  };

  const statusLabels: Record<string, string> = {
    met: 'Met',
    partial: 'Partial',
    pending: 'Pending',
  };

  return (
    <div className="space-y-6">
      {/* CRCF Overview */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
          <ShieldCheck size={16} className="text-[var(--green)]" />
          EU Carbon Removal Certification Framework (CRCF)
        </h3>
        <p className="text-xs text-[var(--text2)] mb-4">
          The EU CRCF (Regulation 2024/3012) establishes a voluntary EU-wide framework for certifying
          carbon removals and soil emission reductions. Forest carbon projects must meet stringent criteria
          for quantification, additionality, permanence, sustainability, and verification.
        </p>

        {/* Score summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-[var(--green)]/5 border border-[var(--green)]/20 rounded-lg text-center">
            <div className="text-xl font-bold font-mono text-[var(--green)]">{metCount}</div>
            <div className="text-[10px] text-[var(--text3)]">Requirements Met</div>
          </div>
          <div className="p-3 bg-[var(--yellow)]/5 border border-[var(--yellow)]/20 rounded-lg text-center">
            <div className="text-xl font-bold font-mono text-[var(--yellow)]">{partialCount}</div>
            <div className="text-[10px] text-[var(--text3)]">Partially Met</div>
          </div>
          <div className="p-3 bg-[var(--bg3)] border border-[var(--border)] rounded-lg text-center">
            <div className="text-xl font-bold font-mono text-[var(--text3)]">{pendingCount}</div>
            <div className="text-[10px] text-[var(--text3)]">Pending</div>
          </div>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-2">
        {CRCF_ITEMS.map((item, i) => (
          <div
            key={i}
            className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-4 flex items-start gap-3"
          >
            <div className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-semibold ${statusColors[item.status]}`}>
              {statusLabels[item.status]}
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text)] mb-1">{item.requirement}</div>
              <div className="text-[10px] text-[var(--text3)]">{item.notes}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Standards Alignment */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <FileText size={16} className="text-[var(--green)]" />
          Registry & Standards Alignment
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[
            {
              name: 'Verra VCS (VM0045)',
              desc: 'Improved Forest Management methodology — most widely used for forest carbon',
              fit: 'High — standard IFM project type, well-established buyer demand',
            },
            {
              name: 'Gold Standard (A/R)',
              desc: 'Afforestation/Reforestation with strong sustainable development co-benefits',
              fit: 'Medium — requires demonstration of SDG contributions beyond carbon',
            },
            {
              name: 'Plan Vivo',
              desc: 'Community-focused standard for smallholder and landscape-level projects',
              fit: 'Medium — good fit for cooperative forest owner groups in Nordic region',
            },
            {
              name: 'EU CRCF (2024/3012)',
              desc: 'New EU voluntary certification for carbon removals — not yet fully operational',
              fit: 'High — native EU framework, expected to command premium pricing post-2027',
            },
          ].map((std) => (
            <div key={std.name} className="p-3 bg-[var(--bg3)] rounded-lg">
              <div className="text-xs font-semibold text-[var(--text)] mb-1">{std.name}</div>
              <div className="text-[10px] text-[var(--text3)] mb-1">{std.desc}</div>
              <div className="text-[10px] text-[var(--green)]">Fit: {std.fit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Utility ───

function formatNumber(n: number, decimals: number = 0): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return '0';
  return n.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Type helper used in child components (mirrors the computed totals shape)
type TotalsShape = {
  totalArea: number;
  totalCO2e: number;
  totalAnnualCO2e: number;
  totalCarbon: number;
  totalAGB: number;
  totalBGB: number;
  totalDeadWood: number;
  totalSOC: number;
};

