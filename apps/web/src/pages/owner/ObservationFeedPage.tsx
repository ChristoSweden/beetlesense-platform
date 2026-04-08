import { useState, useMemo } from 'react';
import {
  Eye,
  Plus,
  CheckCircle,
  MapPin,
  Camera,
  Satellite,
  Bug,
  TreePine,
  Wind,
  Flame,
  Droplets,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Mic,
} from 'lucide-react';
import {
  getUserObservations,
  getObservationStats,
  getObservationsNearby,
  submitObservation,
  verifyObservation,
  OBSERVATION_TYPE_LABELS,
  type ObservationType,
  type Severity,
  type FieldObservation,
} from '@/services/observationService';
import {
  getAllStations,
  analyzeTrapData,
  compareWithSkogsstyrelsen,
  getReadingsForStation,
} from '@/services/trapCountService';
import {
  generateCommunityAlerts,
  generateHeatmap,
} from '@/services/communityIntelligenceService';

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function direction(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
  const dLat = toLat - fromLat;
  const dLng = toLng - fromLng;
  if (Math.abs(dLat) < 0.01 && Math.abs(dLng) < 0.01) return '';
  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
  if (angle > -22.5 && angle <= 22.5) return 'N';
  if (angle > 22.5 && angle <= 67.5) return 'NE';
  if (angle > 67.5 && angle <= 112.5) return 'E';
  if (angle > 112.5 && angle <= 157.5) return 'SE';
  if (angle > 157.5 || angle <= -157.5) return 'S';
  if (angle > -157.5 && angle <= -112.5) return 'SW';
  if (angle > -112.5 && angle <= -67.5) return 'W';
  return 'NW';
}

function severityColor(severity: Severity): string {
  switch (severity) {
    case 1: return 'var(--risk-low)';
    case 2: return 'var(--risk-low)';
    case 3: return 'var(--risk-moderate)';
    case 4: return 'var(--risk-high)';
    case 5: return 'var(--risk-critical, #dc2626)';
  }
}

function typeIcon(type: ObservationType) {
  if (type.startsWith('beetle') || type === 'bark_peeling') return <Bug size={16} />;
  if (type.startsWith('crown') || type === 'healthy_stand' || type === 'resin_flow') return <TreePine size={16} />;
  if (type === 'wind_damage' || type === 'storm_fell') return <Wind size={16} />;
  if (type === 'fire_damage') return <Flame size={16} />;
  if (type === 'drought_stress' || type === 'wet_area' || type === 'erosion') return <Droplets size={16} />;
  if (type === 'fungal_infection') return <AlertTriangle size={16} />;
  return <Eye size={16} />;
}

// ── Tab Types ───────────────────────────────────────────────────────────────

type TabKey = 'mine' | 'nearby' | 'map' | 'traps';

const tabLabels: { key: TabKey; label: string }[] = [
  { key: 'mine', label: 'My Observations' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'map', label: 'Community Map' },
  { key: 'traps', label: 'Traps' },
];

// Demo user location (Värnamo area)
const USER_LAT = 57.19;
const USER_LNG = 14.05;

// ── Segment Control ─────────────────────────────────────────────────────────

