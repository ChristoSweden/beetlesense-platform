import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Printer,
  Download,
  MapPin,
  TreePine,
  AlertTriangle,
  Camera,
  Navigation,
  Shield,
  CheckCircle,
  Clock,
  PenTool,
  Bug,
} from 'lucide-react';

/* ── Demo report data ────────────────────────────────────── */

const REPORT = {
  id: 'RPT-2026-0315',
  generatedAt: '2026-03-17T14:30:00Z',
  parcel: {
    id: 'P-2026-0412',
    name: 'Granudden 4:12',
    municipality: 'Vetlanda',
    county: 'Jönköpings län',
    owner: 'Anna Svensson',
    area_ha: 28,
    coordinates: '57.4287° N, 15.0822° E',
  },
  inspector: {
    name: 'Lars Eriksson',
    certificationId: 'SKS-2024-1847',
    organization: 'Skogsstyrelsen — Distrikt Jönköping',
  },
  inspectionDate: '2026-03-15',
  nextInspectionDue: '2026-06-15',
  treeAssessments: [
    { species: 'Gran (Norway Spruce)', barkBeetleDamage: 3, crownDefoliation: 40, barkCondition: 'Borrhal synliga', healthScore: 35 },
    { species: 'Tall (Scots Pine)', needleLoss: 15, resinBleeding: false, barkDamage: 'Lindrig', healthScore: 78 },
    { species: 'Löv (Broadleaf)', leafHealth: 'God', crownDensity: 'Normal', healthScore: 85 },
  ],
  damageClassification: 'Barkborreangrepp',
  severity: 3,
  severityLabel: 'Måttlig (moderate)',
  recommendation: 'Avverkning (Felling)',
  photos: [
    { id: 'ph1', filename: 'IMG_2026_0315_001.jpg', gps: '57.4290° N, 15.0825° E', description: 'Borrhal i granstam, östra sidan' },
    { id: 'ph2', filename: 'IMG_2026_0315_002.jpg', gps: '57.4288° N, 15.0830° E', description: 'Barkavfall vid rotbasen' },
    { id: 'ph3', filename: 'IMG_2026_0315_003.jpg', gps: '57.4285° N, 15.0818° E', description: 'Krondefoliering, översikt' },
    { id: 'ph4', filename: 'IMG_2026_0315_004.jpg', gps: '57.4292° N, 15.0822° E', description: 'Friska tallar i angränsande bestånd' },
  ],
  waypoints: [
    { label: 'Punkt A', lat: '57.4290', lng: '15.0825', damageType: 'Barkborreangrepp' },
    { label: 'Punkt B', lat: '57.4285', lng: '15.0818', damageType: 'Torka' },
    { label: 'Punkt C', lat: '57.4292', lng: '15.0822', damageType: 'Ingen skada' },
  ],
  regulatoryFlags: {
    biotopskydd: false,
    nyckelbiotop: true,
    natura2000: false,
    strandskydd: false,
  },
  actionItems: [
    { action: 'Avverka angripna granar i område A', deadline: '2026-04-15', priority: 'high' as const },
    { action: 'Inventera angränsande bestånd för spridning', deadline: '2026-04-01', priority: 'high' as const },
    { action: 'Kontakta Skogsstyrelsen angående nyckelbiotopstatus', deadline: '2026-03-25', priority: 'medium' as const },
    { action: 'Planera återplantering efter avverkning', deadline: '2026-09-01', priority: 'low' as const },
    { action: 'Uppföljande inspektion', deadline: '2026-06-15', priority: 'medium' as const },
  ],
};

/* ── Helpers ──────────────────────────────────────────────── */

function healthColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Hög' },
  medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Medel' },
  low: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Låg' },
};

/* ── Component ───────────────────────────────────────────── */

