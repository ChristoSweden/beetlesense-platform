import { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  TreePine,
  FileText,
  Phone,
  Wifi,
  WifiOff,
  Compass,
  Cloud,
  Wind,
  Thermometer,
  BatteryLow,
  MapPin,
  Clock,
  ChevronLeft,
  Mic,
  AlertTriangle,
  Zap,
  CloudRain,
  Sun,
  Navigation,
  RefreshCw,
  CloudUpload,
  Check,
  Database,
} from 'lucide-react';
import FieldCamera from '@/components/field/FieldCamera';
import TreeMeasurement from '@/components/field/TreeMeasurement';
import VoiceRecorder from '@/components/field/VoiceRecorder';
import { syncQueue } from '@/services/syncQueue';
import {
  queueAction,
  getPendingActions,
  getLastSyncTime,
  getCachedParcels,
  type OfflineAction,
  type ParcelData,
} from '@/lib/offlineStore';
import { offlineSyncManager, type SyncState } from '@/services/offlineSync';


// ─── Types ───

interface FieldLogEntry {
  id: string;
  type: 'photo' | 'measurement' | 'observation' | 'emergency';
  title: string;
  description: string;
  timestamp: Date;
  lat: number | null;
  lng: number | null;
  synced?: boolean;
}

type ActivePanel = null | 'camera' | 'tree' | 'voice' | 'emergency';

// ─── Constants ───

const EMERGENCY_CONTACTS = [
  { name: 'SOS Alarm', number: '112', primary: true },
  { name: 'Skogsstyrelsen', number: '036-35 93 00', primary: false },
  { name: 'Närmaste sjukhus', number: '1177', primary: false },
];

// ─── FieldModePage ───

