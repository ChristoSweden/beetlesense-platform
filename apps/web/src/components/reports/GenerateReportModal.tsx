import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  X,
  FileText,
  FileBarChart,
  ClipboardList,
  Globe,
  Bot,
  Check,
  Activity,
} from 'lucide-react';

// ─── Types ───

type ReportTypeOption = 'summary' | 'detailed' | 'valuation';

interface GenerateReportModalProps {
  surveyId: string;
  parcelId: string;
  parcelName: string;
  onClose: () => void;
}

const REPORT_TYPES: { id: ReportTypeOption; label: string; desc: string; icon: typeof FileText }[] = [
  {
    id: 'summary',
    label: 'Summary',
    desc: 'Key findings overview (2-3 pages)',
    icon: FileText,
  },
  {
    id: 'detailed',
    label: 'Detailed',
    desc: 'Full analysis with maps and data (10+ pages)',
    icon: ClipboardList,
  },
  {
    id: 'valuation',
    label: 'Valuation-ready',
    desc: 'Formatted for professional valuation use',
    icon: FileBarChart,
  },
];

// ─── Component ───

export function GenerateReportModal({
  surveyId,
  parcelId,
  parcelName,
  onClose,
}: GenerateReportModalProps) {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState<ReportTypeOption>('summary');
  const [language, setLanguage] = useState<'en' | 'sv'>('en');
  const [includeCompanion, setIncludeCompanion] = useState(true);
  const [includeSensorData, setIncludeSensorData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-report', {
        body: {
          survey_id: surveyId,
          parcel_id: parcelId,
          user_id: profile.id,
          report_type: reportType,
          language,
          include_companion_findings: includeCompanion,
          include_sensor_data: includeSensorData,
        },
      });

      if (fnError) throw fnError;

      const reportId = data?.report_id;
      if (reportId) {
        // Redirect to the report viewer
        const basePath = profile.role === 'inspector' ? '/inspector' : '/owner';
        navigate(`${basePath}/reports?view=${reportId}`);
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Report generation failed.');
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-serif font-bold text-[var(--text)]">Generate Report</h3>
            <p className="text-xs text-[var(--text3)] mt-0.5">{parcelName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-[var(--text3)] hover:text-[var(--text)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {generating ? (
            /* Generating State */
            <div className="text-center py-8">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--green)] animate-spin" />
                <FileText size={20} className="absolute inset-0 m-auto text-[var(--green)]" />
              </div>
              <p className="text-sm text-[var(--text)] mb-1">Generating your report...</p>
              <p className="text-xs text-[var(--text3)]">
                This may take a moment. You will be redirected when ready.
              </p>
            </div>
          ) : (
            <>
              {/* Report Type */}
              <div>
                <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-2">
                  Report Type
                </span>
                <div className="space-y-2">
                  {REPORT_TYPES.map((rt) => {
                    const Icon = rt.icon;
                    const isSelected = reportType === rt.id;
                    return (
                      <button
                        key={rt.id}
                        onClick={() => setReportType(rt.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--green)]/40 bg-[var(--green)]/10'
                            : 'border-[var(--border)] hover:border-[var(--text3)]'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-[var(--green)]/20' : 'bg-[var(--bg3)]'
                          }`}
                        >
                          <Icon
                            size={14}
                            className={isSelected ? 'text-[var(--green)]' : 'text-[var(--text3)]'}
                          />
                        </div>
                        <div>
                          <p
                            className={`text-xs font-medium ${
                              isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'
                            }`}
                          >
                            {rt.label}
                          </p>
                          <p className="text-[10px] text-[var(--text3)]">{rt.desc}</p>
                        </div>
                        {isSelected && (
                          <Check size={14} className="ml-auto text-[var(--green)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-2">
                  Language
                </span>
                <div className="flex gap-2">
                  {(['en', 'sv'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                        language === lang
                          ? 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]'
                          : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--text3)]'
                      }`}
                    >
                      <Globe size={12} />
                      {lang === 'en' ? 'English' : 'Svenska'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Companion Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Bot size={14} className="text-[var(--green)]" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text)]">
                      Include AI Companion findings
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">
                      Add insights from your Companion chat sessions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIncludeCompanion(!includeCompanion)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    includeCompanion ? 'bg-[var(--green)]' : 'bg-[var(--text3)]/30'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      includeCompanion ? 'left-5.5' : 'left-0.5'
                    }`}
                    style={{ left: includeCompanion ? '22px' : '2px' }}
                  />
                </button>
              </div>

              {/* Sensor Data Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-[var(--green)]" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text)]">
                      Include sensor data
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">
                      NDVI, NDRE, thermal, tree inventory &amp; beetle stress
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIncludeSensorData(!includeSensorData)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    includeSensorData ? 'bg-[var(--green)]' : 'bg-[var(--text3)]/30'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      includeSensorData ? 'left-5.5' : 'left-0.5'
                    }`}
                    style={{ left: includeSensorData ? '22px' : '2px' }}
                  />
                </button>
              </div>

              {error && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleGenerate}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                Generate Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
