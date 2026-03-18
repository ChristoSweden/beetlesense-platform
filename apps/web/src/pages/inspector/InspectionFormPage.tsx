import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  MapPin,
  TreePine,
  Camera,
  Navigation,
  Shield,
  PenTool,
  Save,
  Send,
  AlertTriangle,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────── */

interface TreeAssessment {
  species: string;
  speciesLabel: string;
  barkBeetleDamage?: number;       // 0-5, Gran only
  crownDefoliation?: number;       // %, Gran only
  barkCondition?: string;          // Gran only
  needleLoss?: number;             // %, Tall only
  resinBleeding?: boolean;         // Tall only
  barkDamage?: string;             // Tall only
  leafHealth?: string;             // Löv only
  crownDensity?: string;           // Löv only
}

interface GpsWaypoint {
  id: string;
  lat: string;
  lng: string;
  label: string;
  damageType: string;
}

interface PhotoEntry {
  id: string;
  filename: string;
  gpsLat: string;
  gpsLng: string;
  description: string;
}

interface FormData {
  parcelId: string;
  parcelName: string;
  municipality: string;
  owner: string;
  area_ha: number;
  coordinates: string;
  trees: TreeAssessment[];
  damageClassification: string;
  severity: number;
  photos: PhotoEntry[];
  waypoints: GpsWaypoint[];
  recommendation: string;
  regulatoryFlags: {
    biotopskydd: boolean;
    nyckelbiotop: boolean;
    natura2000: boolean;
    strandskydd: boolean;
  };
  inspectorName: string;
  certificationId: string;
  inspectionDate: string;
  nextInspectionDue: string;
  notes: string;
}

/* ── Demo data ─────────────────────────────────────────── */

const INITIAL_FORM: FormData = {
  parcelId: 'P-2026-0412',
  parcelName: 'Granudden 4:12',
  municipality: 'Vetlanda',
  owner: 'Anna Svensson',
  area_ha: 28,
  coordinates: '57.4287° N, 15.0822° E',
  trees: [
    {
      species: 'gran',
      speciesLabel: 'Gran (Norway Spruce)',
      barkBeetleDamage: 3,
      crownDefoliation: 40,
      barkCondition: 'Borrhal synliga',
    },
    {
      species: 'tall',
      speciesLabel: 'Tall (Scots Pine)',
      needleLoss: 15,
      resinBleeding: false,
      barkDamage: 'Lindrig',
    },
    {
      species: 'lov',
      speciesLabel: 'Löv (Broadleaf)',
      leafHealth: 'God',
      crownDensity: 'Normal',
    },
  ],
  damageClassification: 'Barkborreangrepp',
  severity: 3,
  photos: [
    { id: 'ph1', filename: 'IMG_2026_0315_001.jpg', gpsLat: '57.4290', gpsLng: '15.0825', description: 'Borrhal i granstam, östra sidan' },
    { id: 'ph2', filename: 'IMG_2026_0315_002.jpg', gpsLat: '57.4288', gpsLng: '15.0830', description: 'Barkavfall vid rotbasen' },
  ],
  waypoints: [
    { id: 'wp1', lat: '57.4290', lng: '15.0825', label: 'Punkt A', damageType: 'Barkborreangrepp' },
    { id: 'wp2', lat: '57.4285', lng: '15.0818', label: 'Punkt B', damageType: 'Torka' },
  ],
  recommendation: 'Avverkning',
  regulatoryFlags: {
    biotopskydd: false,
    nyckelbiotop: true,
    natura2000: false,
    strandskydd: false,
  },
  inspectorName: 'Lars Eriksson',
  certificationId: 'SKS-2024-1847',
  inspectionDate: '2026-03-17',
  nextInspectionDue: '2026-06-17',
  notes: '',
};

const DAMAGE_CATEGORIES = [
  'Barkborreangrepp',
  'Stormskada',
  'Svampangrepp',
  'Torka',
  'Viltskada',
  'Övrigt',
];

const SEVERITY_LABELS: Record<number, string> = {
  1: '1 — Obetydlig (negligible)',
  2: '2 — Lindrig (minor)',
  3: '3 — Måttlig (moderate)',
  4: '4 — Allvarlig (severe)',
  5: '5 — Kritisk (critical)',
};

const RECOMMENDATIONS = [
  { value: 'Avverkning', label: 'Avverkning (Felling)' },
  { value: 'Markberedning', label: 'Markberedning (Scarification)' },
  { value: 'Återplantering', label: 'Återplantering (Replanting)' },
  { value: 'Bevakning', label: 'Bevakning (Monitoring)' },
  { value: 'Ingen åtgärd', label: 'Ingen åtgärd (No action)' },
];