function SegmentControl({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="inline-flex rounded-xl p-1 gap-0.5" style={{ background: 'var(--bg3)' }}>
      {tabLabels.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            active === key
              ? 'bg-[var(--green)] text-white shadow-sm'
              : 'text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Stats Row ───────────────────────────────────────────────────────────────

function StatsRow() {
  const stats = useMemo(() => getObservationStats(), []);
  const alerts = useMemo(() => generateCommunityAlerts(USER_LAT, USER_LNG, 20), []);
  const myObs = useMemo(() => getUserObservations('demo-user'), []);

  const metrics = [
    { label: 'Total Observations', value: stats.total.toString(), color: 'var(--green)' },
    { label: 'Your Contributions', value: myObs.length.toString(), color: 'var(--text)' },
    { label: 'Verified Sightings', value: stats.verified.toString(), color: 'var(--risk-low)' },
    { label: 'Active Alerts', value: alerts.length.toString(), color: alerts.length > 0 ? 'var(--risk-high)' : 'var(--risk-low)' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl p-4"
          style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-2xl font-bold" style={{ color: m.color, fontFamily: 'var(--font-mono)' }}>
            {m.value}
          </p>
          <p className="text-xs text-[var(--text3)] mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Observation Card ────────────────────────────────────────────────────────

function ObservationCard({
  obs,
  showDistance,
  onVerify,
}: {
  obs: FieldObservation;
  showDistance?: boolean;
  onVerify?: (id: string) => void;
}) {
  const dist = showDistance ? haversineKm(USER_LAT, USER_LNG, obs.lat, obs.lng) : null;
  const dir = showDistance ? direction(USER_LAT, USER_LNG, obs.lat, obs.lng) : '';

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
          style={{ background: 'var(--green-wash)', color: severityColor(obs.severity) }}
        >
          {typeIcon(obs.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text)]">
              {OBSERVATION_TYPE_LABELS[obs.type]}
            </span>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
              style={{ background: severityColor(obs.severity) }}
            >
              {obs.severity}/5
            </span>
            {obs.verified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium" style={{ color: 'var(--risk-low)' }}>
                <CheckCircle size={10} /> Verified ({obs.verificationCount})
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--text3)] mt-1 line-clamp-2">{obs.notes}</p>

          <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text3)]">
            <span>{timeAgo(obs.timestamp)}</span>
            {dist !== null && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} /> ~{dist.toFixed(1)}km {dir}
              </span>
            )}
            {obs.photoIds.length > 0 && (
              <span className="flex items-center gap-0.5">
                <Camera size={10} /> {obs.photoIds.length} photo{obs.photoIds.length > 1 ? 's' : ''}
              </span>
            )}
            {obs.satelliteCrossRef && (
              <span
                className="flex items-center gap-0.5 font-medium"
                style={{
                  color: obs.satelliteCrossRef.confidence === 'high'
                    ? 'var(--risk-low)'
                    : 'var(--text3)',
                }}
              >
                <Satellite size={10} />
                {obs.satelliteCrossRef.ndviAnomaly ? 'Satellite confirms' : 'Unverified'}
              </span>
            )}
          </div>
        </div>
      </div>

      {onVerify && !obs.verified && dist !== null && dist <= 5 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <button
            onClick={() => onVerify(obs.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--green)' }}
          >
            <CheckCircle size={14} /> Verify this sighting
          </button>
        </div>
      )}
    </div>
  );
}

// ── My Observations Tab ─────────────────────────────────────────────────────

function MyObservationsTab() {
  const observations = useMemo(() =>
    getUserObservations('demo-user').sort((a, b) => b.timestamp - a.timestamp),
    []
  );

  return (
    <div className="space-y-3">
      {observations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-6">
          <div className="w-16 h-16 rounded-full bg-[var(--green)]/8 border border-[var(--border)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[var(--green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[var(--text)] mb-2">No observations yet</h3>
          <p className="text-sm text-[var(--text3)] max-w-sm">
            Log what you see in your forest — beetle damage, storm impact, healthy growth — and build a record over time.
          </p>
        </div>
      ) : (
        observations.map(obs => <ObservationCard key={obs.id} obs={obs} />)
      )}
    </div>
  );
}

// ── Nearby Tab ──────────────────────────────────────────────────────────────

function NearbyTab() {
  const [radius, setRadius] = useState(10);
  const nearby = useMemo(
    () => getObservationsNearby(USER_LAT, USER_LNG, radius, 30)
      .filter(o => o.userId !== 'demo-user')
      .sort((a, b) => b.timestamp - a.timestamp),
    [radius]
  );

  const [, forceUpdate] = useState(0);

  const handleVerify = (id: string) => {
    verifyObservation(id, 'demo-user');
    forceUpdate(n => n + 1);
  };

  // Check for high-severity alerts nearby
  const highSeverity = nearby.filter(o => o.severity >= 4);

  return (
    <div className="space-y-3">
      {/* Radius selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[var(--text3)]">Radius:</span>
        {[5, 10, 20, 50].map(r => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              radius === r
                ? 'bg-[var(--green)] text-white'
                : 'bg-[var(--bg3)] text-[var(--text3)]'
            }`}
          >
            {r}km
          </button>
        ))}
      </div>

      {/* Proximity alert */}
      {highSeverity.length > 0 && (
        <div
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'var(--risk-high)', color: 'white' }}
        >
          <AlertTriangle size={18} />
          <div className="text-xs font-medium">
            {highSeverity.length} high-severity observation{highSeverity.length > 1 ? 's' : ''} within {radius}km.
            Nearest: ~{haversineKm(USER_LAT, USER_LNG, highSeverity[0].lat, highSeverity[0].lng).toFixed(1)}km away.
          </div>
        </div>
      )}

      {nearby.length === 0 ? (
        <div className="text-center py-12 text-sm text-[var(--text3)]">
          No community observations within {radius}km in the last 30 days.
        </div>
      ) : (
        nearby.map(obs => (
          <ObservationCard key={obs.id} obs={obs} showDistance onVerify={handleVerify} />
        ))
      )}
    </div>
  );
}

// ── Community Map Tab ───────────────────────────────────────────────────────

