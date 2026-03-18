import { useState, useMemo } from 'react';
import {
  Plane,
  MapPin,
  Clock,
  Camera,
  Battery,
  Wifi,
  Satellite,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Thermometer,
  Leaf,
  Ruler,
  Layers,
} from 'lucide-react';
import { useDjiFleet, type DjiMission, type DjiAircraft } from '@/hooks/useDjiFleet';

// ─── Sensor badges ───

const SENSOR_ICONS: Record<string, { icon: typeof Camera; color: string; label: string }> = {
  rgb: { icon: Camera, color: '#3b82f6', label: 'RGB' },
  multispectral: { icon: Leaf, color: '#22c55e', label: 'Multispektral' },
  thermal: { icon: Thermometer, color: '#ef4444', label: 'Termisk' },
  lidar: { icon: Ruler, color: '#8b5cf6', label: 'LiDAR' },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  planned: { color: '#6b7280', label: 'Planerad' },
  uploaded: { color: '#3b82f6', label: 'Uppladdad' },
  in_progress: { color: '#f59e0b', label: 'Pågår' },
  paused: { color: '#f97316', label: 'Pausad' },
  completed: { color: '#22c55e', label: 'Slutförd' },
  failed: { color: '#ef4444', label: 'Misslyckad' },
  cancelled: { color: '#6b7280', label: 'Avbruten' },
};

/**
 * MissionControl — DJI drone fleet management and mission control dashboard.
 *
 * Shows:
 * - Fleet overview (registered aircraft with status)
 * - Mission list with status, sensor config, stats
 * - Quick stats (flight hours, missions, coverage)
 */
export default function MissionControl() {
  const { aircraft, missions, stats, loading } = useDjiFleet();
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [view, setView] = useState<'missions' | 'fleet'>('missions');

  const mission = useMemo(
    () => missions.find(m => m.id === selectedMission),
    [missions, selectedMission],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Plane size={16} />} label="Drönare" value={String(stats.totalAircraft)} sub={`${stats.cloudPaired} molnkopplade`} />
        <StatCard icon={<Clock size={16} />} label="Flygtimmar" value={String(stats.totalFlightHours)} sub={`${stats.totalMissions} uppdrag totalt`} />
        <StatCard icon={<CheckCircle2 size={16} />} label="Slutförda" value={String(stats.completedMissions)} sub={`${stats.plannedMissions} planerade`} />
        <StatCard icon={<Play size={16} />} label="Aktiva" value={String(stats.activeMissions)} color="#f59e0b" />
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg2)]">
        <button
          onClick={() => setView('missions')}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${view === 'missions' ? 'bg-[var(--bg3)] text-[var(--text)]' : 'text-[var(--text3)]'}`}
        >
          <Layers size={12} className="inline mr-1.5" />Uppdrag
        </button>
        <button
          onClick={() => setView('fleet')}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${view === 'fleet' ? 'bg-[var(--bg3)] text-[var(--text)]' : 'text-[var(--text3)]'}`}
        >
          <Plane size={12} className="inline mr-1.5" />Flotta
        </button>
      </div>

      {/* Mission list */}
      {view === 'missions' && (
        <div className="space-y-3">
          {missions.map(m => (
            <MissionCard
              key={m.id}
              mission={m}
              isSelected={m.id === selectedMission}
              onSelect={() => setSelectedMission(m.id === selectedMission ? null : m.id)}
            />
          ))}
          {missions.length === 0 && (
            <div className="text-center py-12 text-[var(--text3)] text-sm">
              Inga uppdrag ännu. Skapa ett nytt uppdrag från skiftessidan.
            </div>
          )}
        </div>
      )}

      {/* Fleet view */}
      {view === 'fleet' && (
        <div className="space-y-3">
          {aircraft.map(a => (
            <AircraftCard key={a.id} aircraft={a} />
          ))}
        </div>
      )}

      {/* Selected mission detail */}
      {mission && view === 'missions' && (
        <MissionDetail mission={mission} />
      )}
    </div>
  );
}

