import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ANALYSIS_MODULES, type AnalysisModule } from './ModuleCard';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

interface ModuleResult {
  module: AnalysisModule;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress: number; // 0-100
  confidence?: number;
  updated_at?: string;
}

interface SurveyStatusTrackerProps {
  surveyId: string;
  selectedModules: AnalysisModule[];
}

export function SurveyStatusTracker({ surveyId, selectedModules }: SurveyStatusTrackerProps) {
  const [moduleResults, setModuleResults] = useState<ModuleResult[]>(
    selectedModules.map((mod) => ({
      module: mod,
      status: 'pending',
      progress: 0,
    })),
  );

  // Fetch initial results
  useEffect(() => {
    async function fetchResults() {
      const { data, error } = await supabase
        .from('analysis_results')
        .select('module, status, progress, confidence, updated_at')
        .eq('survey_id', surveyId);

      if (error) {
        console.warn('Failed to fetch analysis results:', error.message);
        return;
      }

      if (data) {
        setModuleResults((prev) =>
          prev.map((mr) => {
            const result = data.find((d: Record<string, unknown>) => d.module === mr.module);
            if (result) {
              return {
                ...mr,
                status: result.status as ModuleResult['status'],
                progress: (result.progress as number) ?? 0,
                confidence: result.confidence as number | undefined,
                updated_at: result.updated_at as string | undefined,
              };
            }
            return mr;
          }),
        );
      }
    }

    fetchResults();
  }, [surveyId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`survey-${surveyId}-results`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_results',
          filter: `survey_id=eq.${surveyId}`,
        },
        (payload) => {
          const record = payload.new as Record<string, unknown>;
          if (record) {
            setModuleResults((prev) =>
              prev.map((mr) => {
                if (mr.module === record.module) {
                  return {
                    ...mr,
                    status: record.status as ModuleResult['status'],
                    progress: (record.progress as number) ?? mr.progress,
                    confidence: record.confidence as number | undefined,
                    updated_at: record.updated_at as string | undefined,
                  };
                }
                return mr;
              }),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [surveyId]);

  // Compute overall progress
  const overallProgress =
    moduleResults.length > 0
      ? Math.round(moduleResults.reduce((sum, mr) => sum + mr.progress, 0) / moduleResults.length)
      : 0;

  const completedCount = moduleResults.filter((mr) => mr.status === 'complete').length;

  return (
    <div className="space-y-4">
      {/* Overall progress header */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--text)]">Analysis Progress</h3>
          <span className="text-xs font-mono text-[var(--green)]">
            {completedCount}/{moduleResults.length} modules
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-forest-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-[10px] text-[var(--text3)] mt-1 font-mono">{overallProgress}% complete</p>
      </div>

      {/* Per-module status cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {moduleResults.map((mr) => {
          const modInfo = ANALYSIS_MODULES.find((m) => m.id === mr.module);
          if (!modInfo) return null;

          return (
            <div
              key={mr.module}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4"
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className="mt-0.5">
                  {mr.status === 'complete' && (
                    <CheckCircle size={18} className="text-[var(--green)]" />
                  )}
                  {mr.status === 'processing' && (
                    <Loader2 size={18} className="text-amber animate-spin" />
                  )}
                  {mr.status === 'pending' && (
                    <Clock size={18} className="text-[var(--text3)]" />
                  )}
                  {mr.status === 'failed' && (
                    <XCircle size={18} className="text-danger" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{modInfo.icon}</span>
                    <h4 className="text-xs font-semibold text-[var(--text)]">{modInfo.title}</h4>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 w-full h-1 rounded-full bg-forest-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        mr.status === 'failed' ? 'bg-danger' : 'bg-[var(--green)]'
                      }`}
                      style={{ width: `${mr.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-[var(--text3)] font-mono">
                      {mr.progress}%
                    </span>
                    {mr.confidence !== undefined && (
                      <span className="text-[10px] text-[var(--green)] font-mono">
                        Conf: {mr.confidence.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
