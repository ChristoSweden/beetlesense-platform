import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  onCancel: () => void;
  onConfirmed: () => void;
  isDeleting: boolean;
  errorMsg: string | null;
}

function ConfirmModal({ onCancel, onConfirmed, isDeleting, errorMsg }: ConfirmModalProps) {
  const [typed, setTyped] = useState('');

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-sm mx-4 rounded-xl border border-red-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <h2 id="delete-modal-title" className="text-sm font-semibold text-red-700">
              Delete Account
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-[var(--text3)] hover:text-[var(--text2)] transition-colors disabled:opacity-50"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <p className="text-xs text-[var(--text2)] mb-4">
          This will permanently delete your account, all your parcels, alerts, reports, and
          every other piece of data associated with your account.{' '}
          <strong className="text-[var(--text)]">This cannot be undone.</strong>
        </p>

        <label className="block mb-4">
          <span className="text-xs font-medium text-[var(--text2)] mb-1 block">
            Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
          </span>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={isDeleting}
            placeholder="DELETE"
            autoComplete="off"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
          />
        </label>

        {errorMsg && (
          <p className="text-[10px] text-red-600 mb-3 bg-red-50 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-[var(--border)] py-2 text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmed}
            disabled={typed !== 'DELETE' || isDeleting}
            className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {isDeleting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={12} />
                Delete forever
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function DeleteAccountSection() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);

    // Demo mode: just sign out and redirect
    if (isDemo()) {
      await supabase.auth.signOut();
      navigate('/');
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMsg('You are not signed in. Please refresh and try again.');
        setIsDeleting(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? `Unexpected error (${response.status})`);
      }

      // Success: sign out locally then redirect to home
      await supabase.auth.signOut();
      navigate('/');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setErrorMsg(msg);
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Danger card */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-2">
          <AlertTriangle size={12} />
          Danger Zone
        </h3>
        <p className="text-xs text-red-600 mb-3">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          onClick={() => {
            setErrorMsg(null);
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
        >
          <Trash2 size={12} />
          Delete my account
        </button>
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <ConfirmModal
          onCancel={() => {
            if (!isDeleting) setShowModal(false);
          }}
          onConfirmed={handleDelete}
          isDeleting={isDeleting}
          errorMsg={errorMsg}
        />
      )}
    </>
  );
}
