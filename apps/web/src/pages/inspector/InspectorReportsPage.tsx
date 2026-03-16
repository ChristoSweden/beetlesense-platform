import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_REPORTS } from '@/lib/demoData';
import { ReportCard, type ReportData } from '@/components/reports/ReportCard';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ValuationReportBuilder } from '@/components/inspector/ValuationReportBuilder';
import {
  ChevronRight,
  Plus,
  FileBarChart,
  Loader2,
  X,
} from 'lucide-react';

export default function InspectorReportsPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<ReportData | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Demo mode — show demo reports
    if (isDemo()) {
      setReports(
        DEMO_REPORTS.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type === 'valuation' ? 'valuation' as const : 'standard' as const,
          parcel_name: r.parcel_name,
          created_at: r.created_at,
          language: 'en' as const,
          status: r.status === 'ready' ? 'generated' as const : 'draft' as const,
          inspector_name: 'Demo Inspector',
        })),
      );
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from('valuation_reports')
        .select('id, title, type, parcel_name, created_at, language, status, pdf_url')
        .eq('inspector_id', profile!.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(
          data.map((r: any) => ({
            ...r,
            type: r.type || 'valuation',
            language: r.language || 'en',
            status: r.status || 'draft',
            inspector_name: profile!.full_name ?? undefined,
          })),
        );
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  // Report Viewer mode
  if (viewingReport?.pdf_url) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-4">
          <Link to="/inspector/dashboard" className="hover:text-[var(--text2)]">
            {t('nav.dashboard')}
          </Link>
          <ChevronRight size={12} />
          <button
            onClick={() => setViewingReport(null)}
            className="hover:text-[var(--text2)]"
          >
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
            onClick={() => setViewingReport(null)}
            className="p-2 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <ReportViewer pdfUrl={viewingReport.pdf_url} title={viewingReport.title} />
      </div>
    );
  }

  // Builder mode
  if (showBuilder) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-4">
          <Link to="/inspector/dashboard" className="hover:text-[var(--text2)]">
            {t('nav.dashboard')}
          </Link>
          <ChevronRight size={12} />
          <button
            onClick={() => setShowBuilder(false)}
            className="hover:text-[var(--text2)]"
          >
            {t('nav.reports')}
          </button>
          <ChevronRight size={12} />
          <span className="text-[var(--text)]">New Report</span>
        </nav>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            Valuation Report Builder
          </h1>
          <button
            onClick={() => setShowBuilder(false)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={12} />
            Close
          </button>
        </div>

        <ValuationReportBuilder />
      </div>
    );
  }

  // Report list
  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/inspector/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.reports')}</span>
      </nav>

      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-serif font-bold text-[var(--text)]">{t('nav.reports')}</h1>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
        >
          <Plus size={14} />
          New Report
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <FileBarChart size={24} className="mx-auto text-[var(--text3)] mb-2" />
          <p className="text-sm text-[var(--text2)]">
            No reports yet. Create your first valuation report.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={(r) => {
                if (r.pdf_url) {
                  setViewingReport(r);
                } else {
                  setShowBuilder(true);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