export default function InspectionReportPage() {
  const handlePrint = () => window.print();
  const handleExport = () => alert('Export som PDF (demo)');

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Breadcrumb — hidden in print */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6 print:hidden">
        <Link to="/inspector/dashboard" className="hover:text-[var(--text2)]">
          Inspektörspanel
        </Link>
        <ChevronRight size={12} />
        <Link to="/inspector/reports" className="hover:text-[var(--text2)]">
          Rapporter
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{REPORT.id}</span>
      </nav>

      {/* Actions bar — hidden in print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-xl font-serif font-bold text-[var(--text)]">
          Inspektionsrapport
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <Printer size={14} />
            Skriv ut
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
          >
            <Download size={14} />
            Exportera PDF
          </button>
        </div>
      </div>

      {/* ─── Report Content ─── */}
      <div className="space-y-6 print:space-y-4">
        {/* Header / Letterhead */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6 print:border-black print:bg-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bug size={20} className="text-[var(--green)] print:text-black" />
                <span className="text-lg font-serif font-bold text-[var(--text)] print:text-black">
                  BeetleSense.ai
                </span>
              </div>
              <p className="text-[10px] text-[var(--text3)] print:text-gray-600">
                AI-driven skogsintelligens | Inspektionsrapport
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono font-semibold text-[var(--text)] print:text-black">
                {REPORT.id}
              </p>
              <p className="text-[10px] text-[var(--text3)] font-mono print:text-gray-600">
                Genererad {new Date(REPORT.generatedAt).toLocaleString('sv-SE')}
              </p>
            </div>
          </div>

          <div className="h-px bg-[var(--border)] print:bg-gray-300 mb-4" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
            <div>
              <p className="text-[var(--text3)] print:text-gray-500 mb-0.5">Fastighet</p>
              <p className="font-medium text-[var(--text)] print:text-black">{REPORT.parcel.name}</p>
            </div>
            <div>
              <p className="text-[var(--text3)] print:text-gray-500 mb-0.5">Kommun</p>
              <p className="font-medium text-[var(--text)] print:text-black">{REPORT.parcel.municipality}</p>
            </div>
            <div>
              <p className="text-[var(--text3)] print:text-gray-500 mb-0.5">Markägare</p>
              <p className="font-medium text-[var(--text)] print:text-black">{REPORT.parcel.owner}</p>
            </div>
            <div>
              <p className="text-[var(--text3)] print:text-gray-500 mb-0.5">Areal</p>
              <p className="font-medium text-[var(--text)] print:text-black">{REPORT.parcel.area_ha} ha</p>
            </div>
          </div>
        </div>

        {/* Tree Health Assessment */}
        <ReportSection icon={TreePine} title="Trädhälsobedömning">
          <div className="space-y-3">
            {REPORT.treeAssessments.map((tree) => (
              <div
                key={tree.species}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 print:border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-[var(--text)] print:text-black">
                    {tree.species}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text3)] print:text-gray-500">
                      Hälsovärde
                    </span>
                    <span
                      className="text-sm font-bold font-mono"
                      style={{ color: healthColor(tree.healthScore) }}
                    >
                      {tree.healthScore}/100
                    </span>
                  </div>
                </div>

                {/* Health bar */}
                <div className="w-full h-2 rounded-full bg-[var(--bg3)] print:bg-gray-200 mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${tree.healthScore}%`,
                      backgroundColor: healthColor(tree.healthScore),
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                  {tree.barkBeetleDamage !== undefined && (
                    <InfoPill label="Barkborreskada" value={`Nivå ${tree.barkBeetleDamage}/5`} />
                  )}
                  {tree.crownDefoliation !== undefined && (
                    <InfoPill label="Krondefoliering" value={`${tree.crownDefoliation}%`} />
                  )}
                  {tree.barkCondition && (
                    <InfoPill label="Barkskick" value={tree.barkCondition} />
                  )}
                  {tree.needleLoss !== undefined && (
                    <InfoPill label="Barrförlust" value={`${tree.needleLoss}%`} />
                  )}
                  {tree.resinBleeding !== undefined && (
                    <InfoPill label="Kåda" value={tree.resinBleeding ? 'Ja' : 'Nej'} />
                  )}
                  {tree.barkDamage && (
                    <InfoPill label="Barkskada" value={tree.barkDamage} />
                  )}
                  {tree.leafHealth && (
                    <InfoPill label="Bladhälsa" value={tree.leafHealth} />
                  )}
                  {tree.crownDensity && (
                    <InfoPill label="Krontäthet" value={tree.crownDensity} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Damage + Severity */}
        <ReportSection icon={AlertTriangle} title="Skadeklassificering och allvarlighetsgrad">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 print:border-gray-200">
              <p className="text-[10px] text-[var(--text3)] print:text-gray-500 mb-1">Skadekategori</p>
              <p className="text-sm font-semibold text-[var(--text)] print:text-black">
                {REPORT.damageClassification}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 print:border-gray-200">
              <p className="text-[10px] text-[var(--text3)] print:text-gray-500 mb-1">Allvarlighetsgrad</p>
              <p className="text-sm font-semibold text-amber-400 print:text-amber-600">
                {REPORT.severity}/5 — {REPORT.severityLabel}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 print:border-gray-200">
              <p className="text-[10px] text-[var(--text3)] print:text-gray-500 mb-1">Rekommendation</p>
              <p className="text-sm font-semibold text-[var(--green)] print:text-green-700">
                {REPORT.recommendation}
              </p>
            </div>
          </div>
        </ReportSection>

        {/* Risk Heatmap (placeholder) */}
        <ReportSection icon={MapPin} title="Riskkarta">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] overflow-hidden h-48 relative print:border-gray-200">
            <div className="absolute inset-0 bg-[#071a0b] print:bg-gray-100">
              {/* Simulated heatmap zones */}
              <div className="absolute top-[15%] left-[20%] w-24 h-24 rounded-full bg-red-500/20 blur-xl" />
              <div className="absolute top-[40%] left-[55%] w-20 h-20 rounded-full bg-amber-500/15 blur-xl" />
              <div className="absolute top-[60%] left-[30%] w-16 h-16 rounded-full bg-emerald-500/10 blur-xl" />

              {/* Waypoint dots */}
              {REPORT.waypoints.map((wp, i) => (
                <div
                  key={wp.label}
                  className="absolute flex items-center gap-1"
                  style={{ top: `${20 + i * 25}%`, left: `${25 + i * 20}%` }}
                >
                  <div className="w-3 h-3 rounded-full bg-white/80 border-2 border-[var(--green)] print:border-green-700" />
                  <span className="text-[9px] font-mono text-white/70 print:text-gray-600">
                    {wp.label}
                  </span>
                </div>
              ))}

              {/* Legend */}
              <div className="absolute bottom-2 right-2 bg-[var(--bg2)] border border-[var(--border)] rounded-md px-2 py-1.5 print:bg-white print:border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[8px] text-[var(--text3)]">Hög risk</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[8px] text-[var(--text3)]">Medel</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[8px] text-[var(--text3)]">Låg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ReportSection>

        {/* Photo Grid */}
        <ReportSection icon={Camera} title="Fotodokumentation">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REPORT.photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] overflow-hidden print:border-gray-200"
              >
                <div className="aspect-square bg-[var(--bg3)] print:bg-gray-100 flex items-center justify-center">
                  <Camera size={24} className="text-[var(--text3)] print:text-gray-400" />
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-mono text-[var(--text3)] print:text-gray-500 truncate">
                    {photo.filename}
                  </p>
                  <p className="text-[9px] text-[var(--text3)] print:text-gray-400 mt-0.5 line-clamp-2">
                    {photo.description}
                  </p>
                  <p className="text-[8px] text-[var(--text3)] print:text-gray-400 font-mono mt-0.5">
                    {photo.gps}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* GPS Waypoints */}
        <ReportSection icon={Navigation} title="GPS-punkter">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] overflow-hidden print:border-gray-200">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border)] print:border-gray-200">
                  <th className="text-left px-4 py-2 text-[var(--text3)] print:text-gray-500 font-medium">Punkt</th>
                  <th className="text-left px-4 py-2 text-[var(--text3)] print:text-gray-500 font-medium">Latitud</th>
                  <th className="text-left px-4 py-2 text-[var(--text3)] print:text-gray-500 font-medium">Longitud</th>
                  <th className="text-left px-4 py-2 text-[var(--text3)] print:text-gray-500 font-medium">Skadetyp</th>
                </tr>
              </thead>
              <tbody>
                {REPORT.waypoints.map((wp) => (
                  <tr key={wp.label} className="border-b border-[var(--border)]/50 print:border-gray-100">
                    <td className="px-4 py-2 font-medium text-[var(--text)] print:text-black">{wp.label}</td>
                    <td className="px-4 py-2 font-mono text-[var(--text2)] print:text-gray-700">{wp.lat}°</td>
                    <td className="px-4 py-2 font-mono text-[var(--text2)] print:text-gray-700">{wp.lng}°</td>
                    <td className="px-4 py-2 text-[var(--text2)] print:text-gray-700">{wp.damageType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        {/* Action Items */}
        <ReportSection icon={CheckCircle} title="Åtgärdspunkter">
          <div className="space-y-2">
            {REPORT.actionItems.map((item, i) => {
              const p = PRIORITY_STYLES[item.priority];
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 print:border-gray-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${p.bg} ${p.text} shrink-0`}>
                      {p.label}
                    </span>
                    <span className="text-xs text-[var(--text)] print:text-black truncate">
                      {item.action}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text3)] print:text-gray-500 shrink-0 ml-3 flex items-center gap-1">
                    <Clock size={10} />
                    {item.deadline}
                  </span>
                </div>
              );
            })}
          </div>
        </ReportSection>

        {/* Regulatory Compliance */}
        <ReportSection icon={Shield} title="Regelverksefterlevnad">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'biotopskydd', label: 'Biotopskydd' },
              { key: 'nyckelbiotop', label: 'Nyckelbiotop' },
              { key: 'natura2000', label: 'Natura 2000' },
              { key: 'strandskydd', label: 'Strandskydd' },
            ].map((flag) => {
              const active = REPORT.regulatoryFlags[flag.key as keyof typeof REPORT.regulatoryFlags];
              return (
                <div
                  key={flag.key}
                  className={`rounded-lg border p-3 text-center ${
                    active
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-[var(--border)] bg-[var(--bg)]'
                  } print:border-gray-200`}
                >
                  <p className="text-xs font-medium text-[var(--text)] print:text-black mb-0.5">
                    {flag.label}
                  </p>
                  <p className={`text-[10px] font-semibold ${active ? 'text-amber-400' : 'text-[var(--text3)]'} print:text-gray-600`}>
                    {active ? 'TILLÄMPLIG' : 'Ej tillämplig'}
                  </p>
                </div>
              );
            })}
          </div>
        </ReportSection>

        {/* Inspector Sign-off */}
        <ReportSection icon={PenTool} title="Signering">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[var(--text3)] print:text-gray-500 mb-0.5">Inspektör</p>
              <p className="text-sm font-semibold text-[var(--text)] print:text-black">
                {REPORT.inspector.name}
              </p>
              <p className="text-[10px] text-[var(--text3)] print:text-gray-500">
                {REPORT.inspector.organization}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)] print:text-gray-500 mb-0.5">Certifierings-ID</p>
              <p className="text-sm font-mono font-semibold text-[var(--text)] print:text-black">
                {REPORT.inspector.certificationId}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)] print:text-gray-500 mb-0.5">Inspektionsdatum</p>
              <p className="text-sm font-mono text-[var(--text)] print:text-black">
                {REPORT.inspectionDate}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)] print:text-gray-500 mb-0.5">Nästa inspektion</p>
              <p className="text-sm font-mono text-[var(--text)] print:text-black">
                {REPORT.nextInspectionDue}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border)] print:border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-32 border-b border-[var(--text3)] print:border-gray-400" />
              <span className="text-[10px] text-[var(--text3)] print:text-gray-500">
                Signatur
              </span>
            </div>
          </div>
        </ReportSection>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function ReportSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof TreePine;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 print:border-gray-200 print:bg-white print:break-inside-avoid">
      <h2 className="text-sm font-serif font-bold text-[var(--text)] print:text-black flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[var(--green)] print:text-green-700" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--bg3)] print:bg-gray-100 px-3 py-1.5">
      <p className="text-[9px] text-[var(--text3)] print:text-gray-500">{label}</p>
      <p className="text-[11px] font-medium text-[var(--text)] print:text-black">{value}</p>
    </div>
  );
}
