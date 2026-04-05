import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Search,
  Plus,
  Mail,
  Trees,
  X,
  Loader2,
  Send,
  Check,
} from 'lucide-react';

// ─── Types ───

interface InspectorClient {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  shared_parcels: number;
  added_at: string;
}

// ─── Component ───

export function InspectorClientList() {
  const { profile } = useAuthStore();
  const [clients, setClients] = useState<InspectorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const { data, error } = await supabase
        .from('inspector_clients')
        .select('*')
        .eq('inspector_id', profile!.id)
        .order('added_at', { ascending: false });

      if (!error && data) {
        setClients(data as InspectorClient[]);
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.owner_name.toLowerCase().includes(q) ||
        c.owner_email.toLowerCase().includes(q),
    );
  }, [clients, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="input-field pl-8 text-xs"
          />
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
        >
          <Plus size={14} />
          Add Client
        </button>
      </div>

      {/* ─── Client List ─── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <Users size={24} className="mx-auto text-[var(--text3)] mb-2" />
          <p className="text-sm text-[var(--text2)]">
            {search ? 'No clients match your search.' : 'No clients yet. Invite your first client.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 hover:bg-[var(--bg3)] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-[var(--text3)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {client.owner_name}
                    </p>
                    <p className="text-xs text-[var(--text3)] flex items-center gap-1">
                      <Mail size={10} />
                      {client.owner_email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--text3)] flex-shrink-0">
                  <span className="flex items-center gap-1">
                    <Trees size={12} />
                    {client.shared_parcels} parcels
                  </span>
                  <span className="font-mono text-[10px]">
                    {new Date(client.added_at).toLocaleDateString('sv-SE')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Invite Modal ─── */}
      {showInviteModal && (
        <InviteClientModal
          onClose={() => setShowInviteModal(false)}
          onInvited={(client) => {
            setClients((prev) => [client, ...prev]);
            setShowInviteModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Invite Modal ───

function InviteClientModal({
  onClose,
  onInvited: _onInvited,
}: {
  onClose: () => void;
  onInvited: (client: InspectorClient) => void;
}) {
  const { profile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!profile || !email.trim()) return;
    setSending(true);
    setError(null);

    try {
      const { data: _data, error: dbError } = await supabase
        .from('inspector_client_invites')
        .insert({
          inspector_id: profile.id,
          client_email: email.trim(),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-serif font-bold text-[var(--text)]">Add Client</h3>
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
            <p className="text-sm text-[var(--text)]">Invitation sent!</p>
            <p className="text-xs text-[var(--text3)] mt-1">
              {email} will receive an email to connect their account.
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
              Enter your client's email address. They will receive an invitation to share their
              parcels with you.
            </p>

            <label className="block mb-4">
              <span className="text-xs font-medium text-[var(--text2)] mb-1 block">
                Client Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="input-field"
                autoFocus
              />
            </label>

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
                onClick={handleInvite}
                disabled={!email.trim() || sending}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-40 flex items-center justify-center gap-1"
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {sending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
