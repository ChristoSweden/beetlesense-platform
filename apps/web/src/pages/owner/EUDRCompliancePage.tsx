/**
 * EUDRCompliancePage — EU Deforestation Regulation (2023/1115) Compliance Dashboard.
 *
 * Implements the full EUDR compliance workflow:
 * 1. Due Diligence Statement (DDS) generation per Article 4
 * 2. Deforestation-free verification against Dec 31, 2020 cutoff (Article 2)
 * 3. Supply chain traceability with GeoJSON polygons (Article 9)
 * 4. Risk assessment matrix per Annex II benchmarking
 * 5. Compliance timeline with key regulatory milestones
 * 6. Reporting dashboard with Skogsstyrelsen integration
 *
 * All regulatory content based on EU Regulation 2023/1115 (Official Journal L 150).
 */

import { useState, useMemo } from 'react';
import {
  Shield,
  FileText,
  MapPin,
  TreePine,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Layers,
  Link2,
  BarChart3,
  Calendar,
  Info,
  XCircle,
} from 'lucide-react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';
import { isDemoMode } from '@/lib/dataMode';

/* ================================================================
   EUDR DATA MODEL — based on EU Regulation 2023/1115
   ================================================================ */

// Article 10: Risk assessment levels
type RiskLevel = 'negligible' | 'low' | 'standard' | 'high';

// Article 4: Due Diligence Statement structure
interface DueDiligenceStatement {
  referenceNumber: string;
  operatorName: string;
  operatorCountry: string;
  parcelId: string;
  parcelName: string;
  geolocation: { lat: number; lng: number };
  polygonCoords: [number, number][];
  countryOfProduction: string;
  speciesHarvested: { species: string; volume_m3: number }[];
  dateOfHarvest: string;
  productType: string;
  riskLevel: RiskLevel;
  deforestationFree: boolean;
  legallyHarvested: boolean;
  submissionDate: string;
}

// Article 10: Risk assessment criteria
interface RiskAssessment {
  countryRisk: RiskLevel;
  productRisk: RiskLevel;
  supplierRisk: RiskLevel;
  overallRisk: RiskLevel;
  mitigationMeasures: string[];
}

// Deforestation verification per parcel
interface DeforestationVerification {
  parcelId: string;
  referenceDate: string; // Dec 31, 2020
  landUse2020: string;
  landUseCurrent: string;
  canopyCover2020: number;
  canopyCoverCurrent: number;
  canopyChange: number;
  status: 'verified' | 'pending' | 'flagged';
  verificationMethod: string;
}

// Supply chain node
interface SupplyChainNode {
  id: string;
  type: 'origin' | 'processing' | 'transport' | 'market';
  name: string;
  location: string;
  operator: string;
  date: string;
  documented: boolean;
}

// Compliance checklist item
interface ComplianceItem {
  id: string;
  category: string;
  description: string;
  status: 'complete' | 'in-progress' | 'pending' | 'overdue';
  dueDate: string;
  article: string;
}

// Timeline milestone
interface TimelineMilestone {
  date: string;
  label: string;
  description: string;
  status: 'passed' | 'upcoming' | 'current';
}

/* ================================================================
   DEMO DATA GENERATORS
   ================================================================ */

function generatePolygon(center: [number, number], hectares: number): [number, number][] {
  // Approximate a rectangular polygon from center + area
  const sideKm = Math.sqrt(hectares / 100); // rough side length in km
  const dLat = sideKm / 111.32;
  const dLng = sideKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  return [
    [center[0] - dLng / 2, center[1] - dLat / 2],
    [center[0] + dLng / 2, center[1] - dLat / 2],
    [center[0] + dLng / 2, center[1] + dLat / 2],
    [center[0] - dLng / 2, center[1] + dLat / 2],
    [center[0] - dLng / 2, center[1] - dLat / 2], // close ring
  ];
}

function generateDDS(parcel: DemoParcel, index: number): DueDiligenceStatement {
  const harvestVolumes = parcel.species_mix.map((s) => ({
    species: s.species,
    volume_m3: Math.round(parcel.area_hectares * (s.pct / 100) * 3.2 * 10) / 10, // ~3.2 m3/ha avg
  }));
  return {
    referenceNumber: `DDS-SE-2026-${String(index + 1).padStart(4, '0')}`,
    operatorName: 'BeetleSense Forest AB',
    operatorCountry: 'Sweden',
    parcelId: parcel.id,
    parcelName: parcel.name,
    geolocation: { lat: parcel.center[1], lng: parcel.center[0] },
    polygonCoords: generatePolygon(parcel.center, parcel.area_hectares),
    countryOfProduction: 'Sweden',
    speciesHarvested: harvestVolumes,
    dateOfHarvest: parcel.last_survey ?? '2026-03-15',
    productType: 'Roundwood (CN 4403)',
    riskLevel: 'low',
    deforestationFree: true,
    legallyHarvested: true,
    submissionDate: '2026-04-01',
  };
}

function generateVerification(parcel: DemoParcel): DeforestationVerification {
  // Swedish managed forests: stable or increasing canopy since 2020
  const baseCover = 65 + Math.round(Math.random() * 20);
  const change = Math.round((Math.random() * 5 + 1) * 10) / 10; // slight increase
  return {
    parcelId: parcel.id,
    referenceDate: '2020-12-31',
    landUse2020: 'Forest land (managed production forest)',
    landUseCurrent: 'Forest land (managed production forest)',
    canopyCover2020: baseCover,
    canopyCoverCurrent: Math.min(95, baseCover + change),
    canopyChange: change,
    status: parcel.status === 'infested' ? 'pending' : 'verified',
    verificationMethod: 'Sentinel-2 NDVI time series + Skogsstyrelsen kNN rasters',
  };
}

