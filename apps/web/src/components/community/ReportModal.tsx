import { useState } from 'react';
import { X, Flag, AlertTriangle, Send } from 'lucide-react';
import { useToast } from '@/components/common/Toast';

export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'off_topic' | 'illegal' | 'other';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment';
  targetId: string;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Unsolicited advertising or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or personal attacks' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading forestry information' },
  { value: 'off_topic', label: 'Off Topic', description: 'Not related to forestry or the community' },
  { value: 'illegal', label: 'Illegal Activity', description: 'Promotes illegal logging or violations' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' },
];

export function ReportModal({ isOpen, onClose, targetType, targetId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);

    // In demo mode, just simulate
    await new Promise(r => setTimeout(r, 600));

    toast(`Report submitted. Our moderators will review this ${targetType}.`, 'success');
    setSubmitting(false);
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] p-6 shadow-xl"
        style={{ background: 'var(--bg2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50" style={{ color: '#b45309' }}>
              <Flag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text)]">Report {targetType === 'post' ? 'Post' : 'Comment'}</h2>
              <p className="text-[11px] text-[var(--text3)]">Help keep the community safe</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Reason Selection */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-2">Reason</p>
          {REPORT_REASONS.map(reason => (
            <button
              key={reason.value}
              onClick={() => setSelectedReason(reason.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                selectedReason === reason.value
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--border2)]'
              }`}
            >
              <span className={`text-sm font-medium ${selectedReason === reason.value ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                {reason.label}
              </span>
              <p className="text-[11px] text-[var(--text3)] mt-0.5">{reason.description}</p>
            </button>
          ))}
        </div>

        {/* Details */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-1.5 block">
            Additional details (optional)
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Provide any additional context..."
            rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: selectedReason ? 'var(--green)' : '#9ca3af' }}
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={14} />
                Submit Report
              </>
            )}
          </button>
        </div>

        {/* Reassurance */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[var(--bg)]">
          <AlertTriangle size={14} className="text-[var(--text3)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--text3)] leading-relaxed">
            Reports are anonymous. Our moderators review every report and take action within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
