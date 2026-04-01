import { useState } from 'react';

interface ScanResult { id: string; gridCell: string; scanDate: string; hyperBands: number; thermalAnomaly: number; lidarCanopyGap: number; chlorophyllIndex: number; moistureStress: number; detectionAdvantage: string; classification: 'pre-visual' | 'early-visual' | 'confirmed' | 'healthy'; confidenceBoost: number; }

const SCAN_RESULTS: ScanResult[] = [
  { id: 'HS-001', gridCell: 'G-14-7', scanDate: '2026-03-28', hyperBands: 224, thermalAnomaly: 3.2, lidarCanopyGap: 0.18, chlorophyllIndex: -0.24, moistureStress: 0.71, detectionAdvantage: '22 days before satellite detection. Hyperspectral chlorophyll-a degradation in 680nm band + thermal stomatal closure confirmed simultaneously.', classification: 'pre-visual', confidenceBoost: 0.34 },
  { id: 'HS-002', gridCell: 'G-15-3', scanDate: '2026-03-29', hyperBands: 224, thermalAnomaly: 1.8, lidarCanopyGap: 0.12, chlorophyllIndex: -0.11, moistureStress: 0.45, detectionAdvantage: '15 days before satellite. Thermal shows mild stomatal stress. Hyperspectral green-shoulder shift detected in 550-580nm range.', classification: 'pre-visual', confidenceBoost: 0.28 },
  { id: 'HS-003', gridCell: 'G-12-9', scanDate: '2026-03-30', hyperBands: 224, thermalAnomaly: 0.4, lidarCanopyGap: 0.05, chlorophyllIndex: 0.02, moistureStress: 0.18, detectionAdvantage: 'No stress detected by any modality. Healthy baseline established for future comparison.', classification: 'healthy', confidenceBoost: 0.0 },
  { id: 'HS-004', gridCell: 'G-16-1', scanDate: '2026-03-30', hyperBands: 224, thermalAnomaly: 4.7, lidarCanopyGap: 0.31, chlorophyllIndex: -0.42, moistureStress: 0.89, detectionAdvantage: '28 days advantage. Severe chlorophyll degradation + high thermal anomaly + LiDAR shows canopy thinning. Red attack imminent.', classification: 'early-visual', confidenceBoost: 0.41 },
];

const CLASS_COLORS = { 'pre-visual': '#8B5CF6', 'early-visual': '#F59E0B', confirmed: '#EF4444', healthy: '#10B981' };

export default function HyperspectralThermalPage() {
  const [selected, setSelected] = useState<ScanResult>(SCAN_RESULTS[0]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2"><span className="text-3xl">\uD83D\uDD2C</span><h1 className="text-3xl font-bold">Hyperspectral + Thermal Fusion</h1><span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">3-WEEK ADVANTAGE</span></div>
          <p className="text-[var(--text3)] max-w-3xl">Integrated 224-band hyperspectral (400-2400nm) + thermal infrared (7-14\u00B5m) + LiDAR canopy structure. Detects tree stress 3-4 weeks before satellite-visible symptoms. Thermal captures stomatal closure within minutes of stress onset. No competitor combines all three.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-purple-400">224</div><div className="text-sm text-[var(--text3)]">Spectral Bands</div></div>
          <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-red-400">3-4 wk</div><div className="text-sm text-[var(--text3)]">Detection Advantage</div></div>
          <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-amber-400">5cm</div><div className="text-sm text-[var(--text3)]">Spatial Resolution</div></div>
          <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-[var(--green)]">0</div><div className="text-sm text-[var(--text3)]">Competitors</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">\uD83D\uDEF0\uFE0F Scan Results</h2>
            {SCAN_RESULTS.map(scan => (
              <button key={scan.id} onClick={() => setSelected(scan)} className={`w-full text-left p-4 rounded-xl border transition-all ${selected.id === scan.id ? 'ring-2 ring-purple-500' : 'border-[var(--border)]'} bg-[var(--bg2)]`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><span className="font-mono text-sm">{scan.id}</span><span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: CLASS_COLORS[scan.classification] + '20', color: CLASS_COLORS[scan.classification] }}>{scan.classification.replace('-', ' ')}</span></div>
                  <span className="text-xs text-[var(--text3)]">{scan.scanDate}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-[var(--text3)]">
                  <div>Thermal <span className="text-[var(--text)] font-bold">+{scan.thermalAnomaly}\u00B0C</span></div>
                  <div>Chlorophyll <span className="text-[var(--text)] font-bold">{scan.chlorophyllIndex > 0 ? '+' : ''}{scan.chlorophyllIndex}</span></div>
                  <div>Moisture <span className="text-[var(--text)] font-bold">{(scan.moistureStress * 100).toFixed(0)}%</span></div>
                  <div>LiDAR Gap <span className="text-[var(--text)] font-bold">{(scan.lidarCanopyGap * 100).toFixed(0)}%</span></div>
                </div>
                {scan.confidenceBoost > 0 && <div className="mt-2 text-xs text-purple-400">+{(scan.confidenceBoost * 100).toFixed(0)}% confidence boost vs satellite-only</div>}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
              <h3 className="font-semibold mb-3">\uD83D\uDD2C Analysis: {selected.id}</h3>
              <p className="text-sm text-[var(--text3)] mb-4">{selected.detectionAdvantage}</p>
              <div className="space-y-2">
                {[['Thermal Anomaly', selected.thermalAnomaly, 5, '\u00B0C above baseline'], ['Chlorophyll Loss', Math.abs(selected.chlorophyllIndex), 0.5, 'index units'], ['Moisture Stress', selected.moistureStress, 1, 'stress index'], ['Canopy Gap', selected.lidarCanopyGap, 0.4, 'gap fraction']].map(([label, val, max, unit]) => (
                  <div key={label as string} className="flex items-center gap-3">
                    <span className="text-xs w-28 text-[var(--text3)]">{label as string}</span>
                    <div className="flex-1 h-3 bg-[var(--bg3)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(((val as number) / (max as number)) * 100, 100)}%` }} /></div>
                    <span className="text-xs font-mono w-20 text-right">{(val as number).toFixed(2)} {unit as string}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-purple-400 mb-2">\uD83C\uDFC6 Technology Advantage</h4>
              <p className="text-xs text-[var(--text3)]">Satellite (Sentinel-2): 10m resolution, 5-day revisit, detects red/gray attack only. Our drone: 5cm resolution, on-demand, detects pre-visual stress. Combined with thermal: stomatal closure detected within minutes. LiDAR: 3D canopy structure reveals hidden gaps. Result: 3-4 week detection advantage over any satellite-only competitor.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}