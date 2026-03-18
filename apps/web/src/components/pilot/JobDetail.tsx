import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePilotJobs, type PilotJob } from '@/hooks/usePilotJobs';
import maplibregl from 'maplibre-gl';
import {
  MapPin,
  Ruler,
  Calendar,
  Camera,
  Wind,
  MessageSquare,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
  Send,
} from 'lucide-react';

// ─── Types ───

interface JobDetailData extends PilotJob {
  altitude_m: number;
  overlap_pct: number;
  gsd_cm: number;
  sensor_type: string;
  weather_notes: string;
  client_notes: string;
  boundary_geojson: GeoJSON.Geometry | null;
  accepted_by: string | null;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  phase: 'pre-flight' | 'during' | 'post-flight';
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'pre-1', label: 'Verify drone firmware is up to date', checked: false, phase: 'pre-flight' },
  { id: 'pre-2', label: 'Check battery levels (min 80%)', checked: false, phase: 'pre-flight' },
  { id: 'pre-3', label: 'Confirm airspace authorization', checked: false, phase: 'pre-flight' },
  { id: 'pre-4', label: 'Review weather conditions', checked: false, phase: 'pre-flight' },
  { id: 'pre-5', label: 'Set GCP markers (if RTK unavailable)', checked: false, phase: 'pre-flight' },
  { id: 'dur-1', label: 'Maintain required altitude', checked: false, phase: 'during' },
  { id: 'dur-2', label: 'Verify overlap settings', checked: false, phase: 'during' },
  { id: 'dur-3', label: 'Monitor signal strength', checked: false, phase: 'during' },
  { id: 'dur-4', label: 'Check image capture count', checked: false, phase: 'during' },
  { id: 'post-1', label: 'Review captured images for quality', checked: false, phase: 'post-flight' },
  { id: 'post-2', label: 'Export flight log', checked: false, phase: 'post-flight' },
  { id: 'post-3', label: 'Upload data to BeetleSense', checked: false, phase: 'post-flight' },
  { id: 'post-4', label: 'Confirm all files uploaded', checked: false, phase: 'post-flight' },
];

// ─── Component ───

