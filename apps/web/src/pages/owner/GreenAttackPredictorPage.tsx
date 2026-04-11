import { useState } from 'react';

const DEMO_STANDS = [
  { id: 1, name: 'Falun Nord', county: 'Dalarna', lat: 60.61, lng: 15.63, degreeDays: 287, threshold: 334, windowStart: '2026-06-15', windowEnd: '2026-06-28', confidence: 82, ndviDelta: -0.12, risk: 'high' },
  { id: 2, name: 'Sandviken S\u00F6der', county: 'G\u00E4vleborg', lat: 60.62, lng: 16.78, degreeDays: 245, threshold: 334, windowStart: '2026-07-01', windowEnd: '2026-07-14', confidence: 68, ndviDelta: -0.06, risk: 'medium' },
  { id: 3, name: 'Karlstad V\u00E4st', county: 'V\u00E4rmland', lat: 59.38, lng: 13.50, degreeDays: 198, threshold: 334, windowStart: '2026-07-20', windowEnd: '2026-08-02', confidence: 45, ndviDelta: -0.02, risk: 'low' },
];

export default function GreenAttackPredictorPage() {
  const [selected, setSelected] = useState(DEMO_STANDS[0]);
  const progress = Math.round((selected.degreeDays / selected.threshold) * 100);
  const riskColor = selected.risk === 'high' ? 'bg-red-500' : selected.risk === 'medium' ? 'bg-orange-400' : 'bg-green-500';

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-[var(--bg)]">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Green Attack Window Predictor</h1>
      <p className="text-[var(--text3)] mb-6">Predicts the 7\u201314 day intervention window before bark beetle damage becomes irreversible. Based on degree-day accumulation (&gt;5\u00B0C) and NDVI spectral change from Sentinel-2.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {DEMO_STANDS.map(s => (
          <button key={s.id} onClick={() => setSelected(s)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${selected.id === s.id ? 'border-[var(--green)] bg-[var(--green)]/5' : 'border-[var(--border)] hover:border-[var(--text3)]'}`}>
            <div className="font-semibold text-[var(--text)]">{s.name}</div>
            <div className="text-sm text-[var(--text3)]">{s.county}</div>
            <div className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs text-white ${s.risk === 'high' ? 'bg-red-500' : s.risk === 'medium' ? 'bg-orange-400' : 'bg-green-500'}`}>{s.risk} risk</div>
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg2)] rounded-2xl border border-[var(--border)] p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Degree-Day Accumulation</h2>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 bg-[var(--bg3)] rounded-full h-4">
            <div className={`h-4 rounded-full transition-all ${riskColor}`} style={{width: Math.min(progress, 100) + '%'}}></div>
          </div>
          <span className="text-sm font-mono font-bold">{selected.degreeDays} / {selected.threshold}\u00B0d</span>
        </div>
        <p className="text-sm text-[var(--text3)]">{progress}% toward one full Ips typographus generation cycle. Threshold: 334 degree-days above 5\u00B0C.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--bg2)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-3xl font-bold text-[var(--green)]">{selected.confidence}%</div>
          <div className="text-sm text-[var(--text3)]">Prediction confidence</div>
        </div>
        <div className="bg-[var(--bg2)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-lg font-bold text-[var(--text)]">{selected.windowStart} \u2192 {selected.windowEnd}</div>
          <div className="text-sm text-[var(--text3)]">Intervention window</div>
        </div>
        <div className="bg-[var(--bg2)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{selected.ndviDelta}</div>
          <div className="text-sm text-[var(--text3)]">NDVI change (Sentinel-2)</div>
        </div>
      </div>
    </div>
  );
}
