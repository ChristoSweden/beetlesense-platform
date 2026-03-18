import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  Download,
  Filter,
  Plane,
  Clock,
  TreePine,
  Ruler,
  BarChart3,
  Award,
  ArrowUpDown,
  Search,
  ChevronLeft,
  Camera,
  Loader2,
} from 'lucide-react';
import { useDjiFleet, type DjiMission } from '@/hooks/useDjiFleet';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface FlightRecord {
  id: string;
  date: string;
  parcel: string;
  location: string;
  duration: number; // minutes
  area: number; // hectares
  altitude: number; // meters
  photos: number;
  status: 'completed' | 'failed' | 'cancelled';
  drone: string;
  sensors: string[];
}

function missionToFlight(m: DjiMission, aircraftMap: Map<string, string>): FlightRecord | null {
  // Only include finished missions
  if (!['completed', 'failed', 'cancelled'].includes(m.status)) return null;

  const startDate = m.startedAt ?? m.completedAt ?? m.createdAt;
  let durationMin = m.estimatedDurationMin ?? 0;
  if (m.startedAt && m.completedAt) {
    durationMin = Math.round(
      (new Date(m.completedAt).getTime() - new Date(m.startedAt).getTime()) / 60000,
    );
  }

  return {
    id: m.id,
    date: startDate ? new Date(startDate).toISOString().slice(0, 10) : '-',
    parcel: m.parcelName ?? m.name,
    location: m.parcelName ?? '-',
    duration: durationMin,
    area: m.coverageAreaHa ?? 0,
    altitude: m.altitudeM,
    photos: m.mediaCount || m.estimatedPhotos || 0,
    status: m.status as 'completed' | 'failed' | 'cancelled',
    drone: m.aircraftName ?? aircraftMap.get(m.aircraftId ?? '') ?? '-',
    sensors: m.sensorsEnabled,
  };
}

const STATUS_LABELS: Record<FlightRecord['status'], string> = {
  completed: 'Slutförd',
  failed: 'Misslyckad',
  cancelled: 'Avbruten',
};