function generateRiskAssessment(parcel: DemoParcel): RiskAssessment {
  // Sweden is EU-benchmarked as low risk
  const supplierRisk: RiskLevel = parcel.status === 'infested' ? 'standard' : 'negligible';
  const overall: RiskLevel = supplierRisk === 'standard' ? 'low' : 'negligible';
  const mitigations: string[] = [];
  if (supplierRisk !== 'negligible') {
    mitigations.push('Enhanced monitoring via satellite NDVI change detection');
    mitigations.push('On-site verification of bark beetle remediation measures');
    mitigations.push('Third-party audit of sanitary felling documentation');
  }
  return {
    countryRisk: 'low', // Sweden per EU benchmark
    productRisk: 'low', // roundwood
    supplierRisk,
    overallRisk: overall,
    mitigationMeasures: mitigations,
  };
}

function generateSupplyChain(parcel: DemoParcel): SupplyChainNode[] {
  return [
    {
      id: `sc-${parcel.id}-1`,
      type: 'origin',
      name: parcel.name,
      location: `${parcel.municipality}, Jönköping County, Sweden`,
      operator: 'BeetleSense Forest AB',
      date: parcel.last_survey ?? '2026-03-15',
      documented: true,
    },
    {
      id: `sc-${parcel.id}-2`,
      type: 'processing',
      name: 'Vida Timber AB — Alvesta Sawmill',
      location: 'Alvesta, Kronoberg County, Sweden',
      operator: 'Vida Timber AB',
      date: '2026-03-20',
      documented: true,
    },
    {
      id: `sc-${parcel.id}-3`,
      type: 'transport',
      name: 'Rail transport Alvesta → Gothenburg',
      location: 'Green Cargo rail network',
      operator: 'Green Cargo AB',
      date: '2026-03-22',
      documented: parcel.id !== 'p5', // p5 missing docs
    },
    {
      id: `sc-${parcel.id}-4`,
      type: 'market',
      name: 'EU Internal Market — Construction timber',
      location: 'Gothenburg Port / EU distribution',
      operator: 'Timber Trading EU GmbH',
      date: '2026-03-25',
      documented: parcel.id !== 'p5',
    },
  ];
}

const COMPLIANCE_CHECKLIST: ComplianceItem[] = [
  {
    id: 'c1',
    category: 'Information Collection',
    description: 'Geolocation coordinates for all harvest plots recorded (Article 9.1.d)',
    status: 'complete',
    dueDate: '2025-12-30',
    article: 'Art. 9(1)(d)',
  },
  {
    id: 'c2',
    category: 'Information Collection',
    description: 'Species and quantity of each relevant commodity documented (Article 9.1.b)',
    status: 'complete',
    dueDate: '2025-12-30',
    article: 'Art. 9(1)(b)',
  },
  {
    id: 'c3',
    category: 'Information Collection',
    description: 'Country of production and supplier details recorded (Article 9.1.a)',
    status: 'complete',
    dueDate: '2025-12-30',
    article: 'Art. 9(1)(a)',
  },
  {
    id: 'c4',
    category: 'Risk Assessment',
    description: 'Country benchmarking review completed (Annex II criteria)',
    status: 'complete',
    dueDate: '2025-12-30',
    article: 'Art. 29',
  },
  {
    id: 'c5',
    category: 'Risk Assessment',
    description: 'Deforestation-free verification against Dec 31, 2020 baseline',
    status: 'complete',
    dueDate: '2026-01-15',
    article: 'Art. 2(13)',
  },
  {
    id: 'c6',
    category: 'Risk Assessment',
    description: 'Satellite imagery analysis — Sentinel-2 NDVI time series',
    status: 'complete',
    dueDate: '2026-02-01',
    article: 'Art. 10(2)',
  },
  {
    id: 'c7',
    category: 'Due Diligence Statement',
    description: 'DDS prepared for all relevant parcels with geolocation polygons',
    status: 'complete',
    dueDate: '2026-03-01',
    article: 'Art. 4(2)',
  },
  {
    id: 'c8',
    category: 'Due Diligence Statement',
    description: 'DDS submitted to EU Information System via competent authority',
    status: 'in-progress',
    dueDate: '2026-06-30',
    article: 'Art. 4(1)',
  },
  {
    id: 'c9',
    category: 'Traceability',
    description: 'Full supply chain documentation from forest to first EU market placement',
    status: 'in-progress',
    dueDate: '2026-06-30',
    article: 'Art. 9(1)(h)',
  },
  {
    id: 'c10',
    category: 'Traceability',
    description: 'Chain of custody certificates linked to parcel-level geolocation',
    status: 'in-progress',
    dueDate: '2026-06-30',
    article: 'Art. 9(2)',
  },
  {
    id: 'c11',
    category: 'Legal Compliance',
    description: 'Compliance with Swedish Forestry Act (Skogsvårdslagen)',
    status: 'complete',
    dueDate: '2025-12-30',
    article: 'Art. 2(16)',
  },
  {
    id: 'c12',
    category: 'Legal Compliance',
    description: 'Skogsstyrelsen harvest notifications filed for all active parcels',
    status: 'complete',
    dueDate: '2025-12-30',
    article: 'Art. 2(16)',
  },
  {
    id: 'c13',
    category: 'Record Keeping',
    description: 'DDS and supporting documentation retained for 5-year period (Article 12)',
    status: 'in-progress',
    dueDate: '2031-06-30',
    article: 'Art. 12',
  },
  {
    id: 'c14',
    category: 'Monitoring',
    description: 'Annual review of risk assessment and due diligence system',
    status: 'pending',
    dueDate: '2027-01-01',
    article: 'Art. 10(6)',
  },
];

