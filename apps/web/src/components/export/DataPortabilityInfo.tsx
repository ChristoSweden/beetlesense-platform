/**
 * DataPortabilityInfo — trust messaging, GDPR badge, interoperability,
 * comparison table vs competitors, and import CTA.
 */

import {
  Shield,
  Lock,
  Globe,
  ArrowRightLeft,
  Check,
  X,
  Minus,
  Zap,
  Code,
} from 'lucide-react';

// ─── Comparison data ───

interface ComparisonRow {
  feature: string;
  beetlesense: 'full' | 'partial' | 'no';
  sodra: 'full' | 'partial' | 'no';
  pcskog: 'full' | 'partial' | 'no';
}

const COMPARISON: ComparisonRow[] = [
  { feature: 'Fullstandig dataexport', beetlesense: 'full', sodra: 'no', pcskog: 'partial' },
  { feature: 'GeoJSON / Shapefile', beetlesense: 'full', sodra: 'no', pcskog: 'full' },
  { feature: 'CSV / Excel', beetlesense: 'full', sodra: 'partial', pcskog: 'full' },
  { feature: 'API-atkomst', beetlesense: 'full', sodra: 'no', pcskog: 'no' },
  { feature: 'AI-historik export', beetlesense: 'full', sodra: 'no', pcskog: 'no' },
  { feature: 'GDPR art. 20 portabilitet', beetlesense: 'full', sodra: 'partial', pcskog: 'partial' },
  { feature: 'Molnbaserad', beetlesense: 'full', sodra: 'full', pcskog: 'no' },
  { feature: 'Import fran andra system', beetlesense: 'full', sodra: 'no', pcskog: 'partial' },
];

function StatusIcon({ status }: { status: 'full' | 'partial' | 'no' }) {
  if (status === 'full') return <Check size={14} className="text-[var(--green)]" />;
  if (status === 'partial') return <Minus size={14} className="text-amber-400" />;
  return <X size={14} className="text-red-400/60" />;
}

// ─── Compatible tools ───

const COMPATIBLE_TOOLS = [
  { name: 'pcSKOG', desc: 'Skogsbruksplaner' },
  { name: 'Heureka', desc: 'SLU beslutsverktyg' },
  { name: 'QGIS', desc: 'GIS-programvara' },
  { name: 'Google Earth', desc: 'KML-visualisering' },
  { name: 'ArcGIS', desc: 'Esri GIS-plattform' },
  { name: 'Excel', desc: 'Kalkylblad' },
];

export function DataPortabilityInfo() {
  return (
    <div className="space-y-6">
      {/* Trust messaging */}
      <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--green)]/15 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Vi tror pa dataportabilitet
            </h3>
            <p className="text-xs text-[var(--text2)] mt-1 leading-relaxed">
              Din skogsdata tillhor dig — inte oss. Vi gor det enkelt att exportera allt, nar som helst,
              i oppna format. Ingen inlasning, inga barriarer. Om du vill flytta till ett annat system
              sa ska det vara smidigt. Sa bygger vi fortroende.
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-4 ml-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
            <Lock size={10} />
            GDPR Art. 20
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
            <Globe size={10} />
            Oppna format
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Code size={10} />
            REST API (Pro)
          </span>
        </div>
      </div>

      {/* Interoperability */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRightLeft size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Fungerar med dina verktyg</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMPATIBLE_TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)]"
            >
              <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
              <div>
                <span className="text-xs font-medium text-[var(--text)]">{tool.name}</span>
                <p className="text-[10px] text-[var(--text3)]">{tool.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Jamfor dataportabilitet
          </h3>
          <p className="text-[11px] text-[var(--text3)] mt-0.5">
            Se hur BeetleSense jamfors med andra plattformar
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--bg2)]">
                <th className="px-4 py-2.5 text-left font-semibold text-[var(--text3)]">Funktion</th>
                <th className="px-4 py-2.5 text-center font-semibold text-[var(--green)]">
                  BeetleSense
                </th>
                <th className="px-4 py-2.5 text-center font-semibold text-[var(--text3)]">
                  Sodra
                </th>
                <th className="px-4 py-2.5 text-center font-semibold text-[var(--text3)]">
                  pcSKOG
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-t border-[var(--border)] hover:bg-[var(--bg2)]/50">
                  <td className="px-4 py-2 text-[var(--text2)]">{row.feature}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center">
                      <StatusIcon status={row.beetlesense} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center">
                      <StatusIcon status={row.sodra} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center">
                      <StatusIcon status={row.pcskog} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API access CTA */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start gap-3">
          <Zap size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">REST API for Pro-anvandare</h3>
            <p className="text-[11px] text-[var(--text3)] mt-1 leading-relaxed">
              Med Pro-planen far du full API-atkomst till alla dina data. Bygg egna integrationer,
              koppla ihop med affars-system, eller automatisera exporter. Dokumentation finns pa
              docs.beetlesense.ai.
            </p>
            <button className="mt-2 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Las mer om API-atkomst &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
