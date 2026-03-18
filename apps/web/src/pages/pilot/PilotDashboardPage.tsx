import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  CheckCircle,
  Wallet,
  ChevronRight,
  MapPin,
  Calendar,
  Star,
  Plane,
  Timer,
  TreePine,
  Grid3X3,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  ThermometerSun,
  Eye,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data — all inline, no external imports                       */
/* ------------------------------------------------------------------ */

type MissionStatus = 'pending' | 'in-progress' | 'completed' | 'reviewed';

interface Mission {
  id: string;
  parcelName: string;
  location: string;
  area: number;
  status: MissionStatus;
  deadline: string;
  pay: number;
  lat: number;
  lng: number;
}

const DEMO_MISSIONS: Mission[] = [
  { id: 'm1', parcelName: 'Norrhult 3:7', location: 'Värnamo', area: 42, status: 'in-progress', deadline: '2026-03-19', pay: 3200, lat: 57.19, lng: 14.05 },
  { id: 'm2', parcelName: 'Bredaryds-Kärr 1:14', location: 'Vaggeryd', area: 28, status: 'pending', deadline: '2026-03-21', pay: 2100, lat: 57.5, lng: 14.13 },
  { id: 'm3', parcelName: 'Stockaryd 5:2', location: 'Sävsjö', area: 65, status: 'pending', deadline: '2026-03-23', pay: 4800, lat: 57.32, lng: 14.61 },
  { id: 'm4', parcelName: 'Horda 2:9', location: 'Värnamo', area: 19, status: 'completed', deadline: '2026-03-15', pay: 1500, lat: 57.18, lng: 14.02 },
  { id: 'm5', parcelName: 'Tånnö 8:3', location: 'Värnamo', area: 37, status: 'reviewed', deadline: '2026-03-12', pay: 2800, lat: 57.22, lng: 14.3 },
  { id: 'm6', parcelName: 'Rydaholm 4:1', location: 'Värnamo', area: 53, status: 'completed', deadline: '2026-03-14', pay: 4100, lat: 57.28, lng: 14.52 },
];

const DEMO_SCHEDULE: { day: string; date: string; missions: string[] }[] = [
  { day: 'Mon', date: '17 Mar', missions: ['Norrhult 3:7'] },
  { day: 'Tue', date: '18 Mar', missions: [] },
  { day: 'Wed', date: '19 Mar', missions: ['Norrhult 3:7'] },
  { day: 'Thu', date: '20 Mar', missions: [] },
  { day: 'Fri', date: '21 Mar', missions: ['Bredaryds-Kärr 1:14'] },
  { day: 'Sat', date: '22 Mar', missions: [] },
  { day: 'Sun', date: '23 Mar', missions: ['Stockaryd 5:2'] },
];

interface WeatherDay {
  day: string;
  icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'wind';
  temp: number;
  wind: number;
  flyable: boolean;
}

const DEMO_WEATHER: WeatherDay[] = [
  { day: 'Mon', icon: 'cloud', temp: 5, wind: 8, flyable: true },
  { day: 'Tue', icon: 'rain', temp: 3, wind: 14, flyable: false },
  { day: 'Wed', icon: 'sun', temp: 7, wind: 5, flyable: true },
  { day: 'Thu', icon: 'cloud', temp: 4, wind: 10, flyable: true },
  { day: 'Fri', icon: 'wind', temp: 2, wind: 18, flyable: false },
];

const STATUS_COLORS: Record<MissionStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  'in-progress': 'bg-blue-500/20 text-blue-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
  reviewed: 'bg-purple-500/20 text-purple-400',
};

