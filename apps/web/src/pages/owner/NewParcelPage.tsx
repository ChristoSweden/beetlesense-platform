import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, ChevronRight, Save, Info, Search, Loader2, AlertTriangle } from 'lucide-react';
import { ParcelSelectionMap } from '@/components/onboarding/ParcelSelectionMap';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import { useAuthStore } from '@/stores/authStore';
import { lantmaterietConnector } from '@/services/connectors/LantmaterietConnector';
import { lookupFastighet, isValidFastighetsId } from '@/services/fastighetsLookup';

// ─── Geometry validation ───────────────────────────────────────────────────

function isValidGeometry(coordinates: number[][]): { valid: boolean; error?: string } {
  if (!coordinates || coordinates.length < 3) {
    return { valid: false, error: 'A parcel must have at least 3 boundary points.' };
  }
  if (coordinates.length > 500) {
    return { valid: false, error: 'Parcel boundary is too complex. Simplify to under 500 points.' };
  }
  // Check for duplicate consecutive points
  for (let i = 0; i < coordinates.length - 1; i++) {
    if (
      coordinates[i][0] === coordinates[i + 1][0] &&
      coordinates[i][1] === coordinates[i + 1][1]
    ) {
      return { valid: false, error: 'Parcel boundary has duplicate points. Please redraw.' };
    }
  }
  return { valid: true };
}

