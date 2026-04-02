import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import {
  Trees,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Upload,
  Loader2,
  AlertTriangle,
  MapPin,
} from 'lucide-react';

// ─── Types ───

interface Parcel {
  id: string;
  name: string;
  area_ha: number;
  created_at: string;
  fastighets_id?: string;
}

// ─── Component ───

export function ParcelManagement() {
  const { profile } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    if (isDemo()) {
      setParcels(
        DEMO_PARCELS.map((p) => ({
          id: p.id,
          name: p.name,
          area_ha: p.area_hectares,
          created_at: p.registered_at,
          fastighets_id: undefined,
        })),
      );
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from('parcels')
        .select('id, name, area_ha, created_at, fastighets_id')
        .eq('owner_id', profile!.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setParcels(data as Parcel[]);
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  const startEdit = (parcel: Parcel) => {
    setEditingId(parcel.id);
    setEditName(parcel.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    const { error } = await supabase
      .from('parcels')
      .update({ name: editName.trim() })
      .eq('id', editingId);

    if (!error) {
      setParcels((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, name: editName.trim() } : p)),
      );
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('parcels').delete().eq('id', id);
    if (!error) {
      setParcels((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleteConfirmId(null);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-[var(--green)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider flex items-center gap-2">
          <Trees size={12} className="text-[var(--green)]" />
          Parcels
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
        >
          <Plus size={12} />
          Add Parcel
        </button>
      </div>

      {parcels.length === 0 ? (
        <div className="py-6 text-center">
          <Trees size={20} className="mx-auto text-[var(--text3)] mb-2" />
          <p className="text-xs text-[var(--text3)]">
            No parcels yet. Add your first forest parcel.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {parcels.map((parcel) => (
            <div
              key={parcel.id}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <MapPin size={14} className="text-[var(--green)] flex-shrink-0" />

                {editingId === parcel.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="input-field text-xs flex-1"
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      className="p-1 text-[var(--green)] hover:bg-[var(--green)]/10 rounded transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 text-[var(--text3)] hover:text-[var(--text)] rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--text)] truncate">
                      {parcel.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
                      <span>{parcel.area_ha} ha</span>
                      {parcel.fastighets_id && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-[var(--text3)]" />
                          <span className="font-mono">{parcel.fastighets_id}</span>
                        </>
                      )}
                      <span className="w-0.5 h-0.5 rounded-full bg-[var(--text3)]" />
                      <span>{new Date(parcel.created_at).toLocaleDateString('sv-SE')}</span>
                    </div>
                  </div>
                )}
              </div>

              {editingId !== parcel.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(parcel)}
                    className="p-1.5 rounded text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(parcel.id)}
                    className="p-1.5 rounded text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Add Parcel Modal ─── */}
      {showAddModal && (
        <AddParcelModal
          onClose={() => setShowAddModal(false)}
          onAdded={(parcel) => {
            setParcels((prev) => [parcel, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}

      {/* ─── Delete Confirmation ─── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-xs rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6 text-center">
            <AlertTriangle size={24} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Delete Parcel?</h3>
            <p className="text-xs text-[var(--text3)] mb-4">
              This will permanently delete the parcel and all associated surveys and reports.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Parcel Modal ───

function AddParcelModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (parcel: Parcel) => void;
}) {
  const { profile } = useAuthStore();
  const [name, setName] = useState('');
  const [fastighetId, setFastighetId] = useState('');
  const [geoFile, setGeoFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'registry' | 'upload'>('registry');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!profile || !name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (mode === 'registry' && fastighetId.trim()) {
        // Use edge function to fetch parcel from Swedish registry
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          'parcel-register',
          { body: { fastighets_id: fastighetId.trim() } },
        );

        if (fnError) throw fnError;

        const { data, error: dbError } = await supabase
          .from('parcels')
          .insert({
            owner_id: profile.id,
            name: name.trim(),
            fastighets_id: fastighetId.trim(),
            boundary_geojson: fnData?.boundary ?? null,
            area_ha: fnData?.area_ha ?? 0,
          })
          .select()
          .single();

        if (dbError) throw dbError;
        onAdded(data as Parcel);
      } else if (mode === 'upload' && geoFile) {
        // Parse GeoJSON/Shapefile
        const text = await geoFile.text();
        let geojson;
        try {
          geojson = JSON.parse(text);
        } catch {
          throw new Error('Invalid GeoJSON file.');
        }

        const { data, error: dbError } = await supabase
          .from('parcels')
          .insert({
            owner_id: profile.id,
            name: name.trim(),
            boundary_geojson: geojson.features?.[0]?.geometry ?? geojson.geometry ?? geojson,
            area_ha: 0, // Will be calculated server-side
          })
          .select()
          .single();

        if (dbError) throw dbError;
        onAdded(data as Parcel);
      } else {
        // Just name
        const { data, error: dbError } = await supabase
          .from('parcels')
          .insert({
            owner_id: profile.id,
            name: name.trim(),
            area_ha: 0,
          })
          .select()
          .single();

        if (dbError) throw dbError;
        onAdded(data as Parcel);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add parcel.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-serif font-bold text-[var(--text)]">Add Parcel</h3>
          <button
            onClick={onClose}
            className="text-[var(--text3)] hover:text-[var(--text)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-[var(--text2)] mb-1 block">Parcel Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Norra Skogen"
              className="input-field"
              autoFocus
            />
          </label>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('registry')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                mode === 'registry'
                  ? 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--text3)]'
              }`}
            >
              Fastighets-ID
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                mode === 'upload'
                  ? 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--text3)]'
              }`}
            >
              Upload Boundary
            </button>
          </div>

          {mode === 'registry' ? (
            <label className="block">
              <span className="text-xs font-medium text-[var(--text2)] mb-1 block">
                Fastighets-ID
              </span>
              <input
                type="text"
                value={fastighetId}
                onChange={(e) => setFastighetId(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="input-field font-mono"
              />
              <p className="text-[10px] text-[var(--text3)] mt-1">
                We will fetch the boundary from the Swedish land registry.
              </p>
            </label>
          ) : (
            <div>
              <span className="text-xs font-medium text-[var(--text2)] mb-1 block">
                Boundary File
              </span>
              {geoFile ? (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5">
                  <Check size={14} className="text-[var(--green)]" />
                  <span className="text-xs text-[var(--text)] truncate flex-1">
                    {geoFile.name}
                  </span>
                  <button onClick={() => setGeoFile(null)} className="text-[var(--text3)]">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--text3)] cursor-pointer transition-colors">
                  <Upload size={14} className="text-[var(--text3)]" />
                  <span className="text-xs text-[var(--text3)]">
                    Upload GeoJSON or Shapefile
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".geojson,.json,.shp,.zip"
                    onChange={(e) => setGeoFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {error && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || saving}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Adding...' : 'Add Parcel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
