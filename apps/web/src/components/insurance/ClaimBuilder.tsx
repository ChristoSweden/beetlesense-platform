import { useState } from 'react';
import {
  Wind,
  Bug,
  Flame,
  Droplets,
  TreePine,
  MapPin,
  Satellite,
  BarChart3,
  FileCheck,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import type { DamageType, ClaimBuilderState } from '@/hooks/useInsurance';
import type { DemoParcel } from '@/lib/demoData';

interface Props {
  builder: ClaimBuilderState;
  parcels: DemoParcel[];
  onSetStep: (step: number) => void;
  onSetDamageType: (type: DamageType) => void;
  onToggleParcel: (id: string) => void;
  onCalculateEvidence: () => void;
  onReset: () => void;
}

const DAMAGE_TYPES: { type: DamageType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'storm', label: 'Stormskada', icon: <Wind size={20} />, color: '#60a5fa' },
  { type: 'beetle', label: 'Barkborreskada', icon: <Bug size={20} />, color: '#f97316' },
  { type: 'fire', label: 'Brandskada', icon: <Flame size={20} />, color: '#ef4444' },
  { type: 'moose', label: 'Älgskada', icon: <TreePine size={20} />, color: '#a78bfa' },
  { type: 'flooding', label: 'Översvämning', icon: <Droplets size={20} />, color: '#38bdf8' },
];

const STEP_LABELS = [
  'Skadetyp',
  'Välj skiften',
  'Satellitbevis',
  'Volymförlust',
  'Granska',
  'Generera PDF',
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold transition-colors ${
              i + 1 < current
                ? 'bg-[var(--green)] text-[#030d05]'
                : i + 1 === current
                  ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/40'
                  : 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)]'
            }`}
          >
            {i + 1 < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`w-6 h-px ${i + 1 < current ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function NDVIBlock({ value, label }: { value: number; label: string }) {
  // Map NDVI (0-1) to color: red(0) -> yellow(0.4) -> green(1)
  const r = value < 0.5 ? 220 : Math.round(220 - (value - 0.5) * 2 * 180);
  const g = value < 0.5 ? Math.round(value * 2 * 200) : 200;
  const color = `rgb(${r}, ${g}, 40)`;

  return (
    <div className="flex-1">
      <div
        className="h-32 rounded-lg border border-[var(--border)] flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }}
      >
        <div className="absolute inset-0 opacity-30" style={{
          background: `repeating-linear-gradient(0deg, ${color}33 0px, ${color}33 4px, transparent 4px, transparent 8px), repeating-linear-gradient(90deg, ${color}33 0px, ${color}33 4px, transparent 4px, transparent 8px)`,
        }} />
        <div className="text-center relative z-10">
          <p className="text-2xl font-mono font-bold" style={{ color }}>{value.toFixed(2)}</p>
          <p className="text-[10px] text-[var(--text3)]">NDVI</p>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text3)] text-center mt-1">{label}</p>
    </div>
  );
}

