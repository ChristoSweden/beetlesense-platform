import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMicroclimate } from '../../hooks/useMicroclimate';
import { getActiveFiresNearby } from '../../services/fireService';
import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Play,
  FileText,
  BarChart3,
  Bug,
  CloudLightning,
  TreePine,
  Timer,
  Layers,
  Eye,
} from 'lucide-react';

/* ── Demo data ─────────────────────────────────────────────── */

interface QueueItem {
  id: string;
  parcelName: string;
  municipality: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  damageType: string;
  area_ha: number;
  assignedDate: string;
}

interface RecentReport {
  id: string;
  parcelName: string;
  status: 'draft' | 'submitted' | 'approved';
  date: string;
  inspector: string;
}

interface Alert {
  id: string;
  type: 'outbreak' | 'storm' | 'fire' | 'urgent';
  title: string;
  description: string;
  timestamp: string;
}

/* ── Map pin positions (demo placeholders within a Swedish region) ── */
const MAP_PINS = [
  { id: 'q1', x: 62, y: 28, risk: 'critical' as const },
  { id: 'q2', x: 38, y: 42, risk: 'critical' as const },
  { id: 'q3', x: 75, y: 55, risk: 'high' as const },
  { id: 'q4', x: 25, y: 70, risk: 'medium' as const },
  { id: 'q5', x: 55, y: 78, risk: 'medium' as const },
  { id: 'q6', x: 82, y: 35, risk: 'low' as const },
];

/* ── Helpers ──────────────────────────────────────────────── */

const RISK_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Kritisk' },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Hög' },
  medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Medel' },
  low: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Låg' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
  submitted: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
};

const PIN_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
};

/* ── Component ───────────────────────────────────────────── */