const BARK_CONDITIONS = ['Intakt', 'Borrhal synliga', 'Lös bark', 'Bark saknas'];
const BARK_DAMAGE_LEVELS = ['Ingen', 'Lindrig', 'Måttlig', 'Allvarlig'];
const LEAF_HEALTH_OPTIONS = ['Utmärkt', 'God', 'Nedsatt', 'Dålig'];
const CROWN_DENSITY_OPTIONS = ['Tät', 'Normal', 'Gles', 'Mycket gles'];

/* ── Component ───────────────────────────────────────────── */

export default function InspectionFormPage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('parcel');

  const updateTree = (index: number, updates: Partial<TreeAssessment>) => {
    setForm((prev) => ({
      ...prev,
      trees: prev.trees.map((t, i) => (i === index ? { ...t, ...updates } : t)),
    }));
  };

  const addWaypoint = () => {
    setForm((prev) => ({
      ...prev,
      waypoints: [
        ...prev.waypoints,
        { id: `wp${Date.now()}`, lat: '', lng: '', label: `Punkt ${String.fromCharCode(65 + prev.waypoints.length)}`, damageType: 'Barkborreangrepp' },
      ],
    }));
  };

  const removeWaypoint = (id: string) => {
    setForm((prev) => ({ ...prev, waypoints: prev.waypoints.filter((w) => w.id !== id) }));
  };

  const addPhoto = () => {
    setForm((prev) => ({
      ...prev,
      photos: [
        ...prev.photos,
        { id: `ph${Date.now()}`, filename: '', gpsLat: '', gpsLng: '', description: '' },
      ],
    }));
  };

  const removePhoto = (id: string) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }));
  };

  const handleSave = (status: 'draft' | 'submit') => {
    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      alert(`Inspektion ${status === 'draft' ? 'sparad som utkast' : 'inskickad'} (demo)`);
    }, 800);
  };

  const sections = [
    { id: 'parcel', label: 'Fastighetsinformation' },
    { id: 'trees', label: 'Trädhälsa' },
    { id: 'damage', label: 'Skadeklassificering' },
    { id: 'photos', label: 'Fotodokumentation' },
    { id: 'waypoints', label: 'GPS-punkter' },
    { id: 'recommendations', label: 'Rekommendationer' },
    { id: 'regulatory', label: 'Regelverksflaggor' },
    { id: 'signoff', label: 'Signering' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/inspector/dashboard" className="hover:text-[var(--text2)]">
          Inspektörspanel
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Inspektionsformulär</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            Fältinspektion — {form.parcelName}
          </h1>
          <p className="text-xs text-[var(--text3)]">
            {form.parcelId} | {form.municipality} | {form.area_ha} ha
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            Spara utkast
          </button>
          <button
            onClick={() => handleSave('submit')}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-50"
          >
            <Send size={14} />
            Skicka in
          </button>
        </div>
      </div>

      {/* Section nav (mobile-friendly tabs) */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeSection === s.id
                ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                : 'text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text2)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ─── PARCEL INFO ─── */}
      {activeSection === 'parcel' && (
        <Section icon={MapPin} title="Fastighetsinformation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fastighets-ID" value={form.parcelId} readOnly />
            <Field label="Fastighetsnamn" value={form.parcelName} readOnly />
            <Field label="Kommun" value={form.municipality} readOnly />
            <Field label="Markägare" value={form.owner} readOnly />
            <Field label="Areal (ha)" value={String(form.area_ha)} readOnly />
            <Field label="Koordinater" value={form.coordinates} readOnly />
          </div>
        </Section>
      )}

      {/* ─── TREE HEALTH ─── */}
      {activeSection === 'trees' && (
        <Section icon={TreePine} title="Trädhälsobedömning">
          <div className="space-y-6">
            {form.trees.map((tree, idx) => (
              <div
                key={tree.species}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
              >
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4">
                  {tree.speciesLabel}
                </h3>

                {tree.species === 'gran' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] text-[var(--text3)] block mb-1">
                        Barkborreskada (0-5)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        value={tree.barkBeetleDamage ?? 0}
                        onChange={(e) => updateTree(idx, { barkBeetleDamage: Number(e.target.value) })}
                        className="w-full accent-[var(--green)]"
                      />
                      <div className="flex justify-between text-[9px] text-[var(--text3)] mt-0.5">
                        <span>0 — Ingen</span>
                        <span className="font-mono font-bold text-[var(--text)]">
                          {tree.barkBeetleDamage}
                        </span>
                        <span>5 — Dödlig</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text3)] block mb-1">
                        Krondefoliering (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={tree.crownDefoliation ?? 0}
                        onChange={(e) => updateTree(idx, { crownDefoliation: Number(e.target.value) })}
                        className="input-field text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text3)] block mb-1">
                        Barkskick
                      </label>
                      <select
                        value={tree.barkCondition ?? ''}
                        onChange={(e) => updateTree(idx, { barkCondition: e.target.value })}
                        className="input-field text-xs w-full"
                      >
                        {BARK_CONDITIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {tree.species === 'tall' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] text-[var(--text3)] block mb-1">
                        Barrförlust (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={tree.needleLoss ?? 0}
                        onChange={(e) => updateTree(idx, { needleLoss: Number(e.target.value) })}
                        className="input-field text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text3)] block mb-1">
                        Kåda (resin bleeding)
                      </label>
                      <div className="flex items-center gap-3 mt-2">
                        <label className="flex items-center gap-1.5 text-xs text-[var(--text)]">
                          <input
                            type="radio"
                            name={`resin-${idx}`}
                            checked={tree.resinBleeding === true}
                            onChange={() => updateTree(idx, { resinBleeding: true })}
                            className="accent-[var(--green)]"
                          />
                          Ja
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-[var(--text)]">
                          <input
                            type="radio"
                            name={`resin-${idx}`}
                            checked={tree.resinBleeding === false}
                            onChange={() => updateTree(idx, { resinBleeding: false })}
                            className="accent-[var(--green)]"
                          />
                          Nej
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text3)] block mb-1">
                        Barkskada
                      </label>
                      <select
                        value={tree.barkDamage ?? ''}
                        onChange={(e) => updateTree(idx, { barkDamage: e.target.value })}
                        className="input-field text-xs w-full"
                      >
                        {BARK_DAMAGE_LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {tree.species === 'lov' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-[var(--text3)] block mb-1">
                        Bladhälsa
                      </label>
                      <select
                        value={tree.leafHealth ?? ''}
                        onChange={(e) => updateTree(idx, { leafHealth: e.target.value })}
                        className="input-field text-xs w-full"
                      >
                        {LEAF_HEALTH_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text3)] block mb-1">
                        Krontäthet
                      </label>
                      <select
                        value={tree.crownDensity ?? ''}
                        onChange={(e) => updateTree(idx, { crownDensity: e.target.value })}
                        className="input-field text-xs w-full"
                      >
                        {CROWN_DENSITY_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ─── DAMAGE CLASSIFICATION ─── */}
      {activeSection === 'damage' && (
        <Section icon={AlertTriangle} title="Skadeklassificering">
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-[var(--text3)] block mb-1">
                Skadekategori (Svensk standard)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DAMAGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm((f) => ({ ...f, damageClassification: cat }))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      form.damageClassification === cat
                        ? 'border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]'
                        : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[var(--text3)] block mb-2">
                Allvarlighetsgrad
              </label>
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setForm((f) => ({ ...f, severity: level }))}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.severity === level
                        ? level >= 4
                          ? 'border-red-500/50 bg-red-500/10 text-red-400'
                          : level === 3
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                            : 'border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]'
                        : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                    }`}
                  >
                    {SEVERITY_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ─── PHOTOS ─── */}
      {activeSection === 'photos' && (
        <Section icon={Camera} title="Fotodokumentation">
          <div className="space-y-3">
            {form.photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center">
                      <Camera size={18} className="text-[var(--text3)]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">
                        {photo.filename || 'Ny bild'}
                      </p>
                      <p className="text-[10px] text-[var(--text3)] font-mono">
                        {photo.gpsLat && photo.gpsLng
                          ? `${photo.gpsLat}° N, ${photo.gpsLng}° E`
                          : 'Ingen GPS-data'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="p-1.5 rounded-lg text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text2)]">{photo.description}</p>
              </div>
            ))}
            <button
              onClick={addPhoto}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
            >
              <Upload size={14} />
              Lägg till foto
            </button>
          </div>
        </Section>
      )}

      {/* ─── GPS WAYPOINTS ─── */}
      {activeSection === 'waypoints' && (
        <Section icon={Navigation} title="GPS-punkter">
          <div className="space-y-3">
            {form.waypoints.map((wp) => (
              <div
                key={wp.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[var(--text)]">{wp.label}</span>
                  <button
                    onClick={() => removeWaypoint(wp.id)}
                    className="p-1.5 rounded-lg text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-[var(--text3)] block mb-0.5">Latitud</label>
                    <input
                      type="text"
                      value={wp.lat}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          waypoints: f.waypoints.map((w) =>
                            w.id === wp.id ? { ...w, lat: e.target.value } : w,
                          ),
                        }))
                      }
                      className="input-field text-xs w-full font-mono"
                      placeholder="57.4290"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text3)] block mb-0.5">Longitud</label>
                    <input
                      type="text"
                      value={wp.lng}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          waypoints: f.waypoints.map((w) =>
                            w.id === wp.id ? { ...w, lng: e.target.value } : w,
                          ),
                        }))
                      }
                      className="input-field text-xs w-full font-mono"
                      placeholder="15.0825"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-[var(--text3)] block mb-0.5">Skadetyp</label>
                    <select
                      value={wp.damageType}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          waypoints: f.waypoints.map((w) =>
                            w.id === wp.id ? { ...w, damageType: e.target.value } : w,
                          ),
                        }))
                      }
                      className="input-field text-xs w-full"
                    >
                      {DAMAGE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addWaypoint}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
            >
              <Plus size={14} />
              Lägg till GPS-punkt
            </button>
          </div>
        </Section>
      )}

      {/* ─── RECOMMENDATIONS ─── */}
      {activeSection === 'recommendations' && (
        <Section icon={TreePine} title="Rekommendationer">
          <div className="space-y-2">
            {RECOMMENDATIONS.map((rec) => (
              <button
                key={rec.value}
                onClick={() => setForm((f) => ({ ...f, recommendation: rec.value }))}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs font-medium border transition-colors ${
                  form.recommendation === rec.value
                    ? 'border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]'
                    : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {rec.label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="text-[11px] text-[var(--text3)] block mb-1">
              Ytterligare anteckningar
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={4}
              className="input-field text-xs w-full resize-none"
              placeholder="Beskriv observationer, rekommendationer och övrig information..."
            />
          </div>
        </Section>
      )}

      {/* ─── REGULATORY FLAGS ─── */}
      {activeSection === 'regulatory' && (
        <Section icon={Shield} title="Regelverksflaggor">
          <p className="text-[11px] text-[var(--text3)] mb-4">
            Markera alla tillämpliga skyddsbestämmelser för denna fastighet.
          </p>
          <div className="space-y-3">
            {[
              { key: 'biotopskydd' as const, label: 'Biotopskydd', desc: 'Generellt biotopskydd enligt Miljöbalken' },
              { key: 'nyckelbiotop' as const, label: 'Nyckelbiotop', desc: 'Skogsområde med höga naturvärden (Skogsstyrelsen)' },
              { key: 'natura2000' as const, label: 'Natura 2000', desc: 'EU-skyddat naturområde' },
              { key: 'strandskydd' as const, label: 'Strandskydd', desc: 'Skyddszon kring stränder och vattendrag' },
            ].map((flag) => (
              <label
                key={flag.key}
                className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                  form.regulatoryFlags[flag.key]
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-[var(--border)] hover:bg-[var(--bg3)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.regulatoryFlags[flag.key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      regulatoryFlags: { ...f.regulatoryFlags, [flag.key]: e.target.checked },
                    }))
                  }
                  className="accent-amber-500 mt-0.5"
                />
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">{flag.label}</p>
                  <p className="text-[10px] text-[var(--text3)]">{flag.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* ─── SIGN-OFF ─── */}
      {activeSection === 'signoff' && (
        <Section icon={PenTool} title="Signering och godkännande">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[var(--text3)] block mb-1">
                Inspektörens namn
              </label>
              <input
                type="text"
                value={form.inspectorName}
                onChange={(e) => setForm((f) => ({ ...f, inspectorName: e.target.value }))}
                className="input-field text-xs w-full"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text3)] block mb-1">
                Certifierings-ID
              </label>
              <input
                type="text"
                value={form.certificationId}
                onChange={(e) => setForm((f) => ({ ...f, certificationId: e.target.value }))}
                className="input-field text-xs w-full font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text3)] block mb-1">
                Inspektionsdatum
              </label>
              <input
                type="date"
                value={form.inspectionDate}
                onChange={(e) => setForm((f) => ({ ...f, inspectionDate: e.target.value }))}
                className="input-field text-xs w-full"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text3)] block mb-1">
                Nästa inspektion
              </label>
              <input
                type="date"
                value={form.nextInspectionDue}
                onChange={(e) => setForm((f) => ({ ...f, nextInspectionDue: e.target.value }))}
                className="input-field text-xs w-full"
              />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-4">
            <p className="text-[11px] text-[var(--text2)]">
              Genom att skicka in bekräftar jag att informationen är korrekt och att inspektionen
              har genomförts enligt Skogsstyrelsens riktlinjer.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => handleSave('submit')}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-50"
              >
                <Send size={14} />
                Signera och skicka in
              </button>
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                Spara utkast
              </button>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <h2 className="text-sm font-serif font-bold text-[var(--text)] flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[var(--green)]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  readOnly = false,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] text-[var(--text3)] block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        className={`input-field text-xs w-full ${readOnly ? 'opacity-70 cursor-default' : ''}`}
      />
    </div>
  );
}
