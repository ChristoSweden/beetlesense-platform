import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ReportCard, type ReportData } from '@/components/reports/ReportCard';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ChevronRight, FileBarChart, Loader2, X } from 'lucide-react';
import { isDemo, DEMO_REPORTS } from '@/lib/demoData';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

export default function ReportsPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const viewId = searchParams.get('view');

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
          <button
            onClick={handleCloseViewer}
            className="p-2 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <ReportViewer pdfUrl={viewingReport.pdf_url} title={viewingReport.title} />
      </div>
    );
  }

  // Report list
  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.reports')}</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-4">{t('nav.reports')}</h1>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => window.location.reload()} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <FileBarChart size={24} className="mx-auto text-[var(--text3)] mb-2" />
          <p className="text-sm text-[var(--text2)]">
            No reports yet. Complete a survey to generate your first forest health report.
          </p>
          <Link
            to="/owner/surveys"
            className="inline-block mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
          >
            View Surveys
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} onClick={handleViewReport} />
          ))}
        </div>
      )}
    </div>
  );
}
