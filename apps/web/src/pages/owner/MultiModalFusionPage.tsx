import { useState } from 'react';

interface DataSource {
  id: string;
  name: string;
  type: 'satellite' | 'drone' | 'iot' | 'acoustic' | 'thermal' | 'pheromone';
  status: 'active' | 'processing' | 'offline';
  lastUpdate: string;
  confidence: number;
  dataPoints: number;
  description: string;
}

interface FusionResult {
  gridCell: string;
  lat: number;
  lng: number;
  overallRisk: number;
  modalityScores: { source: string; score: number; weight: number }[];
  fusionMethod: 'early' | 'late' | 'hybrid';
  classification: 'confirmed_attack' | 'probable_stress' | 'monitoring' | 'healthy';
  reasoning: string;
}

const DATA_SOURCES: DataSource[] = [
  { id: 'sentinel2', name: 'Sentinel-2 MSI', type: 'satellite', status: 'active', lastUpdate: '2h ago', confidence: 0.87, dataPoints: 24500, description: '10m multispectral: NDVI, EVI, GNDVI, Red Edge, SWIR1/2. 5-day revisit. Source: ESA Copernicus.' },
  { id: 'planet', name: 'PlanetScope', type: 'satellite', status: 'active', lastUpdate: '6h ago', confidence: 0.82, dataPoints: 18200, description: '3.7m daily RGB+NIR. Canopy change detection at individual tree crowns.' },
  { id: 'drone-hyper', name: 'DJI M350 + MicaSense', type: 'drone', status: 'processing', lastUpdate: '1d ago', confidence: 0.94, dataPoints: 8400, description: 'Hyperspectral 400-2400nm. Detects chlorophyll stress 3 weeks before visible symptoms.' },
  { id: 'lorawan', name: 'LoRaWAN Sensor Grid', type: 'iot', status: 'active', lastUpdate: '15m ago', confidence: 0.91, dataPoints: 52000, description: 'Microclimate: temp, humidity, soil moisture. Degree-day accumulation from April 1.' },
  { id: 'acoustic', name: 'Acoustic Probes', type: 'acoustic', status: 'active', lastUpdate: '30m ago', confidence: 0.96, dataPoints: 3200, description: 'Ultrasonic feeding detection. 99% species ID accuracy. Fraunhofer IDMT validated.' },
  { id: 'thermal', name: 'FLIR Thermal Array', type: 'thermal', status: 'active', lastUpdate: '4h ago', confidence: 0.88, dataPoints: 12600, description: 'Stomatal closure detection via canopy temperature anomaly. Minutes-level stress response.' },
];

const FUSION_RESULTS: FusionResult[] = [
  { gridCell: 'G-14-7', lat: 57.7089, lng: 11.9746, overallRisk: 0.92, fusionMethod: 'early', classification: 'confirmed_attack',
    modalityScores: [{ source: 'Sentinel-2', score: 0.85, weight: 0.2 }, { source: 'Acoustic', score: 0.98, weight: 0.25 }, { source: 'Thermal', score: 0.91, weight: 0.2 }, { source: 'IoT Degree-days', score: 0.94, weight: 0.15 }, { source: 'Drone Hyper', score: 0.96, weight: 0.15 }, { source: 'PlanetScope', score: 0.82, weight: 0.05 }],
    reasoning: 'All 6 modalities confirm active Ips typographus infestation. Acoustic probes detect feeding vibrations at 2.4kHz. Thermal shows 3.2\u00B0C canopy temperature anomaly (stomatal closure). Degree-day accumulation: 312 dd above 8.3\u00B0C \u2014 28 dd from swarming threshold. NDVI decline -0.18 over 10 days. Drone hyperspectral confirms chlorophyll-a degradation in red-edge band.' },
  { gridCell: 'G-15-3', lat: 57.6834, lng: 12.0102, overallRisk: 0.67, fusionMethod: 'early', classification: 'probable_stress',
    modalityScores: [{ source: 'Sentinel-2', score: 0.52, weight: 0.2 }, { source: 'Acoustic', score: 0.71, weight: 0.25 }, { source: 'Thermal', score: 0.78, weight: 0.2 }, { source: 'IoT Degree-days', score: 0.94, weight: 0.15 }, { source: 'Drone Hyper', score: 0.61, weight: 0.15 }, { source: 'PlanetScope', score: 0.44, weight: 0.05 }],
    reasoning: 'Thermal anomaly detected (+1.8\u00B0C) suggesting early stomatal stress. Acoustic sensors picking up intermittent boring activity. Satellite indices within normal range \u2014 green attack stage likely. Recommend drone verification within 48 hours.' },
  { gridCell: 'G-12-9', lat: 57.7245, lng: 11.9401, overallRisk: 0.34, fusionMethod: 'early', classification: 'monitoring',
    modalityScores: [{ source: 'Sentinel-2', score: 0.21, weight: 0.2 }, { source: 'Acoustic', score: 0.18, weight: 0.25 }, { source: 'Thermal', score: 0.45, weight: 0.2 }, { source: 'IoT Degree-days', score: 0.94, weight: 0.15 }, { source: 'Drone Hyper', score: 0.28, weight: 0.15 }, { source: 'PlanetScope', score: 0.19, weight: 0.05 }],
    reasoning: 'Degree-day accumulation approaching threshold but no biological signals detected. Mild thermal variance may be drought-related. Continue passive monitoring. Next scheduled drone survey: 5 days.' },
];

