import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Ruler,
  TreePine,
  Leaf,
  Satellite,
} from 'lucide-react';
import {
  getCanopyHeight,
  detectHeightChange,
  compareWithGrowthModel,
  estimateBiomassFromHeight,
  getParcelSummaries,
  CH_GEE_METHODOLOGY,
} from '@/services/opendata/canopyHeightService';
import type { CanopyHeightData, HeightChangeAnalysis } from '@/services/opendata/canopyHeightService';

// ─── Types ───

interface GrowthComparison {
  predicted: number;
  actual: number;
  deviation: number;
  deviationPercent: number;
}

interface ParcelSummary {
  id: string;
  name: string;
  meanHeight: number;
  status: string;
  areaHa: number;
}

// ─── Helpers ───

function getStatusIcon(status: string) {
  switch (status) {
    case 'growing': return <TrendingUp size={14} style={{ color: 'var(--risk-low)' }} />;
    case 'declining': return <TrendingDown size={14} style={{ color: 'var(--risk-high)' }} />;
    case 'recovering': return <TrendingUp size={14} style={{ color: 'var(--risk-moderate)' }} />;
    default: return <Minus size={14} style={{ color: 'var(--text3)' }} />;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'growing': return 'Growing';
    case 'declining': return 'Declining';
    case 'recovering': return 'Recovering';
    default: return 'Stable';
  }
}

function getHeightColor(height: number, maxH: number): string {
  const ratio = Math.min(1, height / maxH);
  if (ratio > 0.75) return '#1A6B3C';
  if (ratio > 0.5) return '#34A853';
  if (ratio > 0.3) return '#7CB342';
  return '#C8E6C9';
}

// ─── Components ───