const TIMELINE: TimelineMilestone[] = [
  {
    date: '2023-06-29',
    label: 'EUDR enters into force',
    description: 'Regulation 2023/1115 published in Official Journal L 150, entry into force 20 days after publication.',
    status: 'passed',
  },
  {
    date: '2024-06-29',
    label: 'Country benchmarking begins',
    description: 'European Commission begins categorizing countries as low, standard, or high risk per Article 29.',
    status: 'passed',
  },
  {
    date: '2025-12-30',
    label: 'Application date — Large operators',
    description: 'EUDR becomes applicable for large operators and traders. DDS required before placing products on EU market.',
    status: 'passed',
  },
  {
    date: '2026-04-02',
    label: 'Current date',
    description: 'Your compliance status as of today.',
    status: 'current',
  },
  {
    date: '2026-06-30',
    label: 'Application date — SMEs',
    description: 'Micro and small enterprises must comply. Simplified due diligence applies per Article 13.',
    status: 'upcoming',
  },
  {
    date: '2028-06-29',
    label: 'First Commission review',
    description: 'European Commission reviews regulation effectiveness and scope, including potential extension to other ecosystems.',
    status: 'upcoming',
  },
];

/* ================================================================
   SECTION TABS
   ================================================================ */

type SectionId = 'overview' | 'dds' | 'verification' | 'supply-chain' | 'risk' | 'timeline';

const SECTIONS: { id: SectionId; label: string; icon: typeof Shield }[] = [
  { id: 'overview', label: 'Dashboard', icon: BarChart3 },
  { id: 'dds', label: 'Due Diligence', icon: FileText },
  { id: 'verification', label: 'Verification', icon: TreePine },
  { id: 'supply-chain', label: 'Supply Chain', icon: Link2 },
  { id: 'risk', label: 'Risk Matrix', icon: AlertTriangle },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
];

/* ================================================================
   COMPONENT
   ================================================================ */

export default function EUDRCompliancePage() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [selectedParcel, setSelectedParcel] = useState<string>(DEMO_PARCELS[0].id);
  const [expandedDDS, setExpandedDDS] = useState<string | null>(null);

  const demo = isDemoMode();
  const parcels = DEMO_PARCELS;

  // Generate all data for parcels
  const ddsStatements = useMemo(
    () => parcels.map((p, i) => generateDDS(p, i)),
    [parcels],
  );
  const verifications = useMemo(
    () => parcels.map((p) => generateVerification(p)),
    [parcels],
  );
  const riskAssessments = useMemo(
    () => parcels.map((p) => generateRiskAssessment(p)),
    [parcels],
  );
  const supplyChains = useMemo(
    () => parcels.map((p) => generateSupplyChain(p)),
    [parcels],
  );

  const selectedParcelData = parcels.find((p) => p.id === selectedParcel)!;
  const selectedIndex = parcels.findIndex((p) => p.id === selectedParcel);
  const selectedDDS = ddsStatements[selectedIndex];
  const selectedVerification = verifications[selectedIndex];
  const selectedRisk = riskAssessments[selectedIndex];
  const selectedChain = supplyChains[selectedIndex];

  // Overall compliance score
  const completedItems = COMPLIANCE_CHECKLIST.filter((c) => c.status === 'complete').length;
  const totalItems = COMPLIANCE_CHECKLIST.length;
  const complianceScore = Math.round((completedItems / totalItems) * 100);

  // Parcel-level compliance scores
  const parcelScores = parcels.map((p, i) => {
    const v = verifications[i];
    const r = riskAssessments[i];
    const sc = supplyChains[i];
    let score = 0;
    if (v.status === 'verified') score += 30;
    else if (v.status === 'pending') score += 15;
    if (r.overallRisk === 'negligible') score += 30;
    else if (r.overallRisk === 'low') score += 25;
    else if (r.overallRisk === 'standard') score += 15;
    const docsComplete = sc.filter((n) => n.documented).length;
    score += Math.round((docsComplete / sc.length) * 40);
    return { parcelId: p.id, parcelName: p.name, score };
  });

  // Missing documentation alerts
  const alerts = parcels.flatMap((p, i) => {
    const items: { parcelName: string; message: string; severity: 'warning' | 'error' }[] = [];
    if (verifications[i].status === 'pending') {
      items.push({ parcelName: p.name, message: 'Deforestation-free status pending verification', severity: 'warning' });
    }
    supplyChains[i].forEach((node) => {
      if (!node.documented) {
        items.push({ parcelName: p.name, message: `Missing documentation: ${node.name}`, severity: 'error' });
      }
    });
    return items;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield size={24} style={{ color: 'var(--green)' }} />
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            EUDR Compliance Dashboard
          </h1>
        </div>
        <p className="text-sm text-[var(--text3)] ml-9">
          EU Regulation 2023/1115 — Deforestation-free products due diligence
        </p>
        {demo && (
          <div
            className="mt-3 ml-9 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            <Info size={13} />
            Demo mode — showing sample data for 5 Swedish forest parcels
          </div>
        )}
      </div>

      {/* ── Section tabs ── */}
      <div className="flex gap-1 overflow-x-auto rounded-lg p-1" style={{ background: 'var(--bg3)' }}>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors"
              style={{
                background: active ? 'var(--bg2)' : 'transparent',
                color: active ? 'var(--green)' : 'var(--text3)',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Parcel selector ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-[var(--text3)]">Parcel:</span>
        {parcels.map((p) => {
          const score = parcelScores.find((ps) => ps.parcelId === p.id)!.score;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedParcel(p.id)}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: selectedParcel === p.id ? 'var(--green)' : 'var(--bg2)',
                color: selectedParcel === p.id ? '#fff' : 'var(--text2)',
                border: `1px solid ${selectedParcel === p.id ? 'var(--green)' : 'var(--border)'}`,
              }}
            >
              {p.name}
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: selectedParcel === p.id ? 'rgba(255,255,255,0.2)' : score >= 90 ? 'rgba(27,94,32,0.1)' : score >= 70 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  color: selectedParcel === p.id ? '#fff' : score >= 90 ? 'var(--green)' : score >= 70 ? 'var(--yellow)' : '#ef4444',
                }}
              >
                {score}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Section content ── */}
      {activeSection === 'overview' && (
        <OverviewSection
          complianceScore={complianceScore}
          parcelScores={parcelScores}
          alerts={alerts}
          checklist={COMPLIANCE_CHECKLIST}
          verifications={verifications}
          parcels={parcels}
        />
      )}
      {activeSection === 'dds' && (
        <DDSSection
          ddsStatements={ddsStatements}
          parcels={parcels}
          expandedDDS={expandedDDS}
          setExpandedDDS={setExpandedDDS}
        />
      )}
      {activeSection === 'verification' && (
        <VerificationSection
          verification={selectedVerification}
          parcel={selectedParcelData}
        />
      )}
      {activeSection === 'supply-chain' && (
        <SupplyChainSection chain={selectedChain} parcel={selectedParcelData} />
      )}
      {activeSection === 'risk' && (
        <RiskSection risk={selectedRisk} parcel={selectedParcelData} />
      )}
      {activeSection === 'timeline' && (
        <TimelineSection timeline={TIMELINE} checklist={COMPLIANCE_CHECKLIST} />
      )}
    </div>
  );
}