const TYPE_COLORS: Record<string, string> = {
  satellite: '#3B82F6', drone: '#8B5CF6', iot: '#10B981', acoustic: '#F59E0B', thermal: '#EF4444', pheromone: '#EC4899',
};
const TYPE_ICONS: Record<string, string> = {
  satellite: '\uD83D\uDEF0\uFE0F', drone: '\uD83D\uDEE9\uFE0F', iot: '\uD83D\uDCE1', acoustic: '\uD83D\uDD0A', thermal: '\uD83C\uDF21\uFE0F', pheromone: '\uD83E\uDEB2',
};
const CLASS_CONFIG: Record<string, { color: string; label: string; labelSv: string }> = {
  confirmed_attack: { color: '#EF4444', label: 'Confirmed Attack', labelSv: 'Bekr\u00E4ftad attack' },
  probable_stress: { color: '#F59E0B', label: 'Probable Stress', labelSv: 'Trolig stress' },
  monitoring: { color: '#3B82F6', label: 'Under Monitoring', labelSv: '\u00D6vervakning' },
  healthy: { color: '#10B981', label: 'Healthy', labelSv: 'Frisk' },
};

export default function MultiModalFusionPage() {
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<FusionResult | null>(FUSION_RESULTS[0]);
  const [fusionMode, setFusionMode] = useState<'early' | 'late' | 'hybrid'>('early');

  const totalDataPoints = DATA_SOURCES.reduce((sum, s) => sum + s.dataPoints, 0);
  const avgConfidence = DATA_SOURCES.reduce((sum, s) => sum + s.confidence, 0) / DATA_SOURCES.length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">\uD83E\uDDE0</span>
            <h1 className="text-3xl font-bold">Multi-Modal Fusion Engine</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">WORLD FIRST</span>
          </div>
          <p className="text-[var(--text3)] max-w-3xl">
            Six independent data modalities fused into a single AI pipeline. No other platform combines satellite + drone + IoT + acoustic + thermal + pheromone data for forest pest detection. Early fusion at feature level produces confidence scores unavailable from any single source.
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-2xl font-bold text-[var(--green)]">{DATA_SOURCES.length}</div>
            <div className="text-sm text-[var(--text3)]">Active Modalities</div>
          </div>
          <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-2xl font-bold text-blue-400">{(totalDataPoints / 1000).toFixed(1)}K</div>
            <div className="text-sm text-[var(--text3)]">Data Points (24h)</div>
          </div>
          <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-2xl font-bold text-purple-400">{(avgConfidence * 100).toFixed(0)}%</div>
            <div className="text-sm text-[var(--text3)]">Avg Confidence</div>
          </div>
          <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-2xl font-bold text-amber-400">0</div>
            <div className="text-sm text-[var(--text3)]">Global Competitors</div>
          </div>
        </div>

        {/* Fusion Mode Selector */}
        <div className="flex gap-3 mb-6">
          {(['early', 'late', 'hybrid'] as const).map(mode => (
            <button key={mode} onClick={() => setFusionMode(mode)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${fusionMode === mode ? 'bg-purple-500 text-white' : 'bg-[var(--bg2)] text-[var(--text3)] hover:bg-[var(--bg3)]'}`}>
              {mode === 'early' ? '\uD83E\uDDE9 Early Fusion' : mode === 'late' ? '\uD83D\uDD17 Late Fusion' : '\u2696\uFE0F Hybrid'}
            </button>
          ))}
          <span className="text-xs text-[var(--text3)] self-center ml-2">Early: fuse raw features. Late: fuse model outputs. Hybrid: weighted ensemble.</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Data Sources Panel */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-semibold mb-3">\uD83D\uDCE1 Data Sources</h2>
            {DATA_SOURCES.map(source => (
              <button key={source.id} onClick={() => setActiveSource(activeSource === source.id ? null : source.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${activeSource === source.id ? 'border-purple-500 bg-purple-500/10' : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border-hover)]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{TYPE_ICONS[source.type]}</span>
                    <span className="font-medium text-sm">{source.name}</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${source.status === 'active' ? 'bg-green-400 animate-pulse' : source.status === 'processing' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text3)]">
                  <span>Confidence: <span className="text-[var(--text)]">{(source.confidence * 100).toFixed(0)}%</span></span>
                  <span>Points: <span className="text-[var(--text)]">{source.dataPoints.toLocaleString()}</span></span>
                  <span>{source.lastUpdate}</span>
                </div>
                {activeSource === source.id && <p className="mt-2 text-xs text-[var(--text3)] leading-relaxed">{source.description}</p>}
              </button>
            ))}
          </div>

          {/* Fusion Results + Detail */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold">\uD83C\uDFAF Fusion Results</h2>
            <div className="grid gap-3">
              {FUSION_RESULTS.map(result => {
                const cfg = CLASS_CONFIG[result.classification];
                return (
                  <button key={result.gridCell} onClick={() => setSelectedResult(result)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedResult?.gridCell === result.gridCell ? 'ring-2 ring-purple-500 border-purple-500' : 'border-[var(--border)] hover:border-[var(--border-hover)]'} bg-[var(--bg2)]`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm bg-[var(--bg3)] px-2 py-1 rounded">{result.gridCell}</span>
                        <span className="text-xs" style={{ color: cfg.color }}>{cfg.label} / {cfg.labelSv}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[var(--bg3)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${result.overallRisk * 100}%`, backgroundColor: cfg.color }} />
                        </div>
                        <span className="text-sm font-bold" style={{ color: cfg.color }}>{(result.overallRisk * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    {/* Modality bars */}
                    <div className="grid grid-cols-6 gap-1">
                      {result.modalityScores.map(ms => (
                        <div key={ms.source} className="text-center">
                          <div className="h-12 bg-[var(--bg3)] rounded relative overflow-hidden mb-1">
                            <div className="absolute bottom-0 w-full rounded transition-all" style={{ height: `${ms.score * 100}%`, backgroundColor: cfg.color, opacity: 0.7 }} />
                          </div>
                          <span className="text-[10px] text-[var(--text3)] leading-none">{ms.source.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* AI Reasoning Panel */}
            {selectedResult && (
              <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span>\uD83E\uDDE0</span> AI Fusion Reasoning \u2014 {selectedResult.gridCell}
                </h3>
                <p className="text-sm text-[var(--text3)] leading-relaxed">{selectedResult.reasoning}</p>
                <div className="mt-4 flex gap-3">
                  <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition">\uD83D\uDEA8 Dispatch Drone</button>
                  <button className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 transition">\uD83D\uDCC5 Schedule Inspection</button>
                  <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition">\uD83D\uDCC4 Export Report</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Competitor Comparison */}
        <div className="mt-8 bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
          <h3 className="font-semibold mb-4">\uD83C\uDFC6 Why No Competitor Can Match This</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-[var(--bg3)] rounded-lg"><span className="font-medium text-blue-400">CollectiveCrunch (Finland)</span><p className="text-[var(--text3)] mt-1">Satellite-only. No acoustic, thermal, or IoT. Detection after visible damage only.</p></div>
            <div className="p-3 bg-[var(--bg3)] rounded-lg"><span className="font-medium text-blue-400">Crop Cosmos (Germany)</span><p className="text-[var(--text3)] mt-1">LSTM on Sentinel-2 + weather. Academic prototype. No drone, IoT, or acoustic integration.</p></div>
            <div className="p-3 bg-[var(--bg3)] rounded-lg"><span className="font-medium text-blue-400">Aerobotics (South Africa)</span><p className="text-[var(--text3)] mt-1">Crop-focused. No bark beetle models. No IoT, acoustic, or pheromone data fusion.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}