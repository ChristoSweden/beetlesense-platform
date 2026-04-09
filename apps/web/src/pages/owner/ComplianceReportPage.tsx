/**
 * Compliance Report Page
 *
 * Generates self-assessment compliance reports for EUDR, FSC, PEFC,
 * and the Swedish Forestry Act. Exportable as a printable A4 PDF.
 *
 * Route: /owner/compliance-report
 */

import { useState } from 'react';
import {
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Printer,
  RefreshCw,
  FileText,
  ChevronRight,
} from 'lucide-react';
import {
  generateComplianceReport,
  generatePrintableHtml,
  type ComplianceFramework,
  type ComplianceCheck,
  type ComplianceReport,
  type ParcelComplianceInput,
} from '@/services/complianceReportService';

// ─── Demo parcel ──────────────────────────────────────────────────────────────

const DEMO_INPUT: ParcelComplianceInput = {
  parcelId: 'demo-1',
  parcelName: 'Norra Granbacken',
  farmName: 'Svensson Forest AB',
  areaHa: 12.4,
  species: 'Gran (82%), Björk (12%), Tall (6%)',
  registeredAt: '2018-06-15',
  hasGeodata: true,
  hasLegalRightsDoc: false,
  municipalityCode: '0584',
  lastHarvestYear: 2019,
  annualHarvestM3: 120,
  sustainableHarvestM3: 160,
  nearProtectedArea: false,
};

// ─── Framework tab data ───────────────────────────────────────────────────────

const FRAMEWORKS: { key: ComplianceFramework; label: string; subtitle: string }[] = [
  {
    key: 'EUDR',
    label: 'EUDR',
    subtitle: 'EU Deforestation Regulation 2023/1115',
  },
  {
    key: 'FSC',
    label: 'FSC',
    subtitle: 'Forest Stewardship Council',
  },
  {
    key: 'PEFC',
    label: 'PEFC',
    subtitle: 'Programme for Endorsement of Forest Certification',
  },
  {
    key: 'Swedish_Forestry_Act',
    label: 'Swedish Forestry Act',
    subtitle: 'Skogsvårdslagen (SVL)',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ComplianceCheck['status'] }) {
  if (status === 'pass') return <ShieldCheck size={16} className="text-[var(--green)] flex-shrink-0" />;
  if (status === 'fail') return <XCircle size={16} className="text-red-500 flex-shrink-0" />;
  if (status === 'warning') return <AlertTriangle size={16} className="text-[var(--amber)] flex-shrink-0" />;
  return <HelpCircle size={16} className="text-[var(--text3)] flex-shrink-0" />;
}