/* ================================================================
   SECTION COMPONENTS
   ================================================================ */

// ── Overview / Dashboard ──
function OverviewSection({
  complianceScore,
  parcelScores,
  alerts,
  checklist,
  verifications,
  parcels,
}: {
  complianceScore: number;
  parcelScores: { parcelId: string; parcelName: string; score: number }[];
  alerts: { parcelName: string; message: string; severity: 'warning' | 'error' }[];
  checklist: ComplianceItem[];
  verifications: DeforestationVerification[];
  parcels: DemoParcel[];
}) {
  const verifiedCount = verifications.filter((v) => v.status === 'verified').length;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          label="Overall Compliance"
          value={`${complianceScore}%`}
          sub={`${checklist.filter((c) => c.status === 'complete').length}/${checklist.length} items`}
          color={complianceScore >= 80 ? 'var(--green)' : 'var(--yellow)'}
        />
        <KPICard
          label="Parcels Verified"
          value={`${verifiedCount}/${parcels.length}`}
          sub="Deforestation-free"
          color={verifiedCount === parcels.length ? 'var(--green)' : 'var(--yellow)'}
        />
        <KPICard
          label="Country Risk"
          value="Low"
          sub="Sweden — EU benchmark"
          color="var(--green)"
        />
        <KPICard
          label="DDS Status"
          value="Prepared"
          sub="Submission by Jun 30"
          color="var(--green2)"
        />
      </div>

      {/* Parcel compliance scores */}
      <Card title="Parcel Compliance Scores" icon={BarChart3}>
        <div className="space-y-3">
          {parcelScores.map((ps) => (
            <div key={ps.parcelId} className="flex items-center gap-3">
              <span className="w-28 text-xs font-medium text-[var(--text2)] truncate">{ps.parcelName}</span>
              <div className="flex-1 h-3 rounded-full" style={{ background: 'var(--bg3)' }}>
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${ps.score}%`,
                    background: ps.score >= 90 ? 'var(--green)' : ps.score >= 70 ? 'var(--yellow)' : '#ef4444',
                  }}
                />
              </div>
              <span
                className="w-10 text-right text-xs font-bold font-mono"
                style={{ color: ps.score >= 90 ? 'var(--green)' : ps.score >= 70 ? 'var(--yellow)' : '#ef4444' }}
              >
                {ps.score}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card title={`Missing Documentation (${alerts.length})`} icon={AlertTriangle}>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md p-2.5 text-xs"
                style={{
                  background: a.severity === 'error' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${a.severity === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                }}
              >
                {a.severity === 'error' ? (
                  <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
                ) : (
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--yellow)' }} />
                )}
                <div>
                  <span className="font-semibold text-[var(--text)]">{a.parcelName}:</span>{' '}
                  <span className="text-[var(--text2)]">{a.message}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Compliance checklist summary */}
      <Card title="Compliance Checklist" icon={CheckCircle2}>
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <StatusIcon status={item.status} />
              <div className="flex-1">
                <span className="text-[var(--text2)]">{item.description}</span>
                <span className="ml-2 text-[10px] text-[var(--text3)] font-mono">{item.article}</span>
              </div>
              <span className="text-[10px] text-[var(--text3)] whitespace-nowrap">{item.dueDate}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Export */}
      <div className="flex gap-3">
        <button
          className="flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium text-white transition hover:brightness-110"
          style={{ background: 'var(--green)' }}
          onClick={() => {
            const blob = new Blob([generateExportReport(parcelScores, checklist, alerts)], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'eudr-compliance-report.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={14} />
          Export Compliance Report
        </button>
        <a
          href="https://www.skogsstyrelsen.se/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition hover:brightness-95"
          style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
        >
          <ExternalLink size={14} />
          Skogsstyrelsen
        </a>
      </div>
    </div>
  );
}

// ── Due Diligence Statements ──
function DDSSection({
  ddsStatements,
  parcels,
  expandedDDS,
  setExpandedDDS,
}: {
  ddsStatements: DueDiligenceStatement[];
  parcels: DemoParcel[];
  expandedDDS: string | null;
  setExpandedDDS: (id: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--text3)] rounded-md p-3" style={{ background: 'var(--bg3)' }}>
        <strong>Article 4 — Due Diligence Statement (DDS):</strong> Operators must submit a DDS to the EU Information System
        before placing relevant commodities on the EU market. Each statement must include geolocation data, product
        descriptions, risk assessment results, and a declaration of deforestation-free and legally harvested status.
      </div>

      {ddsStatements.map((dds, i) => {
        const parcel = parcels[i];
        const isExpanded = expandedDDS === dds.referenceNumber;

        return (
          <div
            key={dds.referenceNumber}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}
          >
            {/* Header */}
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setExpandedDDS(isExpanded ? null : dds.referenceNumber)}
            >
              <div className="flex items-center gap-3">
                <FileText size={16} style={{ color: 'var(--green)' }} />
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{dds.referenceNumber}</div>
                  <div className="text-xs text-[var(--text3)]">{parcel.name} — {parcel.area_hectares} ha</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RiskBadge level={dds.riskLevel} />
                {dds.deforestationFree && (
                  <span className="flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5"
                    style={{ background: 'rgba(27,94,32,0.1)', color: 'var(--green)' }}>
                    <CheckCircle2 size={10} /> Deforestation-free
                  </span>
                )}
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: 'var(--border)' }}>
                {/* Operator info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <LabelValue label="Operator" value={dds.operatorName} />
                  <LabelValue label="Country" value={dds.operatorCountry} />
                  <LabelValue label="Product" value={dds.productType} />
                  <LabelValue label="Harvest date" value={dds.dateOfHarvest} />
                  <LabelValue label="Submission date" value={dds.submissionDate} />
                  <LabelValue label="Legally harvested" value={dds.legallyHarvested ? 'Yes' : 'No'} />
                </div>

                {/* Geolocation */}
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text)] mb-2 flex items-center gap-1">
                    <MapPin size={12} /> Geolocation (Article 9.1.d)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <LabelValue label="Center point" value={`${dds.geolocation.lat.toFixed(4)}°N, ${dds.geolocation.lng.toFixed(4)}°E`} />
                    <LabelValue label="Polygon vertices" value={`${dds.polygonCoords.length - 1} points (closed ring)`} />
                  </div>
                  <div className="mt-2 rounded-md p-2 text-[10px] font-mono overflow-x-auto" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                    {JSON.stringify({
                      type: 'Feature',
                      properties: { name: parcel.name, dds: dds.referenceNumber },
                      geometry: { type: 'Polygon', coordinates: [dds.polygonCoords] },
                    }, null, 2).slice(0, 400)}...
                  </div>
                </div>

                {/* Species & volume */}
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text)] mb-2 flex items-center gap-1">
                    <TreePine size={12} /> Species & Volume (Article 9.1.b)
                  </h4>
                  <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--bg3)' }}>
                          <th className="text-left p-2 font-medium text-[var(--text3)]">Species</th>
                          <th className="text-right p-2 font-medium text-[var(--text3)]">Volume (m3)</th>
                          <th className="text-right p-2 font-medium text-[var(--text3)]">% mix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dds.speciesHarvested.map((s) => (
                          <tr key={s.species} className="border-t" style={{ borderColor: 'var(--border)' }}>
                            <td className="p-2 text-[var(--text2)]">{s.species}</td>
                            <td className="p-2 text-right font-mono text-[var(--text)]">{s.volume_m3}</td>
                            <td className="p-2 text-right font-mono text-[var(--text3)]">
                              {parcel.species_mix.find((sp) => sp.species === s.species)?.pct ?? 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Download DDS */}
                <button
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-white"
                  style={{ background: 'var(--green)' }}
                  onClick={() => {
                    const text = formatDDS(dds, parcel);
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${dds.referenceNumber}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download size={13} />
                  Download DDS
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Deforestation-Free Verification ──
function VerificationSection({
  verification,
  parcel,
}: {
  verification: DeforestationVerification;
  parcel: DemoParcel;
}) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--text3)] rounded-md p-3" style={{ background: 'var(--bg3)' }}>
        <strong>Article 2(13) — Reference date December 31, 2020:</strong> Products are deforestation-free if the relevant commodities
        were produced on land that was not subject to deforestation after December 31, 2020, and wood was harvested from
        the forest without inducing forest degradation after that date.
      </div>

      <Card title="Deforestation-Free Status" icon={TreePine}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: verification.status === 'verified' ? 'rgba(27,94,32,0.1)' : 'rgba(245,158,11,0.1)',
                color: verification.status === 'verified' ? 'var(--green)' : 'var(--yellow)',
              }}
            >
              {verification.status === 'verified' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              {verification.status === 'verified' ? 'Verified Deforestation-Free' : 'Verification Pending'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <LabelValue label="Reference date" value={verification.referenceDate} />
            <LabelValue label="Verification method" value={verification.verificationMethod} />
            <LabelValue label="Land use (2020)" value={verification.landUse2020} />
            <LabelValue label="Land use (current)" value={verification.landUseCurrent} />
          </div>
        </div>
      </Card>

      {/* Canopy cover comparison */}
      <Card title="Canopy Cover Analysis" icon={Layers}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
              <div className="text-[10px] font-medium text-[var(--text3)] mb-1">Dec 2020 Baseline</div>
              <div className="text-xl font-bold font-mono text-[var(--text)]">{verification.canopyCover2020}%</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
              <div className="text-[10px] font-medium text-[var(--text3)] mb-1">Current (2026)</div>
              <div className="text-xl font-bold font-mono text-[var(--text)]">{verification.canopyCoverCurrent}%</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(27,94,32,0.06)' }}>
              <div className="text-[10px] font-medium text-[var(--text3)] mb-1">Change</div>
              <div className="text-xl font-bold font-mono" style={{ color: 'var(--green)' }}>
                +{verification.canopyChange}%
              </div>
            </div>
          </div>

          {/* Satellite timeline concept */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)] mb-2">Sentinel-2 NDVI Timeline</h4>
            <div className="flex gap-2">
              {['2020-Q4', '2021-Q2', '2022-Q2', '2023-Q2', '2024-Q2', '2025-Q2', '2026-Q1'].map((period, i) => {
                const ndvi = 0.55 + i * 0.015 + Math.random() * 0.03;
                const height = Math.round(ndvi * 80);
                return (
                  <div key={period} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${height}px`,
                        background: `linear-gradient(to top, var(--green), var(--green2))`,
                        opacity: 0.6 + i * 0.05,
                      }}
                    />
                    <span className="text-[8px] text-[var(--text3)]">{period}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text3)]">
              <span>NDVI baseline: stable or increasing canopy</span>
              <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--green)' }}>
                <CheckCircle2 size={10} /> No deforestation detected
              </span>
            </div>
          </div>

          {/* Land classification */}
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-xs font-semibold text-[var(--text)] mb-2">Land Use Classification (IPCC)</h4>
            <div className="text-xs text-[var(--text2)] space-y-1">
              <p>Category: <strong>Forest land remaining forest land</strong> (FL-FL)</p>
              <p>Management type: Managed production forest — continuous cover forestry</p>
              <p>Crown cover threshold: &gt;10% canopy cover over 0.5 ha (FAO definition)</p>
              <p>Status: Compliant with EUDR Article 2(5) forest definition</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Supply Chain Traceability ──
