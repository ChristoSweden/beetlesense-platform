/**
 * CarbonVerification — Independent verification dashboard.
 *
 * Features:
 * - Satellite-verified carbon stock (Sentinel-2 + LiDAR)
 * - Third-party audit status
 * - Swedish National Forest Inventory reference methodology
 * - Additionality proof (forest stores MORE than baseline)
 * - Annual verification report preview
 */

import { useState, useMemo } from 'react';
import {
  Satellite,
  ShieldCheck,
  FileText,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BarChart3,
  Layers,
  TreePine,
  Info,
  Download,
} from 'lucide-react';
import {
  DEMO_PARCELS as CARBON_PARCELS,
  CARBON_COEFFICIENTS,
  getAgeModifier,
  getSiteIndexModifier,
  formatCO2,
  type CarbonParcel,
} from '@/services/carbonService';

// ─── Types ───

interface SatelliteVerification {
  parcelId: string;
  parcelName: string;
  lastScan: string;
  ndviScore: number;         // 0-1
  estimatedCO2: number;      // tonnes
  modelCO2: number;          // our calculation
  deviation: number;         // %
  confidenceLevel: 'high' | 'medium' | 'low';
  lidarAvailable: boolean;
  lidarCO2?: number;
  sentinel2Date: string;
}

interface AuditRecord {
  id: string;
  auditor: string;
  date: string;
  type: 'initial' | 'annual' | 'spot_check';
  status: 'passed' | 'pending' | 'findings';
  findings?: string;
  nextDue: string;
}

interface AdditionalityMetric {
  label: string;
  labelSv: string;
  yourValue: number;
  baselineValue: number;
  unit: string;
  isAboveBaseline: boolean;
  delta: number;     // % difference
}

interface ReportSection {
  title: string;
  status: 'complete' | 'pending' | 'not_started';
  details: string;
}

// ─── Demo Data Generation ───

function buildSatelliteData(parcels: CarbonParcel[]): SatelliteVerification[] {
  return parcels.map(p => {
    const coeff = CARBON_COEFFICIENTS[p.species];
    const siMod = getSiteIndexModifier(p.siteIndex);

    let modelCO2 = 0;
    for (let yr = 1; yr <= p.ageYears; yr++) {
      modelCO2 += coeff.peakSequestration * getAgeModifier(yr) * siMod;
    }
    modelCO2 *= p.areaHa;

    // Satellite estimate with realistic deviation
    const deviation = (Math.random() * 10 - 3); // -3% to +7%
    const estimatedCO2 = Math.round(modelCO2 * (1 + deviation / 100));
    const ndvi = 0.65 + (p.ageYears / 100) * 0.2 + (Math.random() * 0.08);

    return {
      parcelId: p.id,
      parcelName: p.name,
      lastScan: '2026-03-14',
      ndviScore: Math.min(0.95, Math.round(ndvi * 100) / 100),
      estimatedCO2,
      modelCO2: Math.round(modelCO2),
      deviation: Math.round(deviation * 10) / 10,
      confidenceLevel: Math.abs(deviation) < 5 ? 'high' : Math.abs(deviation) < 8 ? 'medium' : 'low',
      lidarAvailable: p.areaHa >= 30,
      lidarCO2: p.areaHa >= 30 ? Math.round(modelCO2 * (1 + (Math.random() * 4 - 1) / 100)) : undefined,
      sentinel2Date: '2026-03-12',
    };
  });
}

const DEMO_AUDITS: AuditRecord[] = [
  {
    id: 'audit-1',
    auditor: 'SGS Sweden AB',
    date: '2026-01-15',
    type: 'annual',
    status: 'passed',
    nextDue: '2027-01-15',
  },
  {
    id: 'audit-2',
    auditor: 'DNV GL Nordic',
    date: '2025-06-20',
    type: 'initial',
    status: 'passed',
    nextDue: '2026-06-20',
  },
  {
    id: 'audit-3',
    auditor: 'Skogsstyrelsen',
    date: '2025-11-03',
    type: 'spot_check',
    status: 'passed',
    findings: 'Minor: Update parcel boundary GPS coordinates',
    nextDue: 'On demand',
  },
  {
    id: 'audit-4',
    auditor: 'Bureau Veritas Nordic',
    date: '2026-06-01',
    type: 'annual',
    status: 'pending',
    nextDue: '2026-06-01',
  },
];

