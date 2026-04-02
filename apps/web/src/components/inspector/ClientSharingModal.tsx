import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { X, Send, Check, Loader2, Mail, MessageSquare } from 'lucide-react';

// ─── Types ───

interface ClientSharingModalProps {
  reportId: string;
  reportTitle: string;
  clientEmail: string;
  clientName: string;
  onClose: () => void;
  onShared?: () => void;
}

// ─── Component ───

export function ClientSharingModal({
  reportId,
  reportTitle,
  clientEmail,
  clientName,
  onClose,
  onShared,
}: ClientSharingModalProps) {
  const { profile } = useAuthStore();
  const [email, setEmail] = useState(clientEmail);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (!profile || !email.trim()) return;
    setSending(true);
    setError(null);

    try {
      // Create shared_reports record
      const { error: dbError } = await supabase.from('shared_reports').insert({
        report_id: reportId,
        shared_by: profile.id,
        shared_with_email: email.trim(),
        message: message.trim() || null,
        shared_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      // Trigger email notification via Edge Function
      await supabase.functions.invoke('send-report-notification', {
        body: {
          report_id: reportId,
          report_title: reportTitle,
          recipient_email: email.trim(),
          sender_name: profile.full_name,
          message: message.trim(),
        },
      });

      setSent(true);
      onShared?.();
    } catch (err: any) {
      setError(err.message || 'Failed to share report.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-serif font-bold text-[var(--text)]">Share Report</h3>
          <button
            onClick={onClose}
            className="text-[var(--text3)] hover:text-[var(--text)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <Check size={24} className="mx-auto text-[var(--green)] mb-2" />
            <p className="text-sm text-[var(--text)]">Report shared!</p>
            <p className="text-xs text-[var(--text3)] mt-1">
              {clientName} will receive an email notification with access to the report.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--text3)] mb-4">
              Share "<span className="text-[var(--text)]">{reportTitle}</span>" with your client.
            </p>

            <div className="space-y-3 mb-4">
              <label className="block">
                <span className="text-xs font-medium text-[var(--text2)] mb-1 flex items-center gap-1">
                  <Mail size={10} />
                  Client Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[var(--text2)] mb-1 flex items-center gap-1">
                  <MessageSquare size={10} />
                  Message (optional)
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal note..."
                  rows={3}
                  className="input-field resize-none"
                />
              </label>
            </div>

            {error && (
              <div className="mb-4 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={!email.trim() || sending}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-40 flex items-center justify-center gap-1"
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {sending ? 'Sending...' : 'Share Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