export default function FieldModePage() {
  // State
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const [heading, setHeading] = useState<number | null>(null);
  const [batterySaver, setBatterySaver] = useState(false);
  const [fieldLog, setFieldLog] = useState<FieldLogEntry[]>([]);
  const [showEmergency, setShowEmergency] = useState(false);

  // Offline-specific state
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [lastSyncTime, setLastSyncTimeState] = useState<Date | null>(null);
  const [cachedParcels, setCachedParcels] = useState<ParcelData[]>([]);
  const [syncState, setSyncState] = useState<SyncState>(offlineSyncManager.getState());

  // ─── Load cached data on mount ───
  useEffect(() => {
    getCachedParcels().then(setCachedParcels).catch(() => {});
    getLastSyncTime().then(setLastSyncTimeState).catch(() => {});
    refreshPendingActions();
  }, []);

  // ─── Subscribe to sync manager ───
  useEffect(() => {
    return offlineSyncManager.subscribe((state) => {
      setSyncState(state);
      if (state.lastSyncTime) setLastSyncTimeState(state.lastSyncTime);
      refreshPendingActions();
    });
  }, []);

  const refreshPendingActions = useCallback(() => {
    getPendingActions().then((actions) => {
      setPendingActions(actions);
      setSyncCount(actions.length);
    }).catch(() => {});
  }, []);

  // ─── Online/Offline ───
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ─── GPS tracking ───
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ─── Compass heading ───
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading for iOS, alpha for Android
      const h = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading ?? (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (h != null) setHeading(Math.round(h));
    };
    window.addEventListener('deviceorientation', handler as EventListener, true);
    return () => window.removeEventListener('deviceorientation', handler as EventListener, true);
  }, []);

  // ─── Sync now handler ───
  const handleSyncNow = useCallback(async () => {
    await offlineSyncManager.syncNow();
    refreshPendingActions();
  }, [refreshPendingActions]);

  // ─── Add log entry ───
  const addLogEntry = useCallback(
    async (type: FieldLogEntry['type'], title: string, description: string, lat?: number | null, lng?: number | null, imageData?: string) => {
      const entryId = crypto.randomUUID();
      const entryLat = lat ?? gps?.lat ?? null;
      const entryLng = lng ?? gps?.lng ?? null;

      const entry: FieldLogEntry = {
        id: entryId,
        type,
        title,
        description,
        timestamp: new Date(),
        lat: entryLat,
        lng: entryLng,
        synced: false,
      };
      setFieldLog((prev) => [entry, ...prev]);

      // Map field log types to offline action types
      const actionTypeMap: Record<string, OfflineAction['type']> = {
        photo: 'photo_capture',
        measurement: 'tree_measurement',
        observation: 'observation',
        emergency: 'observation',
      };

      // Queue to IndexedDB-backed offline store
      try {
        const offlineAction: OfflineAction = {
          id: entryId,
          type: actionTypeMap[type] || 'observation',
          payload: {
            id: entryId,
            type: entry.type,
            title: entry.title,
            description: entry.description,
            timestamp: entry.timestamp.toISOString(),
          },
          createdAt: Date.now(),
          imageData,
          lat: entryLat,
          lng: entryLng,
        };
        await queueAction(offlineAction);
        refreshPendingActions();
      } catch (err) {
        console.warn('Failed to queue offline action:', err);
      }

      // Also enqueue to legacy sync queue for backward compatibility
      syncQueue.enqueue('upsert_survey', 'field_observations', {
        id: entryId,
        type: entry.type,
        title: entry.title,
        description: entry.description,
        latitude: entryLat,
        longitude: entryLng,
        timestamp: entry.timestamp.toISOString(),
      });
    },
    [gps, refreshPendingActions],
  );

  // ─── Heading label ───
  const headingLabel = (deg: number): string => {
    const dirs = ['N', 'NÖ', 'Ö', 'SÖ', 'S', 'SV', 'V', 'NV'];
    return dirs[Math.round(deg / 45) % 8];
  };

  // ─── Time formatting ───
  const formatTs = (d: Date) =>
    d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

  // ─── Panels ───
  if (activePanel === 'camera') {
    return (
      <FieldCamera
        onCapture={(photo) => {
          addLogEntry(
            'photo',
            'Foto taget',
            photo.lat != null ? `GPS: ${photo.lat.toFixed(5)}, ${photo.lng?.toFixed(5)}` : 'Ingen GPS',
            photo.lat,
            photo.lng,
            (photo as unknown as Record<string, unknown>).imageData as string | undefined,
          );
        }}
        onClose={() => setActivePanel(null)}
      />
    );
  }

  if (activePanel === 'tree') {
    return (
      <TreeMeasurement
        onSave={(record) => {
          addLogEntry(
            'measurement',
            `${record.species.charAt(0).toUpperCase() + record.species.slice(1)} — ${record.dbh} cm DBH`,
            `Höjd: ${record.height}m, Ålder: ${record.age} år, Status: ${record.health}`,
            record.lat,
            record.lng,
          );
          setActivePanel(null);
        }}
        onClose={() => setActivePanel(null)}
      />
    );
  }

  if (activePanel === 'voice') {
    return (
      <VoiceRecorder
        onSave={(note) => {
          addLogEntry(
            'observation',
            'Röstanteckning',
            `Längd: ${Math.floor(note.duration / 60)}:${(note.duration % 60).toString().padStart(2, '0')}`,
            note.lat,
            note.lng,
          );
          setActivePanel(null);
        }}
        onClose={() => setActivePanel(null)}
      />
    );
  }

  // ─── Emergency overlay ───
  const EmergencyOverlay = () => (
    <div className="fixed inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center p-6 gap-6">
      <AlertTriangle size={64} className="text-red-400" />
      <h2 className="text-2xl font-bold text-white text-center">SOS / Nödläge</h2>
      <p className="text-red-200 text-center text-sm">
        Din position:{' '}
        {gps ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : 'GPS ej tillgänglig'}
      </p>
      <div className="w-full space-y-3 mt-4">
        {EMERGENCY_CONTACTS.map((c) => (
          <a
            key={c.number}
            href={`tel:${c.number.replace(/[^0-9+]/g, '')}`}
            className={`flex items-center justify-between p-5 rounded-2xl min-h-[64px] w-full ${
              c.primary
                ? 'bg-red-600 text-white font-bold text-xl'
                : 'bg-gray-900 border border-gray-700 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Phone size={c.primary ? 28 : 20} />
              <span>{c.name}</span>
            </div>
            <span className={c.primary ? 'text-2xl' : 'text-lg text-gray-300'}>{c.number}</span>
          </a>
        ))}
      </div>
      <button
        onClick={() => setShowEmergency(false)}
        className="mt-6 px-8 py-4 bg-gray-800 text-white rounded-2xl min-h-[56px] font-medium"
      >
        Stäng
      </button>
    </div>
  );

  // ─── Main render ───
  return (
    <div
      className={`min-h-screen bg-gray-950 text-white flex flex-col ${
        batterySaver ? 'brightness-75' : ''
      }`}
    >
      {showEmergency && <EmergencyOverlay />}

      {/* ─── Offline indicator ─── */}
      <div
        className={`px-4 py-2 text-sm font-medium flex items-center justify-between ${
          isOnline ? 'bg-green-900/60 text-green-300' : 'bg-amber-900/60 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{isOnline ? 'Online' : "Offline — changes saved locally"}</span>
        </div>
        <div className="flex items-center gap-3">
          {lastSyncTime && (
            <span className="text-xs opacity-75">
              Last sync: {lastSyncTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {syncCount > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <RefreshCw size={12} className={syncState.status === 'syncing' ? 'animate-spin' : ''} />
              {syncCount} pending
            </div>
          )}
          {isOnline && syncCount > 0 && (
            <button
              onClick={handleSyncNow}
              disabled={syncState.status === 'syncing'}
              className="text-xs px-2 py-0.5 bg-white/15 rounded hover:bg-white/25 transition disabled:opacity-50"
            >
              Sync now
            </button>
          )}
        </div>
      </div>

      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <button className="p-2 rounded-lg bg-gray-900 text-gray-400 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-green-400 flex items-center gap-2">
          <Navigation size={20} />
          Fältläge
        </h1>
        <button
          onClick={() => setBatterySaver((b) => !b)}
          className={`p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${
            batterySaver ? 'bg-amber-900/60 text-amber-400' : 'bg-gray-900 text-gray-400'
          }`}
          title="Batterisparläge"
        >
          {batterySaver ? <BatteryLow size={20} /> : <Zap size={20} />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
        {/* ─── GPS Map Placeholder ─── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="h-40 bg-gradient-to-br from-green-950 via-gray-900 to-green-950 flex flex-col items-center justify-center relative">
            {/* Grid lines for map feel */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/3 left-0 right-0 h-px bg-green-400" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-green-400" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-green-400" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-green-400" />
            </div>
            {/* Center marker */}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-lg shadow-green-500/50 animate-pulse" />
              <MapPin size={20} className="text-green-400 -mt-1" />
            </div>
            <div className="relative z-10 mt-3 text-green-400 font-mono text-sm">
              {gps
                ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`
                : 'Söker GPS-position...'}
            </div>
            {gps && (
              <div className="relative z-10 text-gray-500 text-xs mt-1">
                Noggrannhet: ~{Math.round(gps.accuracy)}m
              </div>
            )}
          </div>
        </div>

        {/* ─── Compass + Weather row ─── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Compass */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center">
            <Compass size={18} className="text-gray-500 mb-1" />
            <div className="relative w-16 h-16 my-1">
              <div
                className="absolute inset-0 border-2 border-gray-700 rounded-full flex items-center justify-center"
                style={{ transform: heading != null ? `rotate(${-heading}deg)` : undefined }}
              >
                <div className="w-0.5 h-5 bg-red-500 rounded-full absolute top-1" />
                <div className="w-0.5 h-5 bg-gray-500 rounded-full absolute bottom-1" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white bg-gray-900 px-1 rounded">
                  {heading != null ? headingLabel(heading) : '—'}
                </span>
              </div>
            </div>
            <span className="text-gray-400 text-xs mt-1">
              {heading != null ? `${heading}°` : 'Väntar...'}
            </span>
          </div>

          {/* Weather */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
              <Cloud size={14} />
              Väder
            </div>
            <div className="flex items-center gap-2">
              <Sun size={24} className="text-amber-400" />
              <CloudRain size={16} className="text-gray-500 -ml-3 mt-2" />
              <div>
                <div className="flex items-center gap-1">
                  <Thermometer size={14} className="text-green-400" />
                  <span className="text-xl font-bold text-white">14°C</span>
                </div>
                <span className="text-gray-500 text-xs">Delvis molnigt</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-gray-500 text-xs">
              <Wind size={12} />
              3 m/s SV
            </div>
          </div>
        </div>

        {/* ─── Quick Actions ─── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActivePanel('camera')}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center gap-2 min-h-[100px] active:bg-gray-800 transition"
          >
            <Camera size={32} className="text-green-400" />
            <span className="text-white font-medium text-sm text-center">Rapportera skada</span>
          </button>

          <button
            onClick={() => setActivePanel('tree')}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center gap-2 min-h-[100px] active:bg-gray-800 transition"
          >
            <TreePine size={32} className="text-green-400" />
            <span className="text-white font-medium text-sm text-center">Mät träd</span>
          </button>

          <button
            onClick={() => setActivePanel('voice')}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center gap-2 min-h-[100px] active:bg-gray-800 transition"
          >
            <Mic size={32} className="text-green-400" />
            <span className="text-white font-medium text-sm text-center">Notera observation</span>
          </button>

          <button
            onClick={() => setShowEmergency(true)}
            className="bg-red-950 border-2 border-red-700 rounded-2xl p-5 flex flex-col items-center gap-2 min-h-[100px] active:bg-red-900 transition"
          >
            <Phone size={32} className="text-red-400" />
            <span className="text-red-300 font-bold text-sm text-center">SOS / Nödläge</span>
          </button>
        </div>

        {/* ─── Cached Parcels (visible when offline) ─── */}
        {!isOnline && cachedParcels.length > 0 && (
          <div>
            <h2 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
              <Database size={16} />
              Cached parcels ({cachedParcels.length})
            </h2>
            <div className="space-y-2">
              {cachedParcels.map((parcel) => (
                <div
                  key={parcel.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-950 text-green-400 flex items-center justify-center shrink-0">
                    <TreePine size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{parcel.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {parcel.area_ha.toFixed(1)} ha
                      {parcel.health_score != null && ` · Health: ${parcel.health_score}%`}
                      {parcel.beetle_risk != null && ` · Risk: ${parcel.beetle_risk}%`}
                    </div>
                  </div>
                  {parcel.last_survey_date && (
                    <div className="text-gray-600 text-xs shrink-0">
                      {parcel.last_survey_date}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Field Log ─── */}
        <div>
          <h2 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
            <FileText size={16} />
            Field log — today
          </h2>
          {fieldLog.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center text-gray-600 text-sm">
              No observations recorded yet. Use the quick actions above.
            </div>
          ) : (
            <div className="space-y-2">
              {fieldLog.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      entry.type === 'photo'
                        ? 'bg-blue-950 text-blue-400'
                        : entry.type === 'measurement'
                          ? 'bg-green-950 text-green-400'
                          : entry.type === 'emergency'
                            ? 'bg-red-950 text-red-400'
                            : 'bg-purple-950 text-purple-400'
                    }`}
                  >
                    {entry.type === 'photo' && <Camera size={18} />}
                    {entry.type === 'measurement' && <TreePine size={18} />}
                    {entry.type === 'observation' && <Mic size={18} />}
                    {entry.type === 'emergency' && <AlertTriangle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{entry.title}</div>
                    <div className="text-gray-500 text-xs mt-0.5 truncate">{entry.description}</div>
                  </div>
                  <div className="text-gray-600 text-xs shrink-0 flex items-center gap-1">
                    {entry.synced === false && <CloudUpload size={12} className="text-amber-500" />}
                    {entry.synced === true && <Check size={12} className="text-green-500" />}
                    <Clock size={12} />
                    {formatTs(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Pending Offline Actions ─── */}
        {pendingActions.length > 0 && (
          <div>
            <h2 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
              <CloudUpload size={16} />
              Pending sync ({pendingActions.length})
            </h2>
            <div className="space-y-2">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="bg-gray-900 border border-amber-900/40 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center shrink-0">
                    {action.type === 'photo_capture' && <Camera size={14} />}
                    {action.type === 'tree_measurement' && <TreePine size={14} />}
                    {action.type === 'observation' && <Mic size={14} />}
                    {action.type === 'parcel_note' && <FileText size={14} />}
                    {action.type === 'voice_note' && <Mic size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium capitalize">
                      {action.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {new Date(action.createdAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="text-amber-500 text-xs font-medium">Pending</span>
                </div>
              ))}
            </div>
            {isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={syncState.status === 'syncing'}
                className="mt-3 w-full py-2.5 bg-green-900 text-green-300 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-800 transition disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncState.status === 'syncing' ? 'animate-spin' : ''} />
                {syncState.status === 'syncing' ? 'Syncing...' : 'Sync all now'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
