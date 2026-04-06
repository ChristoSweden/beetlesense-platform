import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Radio,
  Plus,
  ChevronRight,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Gauge,
  Sun,
  Leaf,
  X,
  Loader2,
  Wifi,
  WifiOff,
  MapPin,
  Clock,
  ChevronDown,
  Bug,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

type DeviceType = 'davis_vantage' | 'netatmo' | 'ecowitt' | 'tempest' | 'custom' | 'manual';
type StationStatus = 'pending' | 'connected' | 'offline' | 'error';

interface WeatherReading {
  id: string;
  temperature_c: number;
  humidity_pct: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  precipitation_mm: number;
  pressure_hpa: number;
  solar_radiation_wm2?: number;
  soil_temperature_c?: number;
  soil_moisture_pct?: number;
  recorded_at: string;
}

interface WeatherStation {
  id: string;
  name: string;
  device_type: DeviceType;
  device_id?: string;
  api_key?: string;
  parcel_id?: string;
  latitude?: number;
  longitude?: number;
  altitude_m?: number;
  status: StationStatus;
  last_reading_at?: string;
  last_reading?: WeatherReading;
  readings: WeatherReading[];
  created_at: string;
}

// ─── Constants ───

const DEVICE_INFO: Record<DeviceType, { label: string; description: string; priceRange: string }> = {
  davis_vantage: { label: 'Davis Vantage Pro2', description: 'Professional-grade weather station with wide sensor array', priceRange: 'SEK 5,000-8,000' },
  netatmo: { label: 'Netatmo', description: 'Smart home weather station with indoor and outdoor modules', priceRange: 'SEK 1,500-3,000' },
  ecowitt: { label: 'Ecowitt', description: 'Affordable Wi-Fi weather station with soil sensors', priceRange: 'SEK 800-2,500' },
  tempest: { label: 'WeatherFlow Tempest', description: 'No moving parts, haptic rain sensor, lightning detection', priceRange: 'SEK 3,000-4,000' },
  custom: { label: 'Custom / API', description: 'Connect via webhook URL or MQTT for custom setups', priceRange: 'Varies' },
  manual: { label: 'Manual Entry', description: 'Record readings manually on a schedule you set', priceRange: 'Free' },
};

const DEVICE_ICONS: Record<DeviceType, string> = {
  davis_vantage: '\uD83C\uDF21\uFE0F',
  netatmo: '\uD83C\uDFE0',
  ecowitt: '\uD83C\uDF3F',
  tempest: '\u26C8\uFE0F',
  custom: '\uD83D\uDD27',
  manual: '\uD83D\uDCDD',
};

const STATUS_CONFIG: Record<StationStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#d97706' },
  connected: { label: 'Connected', color: '#16a34a' },
  offline: { label: 'Offline', color: '#6b7280' },
  error: { label: 'Error', color: '#ef4444' },
};

// ─── Demo data: realistic Swedish weather ───

function generateHourlyReadings(baseTemp: number, baseHumidity: number): WeatherReading[] {
  const readings: WeatherReading[] = [];
  const now = Date.now();
  for (let h = 23; h >= 0; h--) {
    const hourOffset = h;
    const tempVariation = Math.sin((24 - hourOffset) * Math.PI / 12) * 4;
    const temp = baseTemp + tempVariation + (Math.random() - 0.5) * 1.5;
    readings.push({
      id: `r-${h}`,
      temperature_c: Math.round(temp * 10) / 10,
      humidity_pct: Math.round(baseHumidity + (Math.random() - 0.5) * 10),
      wind_speed_ms: Math.round((3 + Math.random() * 5) * 10) / 10,
      wind_direction_deg: Math.round(180 + (Math.random() - 0.5) * 90),
      precipitation_mm: Math.random() > 0.7 ? Math.round(Math.random() * 3 * 10) / 10 : 0,
      pressure_hpa: Math.round(1013 + (Math.random() - 0.5) * 10),
      solar_radiation_wm2: hourOffset > 6 && hourOffset < 20 ? Math.round(Math.random() * 400) : 0,
      soil_temperature_c: Math.round((temp - 3 + (Math.random() - 0.5)) * 10) / 10,
      soil_moisture_pct: Math.round(45 + (Math.random() - 0.5) * 15),
      recorded_at: new Date(now - hourOffset * 3600_000).toISOString(),
    });
  }
  return readings;
}

