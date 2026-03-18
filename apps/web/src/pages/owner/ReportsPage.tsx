import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ReportCard, type ReportData } from '@/components/reports/ReportCard';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import {
  ChevronRight,
  FileBarChart,
  Loader2,
  X,
  Plus,
  Heart,
  TreePine,
  Calendar,
  ClipboardCheck,
  Share2,
  Mail,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { isDemo, DEMO_REPORTS } from '@/lib/demoData';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

// ─── Quick Generate Buttons ───

const QUICK_ACTIONS = [
  {
    id: 'health',
    labelKey: 'reports.quick.forestHealth',
    icon: Heart,
    color: '#22c55e',
    template: 'forest-health' as const,
  },
  {
    id: 'timber',
    labelKey: 'reports.quick.timberValue',
    icon: TreePine,
    color: '#fbbf24',
    template: 'timber-valuation' as const,
  },
  {
    id: 'annual',
    labelKey: 'reports.quick.annualSummary',
    icon: Calendar,
    color: '#3b82f6',
    template: 'annual-summary' as const,
  },
  {
    id: 'compliance',
    labelKey: 'reports.quick.compliance',
    icon: ClipboardCheck,
    color: '#a78bfa',
    template: 'compliance' as const,
  },
];

// ─── Share Modal ───

function ShareModal({ report, onClose }: { report: ReportData; onClose: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const shareLink = `${window.location.origin}/owner/reports?view=${report.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendEmail = () => {
    if (!email) return;
    // In production, this would call an edge function to send the email
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Share2 size={14} className="text-[var(--green)]" />
            <h3 className="text-sm font-serif font-bold text-[var(--text)]">
              {t('reports.share.title')}
            </h3>
          </div>
          <button onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text)] transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-[var(--text3)]">{report.title}</p>

          {/* Copy Link */}
          <div>
            <label className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
              {t('reports.share.copyLink')}
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareLink}
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[10px] text-[var(--text2)] font-mono truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  copied
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]'
                }`}
              >
                {copied ? <Check size={14} /> : <LinkIcon size={14} />}
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-1">
              {t('reports.share.sendEmail')}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
              />
              <button
                onClick={handleSendEmail}
                disabled={!email || sent}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-40"
              >
                {sent ? <Check size={14} /> : <Mail size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function ReportsPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<ReportData | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [sharingReport, setSharingReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const viewId = searchParams.get('view');
  const action = searchParams.get('action');

  // Open builder if action param says so
  useEffect(() => {
    if (action === 'builder') {
      setShowBuilder(true);
    }
  }, [action]);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      setError(null);

      // Demo mode: use static demo data
      if (isDemo()) {
        const mapped: ReportData[] = DEMO_REPORTS.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type === 'valuation' ? 'valuation' as const : 'standard' as const,
          parcel_name: r.parcel_name,
          created_at: r.created_at,
          language: 'en' as const,
          status: r.status === 'ready' ? 'generated' as const : 'draft' as const,
        }));
        setReports(mapped);
        if (viewId) {
          const target = mapped.find((r) => r.id === viewId);
          if (target) setViewingReport(target);
        }
        setLoading(false);
        return;
      }

      try {
        // Load own reports + reports shared with me
        const [ownRes, sharedRes] = await Promise.all([
          supabase
            .from('reports')
            .select('id, title, report_type, parcel_name, created_at, language, status, pdf_url, inspector_name')
            .eq('owner_id', profile!.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('shared_reports')
            .select('report:reports(id, title, report_type, parcel_name, created_at, language, status, pdf_url, inspector_name)')
            .eq('shared_with_email', profile!.email)
            .order('shared_at', { ascending: false }),
        ]);

        if (ownRes.error) throw ownRes.error;
        if (sharedRes.error) throw sharedRes.error;

        // Map report_type to the frontend's ReportType enum
        const mapReport = (r: any): ReportData => ({
          ...r,
          type: r.report_type === 'inspector_valuation' ? 'valuation' : r.report_type === 'insurance_claim' ? 'insurance' : 'standard',
        });

        const ownReports = (ownRes.data ?? []).map(mapReport) as ReportData[];
        const sharedReports = (sharedRes.data ?? []).map((d: any) => d.report).filter(Boolean).map(mapReport) as ReportData[];

        const allReports = [...ownReports, ...sharedReports];

        // Deduplicate by id
        const seen = new Set<string>();
        const unique = allReports.filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });

        setReports(unique);

        // If view param present, find and show that report
        if (viewId) {
          const target = unique.find((r) => r.id === viewId);
          if (target) setViewingReport(target);
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to load reports');
      }

      setLoading(false);
    }
    load();
  }, [profile, viewId]);

  const handleViewReport = (report: ReportData) => {
    setViewingReport(report);
    setSearchParams({ view: report.id });
  };

  const handleCloseViewer = () => {
    setViewingReport(null);
    setSearchParams({});
  };

  const handleOpenBuilder = () => {
    setShowBuilder(true);
    setSearchParams({ action: 'builder' });
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setSearchParams({});
  };

  // Report Viewer
  if (viewingReport?.pdf_url) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-4">
          <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
            {t('nav.dashboard')}
          </Link>
          <ChevronRight size={12} />
          <button onClick={handleCloseViewer} className="hover:text-[var(--text2)]">
            {t('nav.reports')}
          </button>
          <ChevronRight size={12} />
          <span className="text-[var(--text)] truncate">{viewingReport.title}</span>
        </nav>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            {viewingReport.title}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSharingReport(viewingReport)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text)] border border-[var(--border)] hover:border-[var(--text3)] transition-colors"
            >
              <Share2 size={12} />
              {t('reports.share.title')}
            </button>
            <button
              onClick={handleCloseViewer}
              className="p-2 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <ReportViewer pdfUrl={viewingReport.pdf_url} title={viewingReport.title} />

        {sharingReport && <ShareModal report={sharingReport} onClose={() => setSharingReport(null)} />}
      </div>
    );
  }

  // Report Builder
  if (showBuilder) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
          <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
            {t('nav.dashboard')}
          </Link>
          <ChevronRight size={12} />
          <button onClick={handleCloseBuilder} className="hover:text-[var(--text2)]">
            {t('nav.reports')}
          </button>
          <ChevronRight size={12} />
          <span className="text-[var(--text)]">{t('reports.builder.title')}</span>
        </nav>

        <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-6">
          {t('reports.builder.title')}
        </h1>

        <ReportBuilder onClose={handleCloseBuilder} />
      </div>
    );
  }

  // Reports Hub
  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.reports')}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif font-bold text-[var(--text)]">{t('nav.reports')}</h1>
        <button
          onClick={handleOpenBuilder}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
        >
          <Plus size={16} />
          {t('reports.builder.title')}
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      {/* ─── Quick Generate ─── */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">
          {t('reports.quick.title')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.id}
                onClick={handleOpenBuilder}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] hover:bg-[var(--bg3)] transition-all text-center"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${qa.color}15`, color: qa.color }}
                >
                  <Icon size={18} />
                </div>
                <span className="text-[11px] font-medium text-[var(--text)]">
                  {t(qa.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Report History ─── */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">
          {t('reports.history.title')}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[var(--green)]" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
            <FileBarChart size={24} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-sm text-[var(--text2)]">
              {t('reports.history.empty')}
            </p>
            <button
              onClick={handleOpenBuilder}
              className="inline-block mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
            >
              {t('reports.builder.title')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="relative group">
                <ReportCard report={report} onClick={handleViewReport} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSharingReport(report);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-all"
                  title={t('reports.share.title')}
                >
                  <Share2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {sharingReport && <ShareModal report={sharingReport} onClose={() => setSharingReport(null)} />}
    </div>
  );
}
