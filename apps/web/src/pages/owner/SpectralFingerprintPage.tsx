import { useState } from 'react';

interface SpectralAnomaly {
  id: string; standName: string; detectedDate: string;
  ndviBaseline: number; ndviCurrent: number; ndviDeviation: number;
  eviBaseline: number; eviCurrent: number;
  gndviBaseline: number; gndviCurrent: number;
  redEdgeBaseline: number; redEdgeCurrent: number;
  bayesianProbability: number; anomalyClass: 'bark_beetle' | 'drought_stress' | 'nutrient_deficiency' | 'shadow_artifact' | 'unknown';
  area: number; severity: 'critical' | 'warning' | 'watch';
  pixelCount: number; spatialPattern: string;
}

const DEMO_ANOMALIES: SpectralAnomaly[] = [
  { id: 'a1', standName: 'Falun Nord A-3 (west edge)', detectedDate: '2026-03-28', ndviBaseline: 0.72, ndviCurrent: 0.54, ndviDeviation: -0.18, eviBaseline: 0.48, eviCurrent: 0.33, gndviBaseline: 0.58, gndviCurrent: 0.44, redEdgeBaseline: 0.31, redEdgeCurrent: 0.38, bayesianProbability: 0.94, anomalyClass: 'bark_beetle', area: 1.2, severity: 'critical', pixelCount: 134, spatialPattern: 'Radial spread from center' },
  { id: 'a2', standName: 'Falun Nord B-1 (south slope)', detectedDate: '2026-03-29', ndviBaseline: 0.69, ndviCurrent: 0.58, ndviDeviation: -0.11, eviBaseline: 0.45, eviCurrent: 0.37, gndviBaseline: 0.55, gndviCurrent: 0.47, redEdgeBaseline: 0.29, redEdgeCurrent: 0.34, bayesianProbability: 0.78, anomalyClass: 'bark_beetle', area: 0.8, severity: 'warning', pixelCount: 89, spatialPattern: 'Linear along drainage' },
  { id: 'a3', standName: 'Sandviken C-2 (hilltop)', detectedDate: '2026-03-27', ndviBaseline: 0.65, ndviCurrent: 0.55, ndviDeviation: -0.10, eviBaseline: 0.42, eviCurrent: 0.35, gndviBaseline: 0.52, gndviCurrent: 0.45, redEdgeBaseline: 0.28, redEdgeCurrent: 0.30, bayesianProbability: 0.62, anomalyClass: 'drought_stress', area: 2.1, severity: 'warning', pixelCount: 231, spatialPattern: 'Hilltop exposure pattern' },
  { id: 'a4', standName: 'Gävleborg D-5 (valley)', detectedDate: '2026-03-30', ndviBaseline: 0.71, ndviCurrent: 0.64, ndviDeviation: -0.07, eviBaseline: 0.47, eviCurrent: 0.42, gndviBaseline: 0.57, gndviCurrent: 0.52, redEdgeBaseline: 0.30, redEdgeCurrent: 0.31, bayesianProbability: 0.45, anomalyClass: 'nutrient_deficiency', area: 0.5, severity: 'watch', pixelCount: 56, spatialPattern: 'Diffuse, no clear center' },
  { id: 'a5', standName: 'Karlstad E-1 (north face)', detectedDate: '2026-03-25', ndviBaseline: 0.68, ndviCurrent: 0.61, ndviDeviation: -0.07, eviBaseline: 0.44, eviCurrent: 0.40, gndviBaseline: 0.54, gndviCurrent: 0.50, redEdgeBaseline: 0.29, redEdgeCurrent: 0.30, bayesianProbability: 0.22, anomalyClass: 'shadow_artifact', area: 0.3, severity: 'watch', pixelCount: 33, spatialPattern: 'Consistent with terrain shadow' },
];

const CLASS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bark_beetle: { label: 'Bark Beetle', color: 'text-red-700', bg: 'bg-red-100' },
  drought_stress: { label: 'Drought Stress', color: 'text-orange-700', bg: 'bg-orange-100' },
  nutrient_deficiency: { label: 'Nutrient Deficiency', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  shadow_artifact: { label: 'Shadow Artifact', color: 'text-gray-700', bg: 'bg-gray-100' },
  unknown: { label: 'Unclassified', color: 'text-purple-700', bg: 'bg-purple-100' },
};

const SEV_CONFIG: Record<string, { color: string; badge: string }> = {
  critical: { color: 'border-red-500', badge: 'bg-red-500 text-white' },
  warning: { color: 'border-orange-400', badge: 'bg-orange-500 text-white' },
  watch: { color: 'border-gray-300', badge: 'bg-gray-400 text-white' },
};

