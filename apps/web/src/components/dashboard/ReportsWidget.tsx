import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileBarChart, ChevronRight, Download, Clock, FileText } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

interface ReportData {
  id: string;
  title: string;
  type: string;
  created_at: string;
}

const DEMO_REPORT: ReportData = {
  id: 'r-demo-1',
  title: 'Beetle Assessment — Norra Skogen',
  type: 'detailed',
  created_at: '2026-03-12T10:00:00Z',
};

// ─── Component ───

export function ReportsWidget() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLatestReport() {
      if (isSupabaseConfigured && !isDemo()) {
        try {
          const { data, error } = await supabase
            .from('reports')
            .select('id, title, type, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!cancelled && !error && data) {
            setReport(data as ReportData);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to demo data
        }
      }

      // Demo fallback
      if (!cancelled) {
        setReport(DEMO_REPORT);
        setLoading(false);
      }
    }

    fetchLatestReport();
    return () => { cancelled = true; };
  }, []);

  const lastReportDate = report?.created_at ?? null;
  const daysSince = lastReportDate
    ? Math.floor((Date.now() - new Date(lastReportDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <FileBarChart size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--text)]">
            {t('reports.widget.title')}
          </span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-2/3 rounded bg-[var(--bg3)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--bg3)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <FileBarChart size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--text)]">
            {t('reports.widget.title')}
          </span>
        </div>
      </div>

      {report ? (
        <>
          {/* Report info */}
          <div className="p-2.5 rounded-lg border border-[var(--border)] mb-3" style={{ background: 'var(--bg)' }}>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={11} className="text-[var(--green)]" />
              <span className="text-[11px] font-medium text-[var(--text)] truncate">
                {report.title}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
              <span className="capitalize bg-[var(--green)]/10 text-[var(--green)] px-1.5 py-0.5 rounded">
                {report.type}
              </span>
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>
                  {lastReportDate && new Date(lastReportDate).toLocaleDateString('sv-SE')}
                  {daysSince !== null && daysSince > 0 && ` (${daysSince}d ago)`}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <FileText size={12} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text3)]">
            {t('reports.widget.noReports')}
          </span>
        </div>
      )}

      {/* Generate new report */}
      <Link
        to="/owner/reports?action=builder"
        className="flex items-center justify-between w-full p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors mb-2"
      >
        <div className="flex items-center gap-2">
          <Download size={12} className="text-[var(--green)]" />
          <span className="text-xs font-medium text-[var(--green)]">
            {t('reports.widget.generateMonthly')}
          </span>
        </div>
        <ChevronRight size={14} className="text-[var(--green)]" />
      </Link>

      {/* View all link */}
      <Link
        to="/owner/reports"
        className="flex items-center justify-center gap-1 w-full py-1.5 text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
      >
        {t('reports.widget.viewAll')}
        <ChevronRight size={10} />
      </Link>
    </div>
  );
}
