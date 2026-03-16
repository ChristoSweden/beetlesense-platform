import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_JOBS } from '@/lib/demoData';
import maplibregl from 'maplibre-gl';
import {
  List,
  Map as MapIcon,
  MapPin,
  Calendar,
  Ruler,
  Filter,
  Clock,
  ChevronRight,
  Loader2,
  Cpu,
} from 'lucide-react';

// ─── Types ───

export interface Job {
  id: string;
  title: string;
  parcel_name: string;
  location: string;
  coordinates: [number, number];
  area_ha: number;
  required_modules: string[];
  deadline: string;
  fee_sek: number;
  status: 'open' | 'assigned' | 'completed';
  created_at: string;
}

type ViewMode = 'list' | 'map';

const DISTANCE_OPTIONS = [
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 200, label: '200 km' },
];

const MODULE_OPTIONS = ['RGB Ortho', 'Multispectral', 'Thermal', 'LiDAR', '3D Model'];

// ─── Component ───

export function JobBoard() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [newJobIds, setNewJobIds] = useState<Set<string>>(new Set());

  // Filters
  const [distanceFilter, setDistanceFilter] = useState<number>(200);
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    // Demo mode — use static demo jobs
    if (isDemo()) {
      setJobs(
        DEMO_JOBS.filter((j) => j.status === 'open').map((j) => ({
          id: j.id,
          title: j.title,
          parcel_name: j.parcel_name,
          location: j.municipality,
          coordinates: [0, 0] as [number, number],
          area_ha: j.area_hectares,
          required_modules: j.modules,
          deadline: j.deadline,
          fee_sek: j.fee_sek,
          status: j.status as 'open',
          created_at: '2026-03-14T08:00:00Z',
        })),
      );
      setLoading(false);
      return;
    }

    async function loadJobs() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setJobs(data as Job[]);
      }
      setLoading(false);
    }

    loadJobs();

    // Realtime subscription for new jobs
    const channel = supabase
      .channel('new-jobs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jobs' },
        (payload) => {
          const newJob = payload.new as Job;
          setJobs((prev) => [newJob, ...prev]);
          setNewJobIds((prev) => new Set([...prev, newJob.id]));
          // Remove pulse after 5s
          setTimeout(() => {
            setNewJobIds((prev) => {
              const next = new Set(prev);
              next.delete(newJob.id);
              return next;
            });
          }, 5000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (moduleFilter && !job.required_modules.includes(moduleFilter)) return false;
      if (dateFrom && job.deadline < dateFrom) return false;
      if (dateTo && job.deadline > dateTo) return false;
      return true;
    });
  }, [jobs, moduleFilter, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg text-xs transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                : 'text-[var(--text3)] hover:text-[var(--text2)] border border-[var(--border)]'
            }`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-lg text-xs transition-colors ${
              viewMode === 'map'
                ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                : 'text-[var(--text3)] hover:text-[var(--text2)] border border-[var(--border)]'
            }`}
          >
            <MapIcon size={16} />
          </button>
          <span className="text-xs text-[var(--text3)] ml-2">
            {filteredJobs.length} mission{filteredJobs.length !== 1 ? 's' : ''} available
          </span>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs border transition-colors ${
            showFilters
              ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
              : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          <Filter size={12} />
          Filters
        </button>
      </div>

      {/* ─── Filters ─── */}
      {showFilters && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block">
              <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
                Distance
              </span>
              <select
                value={distanceFilter}
                onChange={(e) => setDistanceFilter(Number(e.target.value))}
                className="input-field text-xs"
              >
                {DISTANCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
                Module
              </span>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="input-field text-xs"
              >
                <option value="">All modules</option>
                {MODULE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
                From
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field text-xs"
              />
            </label>

            <label className="block">
              <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
                To
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field text-xs"
              />
            </label>
          </div>
        </div>
      )}

      {/* ─── Content ─── */}
      {viewMode === 'list' ? (
        <JobListView jobs={filteredJobs} newJobIds={newJobIds} />
      ) : (
        <JobMapView jobs={filteredJobs} newJobIds={newJobIds} />
      )}
    </div>
  );
}

// ─── List View ───

function JobListView({ jobs, newJobIds }: { jobs: Job[]; newJobIds: Set<string> }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
        <MapPin size={24} className="mx-auto text-[var(--text3)] mb-2" />
        <p className="text-sm text-[var(--text2)]">No missions match your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Link
          key={job.id}
          to={`/pilot/jobs/${job.id}`}
          className={`block rounded-xl border bg-[var(--bg2)] p-4 hover:bg-[var(--bg3)] transition-all group ${
            newJobIds.has(job.id)
              ? 'border-[var(--green)]/50 animate-pulse'
              : 'border-[var(--border)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[var(--text)] truncate">
                  {job.parcel_name}
                </h3>
                {newJobIds.has(job.id) && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--green)] text-[var(--bg)] uppercase">
                    New
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text3)]">
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Ruler size={10} />
                  {job.area_ha} ha
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(job.deadline).toLocaleDateString('sv-SE')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {timeAgo(job.created_at)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.required_modules.map((mod) => (
                  <span
                    key={mod}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)]"
                  >
                    {mod}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-base font-semibold font-mono text-[var(--green)]">
                {job.fee_sek.toLocaleString('sv-SE')} kr
              </p>
              <ChevronRight
                size={14}
                className="text-[var(--text3)] group-hover:text-[var(--green)] transition-colors ml-auto mt-1"
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Map View ───

function JobMapView({ jobs, newJobIds }: { jobs: Job[]; newJobIds: Set<string> }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'BeetleSense Dark',
        sources: {
          'osm-raster': {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#030d05' } },
          {
            id: 'osm-raster',
            type: 'raster',
            source: 'osm-raster',
            paint: {
              'raster-saturation': -0.8,
              'raster-brightness-max': 0.35,
              'raster-brightness-min': 0.0,
              'raster-contrast': 0.2,
              'raster-hue-rotate': 90,
            },
          },
        ],
      },
      center: [15.0, 57.2],
      zoom: 6,
      attributionControl: false,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when jobs change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers: maplibregl.Marker[] = [];

    const addMarkers = () => {
      // Clear old markers
      markers.forEach((m) => m.remove());
      markers.length = 0;

      jobs.forEach((job) => {
        if (!job.coordinates) return;

        const el = document.createElement('div');
        el.className = 'job-marker';
        el.style.cssText = `
          width: 16px; height: 16px; border-radius: 50%;
          background: ${newJobIds.has(job.id) ? '#4ade80' : 'rgba(74,222,128,0.6)'};
          border: 2px solid #4ade80;
          cursor: pointer;
          ${newJobIds.has(job.id) ? 'animation: pulse 1.5s infinite;' : ''}
        `;

        const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(`
          <div style="font-family: var(--font-sans); min-width: 160px;">
            <strong style="font-size: 12px;">${job.parcel_name}</strong>
            <p style="font-size: 11px; opacity: 0.7; margin: 2px 0;">${job.location} &middot; ${job.area_ha} ha</p>
            <p style="font-size: 13px; font-weight: 600; color: #4ade80; margin-top: 4px;">${job.fee_sek.toLocaleString('sv-SE')} kr</p>
            <a href="/pilot/jobs/${job.id}" style="font-size: 10px; color: #4ade80; text-decoration: underline;">View details</a>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(job.coordinates)
          .setPopup(popup)
          .addTo(map);

        markers.push(marker);
      });
    };

    if (map.loaded()) {
      addMarkers();
    } else {
      map.on('load', addMarkers);
    }

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [jobs, newJobIds]);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ height: 500 }}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
