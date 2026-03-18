import { useState } from 'react';
import {
  FileText,
  Download,
  Share2,
  Building2,
  Shield,
  Users,
  TreePine,
  Table,
  Map,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { ForestPlan } from '@/hooks/useForestPlan';

interface PlanExportProps {
  plan: ForestPlan;
  formatSEK: (v: number) => string;
}

type ExportFormat = 'pdf' | 'excel' | 'gis';
type ShareTarget = 'bank' | 'insurance' | 'skogsstyrelsen' | 'family';

const FORMATS: { key: ExportFormat; label: string; icon: typeof FileText; description: string }[] = [
  { key: 'pdf', label: 'PDF-rapport', icon: FileText, description: 'Fullständig rapport med sammanfattning, kartor och prognoser' },
  { key: 'excel', label: 'Excel (årsplan)', icon: Table, description: 'Årliga åtgärder med kostnader, intäkter och volymer' },
  { key: 'gis', label: 'GIS (spatial plan)', icon: Map, description: 'Georefererad data för import till GIS-system' },
];

const SHARE_TARGETS: { key: ShareTarget; label: string; icon: typeof Building2; description: string }[] = [
  { key: 'bank', label: 'Bank (för lån)', icon: Building2, description: 'Skogsvärdering och intäktsprognos' },
  { key: 'insurance', label: 'Försäkringsbolag', icon: Shield, description: 'Riskbedömning och beredskapsplaner' },
  { key: 'skogsstyrelsen', label: 'Skogsstyrelsen', icon: TreePine, description: 'Skogsbruksplan enligt standardformat' },
  { key: 'family', label: 'Familj & arvingar', icon: Users, description: 'Generationsplan med lättläst sammanfattning' },
];

const PDF_SECTIONS = [
  'Sammanfattning (Executive Summary)',
  'Fastighetsöversikt & beståndsdata',
  'Målprofil & prioriteringar',
  '50-års åtgärdsschema',
  'Intäkts- och värdeprognoser',
  'Kolbindning & biodiversitet',
  'Beredskapsplaner',
  'Metodik & datakällor',
];

export function PlanExport({ plan, formatSEK }: PlanExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportedFormats, setExportedFormats] = useState<Set<ExportFormat>>(new Set());
  const [sharingTarget, setSharingTarget] = useState<ShareTarget | null>(null);
  const [sharedTargets, setSharedTargets] = useState<Set<ShareTarget>>(new Set());

  const handleExport = (format: ExportFormat) => {
    setExportingFormat(format);
    setTimeout(() => {
      setExportingFormat(null);
      setExportedFormats(prev => new Set(prev).add(format));
    }, 1500);
  };

  const handleShare = (target: ShareTarget) => {
    setSharingTarget(target);
    setTimeout(() => {
      setSharingTarget(null);
      setSharedTargets(prev => new Set(prev).add(target));
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* PDF Preview */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <div className="p-5 border-b border-[var(--border)]" style={{ background: 'rgba(74, 222, 128, 0.03)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-serif font-bold text-[var(--text)]">Skogsbruksplan 2026-2076</h3>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">
                Genererad {new Date(plan.generatedAt).toLocaleDateString('sv-SE')} &middot; BeetleSense AI
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'rgba(74, 222, 128, 0.3)', background: 'rgba(74, 222, 128, 0.08)' }}>
              <Sparkles size={12} className="text-[#4ade80]" />
              <span className="text-[9px] font-semibold text-[#4ade80] uppercase tracking-wider">
                Godkänd av BeetleSense AI
              </span>
            </div>
          </div>

          {/* Mini report preview */}
          <div className="rounded-lg border border-[var(--border)] p-4 space-y-3" style={{ background: 'var(--bg)' }}>
            <div className="text-center pb-3 border-b border-[var(--border)]">
              <p className="text-[11px] font-serif font-bold text-[var(--text)]">SKOGSBRUKSPLAN</p>
              <p className="text-[9px] text-[var(--text3)] mt-1">Planeringsperiod: 2026-2076 (50 år)</p>
              <p className="text-[9px] text-[var(--text3)]">Profil: {plan.profileLabel}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center py-2">
              <div>
                <p className="text-[8px] text-[var(--text3)] uppercase">Total areal</p>
                <p className="text-[11px] font-mono font-semibold text-[var(--text)]">214.8 ha</p>
              </div>
              <div>
                <p className="text-[8px] text-[var(--text3)] uppercase">Planerade intäkter</p>
                <p className="text-[11px] font-mono font-semibold text-[#4ade80]">{formatSEK(plan.totalRevenue50y)}</p>
              </div>
              <div>
                <p className="text-[8px] text-[var(--text3)] uppercase">Åtgärder</p>
                <p className="text-[11px] font-mono font-semibold text-[var(--text)]">{plan.actions.length} st</p>
              </div>
            </div>

            <div>
              <p className="text-[8px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1.5">Innehåll</p>
              <div className="grid grid-cols-2 gap-1">
                {PDF_SECTIONS.map((section, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px] text-[var(--text2)]">
                    <span className="text-[var(--text3)]">{i + 1}.</span>
                    {section}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Export format selection */}
        <div className="p-4">
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-3">
            Exportformat
          </p>
          <div className="space-y-2">
            {FORMATS.map(({ key, label, icon: Icon, description }) => {
              const isExporting = exportingFormat === key;
              const isExported = exportedFormats.has(key);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedFormat === key ? 'border-[#4ade80]/30 bg-[#4ade80]/5' : 'border-[var(--border)] hover:bg-[var(--bg3)]'
                  }`}
                  onClick={() => setSelectedFormat(key)}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: selectedFormat === key ? 'rgba(74, 222, 128, 0.12)' : 'var(--bg3)' }}
                  >
                    <Icon size={16} style={{ color: selectedFormat === key ? '#4ade80' : 'var(--text3)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[var(--text)]">{label}</p>
                    <p className="text-[9px] text-[var(--text3)]">{description}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(key); }}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border border-[var(--border)] hover:bg-[var(--bg3)] disabled:opacity-50"
                    style={isExported ? { color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.3)' } : { color: 'var(--text2)' }}
                  >
                    {isExporting ? (
                      <RefreshCw size={11} className="animate-spin" />
                    ) : isExported ? (
                      <CheckCircle2 size={11} />
                    ) : (
                      <Download size={11} />
                    )}
                    {isExporting ? 'Exporterar...' : isExported ? 'Exporterad' : 'Ladda ner'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Share section */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Share2 size={14} className="text-[#4ade80]" />
          <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
            Dela plan med
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SHARE_TARGETS.map(({ key, label, icon: Icon, description }) => {
            const isSharing = sharingTarget === key;
            const isShared = sharedTargets.has(key);
            return (
              <button
                key={key}
                onClick={() => handleShare(key)}
                disabled={isSharing}
                className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all text-left disabled:opacity-50 ${
                  isShared ? 'border-[#4ade80]/30 bg-[#4ade80]/5' : 'border-[var(--border)] hover:bg-[var(--bg3)]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isShared ? 'rgba(74, 222, 128, 0.12)' : 'var(--bg3)' }}>
                  {isSharing ? (
                    <RefreshCw size={14} className="animate-spin text-[var(--text3)]" />
                  ) : isShared ? (
                    <CheckCircle2 size={14} className="text-[#4ade80]" />
                  ) : (
                    <Icon size={14} className="text-[var(--text3)]" />
                  )}
                </div>
                <div>
                  <p className={`text-[11px] font-medium ${isShared ? 'text-[#4ade80]' : 'text-[var(--text)]'}`}>
                    {label}
                  </p>
                  <p className="text-[9px] text-[var(--text3)] mt-0.5">{description}</p>
                  {isShared && (
                    <p className="text-[8px] text-[#4ade80] mt-1">Delad framgångsrikt</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Update plan button */}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]"
      >
        <RefreshCw size={15} />
        Uppdatera plan (kvartalsvis uppdatering med ny data)
      </button>

      {/* Disclaimer */}
      <p className="text-[9px] text-[var(--text3)] italic leading-relaxed">
        Denna skogsbruksplan har genererats av BeetleSense AI baserat på tillgängliga data och
        angivna målprioriteringar. Planen är ett beslutsunderlag och ersätter inte professionell
        skoglig rådgivning. Prognoser baseras på historiska data och modellberäkningar —
        verkliga utfall kan avvika. Uppdatera planen kvartalsvis för bästa precision.
      </p>
    </div>
  );
}