export default function InspectorDashboardPage() {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [fires, setFires] = useState<any[]>([]);
  const { parcels, loading } = useMicroclimate();

  // Generate alerts from real beetle risk data
  const generateAlertsFromParcels = (): Alert[] => {
    const alerts: Alert[] = [];

    parcels.forEach(parcel => {
      if (parcel.beetleRiskLevel === 'critical') {
        alerts.push({
          id: `alert-${parcel.parcelId}-critical`,
          type: 'outbreak',
          title: `Granbarkborre — Kritisk risk i ${parcel.parcelName}`,
          description: `Riskscore: ${parcel.beetleRiskScore}/100. Omedelbar inspektion krävs för denna fastighet.`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Add fire alerts
    fires.forEach((fire, idx) => {
      if (fire.distanceKm && fire.distanceKm < 50) {
        alerts.push({
          id: `alert-fire-${idx}`,
          type: 'fire',
          title: `Aktiv brand närliggande — ${Math.round(fire.distanceKm)} km ${fire.bearing}`,
          description: `NASA FIRMS har detekterat aktiv brand. FRP: ${fire.frp.toFixed(1)} MW. Övervaka väderskador på omkringliggande fastigheter.`,
          timestamp: new Date(fire.acq_date).toISOString(),
        });
      }
    });

    if (alerts.length === 0) {
      alerts.push({
        id: 'no-critical-alerts',
        type: 'urgent',
        title: 'Ingen kritisk aktivitet just nu',
        description: 'Alla fastigheter visar normala risknivåer. Rutinövervakning rekommenderas.',
        timestamp: new Date().toISOString(),
      });
    }

    return alerts.slice(0, 3);
  };

  // Generate inspection queue from beetle risk
  const generateQueueFromParcels = (): QueueItem[] => {
    const today = new Date().toISOString().split('T')[0];
    return parcels.map((parcel, idx) => ({
      id: parcel.parcelId,
      parcelName: parcel.parcelName,
      municipality: 'Småland',
      riskLevel: parcel.beetleRiskLevel,
      damageType: parcel.beetleRiskLevel === 'critical' ? 'Barkborreangrepp' : 'Rutinövervakning',
      area_ha: parcel.areaHectares,
      assignedDate: new Date(Date.now() - idx * 86400000).toISOString().split('T')[0],
    }));
  };

  // Fetch fire data on mount
  useEffect(() => {
    const loadFires = async () => {
      try {
        const nearbyFires = await getActiveFiresNearby(57.5, 14.5, 100);
        setFires(nearbyFires);
      } catch (error) {
        console.error('Error loading fires:', error);
      }
    };
    loadFires();
  }, []);

  const demoQueue = generateQueueFromParcels();
  const alerts = generateAlertsFromParcels();

  const demoReports: RecentReport[] = [
    { id: 'r1', parcelName: 'Norra Skogen 5:2', status: 'approved', date: '2026-03-14', inspector: 'Lars Eriksson' },
    { id: 'r2', parcelName: parcels[0]?.parcelName || 'Granudden 4:12', status: 'submitted', date: '2026-03-13', inspector: 'Lars Eriksson' },
    { id: 'r3', parcelName: parcels[1]?.parcelName || 'Tallmon 7:3', status: 'draft', date: '2026-03-12', inspector: 'Lars Eriksson' },
    { id: 'r4', parcelName: 'Ekbacken 1:5', status: 'submitted', date: '2026-03-11', inspector: 'Lars Eriksson' },
    { id: 'r5', parcelName: 'Björkdalen 2:8', status: 'approved', date: '2026-03-10', inspector: 'Lars Eriksson' },
  ];

  const stats = {
    completedThisMonth: 18,
    avgTimeMinutes: 47,
    backlog: demoQueue.length,
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            Inspektörs&shy;panel
          </h1>
          <p className="text-xs text-[var(--text3)]">
            Översikt av pågående inspektioner och uppdrag
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/inspector/inspection/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
          >
            <Play size={14} />
            Ny inspektion
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={CheckCircle}
          value={stats.completedThisMonth}
          label="Slutförda denna månad"
          color="var(--green)"
        />
        <StatCard
          icon={Timer}
          value={`${stats.avgTimeMinutes} min`}
          label="Snittid per inspektion"
          color="var(--green)"
        />
        <StatCard
          icon={Layers}
          value={stats.backlog}
          label="Väntande i kön"
          color="var(--amber)"
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-3 flex items-start gap-3 ${
                alert.type === 'outbreak'
                  ? 'border-red-500/30 bg-red-500/5'
                  : alert.type === 'fire'
                    ? 'border-orange-500/30 bg-orange-500/5'
                    : alert.type === 'storm'
                      ? 'border-orange-500/30 bg-orange-500/5'
                      : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="mt-0.5">
                {alert.type === 'outbreak' ? (
                  <Bug size={16} className="text-red-400" />
                ) : alert.type === 'fire' ? (
                  <AlertTriangle size={16} className="text-orange-400" />
                ) : alert.type === 'storm' ? (
                  <CloudLightning size={16} className="text-orange-400" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text)]">{alert.title}</p>
                <p className="text-[11px] text-[var(--text3)] mt-0.5">{alert.description}</p>
                <p className="text-[10px] text-[var(--text3)] font-mono mt-1">
                  {new Date(alert.timestamp).toLocaleString('sv-SE')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Queue + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Inspection Queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif font-bold text-[var(--text)] flex items-center gap-2">
              <ClipboardCheck size={16} className="text-[var(--green)]" />
              Inspektionskö
            </h2>
            <span className="text-[10px] text-[var(--text3)]">
              {demoQueue.length} väntande
            </span>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden divide-y divide-[var(--border)]">
            {(loading ? Array(3).fill(null) : demoQueue).map((item, idx) => {
              if (!item) {
                return (
                  <div key={idx} className="px-4 py-3 animate-pulse">
                    <div className="h-4 bg-[var(--bg3)] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[var(--bg3)] rounded w-1/2" />
                  </div>
                );
              }
              const risk = RISK_STYLES[item.riskLevel];
              return (
                <Link
                  key={item.id}
                  to={`/inspector/inspection/${item.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg3)] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-[var(--text)] truncate">
                        {item.parcelName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${risk.bg} ${risk.text}`}>
                        {risk.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--text3)]">
                      <span className="flex items-center gap-0.5">
                        <MapPin size={9} />
                        {item.municipality}
                      </span>
                      <span>{item.damageType}</span>
                      <span>{item.area_ha} ha</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-[var(--text3)] shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Map Overview (placeholder) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif font-bold text-[var(--text)] flex items-center gap-2">
              <MapPin size={16} className="text-[var(--green)]" />
              Kartöversikt
            </h2>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden relative h-80">
            {/* Placeholder map background */}
            <div className="absolute inset-0 bg-[#071a0b]">
              {/* Grid lines to simulate map */}
              <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10b981" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Pins */}
              {MAP_PINS.map((pin) => (
                <button
                  key={pin.id}
                  onClick={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/50 shadow-lg"
                    style={{ backgroundColor: PIN_COLORS[pin.risk] }}
                  />
                  {selectedPin === pin.id && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg2)] border border-[var(--border)] rounded-md px-2 py-1 whitespace-nowrap z-10">
                      <span className="text-[10px] text-[var(--text)]">
                        {demoQueue.find((q) => q.id === pin.id)?.parcelName}
                      </span>
                    </div>
                  )}
                </button>
              ))}

              {/* Legend */}
              <div className="absolute bottom-3 left-3 bg-[var(--bg2)]/90 backdrop-blur-sm border border-[var(--border)] rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold text-[var(--text2)] mb-1.5">Risknivå</p>
                <div className="flex items-center gap-3">
                  {Object.entries(RISK_STYLES).map(([key, style]) => (
                    <div key={key} className="flex items-center gap-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIN_COLORS[key] }}
                      />
                      <span className="text-[9px] text-[var(--text3)]">{style.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Reports + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif font-bold text-[var(--text)] flex items-center gap-2">
              <FileText size={16} className="text-[var(--green)]" />
              Senaste rapporter
            </h2>
            <Link
              to="/inspector/reports"
              className="text-[10px] text-[var(--green)] hover:underline flex items-center gap-0.5"
            >
              Visa alla <ChevronRight size={10} />
            </Link>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden divide-y divide-[var(--border)]">
            {demoReports.map((report) => {
              const st = STATUS_STYLES[report.status];
              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg3)] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-[var(--text)] truncate">
                        {report.parcelName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text3)] font-mono">
                      {new Date(report.date).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <Link
                    to={`/inspector/report/${report.id}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-[var(--text3)] hover:text-[var(--green)] transition-colors"
                  >
                    <Eye size={12} />
                    Visa
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif font-bold text-[var(--text)] flex items-center gap-2">
              <TreePine size={16} className="text-[var(--green)]" />
              Snabbåtgärder
            </h2>
          </div>
          <div className="space-y-2">
            <QuickAction
              icon={Play}
              title="Starta ny inspektion"
              description="Påbörja ett nytt fältbesök"
              to="/inspector/inspection/new"
            />
            <QuickAction
              icon={ClipboardCheck}
              title="Granska väntande"
              description={`${demoQueue.length} fastigheter väntar på inspektion`}
              to="/inspector/surveys"
            />
            <QuickAction
              icon={FileText}
              title="Generera rapport"
              description="Skapa en inspektionsrapport från befintlig data"
              to="/inspector/reports"
            />
            <QuickAction
              icon={BarChart3}
              title="Visa statistik"
              description="Analyser och trender för inspektioner"
              to="/inspector/analytics"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof CheckCircle;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-2xl font-semibold font-mono text-[var(--text)]">{value}</p>
      <p className="text-[10px] text-[var(--text3)]">{label}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: typeof Play;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 hover:bg-[var(--bg3)] hover:border-[var(--green)]/20 transition-colors group"
    >
      <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-[var(--green)]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--green)] transition-colors">
          {title}
        </p>
        <p className="text-[10px] text-[var(--text3)]">{description}</p>
      </div>
      <ChevronRight size={14} className="text-[var(--text3)] shrink-0 ml-auto" />
    </Link>
  );
}