export default function NewParcelPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [parcelData, setParcelData] = useState<any>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fastighets-ID lookup (with 500ms debounce)
  const [fastighetsId, setFastighetsId] = useState('');
  const [fastighetsLookupLoading, setFastighetsLookupLoading] = useState(false);
  const [fastighetsLookupError, setFastighetsLookupError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!fastighetsId.trim() || !isValidFastighetsId(fastighetsId)) {
      setFastighetsLookupError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setFastighetsLookupLoading(true);
      setFastighetsLookupError(null);
      try {
        const result = await lookupFastighet(fastighetsId);
        const [lng, lat] = result.lookup.centroid;
        setSelectedCoords([lat, lng]);
        setParcelData({
          name: result.lookup.fastighetId,
          area_ha: result.lookup.areaHa,
          municipality: result.lookup.municipality,
          id: result.lookup.fastighetId,
          boundary: result.lookup.boundaryGeoJSON,
        });
        setName(result.lookup.fastighetId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        // Map to standard error codes
        if (msg.includes('No property found') || msg.includes('not found')) {
          setFastighetsLookupError('PARCEL-004: Fastigheten hittades inte i registret.');
        } else if (msg.includes('API') || msg.includes('fetch') || msg.includes('network')) {
          setFastighetsLookupError('PARCEL-002: Lantmäteriets tjänst är tillfälligt otillgänglig. Försök igen om en stund.');
        } else {
          setFastighetsLookupError(msg);
        }
      } finally {
        setFastighetsLookupLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fastighetsId]);

  const handleSelect = (coords: [number, number], info?: any) => {
    setSelectedCoords(coords);
    if (info) {
      setParcelData(info);
      setName(info.name || '');
    }
  };

  const handleSnap = async () => {
    if (!selectedCoords) return;
    setIsSaving(true);
    const response = await lantmaterietConnector.snapToProperty(selectedCoords[0], selectedCoords[1]);
    setIsSaving(false);
    
    if (response.data) {
      setParcelData({
        ...parcelData,
        name: response.data.name,
        area_ha: response.data.area_ha,
        municipality: response.data.municipality,
        id: response.data.id
      });
      setName(response.data.name);
    }
  };

  const handleSave = async () => {
    if (!selectedCoords || !name) return;

    // Validate boundary geometry if available
    if (parcelData?.boundary?.coordinates) {
      // GeoJSON Polygon: coordinates[0] is the outer ring
      const ring: number[][] = parcelData.boundary.coordinates[0] ?? parcelData.boundary.coordinates;
      const validation = isValidGeometry(ring);
      if (!validation.valid) {
        setError(validation.error ?? 'Invalid parcel geometry.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isDemo() || !isSupabaseConfigured) {
        // Simulate save
        await new Promise(r => setTimeout(r, 1000));
        navigate('/owner/parcels');
      } else {
        const { error: saveError } = await supabase
          .from('parcels')
          .insert({
            owner_id: user?.id,
            name,
            municipality: parcelData?.municipality || 'Unknown',
            area_ha: parcelData?.area_ha || 0,
            boundary_geojson: parcelData?.boundary || null,
            status: 'unknown',
            metadata: {
              coords: selectedCoords,
              municipality_code: parcelData?.municipality_code
            }
          });

        if (saveError) throw saveError;
        navigate('/owner/parcels');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Misslyckades att spara fastighet');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pb-20">
      <div className="max-w-xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/owner/parcels')}
            className="p-2 -ml-2 rounded-xl text-[var(--text3)] hover:text-[var(--text)] transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-serif font-bold">Lägg till fastighet</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
        </div>

        {step === 1 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-serif font-bold mb-2">Hitta din skog</h2>
            <p className="text-xs text-[var(--text3)] mb-6">Ange fastighetsbeteckning eller navigera på kartan.</p>

            {/* Fastighets-ID lookup input */}
            <div className="mb-5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)] block mb-2">
                Fastighetsbeteckning (t.ex. Kronoberg Vaxjo 1:23)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {fastighetsLookupLoading
                    ? <Loader2 size={14} className="animate-spin text-[var(--green)]" />
                    : <Search size={14} className="text-[var(--text3)]" />}
                </div>
                <input
                  type="text"
                  value={fastighetsId}
                  onChange={(e) => setFastighetsId(e.target.value)}
                  placeholder="Ange fastighetsbeteckning…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg2)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] transition-colors"
                />
              </div>
              {fastighetsLookupError && (
                <div className="flex items-start gap-2 mt-2 text-xs text-red-500">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>{fastighetsLookupError}</span>
                </div>
              )}
              {parcelData && fastighetsId && !fastighetsLookupLoading && !fastighetsLookupError && (
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--green)]">
                  <CheckCircle2 size={12} />
                  <span>Hittad: {parcelData.municipality}{parcelData.area_ha ? ` · ${parcelData.area_ha} ha` : ''}</span>
                </div>
              )}
            </div>

            <ParcelSelectionMap onSelect={handleSelect} />

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
                <Info size={16} className="text-[var(--green)] mt-0.5" />
                <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                  Vi använder Lantmäteriets öppna register för att identifiera fastigheter.
                  {import.meta.env.VITE_LANTMATERIET_API_KEY ? '' : ' Ange VITE_LANTMATERIET_API_KEY för fullt registeruppslag.'}
                </p>
              </div>

              {selectedCoords && (
                <button
                  onClick={handleSnap}
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 text-emerald-400 text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Ansluter till registret...' : 'Snappa till fastighetsgräns'}
                </button>
              )}

              <button 
                disabled={!selectedCoords}
                onClick={() => setStep(2)}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
                  selectedCoords 
                    ? 'bg-[var(--green)] text-[var(--bg)] shadow-lg shadow-[var(--green)]/20 active:scale-[0.98]' 
                    : 'bg-[var(--border)] text-[var(--text3)] cursor-not-allowed'
                }`}
              >
                Nästa steg
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-serif font-bold mb-2">Bekräfta uppgifter</h2>
            <p className="text-xs text-[var(--text3)] mb-6">Vi hittade följande information i fastighetsregistret.</p>

            <div className="space-y-4 mb-8">
              <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] card-depth">
                <div className="mb-4">
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Namn på skiftet</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 bg-transparent border-none text-lg font-serif font-bold text-[var(--text)] focus:ring-0 p-0"
                    placeholder="Sätt ett namn..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Kommun</label>
                    <p className="text-sm font-medium text-[var(--text2)]">{parcelData?.municipality || '—'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">Areal</label>
                    <p className="text-sm font-medium text-[var(--text2)]">{parcelData?.area_ha || '—'} ha</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <CheckCircle2 size={16} className="text-[var(--green)]" />
                <p className="text-[11px] text-emerald-400/80">Klar för automatisk satellitbevakning</p>
              </div>
            </div>

            {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-xl font-bold bg-[var(--bg2)] border border-[var(--border)] text-[var(--text2)] active:scale-[0.98] transition-all"
              >
                Ändra på karta
              </button>
              <button 
                disabled={!name || isSaving}
                onClick={handleSave}
                className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-xl bg-[var(--green)] text-[var(--bg)] font-bold shadow-lg shadow-[var(--green)]/20 active:scale-[0.98] transition-all"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-[var(--bg)]/30 border-t-[var(--bg)] rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    Spara fastighet
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
