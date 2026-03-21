/**
 * Admin Error Panel — live Sentry-like feed from Supabase error_logs table.
 * Grouped by error code, with frequency, affected users, and status.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertOctagon, CheckCircle2, Loader2, RefreshCw, Bug } from 'lucide-react';
import { captureWithCode } from '@/lib/sentry';

interface ErrorLogEntry {
  id: string;
  error_code: string;
  module: string;
  message: string;
  user_id: string | null;
  route: string | null;
  resolved: boolean;
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  created_at: string;
}

export default function ErrorPanelPage() {
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('last_seen', { ascending: false })
        .limit(100);

      if (!showResolved) query = query.eq('resolved', false);

      const { data, error } = await query;
      if (error) {
        captureWithCode(error, 'ADMIN-001');
        return;
      }
      setErrors(data || []);
    } catch (e) {
      captureWithCode(e, 'ADMIN-001');
    } finally {
      setLoading(false);
    }
  }, [showResolved]);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel('error-logs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'error_logs' }, () => {
        fetchErrors();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchErrors]);

  const handleResolve = async (id: string) => {
    await supabase.from('error_logs').update({ resolved: true }).eq('id', id);
    setErrors((prev) => prev.map((e) => e.id === id ? { ...e, resolved: true } : e));
  };

  // Frequency trend (group by module)
  const moduleGroups = errors.reduce<Record<string, number>>((acc, e) => {
    acc[e.module] = (acc[e.module] || 0) + e.occurrence_count;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text)]">Error Panel</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--text3)]">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="rounded border-[var(--border)]" />
            Show resolved
          </label>
          <button onClick={fetchErrors} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text3)] transition hover:border-[var(--border2)] hover:text-[var(--text)]">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Module summary */}
      {Object.keys(moduleGroups).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(moduleGroups).sort((a, b) => b[1] - a[1]).map(([mod, count]) => (
            <span key={mod} className="rounded-lg bg-[var(--surface)] px-3 py-1 text-xs font-mono text-[var(--text2)]">
              {mod} <span className="text-[var(--red)]">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Error table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--green)]" />
        </div>
      ) : errors.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Bug className="h-10 w-10 text-[var(--green)]" />
          <p className="text-sm text-[var(--text3)]">No errors! Everything is running smoothly.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                <th className="px-4 py-3 text-xs font-medium text-[var(--text3)] uppercase">Code</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text3)] uppercase">Message</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text3)] uppercase">Count</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text3)] uppercase">First Seen</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text3)] uppercase">Last Seen</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text3)] uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text3)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err) => (
                <tr key={err.id} className="border-b border-[var(--border)] transition hover:bg-[var(--bg2)]">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--red)]">{err.error_code}</td>
                  <td className="px-4 py-3 text-[var(--text)]">{err.message}</td>
                  <td className="px-4 py-3 font-mono text-[var(--text2)]">{err.occurrence_count}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text3)]">{new Date(err.first_seen).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text3)]">{new Date(err.last_seen).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {err.resolved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green)]/10 px-2 py-0.5 text-xs text-[var(--green)]">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                        <AlertOctagon className="h-3 w-3" /> Open
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!err.resolved && (
                      <button onClick={() => handleResolve(err.id)} className="rounded-lg px-3 py-1 text-xs text-[var(--green)] transition hover:bg-[var(--green)]/10">
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
