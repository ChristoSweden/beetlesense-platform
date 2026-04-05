import { useState, useEffect, memo } from 'react';
import { Flame, Bug, MapPin, Clock } from 'lucide-react';
import {
  fetchRecentFires,
  clusterFireDetections,
  calculatePostFireBeetleRisk,
  type FirePerimeter,
  type PostFireBeetleRisk,
} from '@/services/opendata/nasaFirmsService';

// ─── Component ───

export const FireBeetleRiskWidget = memo(function FireBeetleRiskWidget({
  bbox,
}: {
  bbox?: [number, number, number, number];
}) {
  const defaultBbox: [number, number, number, number] = [14.0, 56.5, 15.5, 57.5]; // Småland
  const activeBbox = bbox ?? defaultBbox;

  const [fires, setFires] = useState<FirePerimeter[]>([]);
  const [risks, setRisks] = useState<PostFireBeetleRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const detections = await fetchRecentFires(activeBbox, 7);
        const perimeters = clusterFireDetections(detections);
        setFires(perimeters);

        const now = new Date().toISOString();
        const riskResults = perimeters.map((f) => calculatePostFireBeetleRisk(f, now));
        setRisks(riskResults);
      } catch (err) {
        console.warn('Fire data load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeBbox[0], activeBbox[1], activeBbox[2], activeBbox[3]]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-40 bg-[var(--bg)] rounded mb-3" />
        <div className="h-20 bg-[var(--bg)] rounded" />
      </div>
    );
  }

  const hasActiveFires = fires.length > 0;
  const maxRisk = risks.length > 0
    ? risks.reduce((max, r) => (r.riskMultiplier > max.riskMultiplier ? r : max))
    : null;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={16} className={hasActiveFires ? 'text-orange-500' : 'text-[var(--text3)]'} />
          <span className="text-sm font-semibold text-[var(--text)]">
            Fire–Beetle Interaction
          </span>
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{
            background: hasActiveFires ? '#f9731620' : '#4ade8020',
            color: hasActiveFires ? '#f97316' : '#4ade80',
          }}
        >
          {hasActiveFires ? `${fires.length} fire${fires.length > 1 ? 's' : ''}` : 'Clear'}
        </span>
      </div>

      {!hasActiveFires ? (
        <div className="rounded-lg p-3 border border-[var(--border)] text-center" style={{ background: 'var(--bg)' }}>
          <p className="text-xs text-[var(--text3)]">
            No active fires detected within monitoring area (last 7 days).
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-1">
            Source: NASA FIRMS VIIRS/MODIS near-real-time
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {fires.slice(0, 3).map((fire, i) => {
            const risk = risks[i];
            const riskColor = risk && risk.riskMultiplier >= 2.5 ? '#ef4444'
              : risk && risk.riskMultiplier >= 1.8 ? '#f97316'
              : '#fbbf24';

            return (
              <div
                key={fire.id}
                className="rounded-lg p-2.5 border border-[var(--border)]"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={10} className="text-orange-500" />
                    <span className="text-[11px] font-semibold text-[var(--text)]">
                      Fire #{i + 1}
                    </span>
                  </div>
                  {risk && (
                    <span
                      className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
                      style={{ background: `${riskColor}15`, color: riskColor }}
                    >
                      {risk.riskMultiplier.toFixed(1)}x beetle risk
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-[10px] text-[var(--text3)]">
                  <span>
                    <Flame size={9} className="inline mr-0.5" />
                    {fire.burnAreaHa.toFixed(0)} ha
                  </span>
                  <span>
                    <Clock size={9} className="inline mr-0.5" />
                    {fire.lastDetection.slice(0, 10)}
                  </span>
                  <span>
                    FRP: {fire.totalFRP.toFixed(0)} MW
                  </span>
                </div>
                {risk && (
                  <p className="text-[10px] text-[var(--text2)] mt-1">
                    {risk.recommendation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Risk explainer */}
      <div className="mt-2 rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
        <div className="flex items-start gap-1.5">
          <Bug size={10} className="text-[var(--text3)] mt-0.5 shrink-0" />
          <p className="text-[9px] text-[var(--text3)]">
            Post-fire trees emit stress volatiles that attract bark beetles. Risk is 3x within 6 months, declining to 1.2x after 2 years. Buffer zone extends 2 km beyond fire perimeter.
          </p>
        </div>
      </div>
    </div>
  );
});