const DEMO_STATIONS: WeatherStation[] = [
  {
    id: 'ws-1',
    name: 'Norr\u00e5ker North',
    device_type: 'davis_vantage',
    device_id: 'DV-2847',
    parcel_id: 'p1',
    latitude: 63.82,
    longitude: 15.47,
    altitude_m: 340,
    status: 'connected',
    last_reading_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    readings: generateHourlyReadings(7.2, 68),
    created_at: '2026-02-15T10:00:00Z',
    get last_reading() { return this.readings[this.readings.length - 1]; },
  },
  {
    id: 'ws-2',
    name: 'S\u00f6dra Skogen Edge',
    device_type: 'ecowitt',
    device_id: 'ECO-1923',
    parcel_id: 'p2',
    latitude: 57.71,
    longitude: 12.94,
    altitude_m: 85,
    status: 'connected',
    last_reading_at: new Date(Date.now() - 12 * 60_000).toISOString(),
    readings: generateHourlyReadings(9.8, 72),
    created_at: '2026-03-01T08:00:00Z',
    get last_reading() { return this.readings[this.readings.length - 1]; },
  },
];

// ─── Helpers ───

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return iso; }
}

function windLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function degreeDays(readings: WeatherReading[], threshold: number = 5): number {
  let sum = 0;
  for (const r of readings) {
    if (r.temperature_c > threshold) {
      sum += (r.temperature_c - threshold) / 24;
    }
  }
  return Math.round(sum * 10) / 10;
}

// ─── CSS mini-chart (24h bars) ───

