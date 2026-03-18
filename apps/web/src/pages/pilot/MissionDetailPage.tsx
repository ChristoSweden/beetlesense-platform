import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight,
  MapPin,
  TreePine,
  Ruler,
  Camera,
  Layers,
  Battery,
  ClipboardCheck,
  Upload,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  Plane,
  Package,
  Truck,
  MessageSquare,
  AlertTriangle,
  User,
  Play,
  Pause,
  Wifi,
  Image,
  Gauge,
  Wind,
  Thermometer,
  Navigation,
  Loader2,
} from 'lucide-react';
import { useDjiFleet, type DjiMission } from '@/hooks/useDjiFleet';
import { usePilotJobs } from '@/hooks/usePilotJobs';

/* ------------------------------------------------------------------ */
/*  Checklist data                                                     */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  id: string;
  label: string;
  category: 'pre-flight' | 'flight-planning';
}

const FLIGHT_PLANNING_CHECKS: ChecklistItem[] = [
  { id: 'fp1', label: 'Kontrollera SMHI-prognos -- vind < 12 m/s, inget regn', category: 'flight-planning' },
  { id: 'fp2', label: 'Verifiera luftrumsklarering (LFV / Drone Map Sweden)', category: 'flight-planning' },
  { id: 'fp3', label: 'Bekräfta flyghöjd enligt uppdragskrav', category: 'flight-planning' },
  { id: 'fp4', label: 'Planera flygväg med korrekt överlapp', category: 'flight-planning' },
  { id: 'fp5', label: 'Bekräfta tillstånd från markägare', category: 'flight-planning' },
];

const PRE_FLIGHT_CHECKS: ChecklistItem[] = [
  { id: 'pf1', label: 'Batterinivå > 90% (alla batterier)', category: 'pre-flight' },
  { id: 'pf2', label: 'Propellrar inspekterade -- inga skador', category: 'pre-flight' },
  { id: 'pf3', label: 'Sensorer kalibrerade och rena', category: 'pre-flight' },
  { id: 'pf4', label: 'SD-kort formaterat och isatt', category: 'pre-flight' },
  { id: 'pf5', label: 'GPS-lås uppnått (min 12 satelliter)', category: 'pre-flight' },
  { id: 'pf6', label: 'Return-to-home-punkt inställd', category: 'pre-flight' },
  { id: 'pf7', label: 'Visuell observatör informerad (vid behov)', category: 'pre-flight' },
  { id: 'pf8', label: 'Nödprocedurer genomgångna', category: 'pre-flight' },
];

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

type MissionStatus = DjiMission['status'];

type TimelineStep = { key: string; label: string; icon: typeof Clock; done: boolean; active: boolean };

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planerad',
  uploaded: 'Uppladdad',
  in_progress: 'Pågår',
  paused: 'Pausad',
  completed: 'Slutförd',
  failed: 'Misslyckad',
  cancelled: 'Avbruten',
};

function getTimeline(status: MissionStatus): TimelineStep[] {
  const steps: { key: string; label: string; icon: typeof Clock }[] = [
    { key: 'planned', label: 'Planerad', icon: Package },
    { key: 'uploaded', label: 'Uppladdad', icon: Upload },
    { key: 'in_progress', label: 'Flygning', icon: Plane },
    { key: 'completed', label: 'Slutförd', icon: CheckCircle2 },
  ];
  const statusMap: Record<string, number> = {
    planned: 0,
    uploaded: 1,
    in_progress: 2,
    paused: 2,
    completed: 3,
    failed: 2,
    cancelled: 0,
  };
  const currentIdx = statusMap[status] ?? 0;
  return steps.map((s, i) => ({
    ...s,
    done: i < currentIdx,
    active: i === currentIdx,
  }));
}

/* ------------------------------------------------------------------ */
/*  Simulated telemetry for in_progress demo                           */
/* ------------------------------------------------------------------ */