export default function SpectralFingerprintPage() {
  const [anomalies] = useState<SpectralAnomaly[]>(DEMO_ANOMALIES);
  const [selected, setSelected] = useState<SpectralAnomaly | null>(null);
  const [filterClass, setFilterClass] = useState<string>('all');

  const filtered = filterClass === 'all' ? anomalies : anomalies.filter(a => a.anomalyClass === filterClass);
  const beetleCount = anomalies.filter(a => a.anomalyClass === 'bark_beetle').length;
  const avgProb = anomalies.reduce((s, a) => s + a.bayesianProbability, 0) / anomalies.length;

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Spectral Fingerprint Anomaly Detector</h1>
          <p className="text-gray-600">Bayesian multi-index analysis of Sentinel-2 spectral data to classify forest anomalies with probability scoring.</p>
          <p className="text-xs text-gray-500 mt-1">Indices: NDVI, EVI, GNDVI, Red Edge | Method: Bayesian posterior with seasonal priors | Resolution: 10m/pixel</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--bg2)] rounded-lg p-4 shadow-sm border"><div className="text-2xl font-bold">{anomalies.length}</div><div className="text-sm text-gray-500">Active Anomalies</div></div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200"><div className="text-2xl font-bold text-red-600">{beetleCount}</div><div className="text-sm text-red-700">Beetle Classified</div></div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200"><div className="text-2xl font-bold text-blue-600">{(avgProb * 100).toFixed(0)}%</div><div className="text-sm text-blue-700">Avg Confidence</div></div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200"><div className="text-2xl font-bold text-green-600">{anomalies.reduce((s, a) => s + a.pixelCount, 0)}</div><div className="text-sm text-green-700">Pixels Analyzed</div></div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'bark_beetle', 'drought_stress', 'nutrient_deficiency', 'shadow_artifact'].map(c => (
            <button key={c} onClick={() => setFilterClass(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filterClass === c ? 'bg-[var(--green)] text-white' : 'bg-[var(--bg2)] text-gray-600 border hover:bg-[var(--bg)]'}`}>{c === 'all' ? 'All Classes' : CLASS_CONFIG[c]?.label || c}</button>
          ))}
        </div>

        {/* Anomaly Cards */}
        <div className="space-y-4 mb-8">
          {filtered.sort((a, b) => b.bayesianProbability - a.bayesianProbability).map(anomaly => {
            const cls = CLASS_CONFIG[anomaly.anomalyClass];
            const sev = SEV_CONFIG[anomaly.severity];
            return (
              <button key={anomaly.id} onClick={() => setSelected(anomaly)} className={`w-full text-left bg-[var(--bg2)] border-2 ${sev.color} rounded-xl p-5 transition-all hover:shadow-lg ${selected?.id === anomaly.id ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[var(--text)]">{anomaly.standName}</h3>
                    <p className="text-sm text-gray-500">Detected: {anomaly.detectedDate} | {anomaly.area} ha | {anomaly.pixelCount} pixels</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${cls.bg} ${cls.color} px-3 py-1 rounded-full text-xs font-bold`}>{cls.label}</span>
                    <span className={`${sev.badge} px-3 py-1 rounded-full text-xs font-bold uppercase`}>{anomaly.severity}</span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{(anomaly.bayesianProbability * 100).toFixed(0)}%</span>
                  </div>
                </div>
                {/* Spectral bars */}
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {[
                    { label: 'NDVI', base: anomaly.ndviBaseline, curr: anomaly.ndviCurrent },
                    { label: 'EVI', base: anomaly.eviBaseline, curr: anomaly.eviCurrent },
                    { label: 'GNDVI', base: anomaly.gndviBaseline, curr: anomaly.gndviCurrent },
                    { label: 'RedEdge', base: anomaly.redEdgeBaseline, curr: anomaly.redEdgeCurrent },
                  ].map(idx => (
                    <div key={idx.label} className="text-center">
                      <div className="text-xs text-gray-500 mb-1">{idx.label}</div>
                      <div className="text-xs font-mono">{idx.base.toFixed(2)} → {idx.curr.toFixed(2)}</div>
                      <div className={`text-xs font-bold ${idx.curr < idx.base ? 'text-red-600' : 'text-green-600'}`}>{((idx.curr - idx.base) / idx.base * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="bg-[var(--bg2)] rounded-xl shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selected.standName}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div><div className="text-sm text-gray-500">Bayesian Probability</div><div className="text-xl font-bold">{(selected.bayesianProbability * 100).toFixed(1)}%</div></div>
              <div><div className="text-sm text-gray-500">NDVI Deviation</div><div className="text-xl font-bold text-red-600">{selected.ndviDeviation.toFixed(3)}</div></div>
              <div><div className="text-sm text-gray-500">Spatial Pattern</div><div className="text-sm font-bold">{selected.spatialPattern}</div></div>
            </div>
            <div className={`p-4 rounded-lg ${selected.anomalyClass === 'bark_beetle' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
              <h3 className="font-semibold mb-1">AI Classification Reasoning</h3>
              <p className="text-sm">{selected.anomalyClass === 'bark_beetle' ? `High confidence bark beetle detection. NDVI drop of ${selected.ndviDeviation.toFixed(2)} combined with Red Edge increase (+${((selected.redEdgeCurrent - selected.redEdgeBaseline) / selected.redEdgeBaseline * 100).toFixed(1)}%) matches Ips typographus spectral signature. Radial spatial pattern consistent with point-source infestation. Recommend immediate drone verification.` : selected.anomalyClass === 'drought_stress' ? 'Moderate confidence drought stress. Uniform NDVI/EVI depression without Red Edge anomaly suggests water stress rather than biotic damage. Hilltop exposure pattern consistent with windward drying. Monitor for recovery after next precipitation event.' : selected.anomalyClass === 'nutrient_deficiency' ? 'Low-moderate confidence nutrient deficiency. Slight GNDVI depression suggests chlorophyll reduction. Diffuse pattern without clear center argues against pest damage. Recommend soil analysis.' : 'Low confidence classification. Spectral changes consistent with illumination geometry rather than vegetation change. Shadow angle matches terrain model. Likely false positive.'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}