function ParcelSelector({
  parcels,
  activeId,
  onSelect,
}: {
  parcels: ParcelSummary[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
      {parcels.map((p) => {
        const isActive = p.id === activeId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="shrink-0 rounded-xl p-4 text-left transition-all duration-150"
            style={{
              background: 'var(--bg2)',
              boxShadow: 'var(--shadow-card)',
              border: isActive ? '2px solid var(--green)' : '2px solid transparent',
              minWidth: 160,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TreePine size={14} className="text-[var(--text3)]" />
              <span className="text-xs font-medium text-[var(--text2)]">{p.name}</span>
            </div>
            <div className="flex items-end gap-2">
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}
              >
                {p.meanHeight}
              </span>
              <span className="text-xs text-[var(--text3)] mb-1">m</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {getStatusIcon(p.status)}
              <span className="text-[10px] text-[var(--text3)]">{getStatusLabel(p.status)}</span>
              <span className="text-[10px] text-[var(--text3)] ml-auto">{p.areaHa} ha</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatsPanel({ data }: { data: CanopyHeightData }) {
  const stats = [
    { label: 'Mean Height', value: `${data.stats.meanHeight}m`, icon: Ruler },
    { label: 'Max Height', value: `${data.stats.maxHeight}m`, icon: TrendingUp },
    { label: 'Canopy Cover', value: `${data.stats.canopyCover}%`, icon: Leaf },
    { label: 'GEDI Footprints', value: String(data.stats.gediFootprints), icon: Satellite },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-[var(--text3)]" />
              <span className="text-xs text-[var(--text3)]">{s.label}</span>
            </div>
            <span
              className="text-xl font-bold text-[var(--text)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {s.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HeightGrid({ data }: { data: CanopyHeightData }) {
  // Take a 5x4 subset for display
  const rows = 5;
  const cols = 4;
  const cells = data.grid.slice(0, rows * cols);
  const maxH = data.stats.maxHeight;

  // Find cells with significant loss (for Granudden NE)
  const isLossCell = (height: number) => height < data.stats.meanHeight * 0.5;

  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
        Height Profile (10m grid)
      </h3>
      <p className="text-xs text-[var(--text3)] mb-4">
        Each cell represents a 10m x 10m area. Color intensity indicates tree height.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 320 }}>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }, (_, c) => {
                  const cell = cells[r * cols + c];
                  if (!cell) return <td key={c} />;
                  const loss = isLossCell(cell.height);
                  return (
                    <td
                      key={c}
                      className="text-center p-2 border border-[var(--border)]"
                      style={{
                        background: loss
                          ? 'color-mix(in srgb, var(--risk-high) 15%, transparent)'
                          : `color-mix(in srgb, ${getHeightColor(cell.height, maxH)} 20%, var(--bg2))`,
                        minWidth: 70,
                      }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: loss ? 'var(--risk-high)' : 'var(--text)',
                        }}
                      >
                        {cell.height}m
                      </span>
                      {cell.gediCalibrated && (
                        <div className="text-[9px] text-[var(--text3)] mt-0.5">GEDI</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px] text-[var(--text3)]">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#C8E6C9' }} />
          Short
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#7CB342' }} />
          Medium
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#34A853' }} />
          Tall
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: '#1A6B3C' }} />
          Very Tall
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border" style={{ background: 'color-mix(in srgb, var(--risk-high) 15%, transparent)', borderColor: 'var(--risk-high)' }} />
          Height Loss
        </div>
      </div>
    </div>
  );
}

function ChangeAnalysisCard({ analysis }: { analysis: HeightChangeAnalysis }) {
  if (analysis.changeType === 'stable' || analysis.changeType === 'growth') return null;

  const isLoss = analysis.meanHeightChange < -1;

  return (
    <div
      className="rounded-xl overflow-hidden mb-6"
      style={{
        background: 'var(--bg2)',
        boxShadow: 'var(--shadow-card)',
        borderLeft: `4px solid ${isLoss ? 'var(--risk-high)' : 'var(--risk-moderate)'}`,
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} style={{ color: isLoss ? 'var(--risk-high)' : 'var(--risk-moderate)' }} />
          <h3 className="text-sm font-bold text-[var(--text)]">Height Change Detected</h3>
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white"
            style={{ background: isLoss ? 'var(--risk-high)' : 'var(--risk-moderate)' }}
          >
            {analysis.confidence}
          </span>
        </div>

        <div className="space-y-2 text-sm text-[var(--text2)]">
          <p>
            Height loss detected:{' '}
            <span className="font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--risk-high)' }}>
              {analysis.meanHeightChange}m
            </span>{' '}
            average in NE quadrant
          </p>
          <p>
            Affected area:{' '}
            <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
              {analysis.affectedArea_ha} ha ({analysis.affectedPercentage}% of parcel)
            </span>
          </p>
          <p>
            Change type:{' '}
            <span className="font-semibold capitalize">{analysis.changeType.replace('_', ' ')}</span>
            {analysis.changeType === 'mortality' && ' — Beetle-induced mortality'}
          </p>
        </div>

        {/* Cross-validation badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {analysis.crossValidation.ndviCorrelation && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--green-wash)', color: 'var(--green)' }}>
              <CheckCircle size={12} /> NDVI confirms
            </span>
          )}
          {analysis.crossValidation.sarCorrelation && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--green-wash)', color: 'var(--green)' }}>
              <CheckCircle size={12} /> SAR confirms
            </span>
          )}
          {analysis.crossValidation.communityReports > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--green-wash)', color: 'var(--green)' }}>
              <CheckCircle size={12} /> {analysis.crossValidation.communityReports} community report{analysis.crossValidation.communityReports > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoss && (
          <div
            className="mt-4 rounded-lg p-3 text-xs"
            style={{ background: 'color-mix(in srgb, var(--risk-high) 8%, transparent)' }}
          >
            <span className="font-semibold text-[var(--text)]">Recommendation: </span>
            <span className="text-[var(--text2)]">
              Sanitation fell affected area within 7 days per SKSFS 2011:7. Remove infested timber to prevent bark beetle spread to adjacent stands.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function GrowthModelComparison({
  comparisons,
  parcels,
}: {
  comparisons: Map<string, GrowthComparison>;
  parcels: ParcelSummary[];
}) {
  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Growth Model Comparison</h3>
      <p className="text-xs text-[var(--text3)] mb-4">
        Chapman-Richards predicted height vs CH-GEE measured height
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-3 text-[var(--text3)] font-medium">Parcel</th>
              <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Predicted</th>
              <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Actual</th>
              <th className="text-right py-2 px-3 text-[var(--text3)] font-medium">Deviation</th>
              <th className="text-left py-2 pl-3 text-[var(--text3)] font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {parcels.map((p) => {
              const comp = comparisons.get(p.id);
              if (!comp) return null;
              const devColor =
                Math.abs(comp.deviationPercent) < 5 ? 'var(--risk-low)' :
                comp.deviationPercent < -5 ? 'var(--risk-high)' : 'var(--risk-moderate)';
              const status =
                Math.abs(comp.deviationPercent) < 5 ? 'On track' :
                comp.deviationPercent < -5 ? 'Below expected' : 'Above expected';

              return (
                <tr key={p.id} className="border-b border-[var(--border)]">
                  <td className="py-2.5 pr-3 font-medium text-[var(--text)]">{p.name}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[var(--text2)]">{comp.predicted}m</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[var(--text)]">{comp.actual}m</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold" style={{ color: devColor }}>
                    {comp.deviationPercent > 0 ? '+' : ''}{comp.deviationPercent}%
                  </td>
                  <td className="py-2.5 pl-3">
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${devColor} 12%, transparent)`,
                        color: devColor,
                      }}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BiomassComparison({ data }: { data: CanopyHeightData }) {
  const heightBased = estimateBiomassFromHeight(data.stats.meanHeight);
  // Traditional BEF estimate (lower, less accurate)
  const traditionalCarbon = Math.round(heightBased.carbon * 0.91 * 10) / 10;

  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Biomass Estimation</h3>
      <p className="text-xs text-[var(--text3)] mb-4">
        Height-calibrated estimates are more accurate than traditional expansion factors
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg p-4" style={{ background: 'var(--bg)' }}>
          <p className="text-xs text-[var(--text3)] mb-1">Traditional (Marklund BEF)</p>
          <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {traditionalCarbon} <span className="text-xs font-normal">t CO2/ha</span>
          </p>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: 'color-mix(in srgb, var(--green) 6%, var(--bg))' }}
        >
          <p className="text-xs text-[var(--text3)] mb-1">Height-calibrated (GEDI + Marklund)</p>
          <p className="text-lg font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {heightBased.carbon} <span className="text-xs font-normal">t CO2/ha</span>
          </p>
          <p className="text-[10px] text-[var(--green)] mt-1 font-medium">
            +{Math.round((heightBased.carbon / traditionalCarbon - 1) * 100)}% more accurate
          </p>
        </div>
      </div>

      <p className="text-xs text-[var(--text3)] mt-3 leading-relaxed">
        Height-based biomass is more accurate because it uses measured canopy height rather than estimated height from site index tables.
      </p>
    </div>
  );
}

function MethodologySection() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <h3 className="text-sm font-semibold text-[var(--text)]">Methodology</h3>
        {open ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 text-xs text-[var(--text2)] leading-relaxed">
          <div>
            <h4 className="font-semibold text-[var(--text)] mb-1">How CH-GEE works</h4>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>NASA's GEDI satellite fires laser pulses at the forest canopy, measuring exact tree heights at ~25m spots</li>
              <li>We combine these measurements with Sentinel-2 imagery and terrain data</li>
              <li>A machine learning model (Random Forest, R2 = 0.89) fills in the gaps to create a continuous 10m height map</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--text)] mb-1">Data Sources</h4>
            <ul className="space-y-1">
              <li>GEDI L2A v002 — laser altimetry (Rh98 metric)</li>
              <li>Sentinel-2 MSI — 10 spectral bands</li>
              <li>Sentinel-1 SAR — radar backscatter (VV/VH)</li>
              <li>SRTM DEM — elevation, slope, aspect</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--text)] mb-1">Validation</h4>
            <p>R2 = {CH_GEE_METHODOLOGY.validation.r2} | RMSE = {CH_GEE_METHODOLOGY.validation.rmse}% | {CH_GEE_METHODOLOGY.validation.nSamples.toLocaleString()} validation samples | {CH_GEE_METHODOLOGY.validation.crossValidation}</p>
          </div>

          <div className="pt-2 border-t border-[var(--border)]">
            <p className="text-[var(--text3)] text-[11px] leading-relaxed">
              {CH_GEE_METHODOLOGY.citation}
            </p>
            <a
              href={`https://doi.org/${CH_GEE_METHODOLOGY.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--green)] font-medium mt-1"
            >
              View paper <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ───

export default function CanopyHeightPage() {
  const [parcels] = useState<ParcelSummary[]>(() => getParcelSummaries());
  const [activeParcel, setActiveParcel] = useState('bjorkbacken');
  const [heightData, setHeightData] = useState<CanopyHeightData | null>(null);
  const [changeAnalysis, setChangeAnalysis] = useState<HeightChangeAnalysis | null>(null);
  const [growthComparisons, setGrowthComparisons] = useState<Map<string, GrowthComparison>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const [height, change] = await Promise.all([
        getCanopyHeight(activeParcel),
        detectHeightChange(activeParcel),
      ]);
      if (cancelled) return;
      setHeightData(height);
      setChangeAnalysis(change);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [activeParcel]);

  // Load growth comparisons for all parcels once
  useEffect(() => {
    async function loadComparisons() {
      const results = new Map<string, GrowthComparison>();
      for (const p of parcels) {
        const comp = await compareWithGrowthModel(p.id);
        results.set(p.id, comp);
      }
      setGrowthComparisons(results);
    }
    loadComparisons();
  }, [parcels]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link to="/owner/threats" className="p-2 rounded-lg hover:bg-[var(--bg2)]">
            <ArrowLeft size={20} className="text-[var(--text3)]" />
          </Link>
          <div>
            <h1
              className="text-xl font-bold text-[var(--text)]"
              style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)' }}
            >
              Canopy Height Intelligence
            </h1>
            <p className="text-sm text-[var(--text3)]">
              GEDI LiDAR + Sentinel-2 + ML &middot; 10m resolution
            </p>
          </div>
        </div>

        {/* Methodology badge */}
        <div className="mb-6 ml-11">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'var(--green-wash)', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}
          >
            Alvites et al. 2025 &middot; R&sup2; = 0.89 &middot; RMSE = 17%
          </span>
        </div>

        {/* Parcel Selector */}
        <ParcelSelector
          parcels={parcels}
          activeId={activeParcel}
          onSelect={setActiveParcel}
        />

        {loading || !heightData ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-[var(--text3)]">Loading canopy height data...</div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <StatsPanel data={heightData} />

            {/* Height Grid */}
            <HeightGrid data={heightData} />

            {/* Change Analysis */}
            {changeAnalysis && <ChangeAnalysisCard analysis={changeAnalysis} />}

            {/* Growth Model Comparison */}
            {growthComparisons.size > 0 && (
              <GrowthModelComparison comparisons={growthComparisons} parcels={parcels} />
            )}

            {/* Biomass Estimation */}
            <BiomassComparison data={heightData} />

            {/* Methodology */}
            <MethodologySection />

            {/* Data Freshness */}
            <div
              className="rounded-xl p-4 text-xs text-[var(--text3)]"
              style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Last updated: March 15, 2026</span>
                <span>&middot;</span>
                <span>Next Sentinel-2 pass: April 5, 2026</span>
                <span>&middot;</span>
                <span>GEDI coverage: {heightData.stats.gediFootprints} footprints (sufficient for calibration)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