// ─── Sub-components ───

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[var(--green)]">{icon}</span>
        <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-mono font-bold" style={{ color: color ?? 'var(--text)' }}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--text3)] mt-0.5">{sub}</div>}
    </div>
  );
}

function MissionCard({ mission: m, isSelected, onSelect }: {
  mission: DjiMission; isSelected: boolean; onSelect: () => void;
}) {
  const statusCfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.planned;
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        isSelected ? 'border-[var(--green)] bg-[var(--green)]/5' : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Plane size={14} className="text-[var(--green)]" />
          <span className="text-sm font-medium text-[var(--text)]">{m.name}</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-[var(--text3)]">
        <span className="flex items-center gap-1"><MapPin size={10} />{m.parcelName ?? m.parcelId}</span>
        {m.estimatedDurationMin && <span className="flex items-center gap-1"><Clock size={10} />{m.estimatedDurationMin} min</span>}
        {m.estimatedPhotos && <span className="flex items-center gap-1"><Camera size={10} />{m.estimatedPhotos} bilder</span>}
        {m.coverageAreaHa && <span>{m.coverageAreaHa} ha</span>}
      </div>
      <div className="flex gap-1.5 mt-2">
        {m.sensorsEnabled.map(s => {
          const cfg = SENSOR_ICONS[s];
          if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <span key={s} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
              <Icon size={10} />{cfg.label}
            </span>
          );
        })}
      </div>
    </button>
  );
}

function MissionDetail({ mission: m }: { mission: DjiMission }) {
  return (
    <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--bg2)] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--text)]">{m.name}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-[var(--bg3)]">
          <div className="text-[var(--text3)]">Höjd</div>
          <div className="font-mono font-semibold text-[var(--text)]">{m.altitudeM} m</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg3)]">
          <div className="text-[var(--text3)]">Hastighet</div>
          <div className="font-mono font-semibold text-[var(--text)]">{m.speedMs} m/s</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg3)]">
          <div className="text-[var(--text3)]">Överlapp F/S</div>
          <div className="font-mono font-semibold text-[var(--text)]">{m.overlapFront}/{m.overlapSide}%</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg3)]">
          <div className="text-[var(--text3)]">Media</div>
          <div className="font-mono font-semibold text-[var(--text)]">{m.mediaCount} filer</div>
        </div>
      </div>
      {m.startedAt && (
        <div className="text-[10px] text-[var(--text3)]">
          Startad: {new Date(m.startedAt).toLocaleString('sv-SE')}
          {m.completedAt && ` — Klar: ${new Date(m.completedAt).toLocaleString('sv-SE')}`}
        </div>
      )}
    </div>
  );
}

function AircraftCard({ aircraft: a }: { aircraft: DjiAircraft }) {
  const isOnline = a.lastSeenAt && Date.now() - new Date(a.lastSeenAt).getTime() < 3600000;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Plane size={14} className="text-[var(--green)]" />
          <span className="text-sm font-medium text-[var(--text)]">{a.modelName}</span>
        </div>
        <div className="flex items-center gap-2">
          {a.cloudPaired && <Wifi size={12} className="text-[var(--green)]" title="Molnkopplad" />}
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
        </div>
      </div>
      <div className="text-[10px] text-[var(--text3)] font-mono mb-2">{a.serialNumber}</div>
      <div className="flex gap-1.5 mb-2">
        {a.rtkCapable && <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 text-purple-400">RTK</span>}
        {a.thermalCapable && <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 text-red-400">Termisk</span>}
        {a.multispectralCapable && <span className="px-1.5 py-0.5 rounded text-[9px] bg-green-500/10 text-green-400">MS</span>}
        {a.lidarCapable && <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/10 text-violet-400">LiDAR</span>}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-[var(--text3)]">
        <span>{a.totalFlightHours}h flygtid</span>
        <span>{a.totalFlights} flygningar</span>
        <span>FW {a.firmwareVersion}</span>
      </div>
    </div>
  );
}
