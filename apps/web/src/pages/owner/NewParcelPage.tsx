import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, ChevronRight, Save, Info } from 'lucide-react';
import { ParcelSelectionMap } from '@/components/onboarding/ParcelSelectionMap';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import { lantmaterietConnector } from '@/services/connectors/LantmaterietConnector';

export default function NewParcelPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [parcelData, setParcelData] = useState<any>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            name,
            municipality: parcelData?.municipality || 'Unknown',
            area_ha: parcelData?.area_ha || 0,
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
            <p className="text-xs text-[var(--text3)] mb-6">Navigera på kartan och klicka där din skog ligger för att automatiskt hämta gränser och data.</p>
            
            <ParcelSelectionMap onSelect={handleSelect} />

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
                <Info size={16} className="text-[var(--green)] mt-0.5" />
                <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                  Vi använder Lantmäteriets öppna register för att identifiera fastigheter.
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