export function ClaimBuilder({
  builder,
  parcels,
  onSetStep,
  onSetDamageType,
  onToggleParcel,
  onCalculateEvidence,
  onReset,
}: Props) {
  const [pdfGenerated, setPdfGenerated] = useState(false);

  const canProceed = (): boolean => {
    switch (builder.step) {
      case 1: return builder.damageType !== null;
      case 2: return builder.selectedParcels.length > 0;
      case 3: return builder.ndviBefore > 0;
      case 4: return builder.volumeLossM3 > 0;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (builder.step === 2) {
      onCalculateEvidence();
    }
    if (builder.step < 6) {
      onSetStep(builder.step + 1);
    }
  };

  const handleBack = () => {
    if (builder.step > 1) {
      onSetStep(builder.step - 1);
    }
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Steg {builder.step}: {STEP_LABELS[builder.step - 1]}
          </h3>
          <button
            onClick={onReset}
            className="text-[10px] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
          >
            Börja om
          </button>
        </div>
        <StepIndicator current={builder.step} total={6} />

        {/* Step 1: Select damage type */}
        {builder.step === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DAMAGE_TYPES.map((d) => (
              <button
                key={d.type}
                onClick={() => onSetDamageType(d.type)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  builder.damageType === d.type
                    ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                    : 'border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--bg3)]'
                }`}
                style={builder.damageType === d.type ? { boxShadow: `0 0 0 1px var(--green)` } : undefined}
              >
                <div className="mb-2" style={{ color: d.color }}>
                  {d.icon}
                </div>
                <p className="text-xs font-medium text-[var(--text)]">{d.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Select parcels */}
        {builder.step === 2 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text3)] mb-3">Välj de skiften som drabbats:</p>
            {parcels.map((p) => (
              <button
                key={p.id}
                onClick={() => onToggleParcel(p.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  builder.selectedParcels.includes(p.id)
                    ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                    : 'border-[var(--border)] hover:bg-[var(--bg3)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin size={14} className={builder.selectedParcels.includes(p.id) ? 'text-[var(--green)]' : 'text-[var(--text3)]'} />
                  <div className="text-left">
                    <p className="text-xs font-medium text-[var(--text)]">{p.name}</p>
                    <p className="text-[10px] text-[var(--text3)]">{p.area_hectares} ha — {p.municipality}</p>
                  </div>
                </div>
                {builder.selectedParcels.includes(p.id) && (
                  <CheckCircle2 size={16} className="text-[var(--green)]" />
                )}
              </button>
            ))}
            {builder.selectedParcels.length > 0 && (
              <div className="mt-3 p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                <p className="text-xs text-[var(--text3)]">
                  Vald areal: <span className="font-mono text-[var(--text)]">{builder.affectedAreaHa} ha</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Satellite evidence */}
        {builder.step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Satellite size={14} className="text-[var(--green)]" />
              <p className="text-xs text-[var(--text)]">Auto-genererade satellitbevis</p>
            </div>

            {/* Before/After NDVI */}
            <div className="flex gap-3">
              <NDVIBlock value={builder.ndviBefore} label="Före skada (2026-01-15)" />
              <NDVIBlock value={builder.ndviAfter} label="Efter skada (2026-03-05)" />
            </div>

            {/* Evidence details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                <p className="text-[10px] text-[var(--text3)]">Detektionsdatum</p>
                <p className="text-xs font-mono text-[var(--text)]">{builder.detectionDate}</p>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                <p className="text-[10px] text-[var(--text3)]">Skadad areal</p>
                <p className="text-xs font-mono text-[var(--text)]">
                  {(builder.affectedAreaHa * builder.damagePct / 100).toFixed(1)} ha
                </p>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                <p className="text-[10px] text-[var(--text3)]">NDVI-förändring</p>
                <p className="text-xs font-mono text-red-400">
                  -{((builder.ndviBefore - builder.ndviAfter) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                <p className="text-[10px] text-[var(--text3)]">Skadegrad</p>
                <p className="text-xs font-mono text-[var(--text)]">{builder.damagePct}%</p>
              </div>
            </div>

            {/* BeetleSense stamp */}
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--green)]/20" style={{ background: 'var(--green)' + '08' }}>
              <Shield size={14} className="text-[var(--green)]" />
              <p className="text-[10px] font-medium text-[var(--green)]">BeetleSense-verifierad satellitanalys</p>
            </div>
          </div>
        )}

        {/* Step 4: Volume loss */}
        {builder.step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-[var(--green)]" />
              <p className="text-xs text-[var(--text)]">Volymförlust och marknadsvärde</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                <p className="text-[10px] text-[var(--text3)] mb-1">Volymförlust</p>
                <p className="text-xl font-mono font-semibold text-[var(--text)]">
                  {builder.volumeLossM3.toLocaleString('sv-SE')} m&sup3;
                </p>
                <p className="text-[10px] text-[var(--text3)]">Baserat på 180 m&sup3;/ha</p>
              </div>
              <div className="p-4 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
                <p className="text-[10px] text-[var(--text3)] mb-1">Marknadsvärde</p>
                <p className="text-xl font-mono font-semibold text-[var(--text)]">
                  {builder.marketValueSEK.toLocaleString('sv-SE')} SEK
                </p>
                <p className="text-[10px] text-[var(--text3)]">580 SEK/m&sup3; (aktuellt pris)</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[var(--green)]/30" style={{ background: 'var(--green)' + '08' }}>
              <p className="text-[10px] text-[var(--text3)] mb-1">Estimerat skadebelopp</p>
              <p className="text-2xl font-mono font-bold text-[var(--green)]">
                {builder.totalClaimSEK.toLocaleString('sv-SE')} SEK
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {builder.step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck size={14} className="text-[var(--green)]" />
              <p className="text-xs text-[var(--text)]">Granska skaderapport</p>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Skadetyp', value: DAMAGE_TYPES.find((d) => d.type === builder.damageType)?.label ?? '' },
                { label: 'Drabbade skiften', value: `${builder.selectedParcels.length} skiften (${builder.affectedAreaHa} ha)` },
                { label: 'Skadegrad', value: `${builder.damagePct}%` },
                { label: 'Volymförlust', value: `${builder.volumeLossM3.toLocaleString('sv-SE')} m\u00B3` },
                { label: 'Detektionsdatum', value: builder.detectionDate },
                { label: 'NDVI-förändring', value: `${builder.ndviBefore.toFixed(2)} \u2192 ${builder.ndviAfter.toFixed(2)}` },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]"
                  style={{ background: 'var(--bg3)' }}
                >
                  <p className="text-xs text-[var(--text3)]">{row.label}</p>
                  <p className="text-xs font-mono text-[var(--text)]">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg border border-[var(--green)]/30" style={{ background: 'var(--green)' + '08' }}>
              <p className="text-[10px] text-[var(--text3)] mb-1">Totalt skadebelopp</p>
              <p className="text-2xl font-mono font-bold text-[var(--green)]">
                {builder.totalClaimSEK.toLocaleString('sv-SE')} SEK
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--green)]/20" style={{ background: 'var(--green)' + '08' }}>
              <Shield size={14} className="text-[var(--green)]" />
              <div>
                <p className="text-[10px] font-medium text-[var(--green)]">BeetleSense-verifierad</p>
                <p className="text-[10px] text-[var(--text3)]">
                  Satellitbevis och volymberäkning genererade automatiskt
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Generate PDF */}
        {builder.step === 6 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-[var(--green)]" />
              <p className="text-xs text-[var(--text)]">Generera skaderapport (PDF)</p>
            </div>

            {!pdfGenerated ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center mx-auto mb-4">
                  <FileText size={28} className="text-[var(--green)]" />
                </div>
                <p className="text-sm text-[var(--text)] mb-2">Redo att generera</p>
                <p className="text-xs text-[var(--text3)] mb-4">
                  Rapporten inkluderar satellitbevis, NDVI-jämförelse, volymberäkning och skadebelopp.
                </p>
                <button
                  onClick={() => setPdfGenerated(true)}
                  className="px-6 py-2.5 rounded-lg bg-[var(--green)] text-[#030d05] text-sm font-semibold hover:bg-[var(--green)]/90 transition-colors"
                >
                  Generera PDF-rapport
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* PDF preview mockup */}
                <div className="rounded-lg border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg3)' }}>
                  <div className="p-4 border-b border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[var(--text)]">SKADERAPPORT</p>
                        <p className="text-[10px] text-[var(--text3)]">BeetleSense Insurance Claim Report</p>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--green)]/10 border border-[var(--green)]/20">
                        <Shield size={10} className="text-[var(--green)]" />
                        <span className="text-[8px] font-mono text-[var(--green)]">VERIFIERAD</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-[var(--text3)]">Typ:</span>
                      <span className="text-[10px] font-mono text-[var(--text)]">
                        {DAMAGE_TYPES.find((d) => d.type === builder.damageType)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-[var(--text3)]">Areal:</span>
                      <span className="text-[10px] font-mono text-[var(--text)]">{builder.affectedAreaHa} ha</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-[var(--text3)]">Volym:</span>
                      <span className="text-[10px] font-mono text-[var(--text)]">{builder.volumeLossM3.toLocaleString('sv-SE')} m&sup3;</span>
                    </div>
                    <div className="h-px bg-[var(--border)]" />
                    <div className="flex justify-between">
                      <span className="text-[10px] font-semibold text-[var(--text)]">Skadebelopp:</span>
                      <span className="text-[10px] font-mono font-semibold text-[var(--green)]">
                        {builder.totalClaimSEK.toLocaleString('sv-SE')} SEK
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-lg bg-[var(--green)] text-[#030d05] text-xs font-semibold hover:bg-[var(--green)]/90 transition-colors">
                    Ladda ner PDF
                  </button>
                  <button className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text)] hover:bg-[var(--bg3)] transition-colors">
                    Skicka till försäkringsbolag
                  </button>
                </div>

                <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <p className="text-[10px] text-blue-400">
                    BeetleSense upptäckte skadan 2 veckor innan ditt försäkringsbolag kände till den och sammanställde skadebevisningen automatiskt.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--border)]">
          <button
            onClick={handleBack}
            disabled={builder.step === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} /> Tillbaka
          </button>
          {builder.step < 6 && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--green)] text-[#030d05] text-xs font-semibold hover:bg-[var(--green)]/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Nästa <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