const WeatherIcon = ({ type }: { type: WeatherDay['icon'] }) => {
  switch (type) {
    case 'sun': return <Sun size={18} className="text-amber-400" />;
    case 'cloud': return <Cloud size={18} className="text-gray-400" />;
    case 'rain': return <CloudRain size={18} className="text-blue-400" />;
    case 'snow': return <CloudSnow size={18} className="text-blue-200" />;
    case 'wind': return <Wind size={18} className="text-gray-300" />;
  }
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PilotDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all');

  const filtered = statusFilter === 'all'
    ? DEMO_MISSIONS
    : DEMO_MISSIONS.filter((m) => m.status === statusFilter);

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-1">
        Pilot Dashboard
      </h1>
      <p className="text-xs text-[var(--text3)] mb-6">
        Your missions, earnings, and performance at a glance
      </p>

      {/* ---- Quick Stats ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { icon: Briefcase, label: 'Active Missions', value: '3', color: 'var(--green)' },
          { icon: CheckCircle, label: 'Completed', value: '47', color: 'var(--green)' },
          { icon: Plane, label: 'Total Flights', value: '124', color: 'var(--green)' },
          { icon: Timer, label: 'Hours Flown', value: '86.5', color: 'var(--green)' },
          { icon: TreePine, label: 'Area Covered', value: '1,240 ha', color: 'var(--green)' },
          { icon: Grid3X3, label: 'Parcels Surveyed', value: '89', color: 'var(--green)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center mb-2">
              <s.icon size={16} className="text-[var(--green)]" />
            </div>
            <p className="text-lg font-semibold font-mono text-[var(--text)] leading-tight">{s.value}</p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* ---- Earnings Summary ---- */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={16} className="text-amber-400" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Earnings — March</h2>
          </div>
          <p className="text-2xl font-semibold font-mono text-[var(--text)]">12 500 kr</p>
          <p className="text-[10px] text-[var(--text3)] mt-1">8 missions completed</p>
          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text3)]">Pending payments</span>
              <span className="text-amber-400 font-mono">3 200 kr</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text3)]">Paid this month</span>
              <span className="text-emerald-400 font-mono">9 300 kr</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text3)]">Lifetime earnings</span>
              <span className="text-[var(--text)] font-mono">87 400 kr</span>
            </div>
          </div>
        </div>

        {/* ---- Rating ---- */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-amber-400" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Pilot Rating</h2>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-semibold font-mono text-[var(--text)]">4.8</p>
            <p className="text-xs text-[var(--text3)] mb-1">/ 5.0</p>
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                className={s <= 4 ? 'fill-amber-400 text-amber-400' : 'text-amber-400/40'}
              />
            ))}
            <span className="text-[10px] text-[var(--text3)] ml-1.5">23 reviews</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
            {[
              { label: 'Data quality', value: 4.9 },
              { label: 'Punctuality', value: 4.7 },
              { label: 'Communication', value: 4.8 },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text3)] w-24">{r.label}</span>
                <div className="flex-1 h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${(r.value / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--text2)]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Mission Map (placeholder) ---- */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-[var(--green)]" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Mission Locations</h2>
          </div>
          <div className="relative w-full h-40 bg-[var(--bg3)] rounded-lg flex items-center justify-center">
            {/* Stylized Sweden outline placeholder */}
            <svg viewBox="0 0 100 200" className="h-32 opacity-20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M50 10 C45 30, 35 50, 30 70 C25 90, 40 110, 45 130 C50 150, 42 170, 50 190 C55 170, 60 150, 58 130 C56 110, 70 90, 65 70 C60 50, 55 30, 50 10Z" className="text-emerald-500" />
            </svg>
            {/* Mission dots */}
            {DEMO_MISSIONS.filter((m) => m.status !== 'reviewed').map((m) => (
              <div
                key={m.id}
                className={`absolute w-2.5 h-2.5 rounded-full border border-[var(--bg2)] ${m.status === 'in-progress' ? 'bg-blue-400 animate-pulse' : m.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{
                  left: `${30 + ((m.lng - 14) * 60)}%`,
                  top: `${80 - ((m.lat - 57) * 120)}%`,
                }}
                title={m.parcelName}
              />
            ))}
          </div>
          <p className="text-[10px] text-[var(--text3)] text-center mt-2">
            Småland region — {DEMO_MISSIONS.filter((m) => m.status === 'pending' || m.status === 'in-progress').length} active missions
          </p>
        </div>
      </div>

      {/* ---- Active Missions ---- */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Missions
          </h2>
          <div className="flex items-center gap-1.5">
            {(['all', 'pending', 'in-progress', 'completed', 'reviewed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                  statusFilter === s
                    ? 'bg-[var(--green)]/20 text-[var(--green)]'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <LayoutDashboard size={20} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-xs text-[var(--text3)]">No missions with this status.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((m) => (
              <Link
                key={m.id}
                to={`/pilot/missions/${m.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg3)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-[var(--text)] truncate">{m.parcelName}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status]}`}>
                      {m.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text3)] flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-0.5"><MapPin size={9} />{m.location}</span>
                    <span className="flex items-center gap-0.5"><TreePine size={9} />{m.area} ha</span>
                    <span className="flex items-center gap-0.5"><Calendar size={9} />{m.deadline}</span>
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-xs font-mono text-[var(--text)]">{m.pay.toLocaleString('sv-SE')} kr</p>
                </div>
                <ChevronRight size={14} className="text-[var(--text3)] ml-2" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ---- Upcoming Schedule ---- */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-[var(--green)]" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Next 7 Days</h2>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DEMO_SCHEDULE.map((d) => (
              <div
                key={d.day}
                className={`rounded-lg p-2 text-center ${
                  d.missions.length > 0
                    ? 'bg-[var(--green)]/10 border border-[var(--green)]/20'
                    : 'bg-[var(--bg3)]'
                }`}
              >
                <p className="text-[9px] font-medium text-[var(--text3)] uppercase">{d.day}</p>
                <p className="text-xs font-mono text-[var(--text)] mt-0.5">{d.date.split(' ')[0]}</p>
                {d.missions.length > 0 && (
                  <div className="mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] mx-auto" />
                    <p className="text-[8px] text-[var(--green)] mt-0.5 truncate">{d.missions[0]}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ---- Weather Forecast ---- */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <ThermometerSun size={16} className="text-amber-400" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              Weather — Värnamo
            </h2>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DEMO_WEATHER.map((w) => (
              <div
                key={w.day}
                className={`rounded-lg p-2.5 text-center ${
                  w.flyable
                    ? 'bg-[var(--bg3)]'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <p className="text-[9px] font-medium text-[var(--text3)] uppercase mb-1">{w.day}</p>
                <WeatherIcon type={w.icon} />
                <p className="text-xs font-mono text-[var(--text)] mt-1">{w.temp}°C</p>
                <p className="text-[9px] text-[var(--text3)] flex items-center justify-center gap-0.5 mt-0.5">
                  <Wind size={8} />{w.wind} m/s
                </p>
                <div className="mt-1.5">
                  {w.flyable ? (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Flyable
                    </span>
                  ) : (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      No-fly
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text3)] mt-2 flex items-center gap-1">
            <Eye size={10} />
            Source: SMHI (demo) — Updated 2026-03-17 06:00
          </p>
        </div>
      </div>
    </div>
  );
}