function buildAdditionalityMetrics(parcels: CarbonParcel[]): AdditionalityMetric[] {
  const totalArea = parcels.reduce((s, p) => s + p.areaHa, 0);
  const avgAge = parcels.reduce((s, p) => s + p.ageYears * p.areaHa, 0) / totalArea;

  // Total CO₂ per ha
  let totalCO2 = 0;
  for (const p of parcels) {
    const coeff = CARBON_COEFFICIENTS[p.species];
    const siMod = getSiteIndexModifier(p.siteIndex);
    for (let yr = 1; yr <= p.ageYears; yr++) {
      totalCO2 += coeff.peakSequestration * getAgeModifier(yr) * siMod * p.areaHa;
    }
  }
  const co2PerHa = totalCO2 / totalArea;

  // Swedish National Forest Inventory baseline for southern Sweden
  const baselineCO2PerHa = 120; // average for Gotaland region
  const baselineSeqRate = 5.2;  // t CO₂/ha/yr
  const _baselineVolume = 180;   // m³/ha

  // Your sequestration rate
  let annualSeq = 0;
  for (const p of parcels) {
    const coeff = CARBON_COEFFICIENTS[p.species];
    annualSeq += coeff.peakSequestration * getAgeModifier(p.ageYears) * getSiteIndexModifier(p.siteIndex) * p.areaHa;
  }
  const seqPerHa = annualSeq / totalArea;

  return [
    {
      label: 'Carbon stock per hectare',
      labelSv: 'Kolförråd per hektar',
      yourValue: Math.round(co2PerHa),
      baselineValue: baselineCO2PerHa,
      unit: 't CO₂/ha',
      isAboveBaseline: co2PerHa > baselineCO2PerHa,
      delta: Math.round(((co2PerHa - baselineCO2PerHa) / baselineCO2PerHa) * 100),
    },
    {
      label: 'Annual sequestration rate',
      labelSv: 'Årlig kolbindningstakt',
      yourValue: Math.round(seqPerHa * 10) / 10,
      baselineValue: baselineSeqRate,
      unit: 't CO₂/ha/yr',
      isAboveBaseline: seqPerHa > baselineSeqRate,
      delta: Math.round(((seqPerHa - baselineSeqRate) / baselineSeqRate) * 100),
    },
    {
      label: 'Average stand age',
      labelSv: 'Genomsnittlig bestandsålder',
      yourValue: Math.round(avgAge),
      baselineValue: 55,
      unit: 'years',
      isAboveBaseline: avgAge > 55,
      delta: Math.round(((avgAge - 55) / 55) * 100),
    },
    {
      label: 'Species diversity index',
      labelSv: 'Artdiversitetsindex',
      yourValue: 3.2,
      baselineValue: 2.1,
      unit: 'Shannon H\'',
      isAboveBaseline: true,
      delta: 52,
    },
    {
      label: 'Deadwood volume',
      labelSv: 'Döda vedvolym',
      yourValue: 18,
      baselineValue: 8,
      unit: 'm³/ha',
      isAboveBaseline: true,
      delta: 125,
    },
  ];
}

const DEMO_REPORT_SECTIONS: ReportSection[] = [
  { title: 'Project Description', status: 'complete', details: 'Forest parcels in Småland, southern Sweden. Mixed spruce/pine with biodiversity set-asides.' },
  { title: 'Baseline Assessment', status: 'complete', details: 'Swedish NFI reference data for Götaland used as baseline. Regional average: 120 t CO₂/ha.' },
  { title: 'Monitoring Plan', status: 'complete', details: 'Sentinel-2 NDVI monthly, LiDAR biennial, field surveys annual. NFI-calibrated biomass model.' },
  { title: 'Carbon Stock Quantification', status: 'complete', details: '3 carbon pools: AGB, BGB, SOC. Marklund equations + SLU BEF tables.' },
  { title: 'Additionality Demonstration', status: 'complete', details: 'Project scenario exceeds baseline by 38% due to extended rotation and reduced harvest intensity.' },
  { title: 'Leakage Assessment', status: 'complete', details: 'Activity-shifting leakage minimal — all parcels managed by same owner. Market leakage accounted via 15% discount.' },
  { title: 'Permanence Risk Assessment', status: 'pending', details: 'Buffer pool contribution: 15% of credits. Storm risk, fire risk, pest risk evaluated.' },
  { title: 'Stakeholder Consultation', status: 'not_started', details: 'Community consultation with local Jaktlag and Naturskyddsföreningen.' },
];

// ─── Sub-components ───

function ConfidenceBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    high: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${styles[level] || ''}`}>
      {level} confidence
    </span>
  );
}

function AuditStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'passed': return <CheckCircle2 size={14} className="text-[var(--green)]" />;
    case 'findings': return <AlertTriangle size={14} className="text-amber-400" />;
    case 'pending': return <Clock size={14} className="text-blue-400" />;
    default: return null;
  }
}

function AdditionalityBar({ metric }: { metric: AdditionalityMetric }) {
  const maxVal = Math.max(metric.yourValue, metric.baselineValue) * 1.2;
  const yourPct = (metric.yourValue / maxVal) * 100;
  const basePct = (metric.baselineValue / maxVal) * 100;

  return (
    <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text)]">{metric.label}</span>
        <span className={`text-xs font-bold font-mono ${metric.isAboveBaseline ? 'text-[var(--green)]' : 'text-red-400'}`}>
          {metric.isAboveBaseline ? '+' : ''}{metric.delta}%
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[var(--text3)] w-16">Your forest</span>
          <div className="flex-1 h-3 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--green)] transition-all duration-700"
              style={{ width: `${yourPct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-[var(--text)] w-20 text-right">
            {metric.yourValue} {metric.unit}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[var(--text3)] w-16">NFI baseline</span>
          <div className="flex-1 h-3 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--text3)]/40 transition-all duration-700"
              style={{ width: `${basePct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-[var(--text3)] w-20 text-right">
            {metric.baselineValue} {metric.unit}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───

type TabId = 'satellite' | 'audits' | 'additionality' | 'report';

export function CarbonVerification() {
  const [activeTab, setActiveTab] = useState<TabId>('satellite');

  const satelliteData = useMemo(() => buildSatelliteData(CARBON_PARCELS), []);
  const additionalityMetrics = useMemo(() => buildAdditionalityMetrics(CARBON_PARCELS), []);

  // Totals
  const totalSatelliteCO2 = satelliteData.reduce((s, d) => s + d.estimatedCO2, 0);
  const totalModelCO2 = satelliteData.reduce((s, d) => s + d.modelCO2, 0);
  const avgDeviation = satelliteData.reduce((s, d) => s + Math.abs(d.deviation), 0) / satelliteData.length;
  const _allHigh = satelliteData.every(d => d.confidenceLevel === 'high');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'satellite', label: 'Satellite Data', icon: <Satellite size={14} /> },
    { id: 'audits', label: 'Audit Status', icon: <ShieldCheck size={14} /> },
    { id: 'additionality', label: 'Additionality', icon: <BarChart3 size={14} /> },
    { id: 'report', label: 'Report', icon: <FileText size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--green)]/30 p-4 bg-[var(--green)]/5">
          <div className="flex items-center gap-2 mb-1">
            <Satellite size={14} className="text-[var(--green)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Satellite Verified</span>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--green)]">{formatCO2(totalSatelliteCO2)} t</p>
          <p className="text-[10px] text-[var(--text3)]">Sentinel-2 + LiDAR estimate</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Model Estimate</span>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text)]">{formatCO2(totalModelCO2)} t</p>
          <p className="text-[10px] text-[var(--text3)]">SLU growth model</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Avg Deviation</span>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text)]">{avgDeviation.toFixed(1)}%</p>
          <p className="text-[10px] text-[var(--text3)]">Satellite vs model</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Audit Status</span>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--green)]">
            {DEMO_AUDITS.filter(a => a.status === 'passed').length}/{DEMO_AUDITS.length}
          </p>
          <p className="text-[10px] text-[var(--text3)]">audits passed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-[var(--border)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--green)] text-[var(--green)]'
                : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[40vh]">
        {/* ── Satellite Data ── */}
        {activeTab === 'satellite' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text)]">Satellite-Verified Carbon Stock</h3>
              <span className="text-[10px] text-[var(--text3)]">Last scan: 2026-03-14</span>
            </div>
            <div className="space-y-3">
              {satelliteData.map(sv => (
                <div key={sv.parcelId} className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TreePine size={14} className="text-[var(--green)]" />
                      <span className="text-sm font-medium text-[var(--text)]">{sv.parcelName}</span>
                    </div>
                    <ConfidenceBadge level={sv.confidenceLevel} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Sentinel-2 NDVI</p>
                      <p className="text-base font-bold font-mono text-[var(--green)]">{sv.ndviScore.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Satellite CO₂</p>
                      <p className="text-base font-bold font-mono text-[var(--text)]">{formatCO2(sv.estimatedCO2)} t</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Model CO₂</p>
                      <p className="text-base font-bold font-mono text-[var(--text)]">{formatCO2(sv.modelCO2)} t</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Deviation</p>
                      <p className={`text-base font-bold font-mono ${
                        Math.abs(sv.deviation) < 5 ? 'text-[var(--green)]' : 'text-amber-400'
                      }`}>
                        {sv.deviation > 0 ? '+' : ''}{sv.deviation}%
                      </p>
                    </div>
                  </div>

                  {sv.lidarAvailable && sv.lidarCO2 && (
                    <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5 flex items-center gap-2">
                      <Layers size={12} className="text-blue-400" />
                      <span className="text-[10px] text-[var(--text3)]">LiDAR cross-check:</span>
                      <span className="text-[10px] font-mono font-medium text-blue-400">{formatCO2(sv.lidarCO2)} t CO₂</span>
                      <span className="text-[10px] text-[var(--text3)]">
                        ({((sv.lidarCO2 - sv.modelCO2) / sv.modelCO2 * 100).toFixed(1)}% vs model)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Methodology note */}
            <div className="rounded-lg border border-[var(--border)] p-3 flex items-start gap-2" style={{ background: 'var(--bg2)' }}>
              <Info size={14} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                Carbon stock estimated using Sentinel-2 Level-2A NDVI composites calibrated against
                Swedish National Forest Inventory (Riksskogstaxeringen) ground-truth plots.
                LiDAR data from Lantmateriet's national scan provides canopy height models for
                biomass estimation using Marklund (1988) allometric equations.
              </p>
            </div>
          </div>
        )}

        {/* ── Audit Status ── */}
        {activeTab === 'audits' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Third-Party Audit History</h3>
            <div className="space-y-3">
              {DEMO_AUDITS.map(audit => (
                <div key={audit.id} className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AuditStatusIcon status={audit.status} />
                      <span className="text-sm font-medium text-[var(--text)]">{audit.auditor}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                      audit.status === 'passed' ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20' :
                      audit.status === 'pending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {audit.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Type</p>
                      <p className="text-xs font-medium text-[var(--text)] capitalize">{audit.type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Date</p>
                      <p className="text-xs font-mono text-[var(--text)]">{audit.date}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Next Due</p>
                      <p className="text-xs font-mono text-[var(--text)]">{audit.nextDue}</p>
                    </div>
                  </div>
                  {audit.findings && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)]">
                      <p className="text-[10px] text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {audit.findings}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Additionality ── */}
        {activeTab === 'additionality' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Additionality Proof</h3>
              <p className="text-xs text-[var(--text3)] mt-1">
                Demonstrating your forest stores MORE carbon than the Swedish National Forest Inventory (Riksskogstaxeringen) regional baseline.
              </p>
            </div>

            {/* Overall additionality score */}
            <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--green)]/20 border border-[var(--green)]/30">
                  <TrendingUp size={24} className="text-[var(--green)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text3)]">Overall Additionality Score</p>
                  <p className="text-3xl font-bold font-mono text-[var(--green)]">+38%</p>
                  <p className="text-[10px] text-[var(--text3)]">Above NFI baseline for Gotaland region</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text2)]">
                Your forest management practices result in significantly higher carbon storage than the regional average,
                qualifying for additionality under Gold Standard and Verra VCS methodologies.
              </p>
            </div>

            {/* Individual metrics */}
            <div className="space-y-2">
              {additionalityMetrics.map((m, i) => (
                <AdditionalityBar key={i} metric={m} />
              ))}
            </div>

            <div className="rounded-lg border border-[var(--border)] p-3 flex items-start gap-2" style={{ background: 'var(--bg2)' }}>
              <Info size={14} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                Baseline data sourced from Swedish National Forest Inventory (Riksskogstaxeringen) 2020-2025
                for the Gotaland region. Additionality demonstrated through comparison of project scenario
                (extended rotation, reduced harvest) against business-as-usual regional management practices.
              </p>
            </div>
          </div>
        )}

        {/* ── Report Preview ── */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Annual Verification Report 2026</h3>
                <p className="text-xs text-[var(--text3)]">Gold Standard A/R Methodology</p>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] text-xs font-medium hover:bg-[var(--green)]/15 transition-colors">
                <Download size={12} />
                Export PDF
              </button>
            </div>

            {/* Progress */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text2)]">Report Completion</span>
                <span className="text-xs font-mono font-semibold text-[var(--green)]">
                  {DEMO_REPORT_SECTIONS.filter(s => s.status === 'complete').length}/{DEMO_REPORT_SECTIONS.length} sections
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--green)] transition-all duration-700"
                  style={{ width: `${(DEMO_REPORT_SECTIONS.filter(s => s.status === 'complete').length / DEMO_REPORT_SECTIONS.length) * 100}%` }} />
              </div>
            </div>

            {/* Report sections */}
            <div className="space-y-2">
              {DEMO_REPORT_SECTIONS.map((section, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {section.status === 'complete' && <CheckCircle2 size={12} className="text-[var(--green)]" />}
                      {section.status === 'pending' && <Clock size={12} className="text-amber-400" />}
                      {section.status === 'not_started' && <AlertTriangle size={12} className="text-[var(--text3)]" />}
                      <span className="text-xs font-medium text-[var(--text)]">{section.title}</span>
                    </div>
                    <span className={`text-[10px] capitalize ${
                      section.status === 'complete' ? 'text-[var(--green)]' :
                      section.status === 'pending' ? 'text-amber-400' : 'text-[var(--text3)]'
                    }`}>
                      {section.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text3)] ml-5">{section.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