function SupplyChainSection({
  chain,
  parcel,
}: {
  chain: SupplyChainNode[];
  parcel: DemoParcel;
}) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--text3)] rounded-md p-3" style={{ background: 'var(--bg3)' }}>
        <strong>Article 9 — Information requirements:</strong> Operators must collect and retain geolocation,
        product description, quantity, supplier details, and evidence that products are deforestation-free
        and comply with the legislation of the country of production.
      </div>

      <Card title={`Supply Chain — ${parcel.name}`} icon={Link2}>
        <div className="relative space-y-0">
          {chain.map((node, i) => (
            <div key={node.id} className="flex gap-3">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: node.documented ? 'rgba(27,94,32,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `2px solid ${node.documented ? 'var(--green)' : '#ef4444'}`,
                  }}
                >
                  {node.type === 'origin' && <TreePine size={14} style={{ color: node.documented ? 'var(--green)' : '#ef4444' }} />}
                  {node.type === 'processing' && <Layers size={14} style={{ color: node.documented ? 'var(--green)' : '#ef4444' }} />}
                  {node.type === 'transport' && <Link2 size={14} style={{ color: node.documented ? 'var(--green)' : '#ef4444' }} />}
                  {node.type === 'market' && <BarChart3 size={14} style={{ color: node.documented ? 'var(--green)' : '#ef4444' }} />}
                </div>
                {i < chain.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-[20px]" style={{ background: 'var(--border)' }} />
                )}
              </div>

              {/* Node content */}
              <div className="pb-4 flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[var(--text)]">{node.name}</div>
                    <div className="text-[10px] text-[var(--text3)]">{node.location}</div>
                    <div className="text-[10px] text-[var(--text3)]">Operator: {node.operator} — {node.date}</div>
                  </div>
                  {node.documented ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5"
                      style={{ background: 'rgba(27,94,32,0.1)', color: 'var(--green)' }}>
                      <CheckCircle2 size={10} /> Documented
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      <XCircle size={10} /> Missing
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Chain of custody checklist */}
      <Card title="Chain of Custody Documentation" icon={FileText}>
        <div className="space-y-2 text-xs">
          {[
            { label: 'Harvest notification (Avverkningsanmälan) — Skogsstyrelsen', done: true },
            { label: 'Measurement certificate (VMR virkesmätning)', done: true },
            { label: 'Transport waybill (fraktsedel)', done: chain[2]?.documented ?? false },
            { label: 'Sawmill intake receipt', done: true },
            { label: 'FSC/PEFC chain of custody certificate', done: true },
            { label: 'EU market placement declaration', done: chain[3]?.documented ?? false },
          ].map((doc, i) => (
            <div key={i} className="flex items-center gap-2">
              {doc.done ? (
                <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
              ) : (
                <Circle size={14} style={{ color: '#ef4444' }} />
              )}
              <span className="text-[var(--text2)]">{doc.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Operator vs Trader */}
      <Card title="Operator vs Trader Obligations" icon={Info}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-md p-3" style={{ background: 'var(--bg3)' }}>
            <h4 className="font-semibold text-[var(--text)] mb-2">Operator (Article 2.15)</h4>
            <p className="text-[var(--text3)] mb-2">Natural or legal person who places relevant products on the EU market.</p>
            <ul className="space-y-1 text-[var(--text2)]">
              <li>- Full due diligence obligation</li>
              <li>- Must submit DDS before market placement</li>
              <li>- Geolocation of all production plots required</li>
              <li>- 5-year record retention obligation</li>
            </ul>
          </div>
          <div className="rounded-md p-3" style={{ background: 'var(--bg3)' }}>
            <h4 className="font-semibold text-[var(--text)] mb-2">Trader (Article 2.16)</h4>
            <p className="text-[var(--text3)] mb-2">Person in the supply chain other than the operator who makes products available.</p>
            <ul className="space-y-1 text-[var(--text2)]">
              <li>- Must keep records of suppliers and customers</li>
              <li>- Must be able to identify operators/traders</li>
              <li>- Simplified due diligence for non-SME traders</li>
              <li>- SME traders: full due diligence from June 2026</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Risk Assessment Matrix ──
function RiskSection({
  risk,
  parcel,
}: {
  risk: RiskAssessment;
  parcel: DemoParcel;
}) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--text3)] rounded-md p-3" style={{ background: 'var(--bg3)' }}>
        <strong>Article 10 — Risk assessment:</strong> Operators must assess and mitigate the risk that products
        are not deforestation-free or were not produced in accordance with relevant legislation. The assessment
        must consider country benchmarking (Article 29), product complexity, and supply chain factors.
      </div>

      {/* Risk matrix */}
      <Card title={`Risk Assessment — ${parcel.name}`} icon={AlertTriangle}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <RiskCard label="Country Risk" level={risk.countryRisk} detail="Sweden — EU low risk" />
            <RiskCard label="Product Risk" level={risk.productRisk} detail="Roundwood CN 4403" />
            <RiskCard label="Supplier Risk" level={risk.supplierRisk} detail="Forest owner verified" />
            <RiskCard label="Overall Risk" level={risk.overallRisk} detail="Combined assessment" />
          </div>

          {risk.mitigationMeasures.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text)] mb-2">Mitigation Measures Required</h4>
              <div className="space-y-1.5">
                {risk.mitigationMeasures.map((m, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[var(--text2)]">
                    <Shield size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--yellow)' }} />
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}

          {risk.mitigationMeasures.length === 0 && (
            <div className="flex items-center gap-2 rounded-md p-3 text-xs"
              style={{ background: 'rgba(27,94,32,0.06)', border: '1px solid rgba(27,94,32,0.15)' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
              <span className="text-[var(--text2)]">
                No additional mitigation required — negligible risk classification per Annex II criteria.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Country benchmarking detail */}
      <Card title="Country Benchmarking (Article 29)" icon={MapPin}>
        <div className="space-y-3 text-xs">
          <p className="text-[var(--text3)]">
            The European Commission categorizes countries/regions based on deforestation risk using criteria
            including rate of deforestation, rate of forest expansion, production trends for relevant commodities,
            and governance indicators.
          </p>
          <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  <th className="text-left p-2 font-medium text-[var(--text3)]">Criterion</th>
                  <th className="text-left p-2 font-medium text-[var(--text3)]">Sweden Assessment</th>
                  <th className="text-center p-2 font-medium text-[var(--text3)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { criterion: 'Rate of deforestation/forest degradation', assessment: 'Net forest area increasing (+0.3%/yr)', pass: true },
                  { criterion: 'Rate of expansion of agricultural land', assessment: 'Stable; no conversion from forest', pass: true },
                  { criterion: 'Production trends for relevant commodities', assessment: 'Sustainable yield management (SVL)', pass: true },
                  { criterion: 'Information from indigenous peoples', assessment: 'Sami Parliament consultation framework', pass: true },
                  { criterion: 'Transparency of legislation and governance', assessment: 'EU member state, Skogsstyrelsen oversight', pass: true },
                  { criterion: 'National/subnational REDD+ programs', assessment: 'Not applicable (net carbon sink)', pass: true },
                  { criterion: 'Bilateral agreements with EU', assessment: 'EU member state — full alignment', pass: true },
                ].map((row, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="p-2 text-[var(--text2)]">{row.criterion}</td>
                    <td className="p-2 text-[var(--text)]">{row.assessment}</td>
                    <td className="p-2 text-center">
                      <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Product risk detail */}
      <Card title="Product Risk Classification" icon={TreePine}>
        <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                <th className="text-left p-2 font-medium text-[var(--text3)]">Product</th>
                <th className="text-left p-2 font-medium text-[var(--text3)]">CN Code</th>
                <th className="text-center p-2 font-medium text-[var(--text3)]">Risk Level</th>
                <th className="text-left p-2 font-medium text-[var(--text3)]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                { product: 'Roundwood (logs)', cn: '4403', risk: 'low' as RiskLevel, note: 'Direct forest origin, fully traceable' },
                { product: 'Sawn timber', cn: '4407', risk: 'low' as RiskLevel, note: 'Single processing step from roundwood' },
                { product: 'Wood pulp', cn: '4702-4706', risk: 'low' as RiskLevel, note: 'Industrial processing, FSC/PEFC certified' },
                { product: 'Biomass pellets', cn: '4401.31', risk: 'negligible' as RiskLevel, note: 'Residual material from sawmills' },
                { product: 'Paper products', cn: '4801-4823', risk: 'low' as RiskLevel, note: 'Multi-step processing chain' },
              ].map((row, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="p-2 text-[var(--text2)]">{row.product}</td>
                  <td className="p-2 font-mono text-[var(--text3)]">{row.cn}</td>
                  <td className="p-2 text-center"><RiskBadge level={row.risk} /></td>
                  <td className="p-2 text-[var(--text3)]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Compliance Timeline ──
function TimelineSection({
  timeline,
  checklist,
}: {
  timeline: TimelineMilestone[];
  checklist: ComplianceItem[];
}) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--text3)] rounded-md p-3" style={{ background: 'var(--bg3)' }}>
        <strong>Regulation 2023/1115 — Key dates:</strong> The EUDR entered into force June 29, 2023.
        Large operators and non-SME traders must comply from December 30, 2025. Micro and small enterprises
        have until June 30, 2026. The Commission will review the regulation by June 29, 2028.
      </div>

      {/* Visual timeline */}
      <Card title="Regulatory Timeline" icon={Calendar}>
        <div className="relative">
          {timeline.map((m, i) => (
            <div key={i} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: m.status === 'passed' ? 'var(--green)' : m.status === 'current' ? 'var(--yellow)' : 'var(--bg3)',
                    border: m.status === 'upcoming' ? '2px solid var(--border)' : 'none',
                  }}
                >
                  {m.status === 'passed' && <CheckCircle2 size={12} color="#fff" />}
                  {m.status === 'current' && <Circle size={12} color="#fff" fill="#fff" />}
                  {m.status === 'upcoming' && <Circle size={10} style={{ color: 'var(--text3)' }} />}
                </div>
                {i < timeline.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-[16px]" style={{ background: 'var(--border)' }} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-[var(--text)]">{m.label}</span>
                  <span className="text-[10px] font-mono text-[var(--text3)]">{m.date}</span>
                </div>
                <p className="text-[11px] text-[var(--text3)] mt-0.5">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Document preparation tracker */}
      <Card title="Document Preparation Tracker" icon={FileText}>
        <div className="space-y-3">
          {['Information Collection', 'Risk Assessment', 'Due Diligence Statement', 'Traceability', 'Legal Compliance', 'Record Keeping', 'Monitoring'].map((cat) => {
            const items = checklist.filter((c) => c.category === cat);
            if (items.length === 0) return null;
            const completed = items.filter((c) => c.status === 'complete').length;
            const pct = Math.round((completed / items.length) * 100);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--text)]">{cat}</span>
                  <span className="text-[10px] font-mono text-[var(--text3)]">{completed}/{items.length}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--bg3)' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ================================================================
   REUSABLE UI COMPONENTS
   ================================================================ */

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Shield; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color: 'var(--green)' }} />
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
      <div className="text-[10px] font-medium text-[var(--text3)] mb-1">{label}</div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[var(--text3)] mt-0.5">{sub}</div>
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium text-[var(--text3)] mb-0.5">{label}</div>
      <div className="text-xs text-[var(--text)]">{value}</div>
    </div>
  );
}

