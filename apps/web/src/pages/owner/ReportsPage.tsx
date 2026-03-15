import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ReportCard, type ReportData } from '@/components/reports/ReportCard';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ChevronRight, FileBarChart, Loader2, X } from 'lucide-react';

export default function ReportsPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<ReportData | null>(null);

  const viewId = searchParams.get('view');

  useEffect(() => {
    if (!profile) return;

    async function load() {
      // Load own reports + reports shared with me
      const [ownRes, sharedRes] = await Promise.all([
        supabase
          .from('reports')
          .select('id, title, type, parcel_name, created_at, language, status, pdf_url, inspector_name')
          .eq('owner_id', profile!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('shared_reports')
          .select('reports(id, title, type, parcel_name, created_at, language, status, pdf_url, inspector_name)')
          .eq('shared_with_email', profile!.email)
          .order('shared_at', { ascending: false }),
      ]);

      const ownReports = (ownRes.data ?? []) as ReportData[];
      const sharedReports = (sharedRes.data ?? []).map((d: any) => d.reports).filter(Boolean) as ReportData[];

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
