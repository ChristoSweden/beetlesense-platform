import { useState, useEffect } from 'react';
import {
  TreePine,
  Minus,
  Plus,
  MapPin,
  Save,
  X,
  Ruler,
  ArrowUpFromLine,
  Clock,
  Heart,
  AlertTriangle,
  Bug,
  Skull,
} from 'lucide-react';

// ─── Types ───

type Species = 'gran' | 'tall' | 'björk' | 'ek' | 'bok' | 'asp';
type HealthStatus = 'healthy' | 'stressed' | 'infested' | 'dead';

interface TreeRecord {
  id: string;
  species: Species;
  dbh: number;
  height: number;
  age: number;
  health: HealthStatus;
  notes: string;
  lat: number | null;
  lng: number | null;
  timestamp: Date;
}

interface TreeMeasurementProps {
  onSave?: (record: TreeRecord) => void;
  onClose?: () => void;
}

// ─── Species data ───

const SPECIES: { value: Species; label: string; icon: string }[] = [
  { value: 'gran', label: 'Gran', icon: '🌲' },
  { value: 'tall', label: 'Tall', icon: '🌲' },
  { value: 'björk', label: 'Björk', icon: '🌳' },
  { value: 'ek', label: 'Ek', icon: '🌳' },
  { value: 'bok', label: 'Bok', icon: '🌳' },
  { value: 'asp', label: 'Asp', icon: '🌳' },
];

const HEALTH_OPTIONS: { value: HealthStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'healthy', label: 'Friskt', icon: <Heart size={18} />, color: 'text-green-400 border-green-700 bg-green-950' },
  { value: 'stressed', label: 'Stressat', icon: <AlertTriangle size={18} />, color: 'text-yellow-400 border-yellow-700 bg-yellow-950' },
  { value: 'infested', label: 'Angripet', icon: <Bug size={18} />, color: 'text-orange-400 border-orange-700 bg-orange-950' },
  { value: 'dead', label: 'Dött', icon: <Skull size={18} />, color: 'text-red-400 border-red-700 bg-red-950' },
];

// ─── Stepper component ───

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  label,
  icon,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
  icon: React.ReactNode;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
        {icon}
        {label}
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={dec}
          className="w-[52px] h-[52px] rounded-xl bg-gray-800 border border-gray-700 text-white flex items-center justify-center active:bg-gray-700 transition"
        >
          <Minus size={24} />
        </button>
        <div className="text-center">
          <span className="text-3xl font-bold text-white">{value}</span>
          <span className="text-gray-400 text-lg ml-1">{unit}</span>
        </div>
        <button
          onClick={inc}
          className="w-[52px] h-[52px] rounded-xl bg-gray-800 border border-gray-700 text-white flex items-center justify-center active:bg-gray-700 transition"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}

// ─── TreeMeasurement ───

export default function TreeMeasurement({ onSave, onClose }: TreeMeasurementProps) {
  const [species, setSpecies] = useState<Species>('gran');
  const [dbh, setDbh] = useState(25);
  const [height, setHeight] = useState(18);
  const [age, setAge] = useState(60);
  const [health, setHealth] = useState<HealthStatus>('healthy');
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  const handleSave = () => {
    const record: TreeRecord = {
      id: crypto.randomUUID(),
      species,
      dbh,
      height,
      age,
      health,
      notes,
      lat: gps?.lat ?? null,
      lng: gps?.lng ?? null,
      timestamp: new Date(),
    };
    onSave?.(record);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <TreePine size={22} className="text-green-400" />
          Mät träd
        </h2>
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-gray-800 text-white min-w-[48px] min-h-[48px] flex items-center justify-center"
        >
          <X size={24} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-5">
        {/* GPS */}
        <div className="flex items-center gap-2 text-sm font-mono text-green-400">
          <MapPin size={14} />
          {gps ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : 'Söker GPS-position...'}
        </div>

        {/* Species selector */}
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Trädslag</label>
          <div className="grid grid-cols-3 gap-2">
            {SPECIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSpecies(s.value)}
                className={`p-3 rounded-xl border text-center min-h-[52px] transition font-medium ${
                  species === s.value
                    ? 'bg-green-900/60 border-green-500 text-green-300'
                    : 'bg-gray-900 border-gray-700 text-gray-300 active:bg-gray-800'
                }`}
              >
                <span className="text-xl block">{s.icon}</span>
                <span className="text-sm">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* DBH */}
        <NumberStepper
          value={dbh}
          onChange={setDbh}
          min={1}
          max={200}
          step={1}
          unit="cm"
          label="DBH (diameter i brösthöjd)"
          icon={<Ruler size={16} />}
        />

        {/* Height */}
        <NumberStepper
          value={height}
          onChange={setHeight}
          min={1}
          max={60}
          step={0.5}
          unit="m"
          label="Höjd"
          icon={<ArrowUpFromLine size={16} />}
        />

        {/* Age slider */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <Clock size={16} />
            Uppskattad ålder
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-xs">10 år</span>
            <span className="text-2xl font-bold text-white">{age} år</span>
            <span className="text-gray-500 text-xs">200 år</span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        {/* Health assessment */}
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Hälsostatus</label>
          <div className="grid grid-cols-2 gap-2">
            {HEALTH_OPTIONS.map((h) => (
              <button
                key={h.value}
                onClick={() => setHealth(h.value)}
                className={`flex items-center gap-2 p-3 rounded-xl border min-h-[52px] transition font-medium ${
                  health === h.value ? h.color : 'bg-gray-900 border-gray-700 text-gray-400 active:bg-gray-800'
                }`}
              >
                {h.icon}
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Anteckningar</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Beskriv observationer..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-600 resize-none focus:outline-none focus:border-green-600"
          />
        </div>
      </div>

      {/* Save button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
        <button
          onClick={handleSave}
          className="w-full py-4 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 min-h-[56px] transition text-lg"
        >
          <Save size={22} />
          Spara mätning
        </button>
      </div>
    </div>
  );
}