function StatusBadge({ status }: { status: ComplianceCheck['status'] }) {
  const map = {
    pass: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
    fail: 'bg-red-50 text-red-600 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    unknown: 'bg-[var(--bg3)] text-[var(--text3)] border-[var(--border)]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${map[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function OverallStatusBanner({ report }: { report: ComplianceReport }) {
  const isPass = report.overallStatus === 'PASS';
  const isFail = report.overallStatus === 'FAIL';
  const cls = isPass
    ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
    : isFail
    ? 'border-red-200 bg-red-50'
    : 'border-amber-200 bg-amber-50';
  const icon = isPass
    ? <ShieldCheck size={20} className="text-[var(--green)]" />
    : isFail
    ? <XCircle size={20} className="text-red-500" />
    : <AlertTriangle size={20} className="text-[var(--amber)]" />;
  const textCls = isPass ? 'text-[var(--green)]' : isFail ? 'text-red-600' : 'text-amber-700';

  return (
    <div className={`rounded-xl border ${cls} p-4 flex items-start gap-3`}>
      {icon}
      <div className="flex-1">
        <p className={`text-sm font-semibold ${textCls}`}>{report.summary}</p>
        <div className="flex items-center gap-4 mt-1.5 text-[11px] text-[var(--text3)]">
          <span className="text-[var(--green)]">{report.passCount} pass</span>
          {report.failCount > 0 && <span className="text-red-500">{report.failCount} fail</span>}
          {report.warningCount > 0 && <span className="text-amber-600">{report.warningCount} warning</span>}
          {report.unknownCount > 0 && <span>{report.unknownCount} unknown</span>}
        </div>
      </div>
    </div>
  );
}

function CheckCard({ check }: { check: ComplianceCheck }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--bg3)] transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <StatusIcon status={check.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text)]">{check.requirement}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={check.status} />
          <ChevronRight
            size={12}
            className={`text-[var(--text3)] transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text3)] pt-3">{check.description}</p>
          <div className="rounded-md bg-[var(--bg3)] px-3 py-2">
            <p className="text-[11px] font-semibold text-[var(--text2)] mb-0.5">Evidence</p>
            <p className="text-xs text-[var(--text2)]">{check.evidence}</p>
          </div>
          {check.recommendation && (
            <div className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-[11px] font-semibold text-amber-700 mb-0.5">Recommended action</p>
              <p className="text-xs text-amber-700">{check.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComplianceReportPage() {
  const [activeFramework, setActiveFramework] = useState<ComplianceFramework>('EUDR');
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runReport = async (framework: ComplianceFramework) => {
    setLoading(true);
    setReport(null);
    try {
      const r = await generateComplianceReport(DEMO_INPUT, framework);
      setReport(r);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (framework: ComplianceFramework) => {
    setActiveFramework(framework);
    runReport(framework);
  };

  const handlePrint = () => {
    if (!report) return;
    const html = generatePrintableHtml(report);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-5 lg:p-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <ClipboardCheck size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">Compliance Report Generator</h1>
              <p className="text-xs text-[var(--text3)]">Self-assessment against EUDR, FSC, PEFC, and Swedish Forestry Act</p>
            </div>
          </div>
        </div>

        {/* Framework tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--border)] bg-[var(--bg3)] mb-6 overflow-x-auto">
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw.key}
              onClick={() => handleTabChange(fw.key)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeFramework === fw.key
                  ? 'bg-[var(--green)] text-white shadow-sm'
                  : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
              }`}
            >
              {fw.label}
            </button>
          ))}
        </div>

        {/* Active framework subtitle */}
        {!loading && !report && (
          <div className="text-center py-10">
            <FileText size={32} className="mx-auto text-[var(--text3)] mb-3" />
            <p className="text-sm text-[var(--text2)] mb-4">
              Select a framework above to generate your compliance self-assessment
            </p>
            <button
              onClick={() => runReport(activeFramework)}
              className="px-5 py-2.5 rounded-lg bg-[var(--green)] text-white text-sm font-semibold hover:brightness-110 transition"
            >
              Run {FRAMEWORKS.find((f) => f.key === activeFramework)?.label} Assessment
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
              <p className="text-sm text-[var(--text3)]">Checking {FRAMEWORKS.find((f) => f.key === activeFramework)?.label} requirements…</p>
            </div>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-4">
            {/* Report header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{report.farmName} — {report.parcelName}</p>
                <p className="text-xs text-[var(--text3)]">
                  {FRAMEWORKS.find((f) => f.key === report.framework)?.subtitle} &middot;{' '}
                  Generated {new Date(report.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runReport(activeFramework)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:text-[var(--text)] transition"
                >
                  <RefreshCw size={12} />
                  Refresh
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)] text-white text-xs font-semibold hover:brightness-110 transition"
                >
                  <Printer size={12} />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Overall status */}
            <OverallStatusBanner report={report} />

            {/* Individual checks */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">
                Requirement checks ({report.checks.length})
              </h2>
              {report.checks.map((check) => (
                <CheckCard key={check.id} check={check} />
              ))}
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg3)] p-4">
              <p className="text-[11px] text-[var(--text3)]">
                <strong className="text-[var(--text2)]">Disclaimer:</strong> This is a self-assessment tool based on publicly available regulatory information.
                It does not constitute legal or professional compliance advice. Consult a certified forester or regulatory specialist for official compliance verification.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
