import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Plane,
  Plus,
  Trash2,
  Shield,
  MapPin,
  Calendar,
  FileCheck,
  CreditCard,
  Edit3,
  Save,
  X,
  Battery,
  Camera,
  Timer,
  Award,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                         */
/* ------------------------------------------------------------------ */

interface Drone {
  id: string;
  model: string;
  serial: string;
  sensors: string[];
  maxFlightTime: number;
}

interface Certification {
  id: string;
  name: string;
  category: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  operatorId?: string;
}

const SWEDISH_COUNTIES = [
  'Blekinge', 'Dalarna', 'Gotland', 'Gävleborg', 'Halland',
  'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten',
  'Skåne', 'Stockholm', 'Södermanland', 'Uppsala', 'Värmland',
  'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland',
  'Örebro', 'Östergötland',
];

const INITIAL_DRONES: Drone[] = [
  { id: 'd1', model: 'DJI Matrice 350 RTK', serial: 'DJI-M350-2024-SE001', sensors: ['RGB', 'Multispectral', 'LiDAR'], maxFlightTime: 55 },
  { id: 'd2', model: 'DJI Mavic 3 Enterprise', serial: 'DJI-M3E-2025-SE042', sensors: ['RGB', 'Thermal'], maxFlightTime: 45 },
];