const STATUS_COLORS: Record<FlightRecord['status'], string> = {
  completed: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-amber-500/20 text-amber-400',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FlightLogPage() {
  const { missions, aircraft, loading } = useDjiFleet();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FlightRecord['status'] | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [droneFilter, setDroneFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'area' | 'duration'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [chartMode, setChartMode] = useState<'flights' | 'area'>('flights');

  // Build aircraft lookup
  const aircraftMap = useMemo(
    () => new Map(aircraft.map((a) => [a.id, a.modelName])),
    [aircraft],
  );

  // All drone names for filter dropdown
  const droneNames = useMemo(() => {
    const names = new Set<string>();
    aircraft.forEach((a) => names.add(a.modelName));
    return Array.from(names).sort();
  }, [aircraft]);

  // Convert missions to flight records
  const allFlights: FlightRecord[] = useMemo(
    () => missions.map((m) => missionToFlight(m, aircraftMap)).filter(Boolean) as FlightRecord[],
    [missions, aircraftMap],
  );

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...allFlights];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.parcel.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q) ||
          f.drone.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((f) => f.status === statusFilter);
    }

    if (droneFilter !== 'all') {
      result = result.filter((f) => f.drone === droneFilter);
    }

    if (dateFrom) {
      result = result.filter((f) => f.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((f) => f.date <= dateTo);
    }

    result.sort((a, b) => {
      const av = sortField === 'date' ? a.date : sortField === 'area' ? a.area : a.duration;
      const bv = sortField === 'date' ? b.date : sortField === 'area' ? b.area : b.duration;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allFlights, searchQuery, statusFilter, droneFilter, dateFrom, dateTo, sortField, sortDir]);

  // Summary stats
  const totalFlights = allFlights.length;
  const totalHours = allFlights.reduce((s, f) => s + f.duration, 0) / 60;
  const totalArea = allFlights.reduce((s, f) => s + f.area, 0);
  const totalPhotos = allFlights.reduce((s, f) => s + f.photos, 0);

  // Monthly activity chart data (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; flights: number; area: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('sv-SE', { month: 'short' });
      const matching = allFlights.filter((f) => f.date.startsWith(key));
      months.push({
        month: label.charAt(0).toUpperCase() + label.slice(1),
        flights: matching.length,
        area: matching.reduce((s, f) => s + f.area, 0),
      });
    }
    return months;
  }, [allFlights]);

  // Certification renewal tracking
  const certExpiryDate = new Date('2029-06-15');
  const now = new Date();
  const daysUntilRenewal = Math.ceil((certExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const exportCSV = () => {
    const headers = ['Datum', 'Skifte', 'Plats', 'Tid (min)', 'Yta (ha)', 'Höjd (m)', 'Foton', 'Status', 'Drönare', 'Sensorer'];
    const rows = filtered.map((f) => [
      f.date, f.parcel, f.location, f.duration, f.area, f.altitude, f.photos, f.status, f.drone, f.sensors.join('+'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flyglogg-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxBarValue = Math.max(1, ...monthlyData.map((m) => (chartMode === 'flights' ? m.flights : m.area)));

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-6xl flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
          <p className="text-xs text-[var(--text3)]">Laddar flyglogg...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/pilot/dashboard" className="hover:text-[var(--text2)]">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Flyglogg</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">Flyglogg</h1>
          <p className="text-xs text-[var(--text3)]">Alla registrerade flygningar och efterlevnad</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 text-xs text-[var(--green)] border border-[var(--green)]/30 rounded-lg hover:bg-[var(--green)]/10 transition-colors self-start"
        >
          <Download size={14} /> Exportera CSV
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Plane, label: 'Totalt flygningar', value: `${totalFlights}` },
          { icon: Clock, label: 'Flygtimmar', value: `${totalHours.toFixed(1)} h` },
          { icon: TreePine, label: 'Kartlagd yta', value: `${totalArea.toFixed(0)} ha` },
          { icon: Camera, label: 'Totalt foton', value: totalPhotos.toLocaleString('sv-SE') },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center mb-2">
              <s.icon size={14} className="text-[var(--green)]" />
            </div>
            <p className="text-lg font-semibold font-mono text-[var(--text)]">{s.value}</p>
            <p className="text-[10px] text-[var(--text3)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[var(--green)]" />
              <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Aktivitet</h2>
            </div>
            <div className="flex items-center gap-1">
              {(['flights', 'area'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                    chartMode === m
                      ? 'bg-[var(--green)]/20 text-[var(--green)]'
                      : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  {m === 'flights' ? 'Flygningar' : 'Yta (ha)'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2 h-32">
            {monthlyData.map((m) => {
              const value = chartMode === 'flights' ? m.flights : m.area;
              const height = maxBarValue > 0 ? (value / maxBarValue) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono text-[var(--text2)]">{value}</span>
                  <div className="w-full bg-[var(--bg3)] rounded-t-md overflow-hidden" style={{ height: '100px' }}>
                    <div
                      className="w-full bg-[var(--green)]/60 rounded-t-md transition-all duration-500"
                      style={{ height: `${height}%`, marginTop: `${100 - height}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--text3)]">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance Tracker */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-amber-400" />
            <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Efterlevnad</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-1">A2-certifikat förnyelse</p>
              <p className="text-sm font-mono text-[var(--text)]">{daysUntilRenewal} dagar</p>
              <div className="w-full h-1.5 bg-[var(--bg3)] rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${Math.min(100, (daysUntilRenewal / (5 * 365)) * 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-[var(--text3)] mt-1">Utgår 2029-06-15</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-1">Flygtimmar (i år)</p>
              <p className="text-sm font-mono text-[var(--text)]">{totalHours.toFixed(1)} h</p>
              <p className="text-[9px] text-[var(--text3)] mt-1">Ingen årlig timgräns för A2-kategori</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-1">Försäkringsstatus</p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-xs text-emerald-400">Aktiv -- Länsförsäkringar</p>
              </div>
              <p className="text-[9px] text-[var(--text3)] mt-1">Utgår 2027-04-01</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="text"
              placeholder="Sök skifte, plats, drönare..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg3)] border border-[var(--border)] rounded-lg text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-[10px] text-[var(--text3)] hover:text-[var(--text2)]"
            >
              <Filter size={12} /> Filter <ChevronDown size={10} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {(['all', 'completed', 'failed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                  statusFilter === s
                    ? 'bg-[var(--green)]/20 text-[var(--green)]'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {s === 'all' ? 'Alla' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg3)] flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-[var(--text3)]">Från</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-[var(--bg2)] border border-[var(--border)] rounded px-2 py-1 text-[10px] text-[var(--text)] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-[var(--text3)]">Till</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-[var(--bg2)] border border-[var(--border)] rounded px-2 py-1 text-[10px] text-[var(--text)] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-[var(--text3)]">Drönare</label>
              <select
                value={droneFilter}
                onChange={(e) => setDroneFilter(e.target.value)}
                className="bg-[var(--bg2)] border border-[var(--border)] rounded px-2 py-1 text-[10px] text-[var(--text)] focus:outline-none"
              >
                <option value="all">Alla</option>
                {droneNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setSearchQuery(''); setDroneFilter('all'); }}
              className="text-[10px] text-[var(--text3)] hover:text-[var(--text2)] underline"
            >
              Rensa filter
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg3)]">
                {[
                  { key: 'date' as const, label: 'Datum', sortable: true },
                  { key: null, label: 'Skifte', sortable: false },
                  { key: 'duration' as const, label: 'Tid', sortable: true },
                  { key: null, label: 'Drönare', sortable: false },
                  { key: 'area' as const, label: 'Yta', sortable: true },
                  { key: null, label: 'Höjd', sortable: false },
                  { key: null, label: 'Foton', sortable: false },
                  { key: null, label: 'Sensorer', sortable: false },
                  { key: null, label: 'Status', sortable: false },
                ].map((col, i) => (
                  <th key={i} className="px-3 py-2 text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                    {col.sortable && col.key ? (
                      <button
                        onClick={() => toggleSort(col.key!)}
                        className="flex items-center gap-0.5 hover:text-[var(--text2)]"
                      >
                        {col.label}
                        <ArrowUpDown size={9} className={sortField === col.key ? 'text-[var(--green)]' : ''} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-[var(--bg3)] transition-colors group">
                  <td className="px-3 py-2.5 text-xs font-mono text-[var(--text)]">
                    <Link to={`/pilot/missions/${f.id}`} className="hover:text-[var(--green)] transition-colors">
                      {f.date}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--text)]">
                    <Link to={`/pilot/missions/${f.id}`} className="hover:text-[var(--green)] transition-colors">
                      {f.parcel}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-[var(--text)]">{f.duration} min</td>
                  <td className="px-3 py-2.5 text-[10px] text-[var(--text3)] max-w-[140px] truncate">{f.drone}</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-[var(--text)]">{f.area} ha</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-[var(--text3)]">{f.altitude} m</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-[var(--text3)]">{f.photos}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-0.5">
                      {f.sensors.map((s) => (
                        <span key={s} className="text-[7px] px-1 py-0.5 rounded bg-[var(--bg3)] text-[var(--text3)] uppercase">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[f.status]}`}>
                      {STATUS_LABELS[f.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <Plane size={20} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-xs text-[var(--text3)]">Inga flygningar matchar dina filter.</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-[10px] text-[var(--text3)]">
            Visar {filtered.length} av {allFlights.length} flygningar
          </p>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-[var(--text3)] hover:text-[var(--text2)]">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] text-[var(--text3)] px-2">Sida 1 av 1</span>
            <button className="p-1 rounded text-[var(--text3)] hover:text-[var(--text2)]">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