function useTelemetry(active: boolean) {
  const [telemetry, setTelemetry] = useState({
    altitude: 80,
    speed: 5.0,
    battery: 78,
    satellites: 16,
    heading: 90,
    windSpeed: 4.2,
    temperature: 6,
    waypointsCompleted: 24,
    waypointsTotal: 48,
    distanceTravelled: 3600,
    elapsedMin: 12,
  });

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        battery: Math.max(10, prev.battery - 0.3 + Math.random() * 0.1),
        speed: 4.5 + Math.random() * 1.5,
        altitude: 79 + Math.random() * 2,
        heading: (prev.heading + (Math.random() > 0.5 ? 0.5 : -0.5) + 360) % 360,
        windSpeed: 3 + Math.random() * 3,
        temperature: 5 + Math.random() * 3,
        satellites: 14 + Math.floor(Math.random() * 4),
        waypointsCompleted: Math.min(prev.waypointsTotal, prev.waypointsCompleted + (Math.random() > 0.6 ? 1 : 0)),
        distanceTravelled: prev.distanceTravelled + Math.round(Math.random() * 50),
        elapsedMin: prev.elapsedMin + (Math.random() > 0.8 ? 1 : 0),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [active]);

  return telemetry;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MissionDetailPage() {
  const { id } = useParams();
  const { missions, aircraft, loading: fleetLoading } = useDjiFleet();
  const { jobs, loading: jobsLoading } = usePilotJobs({ role: 'pilot' });

  const [fpChecked, setFpChecked] = useState<Set<string>>(new Set());
  const [pfChecked, setPfChecked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [missionStatus, setMissionStatus] = useState<MissionStatus | null>(null);

  // Find mission from useDjiFleet
  const mission = useMemo(() => missions.find((m) => m.id === id) ?? null, [missions, id]);

  // Find matching pilot job for extra context (parcel name, fee, etc.)
  const matchingJob = useMemo(
    () => jobs.find((j) => j.parcel_id === mission?.parcelId || j.survey_id === mission?.id) ?? null,
    [jobs, mission],
  );

  // Find the aircraft
  const missionAircraft = useMemo(
    () => (mission?.aircraftId ? aircraft.find((a) => a.id === mission.aircraftId) : null),
    [aircraft, mission],
  );

  // Sync local status
  useEffect(() => {
    if (mission) setMissionStatus(mission.status);
  }, [mission]);

  const isActive = missionStatus === 'in_progress';
  const isPaused = missionStatus === 'paused';
  const isCompleted = missionStatus === 'completed';
  const telemetry = useTelemetry(isActive);

  const toggleCheck = (
    checkId: string,
    set: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) => {
    const next = new Set(set);
    if (next.has(checkId)) next.delete(checkId);
    else next.add(checkId);
    setter(next);
  };

  const timeline = getTimeline(missionStatus ?? 'planned');
  const allChecksComplete =
    fpChecked.size === FLIGHT_PLANNING_CHECKS.length &&
    pfChecked.size === PRE_FLIGHT_CHECKS.length;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).map((f) => f.name);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleStart = () => setMissionStatus('in_progress');
  const handlePause = () => setMissionStatus('paused');
  const handleResume = () => setMissionStatus('in_progress');

  // Loading state
  if (fleetLoading || jobsLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
          <p className="text-xs text-[var(--text3)]">Laddar uppdragsdata...</p>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
          <Link to="/pilot/dashboard" className="hover:text-[var(--text2)]">Dashboard</Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text)]">Uppdrag</span>
        </nav>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-12 text-center">
          <AlertTriangle size={24} className="mx-auto text-amber-400 mb-3" />
          <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Uppdrag hittades inte</h2>
          <p className="text-xs text-[var(--text3)] mb-4">ID: {id}</p>
          <Link to="/pilot/dashboard" className="text-xs text-[var(--green)] hover:underline">
            Tillbaka till Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const parcelName = mission.parcelName ?? matchingJob?.parcel_name ?? 'Okänt skifte';
  const feeSek = matchingJob?.fee_sek ?? null;
  const deadline = matchingJob?.deadline ?? null;
  const municipality = matchingJob?.municipality ?? null;
  const areaHa = mission.coverageAreaHa ?? matchingJob?.area_ha ?? null;

  // Media gallery placeholder for completed missions
  const demoMedia = isCompleted
    ? Array.from({ length: mission.mediaCount || 6 }, (_, i) => ({
        id: `media-${i}`,
        name: `IMG_${String(i + 1).padStart(4, '0')}.jpg`,
        type: i < 2 ? 'thermal' : i < 4 ? 'multispectral' : 'rgb',
      }))
    : [];

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/pilot/dashboard" className="hover:text-[var(--text2)]">Dashboard</Link>
        <ChevronRight size={12} />
        <Link to="/pilot/flight-log" className="hover:text-[var(--text2)]">Flyglogg</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Uppdragsdetalj</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">{mission.name}</h1>
          <p className="text-xs text-[var(--text3)] flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-0.5"><MapPin size={10} />{parcelName}</span>
            {municipality && <span className="flex items-center gap-0.5"><TreePine size={10} />{municipality}</span>}
            {areaHa && <span className="flex items-center gap-0.5"><Layers size={10} />{areaHa} ha</span>}
            {deadline && <span className="flex items-center gap-0.5"><Clock size={10} />Deadline {deadline}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
            isActive ? 'bg-blue-500/20 text-blue-400 animate-pulse'
            : isCompleted ? 'bg-emerald-500/20 text-emerald-400'
            : isPaused ? 'bg-amber-500/20 text-amber-400'
            : 'bg-[var(--bg3)] text-[var(--text3)]'
          }`}>
            {STATUS_LABEL[missionStatus ?? 'planned']}
          </span>
          {feeSek && (
            <div className="text-right">
              <p className="text-lg font-mono font-semibold text-[var(--text)]">{feeSek.toLocaleString('sv-SE')} kr</p>
              <p className="text-[10px] text-[var(--text3)]">Uppdragsersättning</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {(missionStatus === 'planned' || missionStatus === 'uploaded' || isActive || isPaused) && (
        <div className="flex items-center gap-2 mb-6">
          {(missionStatus === 'planned' || missionStatus === 'uploaded') && allChecksComplete && (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--green)] text-white rounded-lg hover:bg-[var(--green)]/90 transition-colors"
            >
              <Play size={14} /> Starta uppdrag
            </button>
          )}
          {isActive && (
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              <Pause size={14} /> Pausa
            </button>
          )}
          {isPaused && (
            <button
              onClick={handleResume}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--green)] text-white rounded-lg hover:bg-[var(--green)]/90 transition-colors"
            >
              <Play size={14} /> Återuppta
            </button>
          )}
          {(missionStatus === 'planned' || missionStatus === 'uploaded') && !allChecksComplete && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
              <AlertTriangle size={12} />
              Slutför alla checklistor innan start
            </div>
          )}
        </div>
      )}

      {/* Status Timeline */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-6">
        <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">Statusförlopp</h2>
        <div className="flex items-center justify-between">
          {timeline.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.done
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : step.active
                        ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-400/30'
                        : 'bg-[var(--bg3)] text-[var(--text3)]'
                  }`}
                >
                  <step.icon size={14} />
                </div>
                <p className={`text-[9px] mt-1 ${step.active ? 'text-blue-400 font-medium' : 'text-[var(--text3)]'}`}>
                  {step.label}
                </p>
              </div>
              {i < timeline.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1.5 mt-[-16px] ${step.done ? 'bg-emerald-500/40' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Telemetry (visible when in_progress) */}
      {isActive && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Wifi size={14} className="text-blue-400 animate-pulse" />
            <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Realtidstelemetri</h2>
            <span className="text-[9px] text-blue-400/60 ml-auto">Uppdateras var 2:a sekund</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { icon: Gauge, label: 'Höjd', value: `${telemetry.altitude.toFixed(0)} m`, color: 'text-blue-400' },
              { icon: Navigation, label: 'Hastighet', value: `${telemetry.speed.toFixed(1)} m/s`, color: 'text-blue-400' },
              { icon: Battery, label: 'Batteri', value: `${Math.round(telemetry.battery)}%`, color: telemetry.battery < 30 ? 'text-red-400' : 'text-emerald-400' },
              { icon: Wind, label: 'Vind', value: `${telemetry.windSpeed.toFixed(1)} m/s`, color: telemetry.windSpeed > 8 ? 'text-amber-400' : 'text-blue-400' },
              { icon: Thermometer, label: 'Temp', value: `${telemetry.temperature.toFixed(0)}°C`, color: 'text-blue-400' },
            ].map((t) => (
              <div key={t.label} className="bg-[var(--bg2)] rounded-lg p-2.5 border border-[var(--border)]">
                <div className="flex items-center gap-1.5 mb-1">
                  <t.icon size={10} className="text-[var(--text3)]" />
                  <span className="text-[9px] text-[var(--text3)]">{t.label}</span>
                </div>
                <p className={`text-sm font-mono font-semibold ${t.color}`}>{t.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-xs text-[var(--text)]">
              <span className="text-[9px] text-[var(--text3)] block">Waypoints</span>
              <span className="font-mono">{telemetry.waypointsCompleted}/{telemetry.waypointsTotal}</span>
            </div>
            <div className="text-xs text-[var(--text)]">
              <span className="text-[9px] text-[var(--text3)] block">Satelliter</span>
              <span className="font-mono">{telemetry.satellites}</span>
            </div>
            <div className="text-xs text-[var(--text)]">
              <span className="text-[9px] text-[var(--text3)] block">Sträcka</span>
              <span className="font-mono">{(telemetry.distanceTravelled / 1000).toFixed(1)} km</span>
            </div>
            <div className="text-xs text-[var(--text)]">
              <span className="text-[9px] text-[var(--text3)] block">Tid</span>
              <span className="font-mono">{telemetry.elapsedMin} min</span>
            </div>
          </div>
          {/* Waypoint progress bar */}
          <div className="mt-3">
            <div className="w-full h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${(telemetry.waypointsCompleted / telemetry.waypointsTotal) * 100}%` }}
              />
            </div>
            <p className="text-[9px] text-[var(--text3)] mt-1">
              {Math.round((telemetry.waypointsCompleted / telemetry.waypointsTotal) * 100)}% slutfört
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Parcel / Mission Info */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Uppdragsinformation</h2>
          <div className="space-y-2">
            {[
              { icon: TreePine, label: 'Skifte', value: parcelName },
              { icon: MapPin, label: 'Kommun', value: municipality ?? '-' },
              { icon: Layers, label: 'Yta', value: areaHa ? `${areaHa} ha` : '-' },
              { icon: Plane, label: 'Drönare', value: mission.aircraftName ?? missionAircraft?.modelName ?? '-' },
              { icon: User, label: 'Uppdragstyp', value: mission.missionType },
              { icon: Clock, label: 'Skapad', value: new Date(mission.createdAt).toLocaleDateString('sv-SE') },
              ...(mission.startedAt ? [{ icon: Play as typeof Clock, label: 'Startad', value: new Date(mission.startedAt).toLocaleString('sv-SE') }] : []),
              ...(mission.completedAt ? [{ icon: CheckCircle2 as typeof Clock, label: 'Slutförd', value: new Date(mission.completedAt).toLocaleString('sv-SE') }] : []),
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <item.icon size={12} className="text-[var(--text3)] shrink-0" />
                <span className="text-[10px] text-[var(--text3)] w-24">{item.label}</span>
                <span className="text-xs text-[var(--text)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flight Parameters */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Flygparametrar</h2>
          <div className="space-y-2 mb-4">
            {[
              { icon: Ruler, label: 'Flyghöjd', value: `${mission.altitudeM} m AGL` },
              { icon: Navigation, label: 'Hastighet', value: `${mission.speedMs} m/s` },
              { icon: Layers, label: 'Överlapp (fram)', value: `${mission.overlapFront}%` },
              { icon: Layers, label: 'Överlapp (sida)', value: `${mission.overlapSide}%` },
              ...(mission.estimatedDurationMin ? [{ icon: Clock as typeof Ruler, label: 'Beräknad tid', value: `${mission.estimatedDurationMin} min` }] : []),
              ...(mission.estimatedPhotos ? [{ icon: Camera as typeof Ruler, label: 'Beräknade foton', value: `${mission.estimatedPhotos} st` }] : []),
              ...(mission.flightDistanceM ? [{ icon: Ruler, label: 'Flygsträcka', value: `${(mission.flightDistanceM / 1000).toFixed(1)} km` }] : []),
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <item.icon size={12} className="text-[var(--text3)] shrink-0" />
                <span className="text-[10px] text-[var(--text3)] w-28">{item.label}</span>
                <span className="text-xs text-[var(--text)]">{item.value}</span>
              </div>
            ))}
          </div>
          <h3 className="text-[10px] font-medium text-[var(--text2)] uppercase tracking-wider mb-1.5">Sensorer</h3>
          <div className="flex flex-wrap gap-1.5">
            {mission.sensorsEnabled.map((s) => (
              <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)] font-medium uppercase">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Media Gallery (completed missions) */}
      {isCompleted && demoMedia.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Image size={16} className="text-[var(--green)]" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Mediagalleri</h2>
            <span className="text-[9px] text-[var(--text3)] ml-auto">{mission.mediaCount || demoMedia.length} filer</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {demoMedia.slice(0, 12).map((m) => (
              <div
                key={m.id}
                className="aspect-square rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex flex-col items-center justify-center gap-1 hover:border-[var(--green)]/30 transition-colors cursor-pointer"
              >
                <Camera size={16} className="text-[var(--text3)]" />
                <span className="text-[8px] text-[var(--text3)] truncate max-w-full px-1">{m.name}</span>
                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium ${
                  m.type === 'thermal' ? 'bg-red-500/20 text-red-400'
                  : m.type === 'multispectral' ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {m.type}
                </span>
              </div>
            ))}
          </div>
          {demoMedia.length > 12 && (
            <p className="text-[10px] text-[var(--text3)] mt-2 text-center">
              +{demoMedia.length - 12} fler filer
            </p>
          )}
        </div>
      )}

      {/* Checklists (show for non-completed missions) */}
      {!isCompleted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Flight Planning Checklist */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck size={16} className="text-[var(--green)]" />
              <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Flygplanering</h2>
              <span className="text-[9px] text-[var(--text3)] ml-auto">
                {fpChecked.size}/{FLIGHT_PLANNING_CHECKS.length}
              </span>
            </div>
            <div className="space-y-2">
              {FLIGHT_PLANNING_CHECKS.map((c) => (
                <label key={c.id} className="flex items-start gap-2.5 cursor-pointer group">
                  <button
                    onClick={() => toggleCheck(c.id, fpChecked, setFpChecked)}
                    className="mt-0.5 shrink-0"
                  >
                    {fpChecked.has(c.id) ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <Circle size={14} className="text-[var(--text3)] group-hover:text-[var(--text2)]" />
                    )}
                  </button>
                  <span className={`text-xs ${fpChecked.has(c.id) ? 'text-[var(--text3)] line-through' : 'text-[var(--text)]'}`}>
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Pre-Flight Checklist */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Battery size={16} className="text-amber-400" />
              <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Kontroll före flygning</h2>
              <span className="text-[9px] text-[var(--text3)] ml-auto">
                {pfChecked.size}/{PRE_FLIGHT_CHECKS.length}
              </span>
            </div>
            <div className="space-y-2">
              {PRE_FLIGHT_CHECKS.map((c) => (
                <label key={c.id} className="flex items-start gap-2.5 cursor-pointer group">
                  <button
                    onClick={() => toggleCheck(c.id, pfChecked, setPfChecked)}
                    className="mt-0.5 shrink-0"
                  >
                    {pfChecked.has(c.id) ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <Circle size={14} className="text-[var(--text3)] group-hover:text-[var(--text2)]" />
                    )}
                  </button>
                  <span className={`text-xs ${pfChecked.has(c.id) ? 'text-[var(--text3)] line-through' : 'text-[var(--text)]'}`}>
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Upload Zone */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload size={16} className="text-[var(--green)]" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Ladda upp rådata</h2>
          </div>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-[var(--green)] bg-[var(--green)]/5'
                : 'border-[var(--border)] hover:border-[var(--text3)]'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload size={24} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-xs text-[var(--text2)]">Dra och släpp filer här</p>
            <p className="text-[10px] text-[var(--text3)] mt-1">GeoTIFF, LAS, CSV, JPG -- Max 2 GB per fil</p>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-3 space-y-1">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[var(--text)]">
                  <FileText size={12} className="text-[var(--text3)]" />
                  {f}
                  <CheckCircle2 size={10} className="text-emerald-400 ml-auto" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mission Notes */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-[var(--green)]" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Uppdragsanteckningar</h2>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Lägg till anteckningar om uppdraget, observationer, hinder som påträffats..."
            className="w-full h-32 bg-[var(--bg3)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text)] placeholder:text-[var(--text3)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
          />
          <p className="text-[10px] text-[var(--text3)] mt-1">
            Anteckningar delas med skogsägaren och inspektionsteamet.
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3">
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/pilot/dashboard"
            className="px-4 py-2 text-xs text-[var(--text2)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg3)] transition-colors"
          >
            Tillbaka
          </Link>
          {!isCompleted && (
            <button
              disabled={!allChecksComplete}
              className={`px-5 py-2 text-xs font-medium rounded-lg transition-colors ${
                allChecksComplete
                  ? 'bg-[var(--green)] text-white hover:bg-[var(--green)]/90'
                  : 'bg-[var(--bg3)] text-[var(--text3)] cursor-not-allowed'
              }`}
            >
              Slutför och skicka
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