const INITIAL_CERTS: Certification[] = [
  { id: 'c1', name: 'UAS Remote Pilot Certificate', category: 'A2', issuer: 'Transportstyrelsen', issueDate: '2024-06-15', expiryDate: '2029-06-15', operatorId: 'SWE-OP-2024-04821' },
  { id: 'c2', name: 'STS-01 Scenario Authorization', category: 'Specific', issuer: 'Transportstyrelsen', issueDate: '2025-01-10', expiryDate: '2027-01-10' },
  { id: 'c3', name: 'A1/A3 Online Certificate', category: 'A1/A3', issuer: 'Transportstyrelsen', issueDate: '2024-03-20', expiryDate: '2029-03-20' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PilotSettingsPage() {
  const [drones, setDrones] = useState<Drone[]>(INITIAL_DRONES);
  const [certs] = useState<Certification[]>(INITIAL_CERTS);
  const [selectedCounties, setSelectedCounties] = useState<Set<string>>(
    new Set(['Jönköping', 'Kronoberg', 'Kalmar']),
  );
  const [availability, setAvailability] = useState<Set<string>>(
    new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
  );
  const [insuranceProvider, setInsuranceProvider] = useState('Länsförsäkringar');
  const [insurancePolicy, setInsurancePolicy] = useState('UAS-2025-SE-44821');
  const [insuranceExpiry, setInsuranceExpiry] = useState('2027-04-01');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'swish'>('bank');
  const [bankClearing, setBankClearing] = useState('6789');
  const [bankAccount, setBankAccount] = useState('123 456 789');
  const [swishNumber, setSwishNumber] = useState('');
  const [editingDrone, setEditingDrone] = useState<string | null>(null);
  const [showAddDrone, setShowAddDrone] = useState(false);
  const [newDrone, setNewDrone] = useState({ model: '', serial: '', sensors: '', maxFlightTime: '' });

  const toggleCounty = (county: string) => {
    const next = new Set(selectedCounties);
    if (next.has(county)) { next.delete(county); } else { next.add(county); }
    setSelectedCounties(next);
  };

  const toggleDay = (day: string) => {
    const next = new Set(availability);
    if (next.has(day)) { next.delete(day); } else { next.add(day); }
    setAvailability(next);
  };

  const addDrone = () => {
    if (!newDrone.model || !newDrone.serial) return;
    setDrones([
      ...drones,
      {
        id: `d${Date.now()}`,
        model: newDrone.model,
        serial: newDrone.serial,
        sensors: newDrone.sensors.split(',').map((s) => s.trim()).filter(Boolean),
        maxFlightTime: parseInt(newDrone.maxFlightTime) || 30,
      },
    ]);
    setNewDrone({ model: '', serial: '', sensors: '', maxFlightTime: '' });
    setShowAddDrone(false);
  };

  const removeDrone = (id: string) => {
    setDrones(drones.filter((d) => d.id !== id));
  };

  const isExpiringSoon = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 180 * 24 * 60 * 60 * 1000; // 6 months
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/pilot/dashboard" className="hover:text-[var(--text2)]">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Pilot Settings</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-1">Pilot Settings</h1>
      <p className="text-xs text-[var(--text3)] mb-6">Manage your drones, certifications, and availability</p>

      {/* ---- Drone Fleet ---- */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Plane size={16} className="text-[var(--green)]" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Drone Fleet</h2>
          </div>
          <button
            onClick={() => setShowAddDrone(true)}
            className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:underline"
          >
            <Plus size={12} /> Add Drone
          </button>
        </div>

        <div className="space-y-3">
          {drones.map((drone) => (
            <div key={drone.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">{drone.model}</p>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5">S/N: {drone.serial}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingDrone(editingDrone === drone.id ? null : drone.id)}
                    className="p-1 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text2)]"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => removeDrone(drone.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-[var(--text3)] hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                  <Camera size={9} />{drone.sensors.join(', ')}
                </span>
                <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                  <Timer size={9} />{drone.maxFlightTime} min max
                </span>
                <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                  <Battery size={9} />Ready
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Add Drone Form */}
        {showAddDrone && (
          <div className="mt-3 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5 p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[var(--text)]">Add New Drone</p>
              <button onClick={() => setShowAddDrone(false)} className="text-[var(--text3)] hover:text-[var(--text2)]">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <input
                type="text"
                placeholder="Model (e.g. DJI Matrice 350)"
                value={newDrone.model}
                onChange={(e) => setNewDrone({ ...newDrone, model: e.target.value })}
                className="bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
              />
              <input
                type="text"
                placeholder="Serial number"
                value={newDrone.serial}
                onChange={(e) => setNewDrone({ ...newDrone, serial: e.target.value })}
                className="bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
              />
              <input
                type="text"
                placeholder="Sensors (comma separated)"
                value={newDrone.sensors}
                onChange={(e) => setNewDrone({ ...newDrone, sensors: e.target.value })}
                className="bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
              />
              <input
                type="number"
                placeholder="Max flight time (min)"
                value={newDrone.maxFlightTime}
                onChange={(e) => setNewDrone({ ...newDrone, maxFlightTime: e.target.value })}
                className="bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
              />
            </div>
            <button
              onClick={addDrone}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--green)] text-white text-xs rounded-lg hover:bg-[var(--green)]/90 transition-colors"
            >
              <Save size={12} /> Save Drone
            </button>
          </div>
        )}
      </section>

      {/* ---- Certifications ---- */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-amber-400" />
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Certifications</h2>
        </div>

        <div className="space-y-3">
          {certs.map((cert) => (
            <div key={cert.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">{cert.name}</p>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5">
                    {cert.issuer} — Category {cert.category}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {isExpiringSoon(cert.expiryDate) ? (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      <AlertCircle size={8} /> Renew soon
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 size={8} /> Valid
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="text-[10px] text-[var(--text3)]">
                  Issued: {cert.issueDate}
                </span>
                <span className="text-[10px] text-[var(--text3)]">
                  Expires: {cert.expiryDate}
                </span>
                {cert.operatorId && (
                  <span className="text-[10px] text-[var(--green)] font-mono">
                    ID: {cert.operatorId}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Service Area ---- */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-[var(--green)]" />
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Service Area</h2>
          <span className="text-[9px] text-[var(--text3)] ml-auto">{selectedCounties.size} of 21 counties</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SWEDISH_COUNTIES.map((county) => (
            <button
              key={county}
              onClick={() => toggleCounty(county)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                selectedCounties.has(county)
                  ? 'bg-[var(--green)]/15 border-[var(--green)]/30 text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)] hover:border-[var(--text3)]'
              }`}
            >
              {county}
            </button>
          ))}
        </div>
      </section>

      {/* ---- Availability ---- */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-[var(--green)]" />
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Availability</h2>
        </div>
        <p className="text-[10px] text-[var(--text3)] mb-3">Select days you are generally available for missions</p>
        <div className="flex gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium text-center transition-colors ${
                availability.has(day)
                  ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                  : 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text2)]'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </section>

      {/* ---- Insurance ---- */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-blue-400" />
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Insurance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">Provider</label>
            <input
              type="text"
              value={insuranceProvider}
              onChange={(e) => setInsuranceProvider(e.target.value)}
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">Policy Number</label>
            <input
              type="text"
              value={insurancePolicy}
              onChange={(e) => setInsurancePolicy(e.target.value)}
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">Expiry Date</label>
            <input
              type="date"
              value={insuranceExpiry}
              onChange={(e) => setInsuranceExpiry(e.target.value)}
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
            />
          </div>
        </div>
        <p className="text-[10px] text-[var(--text3)] mt-2 flex items-center gap-1">
          <FileCheck size={10} />
          UAS liability insurance is required for all commercial operations in Sweden.
        </p>
      </section>

      {/* ---- Payment Details ---- */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-amber-400" />
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Payment Details</h2>
        </div>

        <div className="flex gap-2 mb-4">
          {(['bank', 'swish'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`text-xs px-4 py-1.5 rounded-lg border transition-colors ${
                paymentMethod === method
                  ? 'bg-[var(--green)]/15 border-[var(--green)]/30 text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {method === 'bank' ? 'Bank Transfer' : 'Swish'}
            </button>
          ))}
        </div>

        {paymentMethod === 'bank' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">Clearing Number</label>
              <input
                type="text"
                value={bankClearing}
                onChange={(e) => setBankClearing(e.target.value)}
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">Account Number</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
              />
            </div>
          </div>
        ) : (
          <div className="max-w-xs">
            <label className="text-[10px] text-[var(--text3)] block mb-1">Swish Number</label>
            <input
              type="text"
              placeholder="07X-XXX XX XX"
              value={swishNumber}
              onChange={(e) => setSwishNumber(e.target.value)}
              className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] font-mono placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
            />
          </div>
        )}
      </section>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-1.5 px-5 py-2 bg-[var(--green)] text-white text-xs font-medium rounded-lg hover:bg-[var(--green)]/90 transition-colors">
          <Save size={14} /> Save Settings
        </button>
      </div>
    </div>
  );
}