export function JobDetail({ jobId }: { jobId: string }) {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyFee, setApplyFee] = useState('');
  const [applying, setApplying] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [expandedPhase, setExpandedPhase] = useState<string | null>('pre-flight');
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const { apply } = usePilotJobs({ role: 'pilot' });
  const isAssignedToMe = job?.pilot_id === profile?.id;

  useEffect(() => {
    async function loadJob() {
      if (isDemo() || !isSupabaseConfigured) {
        // Demo: create a synthetic detail record
        setJob({
          id: jobId,
          title: 'Barkborreinventering — Norra Skogen',
          description: 'Flyguppdrag för Norra Skogen i Värnamo kommun.',
          parcel_id: 'p1',
          survey_id: 's1',
          owner_id: 'demo-owner-1',
          pilot_id: null,
          status: 'open',
          fee_sek: 9_400,
          location_lat: 57.186,
          location_lng: 14.044,
          modules_required: ['RGB Ortho', 'Multispectral'],
          deadline: '2026-04-01',
          created_at: '2026-03-16T08:30:00Z',
          assigned_at: null,
          completed_at: null,
          parcel_name: 'Norra Skogen',
          municipality: 'Värnamo',
          area_ha: 42.5,
          altitude_m: 120,
          overlap_pct: 75,
          gsd_cm: 2.5,
          sensor_type: 'RGB + Multispectral',
          weather_notes: 'Undvik flygning vid vindstyrka över 8 m/s',
          client_notes: 'Misstänkt angrepp i nordvästra hörnet. Prioritera det området.',
          boundary_geojson: null,
          accepted_by: null,
        } as JobDetailData);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('pilot_jobs')
        .select('*, parcels:parcel_id(name, municipality, area_ha)')
        .eq('id', jobId)
        .single();

      if (!error && data) {
        const row = data as any;
        setJob({
          ...row,
          parcel_name: row.parcels?.name ?? null,
          municipality: row.parcels?.municipality ?? null,
          area_ha: row.parcels?.area_ha ?? null,
        } as JobDetailData);
      }
      setLoading(false);
    }
    loadJob();
  }, [jobId]);

  // Mini map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !job?.location_lat || !job?.location_lng) return;

    const jobCenter: [number, number] = [job.location_lng, job.location_lat];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
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
              'raster-contrast': 0.2,
              'raster-hue-rotate': 90,
            },
          },
        ],
      },
      center: jobCenter,
      zoom: 13,
      interactive: false,
      attributionControl: false,
    });

    map.on('load', () => {
      // Add parcel boundary if available
      if (job.boundary_geojson) {
        map.addSource('parcel', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: job.boundary_geojson,
            properties: {},
          },
        });
        map.addLayer({
          id: 'parcel-fill',
          type: 'fill',
          source: 'parcel',
          paint: {
            'fill-color': '#4ade80',
            'fill-opacity': 0.15,
          },
        });
        map.addLayer({
          id: 'parcel-line',
          type: 'line',
          source: 'parcel',
          paint: {
            'line-color': '#4ade80',
            'line-width': 2,
          },
        });
      }

      // Center marker
      new maplibregl.Marker({ color: '#4ade80' })
        .setLngLat(jobCenter)
        .addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [job]);

  const handleApply = async () => {
    if (!profile || !job) return;
    setApplying(true);

    const result = await apply(
      job.id,
      applyMessage || undefined,
      applyFee ? Number(applyFee) : undefined,
    );

    if (result.success) {
      setJob({ ...job, my_application_status: 'pending' } as JobDetailData);
      setShowApplyModal(false);
      setApplyMessage('');
      setApplyFee('');
    }
    setApplying(false);
  };

  // Legacy accept handler (for backward compatibility)
  const handleAccept = async () => {
    if (!profile || !job) return;
    setAccepting(true);

    const { error } = await supabase
      .from('pilot_jobs')
      .update({ status: 'assigned', pilot_id: profile.id })
      .eq('id', job.id)
      .eq('status', 'open');

    if (!error) {
      setJob({ ...job, status: 'assigned', pilot_id: profile.id, accepted_by: profile.id });
    }
    setAccepting(false);
    setShowConfirmModal(false);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <AlertTriangle size={24} className="mx-auto text-[var(--amber)] mb-2" />
        <p className="text-sm text-[var(--text2)]">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* ─── Mini Map ─── */}
      <div
        ref={mapContainer}
        className="w-full h-48 sm:h-64 rounded-xl border border-[var(--border)] overflow-hidden"
      />

      {/* ─── Header ─── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-serif font-bold text-[var(--text)]">{job.parcel_name ?? job.title}</h2>
          <p className="text-xs text-[var(--text3)] flex items-center gap-1 mt-0.5">
            <MapPin size={10} />
            {job.municipality ?? '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold font-mono text-[var(--green)]">
            {job.fee_sek.toLocaleString('sv-SE')} kr
          </p>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${
              job.status === 'open'
                ? 'bg-[var(--green)]/10 text-[var(--green)]'
                : job.status === 'assigned'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-[var(--text3)]/10 text-[var(--text3)]'
            }`}
          >
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>
      </div>

      {/* ─── Specs Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SpecCard icon={Ruler} label="Area" value={`${job.area_ha} ha`} />
        <SpecCard icon={Camera} label="Altitude" value={`${job.altitude_m ?? '—'} m`} />
        <SpecCard icon={Camera} label="Overlap" value={`${job.overlap_pct ?? '—'}%`} />
        <SpecCard icon={Camera} label="GSD" value={`${job.gsd_cm ?? '—'} cm/px`} />
      </div>

      {/* ─── Requirements ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 space-y-3">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
          Capture Requirements
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[var(--text3)]">Sensor Type</span>
            <p className="text-[var(--text)] mt-0.5">{job.sensor_type || 'RGB'}</p>
          </div>
          <div>
            <span className="text-[var(--text3)]">Deadline</span>
            <p className="text-[var(--text)] mt-0.5 flex items-center gap-1">
              <Calendar size={10} />
              {job.deadline ? new Date(job.deadline).toLocaleDateString('sv-SE') : '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {job.modules_required.map((mod) => (
            <span
              key={mod}
              className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20"
            >
              {mod}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Weather Note ─── */}
      {job.weather_notes && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <Wind size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-semibold text-amber-300 mb-0.5">Weather Constraints</h3>
            <p className="text-xs text-[var(--text2)]">{job.weather_notes}</p>
          </div>
        </div>
      )}

      {/* ─── Client Notes ─── */}
      {job.client_notes && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 flex gap-3">
          <MessageSquare size={16} className="text-[var(--text3)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-semibold text-[var(--text2)] mb-0.5">Client Notes</h3>
            <p className="text-xs text-[var(--text3)]">{job.client_notes}</p>
          </div>
        </div>
      )}

      {/* ─── Apply Button (for open jobs) ─── */}
      {job.status === 'open' && !(job as any).my_application_status && (
        <button
          onClick={() => setShowApplyModal(true)}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition flex items-center justify-center gap-2"
        >
          <Send size={16} />
          Ansök om uppdraget
        </button>
      )}

      {/* ─── Application pending ─── */}
      {(job as any).my_application_status === 'pending' && (
        <div className="w-full py-3 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 text-center">
          Ansökan inskickad — inväntar svar
        </div>
      )}

      {/* ─── Checklist (for assigned jobs) ─── */}
      {isAssignedToMe && (
        <div className="space-y-3">
          <h3 className="text-sm font-serif font-bold text-[var(--text)]">Uppdragschecklista</h3>

          {(['pre-flight', 'during', 'post-flight'] as const).map((phase) => {
            const items = checklist.filter((c) => c.phase === phase);
            const done = items.filter((c) => c.checked).length;
            const isExpanded = expandedPhase === phase;

            return (
              <div
                key={phase}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                  className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg3)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text)] capitalize">
                      {phase.replace('-', ' ')}
                    </span>
                    <span className="text-[10px] text-[var(--text3)] font-mono">
                      {done}/{items.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={14} className="text-[var(--text3)]" />
                  ) : (
                    <ChevronDown size={14} className="text-[var(--text3)]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleChecklistItem(item.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg3)] transition-colors text-left"
                      >
                        {item.checked ? (
                          <CheckSquare size={14} className="text-[var(--green)] flex-shrink-0" />
                        ) : (
                          <Square size={14} className="text-[var(--text3)] flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs ${
                            item.checked ? 'text-[var(--text3)] line-through' : 'text-[var(--text)]'
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Data Upload Link */}
          <button
            onClick={() => navigate(`/pilot/jobs/${jobId}?upload=true`)}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition flex items-center justify-center gap-2"
          >
            Ladda upp flygdata
          </button>
        </div>
      )}

      {/* ─── Apply Modal ─── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6">
            <h3 className="text-base font-serif font-bold text-[var(--text)] mb-2">
              Ansök om uppdraget
            </h3>
            <p className="text-xs text-[var(--text3)] mb-4">
              Uppdrag: <strong className="text-[var(--text)]">{job.parcel_name ?? job.title}</strong>
              {' '}&middot; Ersättning: <strong className="text-[var(--green)]">{job.fee_sek.toLocaleString('sv-SE')} kr</strong>
            </p>

            <div className="space-y-3 mb-4">
              <label className="block">
                <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
                  Meddelande till uppdragsgivaren
                </span>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  rows={3}
                  placeholder="Berätta om din erfarenhet och utrustning..."
                  className="input-field text-xs w-full"
                />
              </label>

              <label className="block">
                <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
                  Föreslagen ersättning (valfritt, SEK)
                </span>
                <input
                  type="number"
                  value={applyFee}
                  onChange={(e) => setApplyFee(e.target.value)}
                  placeholder={job.fee_sek.toString()}
                  className="input-field text-xs w-full"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {applying ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {applying ? 'Skickar...' : 'Skicka ansökan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal (legacy direct accept) ─── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6">
            <h3 className="text-base font-serif font-bold text-[var(--text)] mb-2">
              Acceptera uppdraget?
            </h3>
            <p className="text-xs text-[var(--text3)] mb-1">
              Du accepterar uppdraget för <strong className="text-[var(--text)]">{job.parcel_name ?? job.title}</strong>.
            </p>
            <p className="text-xs text-[var(--text3)] mb-4">
              Ersättning: <strong className="text-[var(--green)]">{job.fee_sek.toLocaleString('sv-SE')} kr</strong>
              {job.deadline && <>{' '}&middot; Deadline: {new Date(job.deadline).toLocaleDateString('sv-SE')}</>}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {accepting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {accepting ? 'Godkänner...' : 'Bekräfta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function SpecCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3 text-center">
      <Icon size={14} className="mx-auto text-[var(--text3)] mb-1" />
      <p className="text-sm font-semibold font-mono text-[var(--text)]">{value}</p>
      <p className="text-[10px] text-[var(--text3)]">{label}</p>
    </div>
  );
}