function MiniBarChart({ readings, field, color, label, unit }: {
  readings: WeatherReading[];
  field: keyof WeatherReading;
  color: string;
  label: string;
  unit: string;
}) {
  const values = readings.map(r => Number(r[field]) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const current = values[values.length - 1] ?? 0;

  return (
    <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold font-mono" style={{ color }}>{current}{unit}</span>
      </div>
      <div className="flex items-end gap-px h-12">
        {values.map((v, i) => {
          const height = max > min ? ((v - Math.min(0, min)) / (max - Math.min(0, min))) * 100 : 50;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all"
              style={{
                height: `${Math.max(height, 4)}%`,
                background: i === values.length - 1 ? color : `${color}60`,
              }}
              title={`${formatTime(readings[i]?.recorded_at ?? '')}: ${v}${unit}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[var(--text3)]">24h ago</span>
        <span className="text-[9px] text-[var(--text3)]">Now</span>
      </div>
    </div>
  );
}

// ─── Pair Wizard ───

type PairStep = 'device' | 'connection' | 'location' | 'confirm';

interface PairData {
  name: string;
  device_type: DeviceType | '';
  device_id: string;
  api_key: string;
  webhook_url: string;
  latitude: string;
  longitude: string;
  altitude_m: string;
  parcel_id: string;
}

function PairWizard({ onClose, onCreate }: { onClose: () => void; onCreate: (station: WeatherStation) => void }) {
  const toast = useToast();
  const [step, setStep] = useState<PairStep>('device');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PairData>({
    name: '',
    device_type: '',
    device_id: '',
    api_key: '',
    webhook_url: '',
    latitude: '',
    longitude: '',
    altitude_m: '',
    parcel_id: '',
  });

  const canProceedDevice = data.name.trim() && data.device_type;
  const canProceedConnection = data.device_type === 'manual' || data.device_id.trim() || data.webhook_url.trim();

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1500));
    setTestResult(Math.random() > 0.2 ? 'success' : 'error');
    setTesting(false);
  }

  async function handleCreate() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    const newStation: WeatherStation = {
      id: `ws-${Date.now()}`,
      name: data.name,
      device_type: data.device_type as DeviceType,
      device_id: data.device_id || undefined,
      api_key: data.api_key || undefined,
      latitude: data.latitude ? Number(data.latitude) : undefined,
      longitude: data.longitude ? Number(data.longitude) : undefined,
      altitude_m: data.altitude_m ? Number(data.altitude_m) : undefined,
      parcel_id: data.parcel_id || undefined,
      status: data.device_type === 'manual' ? 'connected' : 'pending',
      readings: [],
      created_at: new Date().toISOString(),
    };
    onCreate(newStation);
    setSaving(false);
    toast('Weather station added successfully', 'success');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-[var(--green)]" />
            <h2 className="text-sm font-bold text-[var(--text)]">Pair Weather Station</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
          {(['device', 'connection', 'location', 'confirm'] as PairStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={12} className="text-[var(--text3)]" />}
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${step === s ? 'text-[var(--green)]' : 'text-[var(--text3)]'}`}>
                {i + 1}. {s === 'device' ? 'Device' : s === 'connection' ? 'Connect' : s === 'location' ? 'Location' : 'Confirm'}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {step === 'device' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Station Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. North Forest Edge"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-2">Device Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(DEVICE_INFO) as [DeviceType, typeof DEVICE_INFO[DeviceType]][]).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setData(d => ({ ...d, device_type: key }))}
                      className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                        data.device_type === key
                          ? 'border-[var(--green)] bg-[var(--green)]/5'
                          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--green)]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{DEVICE_ICONS[key]}</span>
                        <span className="text-xs font-semibold text-[var(--text)]">{info.label}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text3)] leading-snug">{info.description}</p>
                      <span className="text-[10px] font-medium text-[var(--green)]">{info.priceRange}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'connection' && (
            <div className="space-y-4">
              {data.device_type === 'manual' ? (
                <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-center">
                  <p className="text-sm text-[var(--text)]">Manual entry mode</p>
                  <p className="text-xs text-[var(--text3)] mt-1">You will record readings by hand. No device connection needed.</p>
                </div>
              ) : data.device_type === 'custom' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Webhook URL or MQTT Topic</label>
                    <input
                      type="text"
                      value={data.webhook_url}
                      onChange={e => setData(d => ({ ...d, webhook_url: e.target.value }))}
                      placeholder="https://your-server.com/webhook or mqtt://..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30 font-mono"
                    />
                  </div>
                  <button
                    onClick={testConnection}
                    disabled={testing || !data.webhook_url.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] transition-colors disabled:opacity-40"
                  >
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {testResult && (
                    <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${testResult === 'success' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                      {testResult === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {testResult === 'success' ? 'Connection successful' : 'Connection failed - check your URL'}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Device ID</label>
                    <input
                      type="text"
                      value={data.device_id}
                      onChange={e => setData(d => ({ ...d, device_id: e.target.value }))}
                      placeholder={`e.g. ${data.device_type === 'davis_vantage' ? 'DV-2847' : data.device_type === 'netatmo' ? '70:ee:50:xx:xx:xx' : 'ECO-1923'}`}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text2)] block mb-1">API Key</label>
                    <input
                      type="password"
                      value={data.api_key}
                      onChange={e => setData(d => ({ ...d, api_key: e.target.value }))}
                      placeholder="Your device API key"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30 font-mono"
                    />
                  </div>
                  <button
                    onClick={testConnection}
                    disabled={testing || !data.device_id.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] transition-colors disabled:opacity-40"
                  >
                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {testResult && (
                    <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${testResult === 'success' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                      {testResult === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {testResult === 'success' ? 'Connection successful' : 'Connection failed - check your credentials'}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 'location' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg)] text-center">
                <MapPin size={24} className="mx-auto text-[var(--text3)] mb-2" />
                <p className="text-xs text-[var(--text3)]">Map pin placement (coming soon)</p>
                <p className="text-[10px] text-[var(--text3)] mt-1">Enter coordinates manually below</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={data.latitude}
                    onChange={e => setData(d => ({ ...d, latitude: e.target.value }))}
                    placeholder="e.g. 63.82"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={data.longitude}
                    onChange={e => setData(d => ({ ...d, longitude: e.target.value }))}
                    placeholder="e.g. 15.47"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Altitude (m above sea level)</label>
                <input
                  type="number"
                  value={data.altitude_m}
                  onChange={e => setData(d => ({ ...d, altitude_m: e.target.value }))}
                  placeholder="e.g. 340"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30 font-mono"
                />
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{data.device_type ? DEVICE_ICONS[data.device_type as DeviceType] : ''}</span>
                  <span className="text-sm font-semibold text-[var(--text)]">{data.name}</span>
                </div>
                <div className="space-y-1 text-[11px] text-[var(--text3)]">
                  <p>Type: {data.device_type ? DEVICE_INFO[data.device_type as DeviceType].label : ''}</p>
                  {data.device_id && <p>Device ID: {data.device_id}</p>}
                  {data.latitude && data.longitude && <p>Location: {data.latitude}, {data.longitude}</p>}
                  {data.altitude_m && <p>Altitude: {data.altitude_m}m</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
                <Bug size={14} className="text-[var(--green)] flex-shrink-0" />
                <p className="text-[11px] text-[var(--green)]">
                  This station's data will feed into your beetle risk forecast for more accurate predictions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          {step === 'device' ? (
            <button onClick={onClose} className="text-xs text-[var(--text3)] hover:text-[var(--text)] transition-colors">Cancel</button>
          ) : (
            <button
              onClick={() => {
                const steps: PairStep[] = ['device', 'connection', 'location', 'confirm'];
                const idx = steps.indexOf(step);
                if (idx > 0) setStep(steps[idx - 1]);
              }}
              className="text-xs text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            >
              Back
            </button>
          )}

          {step !== 'confirm' ? (
            <button
              onClick={() => {
                const steps: PairStep[] = ['device', 'connection', 'location', 'confirm'];
                const idx = steps.indexOf(step);
                if (idx < steps.length - 1) setStep(steps[idx + 1]);
              }}
              disabled={step === 'device' ? !canProceedDevice : step === 'connection' ? !canProceedConnection : false}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--green)] text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--green)] text-white transition-colors hover:brightness-110 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
              {saving ? 'Setting up...' : 'Start Monitoring'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Manual Reading Entry ───

function ManualEntryForm({ onSubmit }: { onSubmit: (reading: WeatherReading) => void }) {
  const toast = useToast();
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [windDir, setWindDir] = useState('');
  const [precip, setPrecip] = useState('');
  const [pressure, setPressure] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!temp) { toast('Temperature is required', 'error'); return; }
    onSubmit({
      id: `mr-${Date.now()}`,
      temperature_c: Number(temp),
      humidity_pct: Number(humidity) || 0,
      wind_speed_ms: Number(windSpeed) || 0,
      wind_direction_deg: Number(windDir) || 0,
      precipitation_mm: Number(precip) || 0,
      pressure_hpa: Number(pressure) || 1013,
      recorded_at: new Date().toISOString(),
    });
    setTemp(''); setHumidity(''); setWindSpeed(''); setWindDir(''); setPrecip(''); setPressure('');
    toast('Reading recorded', 'success');
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <h4 className="text-xs font-semibold text-[var(--text2)] mb-2">Add Manual Reading</h4>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-[var(--text3)] block mb-0.5">Temp (C)</label>
          <input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} placeholder="7.2" className="w-full px-2 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text3)] block mb-0.5">Humidity (%)</label>
          <input type="number" value={humidity} onChange={e => setHumidity(e.target.value)} placeholder="68" className="w-full px-2 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text3)] block mb-0.5">Wind (m/s)</label>
          <input type="number" step="0.1" value={windSpeed} onChange={e => setWindSpeed(e.target.value)} placeholder="4.5" className="w-full px-2 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text3)] block mb-0.5">Wind Dir (&deg;)</label>
          <input type="number" value={windDir} onChange={e => setWindDir(e.target.value)} placeholder="180" className="w-full px-2 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text3)] block mb-0.5">Rain (mm)</label>
          <input type="number" step="0.1" value={precip} onChange={e => setPrecip(e.target.value)} placeholder="0.0" className="w-full px-2 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text3)] block mb-0.5">Pressure (hPa)</label>
          <input type="number" value={pressure} onChange={e => setPressure(e.target.value)} placeholder="1013" className="w-full px-2 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30" />
        </div>
      </div>
      <button
        type="submit"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--green)] text-white hover:brightness-110 transition-colors"
      >
        <Save size={12} /> Record
      </button>
    </form>
  );
}