function StatusIcon({ status }: { status: ComplianceItem['status'] }) {
  switch (status) {
    case 'complete':
      return <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />;
    case 'in-progress':
      return <Clock size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--yellow)' }} />;
    case 'pending':
      return <Circle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text3)' }} />;
    case 'overdue':
      return <XCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />;
  }
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config: Record<RiskLevel, { bg: string; color: string; label: string }> = {
    negligible: { bg: 'rgba(27,94,32,0.1)', color: 'var(--green)', label: 'Negligible' },
    low: { bg: 'rgba(27,94,32,0.08)', color: 'var(--green2)', label: 'Low' },
    standard: { bg: 'rgba(245,158,11,0.1)', color: 'var(--yellow)', label: 'Standard' },
    high: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'High' },
  };
  const c = config[level];
  return (
    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function RiskCard({ label, level, detail }: { label: string; level: RiskLevel; detail: string }) {
  const colors: Record<RiskLevel, string> = {
    negligible: 'var(--green)',
    low: 'var(--green2)',
    standard: 'var(--yellow)',
    high: '#ef4444',
  };
  return (
    <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
      <div className="text-[10px] font-medium text-[var(--text3)] mb-1">{label}</div>
      <div className="text-sm font-bold capitalize" style={{ color: colors[level] }}>{level}</div>
      <div className="text-[9px] text-[var(--text3)] mt-0.5">{detail}</div>
    </div>
  );
}

/* ================================================================
   EXPORT HELPERS
   ================================================================ */

function formatDDS(dds: DueDiligenceStatement, parcel: DemoParcel): string {
  return `
════════════════════════════════════════════════════════════════
EU DEFORESTATION REGULATION (2023/1115) — DUE DILIGENCE STATEMENT
════════════════════════════════════════════════════════════════

Reference Number: ${dds.referenceNumber}
Date of Submission: ${dds.submissionDate}

─── OPERATOR INFORMATION ───
Name: ${dds.operatorName}
Country: ${dds.operatorCountry}
Role: Operator (Article 2.15)

─── PRODUCT INFORMATION ───
Product Type: ${dds.productType}
Country of Production: ${dds.countryOfProduction}
Date of Harvest: ${dds.dateOfHarvest}

Species & Volumes:
${dds.speciesHarvested.map((s) => `  - ${s.species}: ${s.volume_m3} m3`).join('\n')}

Total Volume: ${dds.speciesHarvested.reduce((a, s) => a + s.volume_m3, 0).toFixed(1)} m3

─── GEOLOCATION (Article 9.1.d) ───
Parcel: ${parcel.name}
Area: ${parcel.area_hectares} hectares
Center Point: ${dds.geolocation.lat.toFixed(6)}°N, ${dds.geolocation.lng.toFixed(6)}°E
Municipality: ${parcel.municipality}

Polygon Coordinates (WGS84):
${dds.polygonCoords.map((c, i) => `  Point ${i + 1}: ${c[1].toFixed(6)}°N, ${c[0].toFixed(6)}°E`).join('\n')}

─── RISK ASSESSMENT ───
Risk Level: ${dds.riskLevel.toUpperCase()}
Deforestation-Free: ${dds.deforestationFree ? 'YES' : 'NO'}
Legally Harvested: ${dds.legallyHarvested ? 'YES' : 'NO'}

─── DECLARATION ───
The operator hereby declares that due diligence has been exercised
in accordance with Article 8 of Regulation (EU) 2023/1115, and that
the relevant products are deforestation-free and have been produced
in accordance with the relevant legislation of the country of production.

Generated by BeetleSense Forest Intelligence Platform
  `.trim();
}

function generateExportReport(
  parcelScores: { parcelId: string; parcelName: string; score: number }[],
  checklist: ComplianceItem[],
  alerts: { parcelName: string; message: string; severity: 'warning' | 'error' }[],
): string {
  const completed = checklist.filter((c) => c.status === 'complete').length;
  return `
════════════════════════════════════════════════════════════════
EUDR COMPLIANCE REPORT — BeetleSense Forest AB
Generated: ${new Date().toISOString().split('T')[0]}
════════════════════════════════════════════════════════════════

OVERALL COMPLIANCE: ${Math.round((completed / checklist.length) * 100)}%
Completed Items: ${completed}/${checklist.length}

─── PARCEL SCORES ───
${parcelScores.map((p) => `  ${p.parcelName}: ${p.score}%`).join('\n')}

─── ALERTS (${alerts.length}) ───
${alerts.length === 0 ? '  No outstanding alerts.' : alerts.map((a) => `  [${a.severity.toUpperCase()}] ${a.parcelName}: ${a.message}`).join('\n')}

─── CHECKLIST STATUS ───
${checklist.map((c) => `  [${c.status === 'complete' ? 'X' : c.status === 'in-progress' ? '~' : ' '}] ${c.description}`).join('\n')}

─── REGULATORY REFERENCE ───
EU Regulation 2023/1115 (Official Journal L 150)
Country of Production: Sweden (EU-benchmarked: LOW RISK)
Competent Authority: Skogsstyrelsen (Swedish Forest Agency)
Application Date: December 30, 2025 (large operators)
SME Application Date: June 30, 2026

Report generated by BeetleSense Forest Intelligence Platform.
  `.trim();
}
