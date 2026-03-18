import { useTranslation } from 'react-i18next';
import { Map, Camera, FileText, Bot, Compass, X, Signal, Database } from 'lucide-react';
import { useFieldModeStore } from '@/stores/fieldModeStore';
import { useNetworkStatus } from '@/lib/offlineSync';
import { FieldMap } from './FieldMap';
import { FieldCapture } from './FieldCapture';
import { FieldNotes } from './FieldNotes';
import { FieldAI } from './FieldAI';
import { useState, useEffect } from 'react';

// ─── GPS Hook ───

function useGpsAccuracy() {
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setAccuracy(Math.round(pos.coords.accuracy)),
      () => setAccuracy(null),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return accuracy;
}

// ─── Tab definitions ───

const TABS = [
  { id: 'map' as const, icon: Map, labelKey: 'field.tabs.map' },
  { id: 'capture' as const, icon: Camera, labelKey: 'field.tabs.capture' },
  { id: 'notes' as const, icon: FileText, labelKey: 'field.tabs.notes' },
  { id: 'ai' as const, icon: Bot, labelKey: 'field.tabs.ai' },
];

// ─── Layout ───

export function FieldModeLayout() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, disableFieldMode, capturedPhotos, cacheReady } =
    useFieldModeStore();
  const { isOnline } = useNetworkStatus();
  const gpsAccuracy = useGpsAccuracy();
  const pendingUploads = capturedPhotos.filter((p) => !p.uploaded).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#020a03' }}>
      {/* ─── Status Bar ─── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[#030d05]">
        {/* Left: Field Mode label + compass */}
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-[var(--green)]" />
          <span className="text-xs font-bold text-[var(--green)] uppercase tracking-wider">
            {t('field.fieldMode')}
          </span>
        </div>

        {/* Center: Status indicators */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          {/* GPS accuracy */}
          <div className="flex items-center gap-1">
            <Signal size={10} className={gpsAccuracy && gpsAccuracy < 20 ? 'text-[var(--green)]' : 'text-[var(--amber)]'} />
            <span className={gpsAccuracy && gpsAccuracy < 20 ? 'text-[var(--green)]' : 'text-[var(--amber)]'}>
              {gpsAccuracy !== null ? `${gpsAccuracy}m` : '---'}
            </span>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[var(--green)]' : 'bg-[var(--amber)] animate-pulse'}`} />
            <span className={isOnline ? 'text-[var(--green)]' : 'text-[var(--amber)]'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Cache status */}
          <div className="flex items-center gap-1">
            <Database size={10} className={cacheReady ? 'text-[var(--green)]' : 'text-[var(--text3)]'} />
            <span className={cacheReady ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>
              {cacheReady ? t('field.cached') : '---'}
            </span>
          </div>
        </div>

        {/* Right: Exit button */}
        <button
          onClick={disableFieldMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--red)]/10 text-[var(--red)] text-xs font-medium hover:bg-[var(--red)]/20 transition-colors min-h-[36px]"
        >
          <X size={14} />
          <span className="hidden sm:inline">{t('field.exit')}</span>
        </button>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'map' && <FieldMap />}
        {activeTab === 'capture' && <FieldCapture />}
        {activeTab === 'notes' && <FieldNotes />}
        {activeTab === 'ai' && <FieldAI />}
      </div>

      {/* ─── Bottom Navigation ─── */}
      <nav className="flex items-stretch border-t border-[var(--border)] bg-[#030d05]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors ${
                isActive
                  ? 'text-[var(--green)] bg-[var(--green)]/5'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                {/* Badge for capture tab showing pending count */}
                {tab.id === 'capture' && pendingUploads > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--amber)] text-forest-900 text-[9px] font-bold flex items-center justify-center">
                    {pendingUploads}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
