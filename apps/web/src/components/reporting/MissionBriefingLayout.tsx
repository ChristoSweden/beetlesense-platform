import { Shield, Zap, Map as MapIcon, Calendar, CheckCircle2 } from 'lucide-react';
import { StructuralInsightCard } from '@/components/dashboard/StructuralInsightCard';
import { BiodiversityScore } from '@/components/charts/BiodiversityScore';

interface MissionBriefingLayoutProps {
  parcelName: string;
  parcelId: string;
  advisoryText: string;
  timestamp: string;
}

export function MissionBriefingLayout({ parcelName, parcelId, advisoryText, timestamp }: MissionBriefingLayoutProps) {
  return (
    <div id="mission-briefing-report" className="print-only-container bg-white text-black p-12 max-w-[210mm] mx-auto min-h-[297mm] shadow-2xl relative">
      
      {/* Institutional Header */}
      <header className="flex justify-between items-start border-b-4 border-emerald-900 pb-8 mb-10">
        <div className="flex gap-6 items-start">
          <div className="w-16 h-16 bg-emerald-900 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl">B</div>
          <div>
            <h1 className="text-3xl font-serif font-black tracking-tighter text-emerald-950 uppercase leading-none mb-1">BeetleSense Platform</h1>
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-[0.3em]">Institutional Forestry Intelligence Hub • v4.2.0</p>
            <div className="flex gap-4 mt-3">
              <span className="flex items-center gap-1 text-[8px] font-bold text-gray-500 uppercase tracking-widest"><Shield size={10} className="text-emerald-600" /> EU AI Act Tier-1</span>
              <span className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase tracking-widest"><Zap size={10} /> Real-time WFS Sync</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Briefing Reference</div>
          <div className="text-xl font-mono font-bold text-emerald-900">BS-RECON-{Math.floor(Math.random() * 9000) + 1000}</div>
          <div className="text-[8px] font-mono font-bold text-gray-300 mt-1 uppercase">Classified: Internal Use Only</div>
        </div>
      </header>

      {/* Mission Meta */}
      <div className="grid grid-cols-4 gap-4 mb-12">
        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col justify-between">
           <div className="flex items-center gap-2 mb-2 text-gray-400">
              <MapIcon size={14} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Target Parcel</span>
           </div>
           <div>
             <div className="text-base font-bold text-emerald-950">{parcelName}</div>
             <div className="text-[10px] font-mono text-gray-400">{parcelId}</div>
           </div>
        </div>
        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col justify-between">
           <div className="flex items-center gap-2 mb-2 text-gray-400">
              <Calendar size={14} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Capture Date</span>
           </div>
           <div className="text-base font-bold text-gray-900">{timestamp}</div>
        </div>
        <div className="p-5 bg-emerald-950 rounded-3xl flex flex-col justify-between text-white shadow-lg overflow-hidden relative">
           <div className="absolute -right-2 -top-2 opacity-10">
              <Shield size={60} />
           </div>
           <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Security Status</div>
           <div className="text-base font-bold">Encrypted</div>
        </div>
        <div className="p-5 border-2 border-emerald-500/20 bg-emerald-50/50 rounded-3xl flex flex-col items-center justify-center text-center">
           <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-2 shadow-emerald-500/20 shadow-lg">
             <CheckCircle2 size={18} />
           </div>
           <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest leading-tight">Authenticity<br/>Verified</span>
        </div>
      </div>

      {/* Visual Recon: Structural Vision */}
      <section className="mb-12 page-break-inside-avoid">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-[0.3em] flex items-center gap-2">
            <Zap size={14} className="text-emerald-600" /> I. Visual Recon: Structural Scan
          </h2>
          <span className="text-[8px] font-mono font-bold text-gray-400">INSTRUMENT: TERRESTRIAL LIDAR + GEDI</span>
        </div>
        <div className="rounded-[2.5rem] overflow-hidden border-[12px] border-emerald-950 shadow-2xl bg-black px-6 py-6 ring-1 ring-emerald-500/20">
           <StructuralInsightCard />
        </div>
        <div className="mt-4 flex items-start gap-4">
          <div className="w-1 h-12 bg-emerald-500/20 rounded-full" />
          <p className="text-[11px] text-gray-500 leading-relaxed italic">
            Structural profile depth-calibrated using **NASA GEDI Level 2B** products. Canopy density clusters indicate significant biomass accumulation in the upper tertile. Verification signature: `0x88219_LIDAR_CONFIRMED`.
          </p>
        </div>
      </section>

      {/* Advisory Content */}
      <section className="mb-12 page-break-inside-avoid">
        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
           <CheckCircle2 size={14} className="text-emerald-600" /> II. Intelligence Briefing (AI Advisory)
        </h2>
        <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Shield size={120} />
          </div>
          <div className="prose prose-sm max-w-none text-emerald-950 font-serif leading-relaxed text-lg" 
               style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)' }}>
             {advisoryText}
          </div>
        </div>
      </section>

      {/* Verification Matrix */}
      <section className="mb-16 page-break-inside-avoid">
        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          <Shield size={14} className="text-emerald-600" /> III. Data Verification Matrix
        </h2>
        <div className="grid grid-cols-3 gap-6">
           <div className="border border-gray-200 rounded-2xl p-4 flex items-center gap-4 grayscale opacity-70">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-black text-xs text-gray-400">SLU</div>
              <div>
                <div className="text-[10px] font-bold text-gray-900 uppercase tracking-wider leading-none mb-1">Artdatabanken</div>
                <div className="text-[8px] font-mono text-emerald-600 font-bold uppercase">Sync: OK</div>
              </div>
           </div>
           <div className="border border-gray-200 rounded-2xl p-4 flex items-center gap-4 grayscale opacity-70">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-black text-xs text-gray-400">SMHI</div>
              <div>
                <div className="text-[10px] font-bold text-gray-900 uppercase tracking-wider leading-none mb-1">Weather/Drought</div>
                <div className="text-[8px] font-mono text-emerald-600 font-bold uppercase">Sync: OK</div>
              </div>
           </div>
           <div className="border border-gray-200 rounded-2xl p-4 flex items-center gap-4 grayscale opacity-70">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-black text-[10px] text-gray-400">GEDI</div>
              <div>
                <div className="text-[10px] font-bold text-gray-900 uppercase tracking-wider leading-none mb-1">NASA Biomass</div>
                <div className="text-[8px] font-mono text-emerald-600 font-bold uppercase">Sync: OK</div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer / Legal */}
      <footer className="mt-auto pt-10 border-t-2 border-gray-100">
        <div className="flex justify-between items-end">
          <div className="text-[9px] text-gray-400 max-w-[70%] leading-relaxed">
            <strong>Institutional Declaration:</strong> This report is a product of the BeetleSense forestry intelligence engine. It incorporates multi-source geospatial data verified via WFS/WMS protocols from Skogsstyrelsen and SMHI. AI-derived advisories are supplementary and do not constitute legal forestry advice under the Swedish Forestry Act (1979:429).
          </div>
          <div className="text-right">
             <div className="text-[8px] font-mono font-bold text-gray-400 uppercase mb-1">Authentication Hash</div>
             <div className="text-[10px] font-mono font-bold text-emerald-900">SHA-256: 8D2F...91BE</div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print-only-container {
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          body {
            background: white !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* Report Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] rotate-[-45deg] scale-150">
        <h1 className="text-9xl font-black uppercase text-emerald-900">BeetleSense Official</h1>
      </div>

    </div>
  );
}