function CommunityMapTab() {
  const heatmap = useMemo(() => generateHeatmap(), []);
  const alerts = useMemo(() => generateCommunityAlerts(USER_LAT, USER_LNG, 50), []);

  // Show top hot zones
  const hotZones = useMemo(
    () => heatmap
      .filter(c => c.riskScore > 40)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10),
    [heatmap]
  );

  return (
    <div className="space-y-4">
      {/* Active alerts */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Active Community Alerts</h3>
        <div className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="rounded-xl p-4"
              style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                  style={{
                    background: alert.severity === 'critical' ? 'var(--risk-high)'
                      : alert.severity === 'warning' ? 'var(--risk-moderate)'
                      : 'var(--risk-info)',
                  }}
                >
                  {alert.severity}
                </span>
                <span className="text-sm font-semibold text-[var(--text)]">
                  {alert.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                {alert.satelliteConfirmed && (
                  <span className="text-[10px] font-medium" style={{ color: 'var(--risk-low)' }}>
                    <Satellite size={10} className="inline mr-0.5" />Satellite confirmed
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text3)]">{alert.message}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text3)]">
                <span>{alert.observationCount} observations</span>
                <span>{alert.verifiedCount} verified</span>
                <span>~{alert.radiusKm}km radius</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hot zones table */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Hot Zones by Risk Score</h3>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Location</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Risk</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Obs</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Threat</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Sources</th>
                </tr>
              </thead>
              <tbody>
                {hotZones.map((zone, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {zone.lat.toFixed(2)}, {zone.lng.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{
                          background: zone.riskScore >= 70 ? 'var(--risk-high)'
                            : zone.riskScore >= 40 ? 'var(--risk-moderate)'
                            : 'var(--risk-low)',
                        }}
                      >
                        {zone.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--text3)]">{zone.observationCount}</td>
                    <td className="px-4 py-3 text-[var(--text2)]">
                      {zone.dominantThreat ? OBSERVATION_TYPE_LABELS[zone.dominantThreat] : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--text3)]">{zone.sourcesAgreeing}/4</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Traps Tab ───────────────────────────────────────────────────────────────

function TrapsTab() {
  const stations = useMemo(() => getAllStations(), []);
  const comparison = useMemo(() => compareWithSkogsstyrelsen('Kronoberg'), []);

  return (
    <div className="space-y-4">
      {/* Regional comparison */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
      >
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Regional Comparison</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {comparison.userAvg.toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--text3)]">Your traps avg</p>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {comparison.officialAvg.toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--text3)]">Regional avg</p>
          </div>
          <div>
            <p
              className="text-lg font-bold"
              style={{
                color: comparison.ratio > 1.3 ? 'var(--risk-high)' : comparison.ratio > 1 ? 'var(--risk-moderate)' : 'var(--risk-low)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {comparison.ratio > 1 ? '+' : ''}{Math.round((comparison.ratio - 1) * 100)}%
            </p>
            <p className="text-[10px] text-[var(--text3)]">vs baseline</p>
          </div>
        </div>
      </div>

      {/* Trap stations */}
      {stations.map(station => {
        const analysis = analyzeTrapData(station.id);
        const readings = getReadingsForStation(station.id);
        const last6 = readings.slice(-6);

        return (
          <div
            key={station.id}
            className="rounded-xl p-4"
            style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text)]">{station.name}</h4>
                <p className="text-[10px] text-[var(--text3)]">
                  {station.trapType.replace(/_/g, ' ')} | {station.parcelId ?? 'No parcel'}
                </p>
              </div>
              <span
                className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase"
                style={{
                  background: analysis.riskLevel === 'epidemic' ? '#dc2626'
                    : analysis.riskLevel === 'high' ? 'var(--risk-high)'
                    : analysis.riskLevel === 'moderate' ? 'var(--risk-moderate)'
                    : 'var(--risk-low)',
                }}
              >
                {analysis.riskLevel}
              </span>
            </div>

            {/* Latest count + trend */}
            <div className="flex items-center gap-4 mb-3">
              <div>
                <p className="text-xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {analysis.currentCount.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text3)]">Latest count</p>
              </div>
              <div className="flex items-center gap-1">
                {analysis.weeklyTrend === 'rising' && <TrendingUp size={16} style={{ color: 'var(--risk-high)' }} />}
                {analysis.weeklyTrend === 'falling' && <TrendingDown size={16} style={{ color: 'var(--risk-low)' }} />}
                {analysis.weeklyTrend === 'stable' && <Minus size={16} className="text-[var(--text3)]" />}
                <span className="text-xs text-[var(--text3)]">{analysis.weeklyTrend}</span>
              </div>
              {analysis.daysToThreshold && (
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--risk-high)' }}>
                    ~{analysis.daysToThreshold}d to threshold
                  </p>
                </div>
              )}
            </div>

            {/* Text sparkline */}
            <div className="mb-3">
              <p className="text-[10px] text-[var(--text3)] mb-1">Weekly trend (last 6 weeks):</p>
              <div className="flex items-end gap-1 h-8">
                {last6.map((r, i) => {
                  const maxCount = Math.max(...last6.map(x => x.count), 1);
                  const height = Math.max(4, (r.count / maxCount) * 32);
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${height}px`,
                        background: r.count > 8000 ? 'var(--risk-high)' : r.count > 3000 ? 'var(--risk-moderate)' : 'var(--risk-low)',
                      }}
                      title={`${r.date}: ${r.count.toLocaleString()}`}
                    />
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-[var(--text3)]">{analysis.recommendation}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Add Observation Form ────────────────────────────────────────────────────

const OBSERVATION_TYPES: ObservationType[] = [
  'beetle_bore_dust', 'beetle_entry_holes', 'crown_browning', 'crown_thinning',
  'wind_damage', 'storm_fell', 'wild_boar_rooting', 'drought_stress',
  'fungal_infection', 'bark_peeling', 'resin_flow', 'healthy_stand',
  'wet_area', 'erosion', 'fire_damage', 'other',
];

function AddObservationForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [type, setType] = useState<ObservationType>('beetle_bore_dust');
  const [severity, setSeverity] = useState<Severity>(3);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    submitObservation({
      userId: 'demo-user',
      type,
      severity,
      lat: USER_LAT + (Math.random() - 0.5) * 0.02,
      lng: USER_LNG + (Math.random() - 0.5) * 0.02,
      accuracy: 5 + Math.round(Math.random() * 15),
      timestamp: Date.now(),
      photoIds: [],
      notes: notes || `${OBSERVATION_TYPE_LABELS[type]} observed during field inspection.`,
      parcelId: 'P001',
    });
    onSubmit();
    onClose();
  };

  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)', border: '2px solid var(--green)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Log Field Observation</h3>
        <button onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text)]">
          <X size={18} />
        </button>
      </div>

      {/* Type selector grid */}
      <div className="mb-4">
        <label className="text-xs font-medium text-[var(--text3)] block mb-2">Observation Type</label>
        <div className="grid grid-cols-4 gap-1.5">
          {OBSERVATION_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-center transition-colors ${
                type === t
                  ? 'bg-[var(--green)] text-white'
                  : 'bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {typeIcon(t)}
              <span className="text-[9px] leading-tight">{OBSERVATION_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div className="mb-4">
        <label className="text-xs font-medium text-[var(--text3)] block mb-2">
          Severity: {severity}/5
        </label>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as Severity[]).map(s => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                severity === s ? 'text-white' : 'text-[var(--text3)]'
              }`}
              style={{
                background: severity === s ? severityColor(s) : 'var(--bg3)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="text-xs font-medium text-[var(--text3)] block mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Describe what you observed..."
          className="w-full rounded-lg p-3 text-sm border resize-none"
          style={{
            background: 'var(--bg)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
          rows={3}
        />
      </div>

      {/* GPS */}
      <div className="mb-4 flex items-center gap-2 text-xs text-[var(--text3)]">
        <MapPin size={14} />
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {USER_LAT.toFixed(4)}, {USER_LNG.toFixed(4)}
        </span>
        <span className="text-[10px]">(auto-detected)</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--green)' }}
          onClick={handleSubmit}
        >
          <CheckCircle size={16} /> Submit Observation
        </button>
        <button
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
          title="Attach photo"
        >
          <Camera size={16} />
        </button>
        <button
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
          title="Voice note"
        >
          <Mic size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ObservationFeedPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('mine');
  const [showForm, setShowForm] = useState(false);
  const [, forceUpdate] = useState(0);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold text-[var(--text)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Field Intelligence
          </h1>
          <p className="text-sm text-[var(--text3)] mt-1">
            Community observations, trap data, and field sightings
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--green)' }}
        >
          <Plus size={16} /> Add Observation
        </button>
      </div>

      {/* Add Observation Form */}
      {showForm && (
        <AddObservationForm
          onClose={() => setShowForm(false)}
          onSubmit={() => forceUpdate(n => n + 1)}
        />
      )}

      {/* Stats */}
      <StatsRow />

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <SegmentControl active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === 'mine' && <MyObservationsTab />}
      {activeTab === 'nearby' && <NearbyTab />}
      {activeTab === 'map' && <CommunityMapTab />}
      {activeTab === 'traps' && <TrapsTab />}
    </div>
  );
}