// ─── Station Detail ───

function StationDetail({ station, onClose, onAddReading }: {
  station: WeatherStation;
  onClose: () => void;
  onAddReading: (stationId: string, reading: WeatherReading) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const readings = station.readings;
  const latest = readings[readings.length - 1];
  const dd = degreeDays(readings);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="relative w-full max-w-lg max-h-[85vh] rounded-xl border border-[var(--border)] bg-[var(--bg2)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{DEVICE_ICONS[station.device_type]}</span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--text)] truncate">{station.name}</h2>
              <p className="text-[10px] text-[var(--text3)]">{DEVICE_INFO[station.device_type].label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Live readings */}
          {latest && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-center">
                <Thermometer size={14} className="mx-auto text-[#ef4444] mb-1" />
                <p className="text-lg font-bold font-mono text-[var(--text)]">{latest.temperature_c}&deg;</p>
                <p className="text-[9px] text-[var(--text3)]">Temperature</p>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-center">
                <Droplets size={14} className="mx-auto text-[#3b82f6] mb-1" />
                <p className="text-lg font-bold font-mono text-[var(--text)]">{latest.humidity_pct}%</p>
                <p className="text-[9px] text-[var(--text3)]">Humidity</p>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-center">
                <Wind size={14} className="mx-auto text-[#64748b] mb-1" />
                <p className="text-lg font-bold font-mono text-[var(--text)]">{latest.wind_speed_ms}</p>
                <p className="text-[9px] text-[var(--text3)]">m/s {windLabel(latest.wind_direction_deg)}</p>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-center">
                <CloudRain size={14} className="mx-auto text-[#6366f1] mb-1" />
                <p className="text-lg font-bold font-mono text-[var(--text)]">{latest.precipitation_mm}</p>
                <p className="text-[9px] text-[var(--text3)]">mm rain</p>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-center">
                <Gauge size={14} className="mx-auto text-[#8b5cf6] mb-1" />
                <p className="text-lg font-bold font-mono text-[var(--text)]">{latest.pressure_hpa}</p>
                <p className="text-[9px] text-[var(--text3)]">hPa</p>
              </div>
              {latest.soil_temperature_c !== undefined && (
                <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-center">
                  <Leaf size={14} className="mx-auto text-[var(--green)] mb-1" />
                  <p className="text-lg font-bold font-mono text-[var(--text)]">{latest.soil_temperature_c}&deg;</p>
                  <p className="text-[9px] text-[var(--text3)]">Soil temp</p>
                </div>
              )}
            </div>
          )}

          {/* 24h charts */}
          {readings.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">24-Hour Trends</h3>
              <MiniBarChart readings={readings} field="temperature_c" color="#ef4444" label="Temperature" unit="\u00b0C" />
              <MiniBarChart readings={readings} field="humidity_pct" color="#3b82f6" label="Humidity" unit="%" />
              <MiniBarChart readings={readings} field="wind_speed_ms" color="#64748b" label="Wind Speed" unit=" m/s" />
            </div>
          )}

          {/* Degree-day accumulation */}
          <div className="p-3 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5">
            <div className="flex items-center gap-2 mb-1">
              <Bug size={14} className="text-[var(--green)]" />
              <h4 className="text-xs font-semibold text-[var(--green)]">Degree-Day Accumulation (24h)</h4>
            </div>
            <p className="text-2xl font-bold font-mono text-[var(--green)]">{dd} DD</p>
            <p className="text-[10px] text-[var(--text3)] mt-1">
              Base threshold: 5&deg;C. This data feeds into your beetle risk forecast for more accurate predictions.
            </p>
          </div>

          {/* 7-day history table */}
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text2)] mb-2"
            >
              <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              7-Day History
            </button>
            {showHistory && (
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-[var(--bg)]">
                      <th className="text-left px-2 py-1.5 font-semibold text-[var(--text3)]">Time</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-[var(--text3)]">Temp</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-[var(--text3)]">Hum</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-[var(--text3)]">Wind</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-[var(--text3)]">Rain</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-[var(--text3)]">Press</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {readings.slice(-24).map(r => (
                      <tr key={r.id} className="hover:bg-[var(--bg3)]/30">
                        <td className="px-2 py-1 text-[var(--text2)]">{formatDateTime(r.recorded_at)}</td>
                        <td className="px-2 py-1 text-right font-mono text-[var(--text)]">{r.temperature_c}&deg;</td>
                        <td className="px-2 py-1 text-right font-mono text-[var(--text)]">{r.humidity_pct}%</td>
                        <td className="px-2 py-1 text-right font-mono text-[var(--text)]">{r.wind_speed_ms} {windLabel(r.wind_direction_deg)}</td>
                        <td className="px-2 py-1 text-right font-mono text-[var(--text)]">{r.precipitation_mm}</td>
                        <td className="px-2 py-1 text-right font-mono text-[var(--text)]">{r.pressure_hpa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manual entry */}
          {station.device_type === 'manual' && (
            <ManualEntryForm onSubmit={(reading) => onAddReading(station.id, reading)} />
          )}

          {/* Wingman link */}
          <Link
            to="/owner/wingman"
            className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg3)]/50 transition-colors"
          >
            <Sparkles size={14} className="text-[var(--green)]" />
            <span className="text-xs font-medium text-[var(--text)]">Ask Wingman about my weather data</span>
            <ChevronRight size={14} className="ml-auto text-[var(--text3)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function WeatherStationPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const [stations, setStations] = useState<WeatherStation[]>(DEMO_STATIONS);
  const [showPairWizard, setShowPairWizard] = useState(false);
  const [selectedStation, setSelectedStation] = useState<WeatherStation | null>(null);

  const handleCreate = useCallback((station: WeatherStation) => {
    setStations(prev => [...prev, station]);
  }, []);

  const handleAddReading = useCallback((stationId: string, reading: WeatherReading) => {
    setStations(prev => prev.map(s => {
      if (s.id !== stationId) return s;
      return {
        ...s,
        readings: [...s.readings, reading],
        last_reading: reading,
        last_reading_at: reading.recorded_at,
      };
    }));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
              <Radio size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Weather Stations</h1>
              <p className="text-[11px] text-[var(--text3)]">Connect and monitor your local weather sensors</p>
            </div>
          </div>
          <button
            onClick={() => setShowPairWizard(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--green)] text-white hover:brightness-110 transition-colors"
          >
            <Plus size={14} /> Pair
          </button>
        </div>

        {/* Station cards */}
        {stations.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] px-6 py-12 text-center" style={{ background: 'var(--bg2)' }}>
            <Radio size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-40" />
            <p className="text-sm font-medium text-[var(--text)]">No weather stations connected</p>
            <p className="text-xs text-[var(--text3)] mt-1 mb-4">Connect a station for hyper-local weather and beetle forecasts</p>
            <button
              onClick={() => setShowPairWizard(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--green)] text-white hover:brightness-110 transition-colors"
            >
              <Plus size={14} /> Pair your first station
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {stations.map(station => {
              const latest = station.readings[station.readings.length - 1];
              const statusCfg = STATUS_CONFIG[station.status];

              return (
                <button
                  key={station.id}
                  onClick={() => setSelectedStation(station)}
                  className="w-full rounded-xl border border-[var(--border)] overflow-hidden text-left hover:border-[var(--green)]/30 transition-colors"
                  style={{ background: 'var(--bg2)' }}
                >
                  {/* Station header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg flex-shrink-0">{DEVICE_ICONS[station.device_type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-[var(--text)] truncate">{station.name}</p>
                        {/* Status pulse */}
                        <span className="relative flex h-2.5 w-2.5">
                          {station.status === 'connected' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: statusCfg.color }} />
                          )}
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: statusCfg.color }} />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[var(--text3)]">{DEVICE_INFO[station.device_type].label}</span>
                        {station.last_reading_at && (
                          <>
                            <span className="text-[10px] text-[var(--text3)]">&middot;</span>
                            <span className="text-[10px] text-[var(--text3)]">
                              <Clock size={9} className="inline mr-0.5" />
                              {formatDateTime(station.last_reading_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[var(--text3)] flex-shrink-0" />
                  </div>

                  {/* Live readings strip */}
                  {latest && (
                    <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg)]">
                      <div className="flex items-center gap-1">
                        <Thermometer size={12} className="text-[#ef4444]" />
                        <span className="text-xs font-bold font-mono text-[var(--text)]">{latest.temperature_c}&deg;C</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Droplets size={12} className="text-[#3b82f6]" />
                        <span className="text-xs font-mono text-[var(--text)]">{latest.humidity_pct}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wind size={12} className="text-[#64748b]" />
                        <span className="text-xs font-mono text-[var(--text)]">{latest.wind_speed_ms} m/s {windLabel(latest.wind_direction_deg)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CloudRain size={12} className="text-[#6366f1]" />
                        <span className="text-xs font-mono text-[var(--text)]">{latest.precipitation_mm} mm</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {stations.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg border border-[var(--border)] px-3 py-2.5 text-center" style={{ background: 'var(--bg2)' }}>
              <p className="text-lg font-bold font-mono text-[var(--text)]">{stations.length}</p>
              <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Stations</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] px-3 py-2.5 text-center" style={{ background: 'var(--bg2)' }}>
              <p className="text-lg font-bold font-mono" style={{ color: '#16a34a' }}>{stations.filter(s => s.status === 'connected').length}</p>
              <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Online</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] px-3 py-2.5 text-center" style={{ background: 'var(--bg2)' }}>
              <p className="text-lg font-bold font-mono" style={{ color: '#6b7280' }}>{stations.filter(s => s.status !== 'connected').length}</p>
              <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Offline</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPairWizard && <PairWizard onClose={() => setShowPairWizard(false)} onCreate={handleCreate} />}
      {selectedStation && (
        <StationDetail
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          onAddReading={handleAddReading}
        />
      )}
    </div>
  );
}
