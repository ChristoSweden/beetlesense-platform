import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Send,
  Loader2,
  AlertCircle,
  Check,
  X,
  Clock,
  Mail,
  CalendarDays,
  Shield,
  ChevronDown,
  UserPlus,
  TreePine,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import { isDemo } from '@/lib/demoData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/common/Toast';
import { RoleDefinitions, getDefaultPermissions } from '@/components/sharing/RoleDefinitions';
import type { ForestShareRole } from '@/components/sharing/RoleDefinitions';

/* ─── Types ─── */

interface ForestShare {
  id: string;
  parcel_id: string;
  parcel_name: string;
  owner_id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  shared_with_name: string | null;
  role: ForestShareRole;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  permissions: Record<string, boolean>;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string | null;
  note: string | null;
}

interface SharedWithMeItem {
  id: string;
  parcel_id: string;
  parcel_name: string;
  owner_name: string;
  owner_email: string;
  role: ForestShareRole;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  permissions: Record<string, boolean>;
  invited_at: string;
  note: string | null;
}

interface DemoParcel {
  id: string;
  name: string;
}

/* ─── Status badge ─── */

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  accepted: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
  declined: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  revoked: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const ROLE_STYLES: Record<string, string> = {
  viewer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  editor: 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20',
  manager: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
  advisor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

/* ─── Demo data ─── */

const DEMO_PARCELS: DemoParcel[] = [
  { id: 'p1', name: 'Granbacken' },
  { id: 'p2', name: 'Tallmon' },
  { id: 'p3', name: 'Ekudden' },
];

const DEMO_MY_SHARES: ForestShare[] = [
  {
    id: 'fs-1',
    parcel_id: 'p1',
    parcel_name: 'Granbacken',
    owner_id: 'demo-user',
    shared_with_email: 'anna.svensson@skogsstyrelsen.se',
    shared_with_user_id: 'u-anna',
    shared_with_name: 'Anna Svensson',
    role: 'editor',
    status: 'accepted',
    permissions: getDefaultPermissions('editor'),
    invited_at: '2026-02-15T10:00:00Z',
    accepted_at: '2026-02-15T14:30:00Z',
    expires_at: null,
    note: null,
  },
  {
    id: 'fs-2',
    parcel_id: 'p1',
    parcel_name: 'Granbacken',
    owner_id: 'demo-user',
    shared_with_email: 'lars.berg@sydved.se',
    shared_with_user_id: 'u-lars',
    shared_with_name: 'Lars Berg',
    role: 'advisor',
    status: 'accepted',
    permissions: getDefaultPermissions('advisor'),
    invited_at: '2026-03-01T14:30:00Z',
    accepted_at: '2026-03-02T09:00:00Z',
    expires_at: '2026-09-01T00:00:00Z',
    note: 'Timber valuation advisor',
  },
  {
    id: 'fs-3',
    parcel_id: 'p2',
    parcel_name: 'Tallmon',
    owner_id: 'demo-user',
    shared_with_email: 'maria.ek@example.se',
    shared_with_user_id: null,
    shared_with_name: null,
    role: 'viewer',
    status: 'pending',
    permissions: getDefaultPermissions('viewer'),
    invited_at: '2026-03-28T09:00:00Z',
    accepted_at: null,
    expires_at: null,
    note: 'Family member',
  },
  {
    id: 'fs-4',
    parcel_id: 'p3',
    parcel_name: 'Ekudden',
    owner_id: 'demo-user',
    shared_with_email: 'karl.nordin@example.se',
    shared_with_user_id: 'u-karl',
    shared_with_name: 'Karl Nordin',
    role: 'manager',
    status: 'revoked',
    permissions: getDefaultPermissions('manager'),
    invited_at: '2026-01-10T08:00:00Z',
    accepted_at: '2026-01-10T12:00:00Z',
    expires_at: null,
    note: null,
  },
];

const DEMO_SHARED_WITH_ME: SharedWithMeItem[] = [
  {
    id: 'swm-1',
    parcel_id: 'p-ext-1',
    parcel_name: 'Bjorkudden',
    owner_name: 'Karin Johansson',
    owner_email: 'karin.johansson@example.se',
    role: 'viewer',
    status: 'accepted',
    permissions: getDefaultPermissions('viewer'),
    invited_at: '2026-02-20T08:00:00Z',
    note: null,
  },
  {
    id: 'swm-2',
    parcel_id: 'p-ext-2',
    parcel_name: 'Algmon',
    owner_name: 'Olof Nilsson',
    owner_email: 'olof.nilsson@example.se',
    role: 'editor',
    status: 'accepted',
    permissions: getDefaultPermissions('editor'),
    invited_at: '2026-03-05T12:00:00Z',
    note: 'Co-owner access',
  },
  {
    id: 'swm-3',
    parcel_id: 'p-ext-3',
    parcel_name: 'Furuholmen',
    owner_name: 'Maja Eriksson',
    owner_email: 'maja.eriksson@example.se',
    role: 'manager',
    status: 'pending',
    permissions: getDefaultPermissions('manager'),
    invited_at: '2026-04-01T10:00:00Z',
    note: 'Estate management',
  },
];

const DEMO_FAMILY_MEMBERS = [
  { name: 'Erik Lindstrom', email: 'erik.lindstrom@example.se', role: 'manager' as ForestShareRole },
  { name: 'Anna Lindstrom', email: 'anna.lindstrom@example.se', role: 'editor' as ForestShareRole },
  { name: 'Sofia Lindstrom', email: 'sofia.lindstrom@example.se', role: 'viewer' as ForestShareRole },
];

/* ─── Page Component ─── */

export default function ShareManagementPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const session = useAuthStore((s) => s.session);
  const isDemoMode = isDemo() || !isSupabaseConfigured;

  const [isLoading, setIsLoading] = useState(true);
  const [myShares, setMyShares] = useState<ForestShare[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMeItem[]>([]);
  const [parcels, setParcels] = useState<DemoParcel[]>([]);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ForestShareRole>('viewer');
  const [invitePermissions, setInvitePermissions] = useState<Record<string, boolean>>(getDefaultPermissions('viewer'));
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [inviteExpiry, setInviteExpiry] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Family group
  const [familyName, setFamilyName] = useState('Lindstrom Family');
  const [familyShareAll, setFamilyShareAll] = useState(false);

  // Active section (for mobile)
  const [activeSection, setActiveSection] = useState<'shares' | 'invite' | 'shared-with-me' | 'family'>('shares');

  // ── Load data ──
  const loadData = useCallback(async () => {
    setIsLoading(true);

    if (isDemoMode || !session) {
      setMyShares(DEMO_MY_SHARES);
      setSharedWithMe(DEMO_SHARED_WITH_ME);
      setParcels(DEMO_PARCELS);
      setIsLoading(false);
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      };

      const [sharesRes, sharedWithMeRes, parcelsRes] = await Promise.all([
        fetch(`${baseUrl}/functions/v1/share-invite?type=my_shares`, { headers }),
        fetch(`${baseUrl}/functions/v1/share-invite?type=shared_with_me`, { headers }),
        fetch(`${baseUrl}/functions/v1/share-invite?type=parcels`, { headers }),
      ]);

      if (sharesRes.ok) {
        const data = await sharesRes.json();
        setMyShares(data.data ?? []);
      }
      if (sharedWithMeRes.ok) {
        const data = await sharedWithMeRes.json();
        setSharedWithMe(data.data ?? []);
      }
      if (parcelsRes.ok) {
        const data = await parcelsRes.json();
        setParcels(data.data ?? []);
      }
    } catch (err) {
      console.error('Failed to load sharing data:', err);
      toast('Failed to load sharing data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, session, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update permissions when role changes
  useEffect(() => {
    setInvitePermissions(getDefaultPermissions(inviteRole));
  }, [inviteRole]);

  // ── Handlers ──

  const handleInvite = async () => {
    setInviteError(null);

    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setInviteError('Please enter a valid email address');
      return;
    }
    if (selectedParcels.length === 0) {
      setInviteError('Please select at least one parcel to share');
      return;
    }

    setInviting(true);

    if (isDemoMode) {
      // Demo: add to local state
      const now = new Date().toISOString();
      const newShares: ForestShare[] = selectedParcels.map((pid) => {
        const parcel = parcels.find((p) => p.id === pid);
        return {
          id: `fs-${Date.now()}-${pid}`,
          parcel_id: pid,
          parcel_name: parcel?.name ?? 'Unknown',
          owner_id: 'demo-user',
          shared_with_email: inviteEmail.trim(),
          shared_with_user_id: null,
          shared_with_name: null,
          role: inviteRole,
          status: 'pending' as const,
          permissions: { ...invitePermissions },
          invited_at: now,
          accepted_at: null,
          expires_at: inviteExpiry ? new Date(inviteExpiry).toISOString() : null,
          note: inviteNote.trim() || null,
        };
      });
      setMyShares((prev) => [...newShares, ...prev]);
      setInviteEmail('');
      setInviteRole('viewer');
      setSelectedParcels([]);
      setInviteExpiry('');
      setInviteNote('');
      toast('Invitation sent successfully', 'success');
      setInviting(false);
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      };

      const response = await fetch(`${baseUrl}/functions/v1/share-invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          permissions: invitePermissions,
          parcel_ids: selectedParcels,
          expires_at: inviteExpiry ? new Date(inviteExpiry).toISOString() : null,
          note: inviteNote.trim() || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error ?? 'Failed to send invitation');
      }

      toast('Invitation sent successfully', 'success');
      setInviteEmail('');
      setInviteRole('viewer');
      setSelectedParcels([]);
      setInviteExpiry('');
      setInviteNote('');
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send invitation';
      setInviteError(msg);
      toast(msg, 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeAccess = (shareId: string) => {
    if (isDemoMode) {
      setMyShares((prev) =>
        prev.map((s) => (s.id === shareId ? { ...s, status: 'revoked' as const } : s)),
      );
      toast('Access revoked', 'success');
      return;
    }
    // Live: call edge function
    toast('Access revoked', 'success');
  };

  const handleUpdateRole = (shareId: string, newRole: ForestShareRole) => {
    if (isDemoMode) {
      setMyShares((prev) =>
        prev.map((s) =>
          s.id === shareId
            ? { ...s, role: newRole, permissions: getDefaultPermissions(newRole) }
            : s,
        ),
      );
      toast('Role updated', 'success');
      return;
    }
    toast('Role updated', 'success');
  };

  const handleResendInvite = (shareId: string) => {
    toast('Invitation resent', 'success');
    // In production, call edge function to resend email
    void shareId;
  };

  const handleAcceptInvite = (shareId: string) => {
    if (isDemoMode) {
      setSharedWithMe((prev) =>
        prev.map((s) => (s.id === shareId ? { ...s, status: 'accepted' as const } : s)),
      );
      toast('Invitation accepted', 'success');
      return;
    }
    toast('Invitation accepted', 'success');
  };

  const handleDeclineInvite = (shareId: string) => {
    if (isDemoMode) {
      setSharedWithMe((prev) =>
        prev.map((s) => (s.id === shareId ? { ...s, status: 'declined' as const } : s)),
      );
      toast('Invitation declined', 'success');
      return;
    }
    toast('Invitation declined', 'success');
  };

  const toggleParcel = (parcelId: string) => {
    setSelectedParcels((prev) =>
      prev.includes(parcelId) ? prev.filter((id) => id !== parcelId) : [...prev, parcelId],
    );
  };

  const togglePermission = (key: string) => {
    setInvitePermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Section tabs (mobile-friendly) ──

  const sections = [
    { id: 'shares' as const, label: 'My Shares', icon: <Users size={14} />, count: myShares.length },
    { id: 'invite' as const, label: 'Invite', icon: <UserPlus size={14} /> },
    { id: 'shared-with-me' as const, label: 'Shared With Me', icon: <Mail size={14} />, count: sharedWithMe.length },
    { id: 'family' as const, label: 'Family Group', icon: <UsersRound size={14} /> },
  ];

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-[var(--green)]" />
            <span className="text-sm text-[var(--text3)]">Loading sharing settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
            <Users size={20} className="text-[var(--green)]" />
            Forest Access Management
          </h1>
          <p className="text-xs text-[var(--text3)] mt-1">
            Manage who can access your forest parcels
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text3)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {isDemoMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--amber)]/10 border border-[var(--amber)]/20 text-[var(--amber)]">
          <AlertCircle size={14} />
          <span className="text-xs font-medium">Demo mode - changes are not saved</span>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeSection === section.id
                ? 'text-[var(--green)] border-[var(--green)]'
                : 'text-[var(--text3)] border-transparent hover:text-[var(--text2)]'
            }`}
          >
            {section.icon}
            {section.label}
            {'count' in section && section.count !== undefined && section.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--bg3)] text-[10px] font-mono">
                {section.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Section 1: My Shared Forests */}
      {activeSection === 'shares' && (
        <MySharesSection
          shares={myShares}
          onRevoke={handleRevokeAccess}
          onUpdateRole={handleUpdateRole}
          onResend={handleResendInvite}
        />
      )}

      {/* Section 2: Invite Someone */}
      {activeSection === 'invite' && (
        <InviteSection
          email={inviteEmail}
          setEmail={setInviteEmail}
          role={inviteRole}
          setRole={setInviteRole}
          permissions={invitePermissions}
          togglePermission={togglePermission}
          parcels={parcels}
          selectedParcels={selectedParcels}
          toggleParcel={toggleParcel}
          expiry={inviteExpiry}
          setExpiry={setInviteExpiry}
          note={inviteNote}
          setNote={setInviteNote}
          inviting={inviting}
          error={inviteError}
          onInvite={handleInvite}
        />
      )}

      {/* Section 3: Shared With Me */}
      {activeSection === 'shared-with-me' && (
        <SharedWithMeSection
          items={sharedWithMe}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      )}

      {/* Section 4: Family Group */}
      {activeSection === 'family' && (
        <FamilyGroupSection
          familyName={familyName}
          setFamilyName={setFamilyName}
          members={DEMO_FAMILY_MEMBERS}
          shareAll={familyShareAll}
          setShareAll={setFamilyShareAll}
        />
      )}

      {/* Role definitions reference */}
      <RoleDefinitions compact />
    </div>
  );
}

/* ─── Section 1: My Shares ─── */

function MySharesSection({
  shares,
  onRevoke,
  onUpdateRole,
  onResend,
}: {
  shares: ForestShare[];
  onRevoke: (id: string) => void;
  onUpdateRole: (id: string, role: ForestShareRole) => void;
  onResend: (id: string) => void;
}) {
  const activeShares = shares.filter((s) => s.status !== 'revoked');
  const revokedShares = shares.filter((s) => s.status === 'revoked');

  if (shares.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
        <Users size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-50" />
        <p className="text-sm text-[var(--text3)]">
          You have not shared any parcels yet.
        </p>
        <p className="text-xs text-[var(--text3)] mt-1">
          Use the Invite tab to share access with others.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Active shares */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg3)]">
                <th className="px-4 py-2.5 text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider">Parcel</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider">Shared With</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider">Role</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-[var(--text3)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeShares.map((share) => (
                <ShareRow
                  key={share.id}
                  share={share}
                  onRevoke={onRevoke}
                  onUpdateRole={onUpdateRole}
                  onResend={onResend}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoked shares */}
      {revokedShares.length > 0 && (
        <RevokedSection shares={revokedShares} />
      )}
    </div>
  );
}

function ShareRow({
  share,
  onRevoke,
  onUpdateRole,
  onResend,
}: {
  share: ForestShare;
  onRevoke: (id: string) => void;
  onUpdateRole: (id: string, role: ForestShareRole) => void;
  onResend: (id: string) => void;
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const roles: ForestShareRole[] = ['viewer', 'editor', 'manager', 'advisor'];

  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg3)] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <TreePine size={14} className="text-[var(--green)] flex-shrink-0" />
          <span className="text-sm font-medium text-[var(--text)]">{share.parcel_name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-[var(--text)]">{share.shared_with_name ?? share.shared_with_email}</p>
        {share.shared_with_name && (
          <p className="text-[10px] text-[var(--text3)]">{share.shared_with_email}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_STYLES[share.role]}`}
          >
            {share.role}
            <ChevronDown size={10} />
          </button>
          {roleOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRoleOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 bg-[var(--bg2)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[120px]">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      onUpdateRole(share.id, role);
                      setRoleOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg3)] transition-colors ${
                      share.role === role ? 'text-[var(--green)] font-medium' : 'text-[var(--text2)]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[share.status]}`}>
          {share.status === 'pending' && <Clock size={10} />}
          {share.status === 'accepted' && <Check size={10} />}
          {share.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-[var(--text3)]">
          {new Date(share.invited_at).toLocaleDateString()}
        </span>
        {share.expires_at && (
          <p className="text-[9px] text-[var(--text3)] mt-0.5 flex items-center gap-0.5">
            <CalendarDays size={8} />
            Expires {new Date(share.expires_at).toLocaleDateString()}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {share.status === 'pending' && (
            <button
              onClick={() => onResend(share.id)}
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--text3)] hover:text-blue-500 transition-colors"
              title="Resend invite"
            >
              <Send size={12} />
            </button>
          )}
          {share.status !== 'revoked' && (
            <button
              onClick={() => onRevoke(share.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text3)] hover:text-red-500 transition-colors"
              title="Revoke access"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function RevokedSection({ shares }: { shares: ForestShare[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-medium text-[var(--text3)] flex items-center gap-2">
          <X size={12} />
          Revoked access ({shares.length})
        </span>
        <ChevronDown size={14} className={`text-[var(--text3)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {shares.map((share) => (
            <div
              key={share.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg3)] opacity-60"
            >
              <TreePine size={12} className="text-[var(--text3)]" />
              <span className="text-xs text-[var(--text3)]">{share.parcel_name}</span>
              <span className="text-xs text-[var(--text3)]">{share.shared_with_name ?? share.shared_with_email}</span>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES.revoked}`}>
                revoked
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Section 2: Invite ─── */

function InviteSection({
  email,
  setEmail,
  role,
  setRole,
  permissions,
  togglePermission,
  parcels,
  selectedParcels,
  toggleParcel,
  expiry,
  setExpiry,
  note,
  setNote,
  inviting,
  error,
  onInvite,
}: {
  email: string;
  setEmail: (v: string) => void;
  role: ForestShareRole;
  setRole: (v: ForestShareRole) => void;
  permissions: Record<string, boolean>;
  togglePermission: (key: string) => void;
  parcels: DemoParcel[];
  selectedParcels: string[];
  toggleParcel: (id: string) => void;
  expiry: string;
  setExpiry: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  inviting: boolean;
  error: string | null;
  onInvite: () => void;
}) {
  const roles: ForestShareRole[] = ['viewer', 'editor', 'manager', 'advisor'];

  const permissionLabels: Record<string, string> = {
    view_health: 'View health data',
    view_financial: 'View financial data',
    view_operations: 'View operations',
    edit_parcels: 'Edit parcels',
    manage_surveys: 'Manage surveys',
    manage_sales: 'Manage sales',
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 space-y-5">
      <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
        <UserPlus size={16} className="text-[var(--green)]" />
        Invite someone
      </h2>

      {/* Email */}
      <div>
        <label className="text-[11px] text-[var(--text3)] block mb-1.5">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 focus:ring-1 focus:ring-[var(--green)]/20"
        />
      </div>

      {/* Role selector */}
      <div>
        <label className="text-[11px] text-[var(--text3)] block mb-1.5">Role</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`p-2.5 rounded-lg border text-left transition-colors ${
                role === r
                  ? 'border-[var(--green)]/50 bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--border2)]'
              }`}
            >
              <p className={`text-xs font-medium capitalize ${role === r ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                {r}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div>
        <label className="text-[11px] text-[var(--text3)] block mb-1.5">
          <Shield size={10} className="inline mr-1" />
          Fine-tune permissions
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(permissionLabels).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={permissions[key] ?? false}
                onChange={() => togglePermission(key)}
                className="rounded border-[var(--border)] bg-[var(--bg3)] text-[var(--green)] focus:ring-[var(--green)]"
              />
              <span className="text-xs text-[var(--text2)]">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Parcel multi-select */}
      <div>
        <label className="text-[11px] text-[var(--text3)] block mb-1.5">
          <TreePine size={10} className="inline mr-1" />
          Which parcels to share
        </label>
        <div className="flex flex-wrap gap-2">
          {parcels.map((parcel) => (
            <button
              key={parcel.id}
              onClick={() => toggleParcel(parcel.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedParcels.includes(parcel.id)
                  ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
              }`}
            >
              <TreePine size={12} />
              {parcel.name}
              {selectedParcels.includes(parcel.id) && <Check size={12} />}
            </button>
          ))}
        </div>
      </div>

      {/* Expiry date */}
      <div>
        <label className="text-[11px] text-[var(--text3)] block mb-1.5">
          <CalendarDays size={10} className="inline mr-1" />
          Access expires (optional)
        </label>
        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50 focus:ring-1 focus:ring-[var(--green)]/20"
        />
      </div>

      {/* Note */}
      <div>
        <label className="text-[11px] text-[var(--text3)] block mb-1.5">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Family member, timber advisor..."
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 focus:ring-1 focus:ring-[var(--green)]/20"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={onInvite}
        disabled={inviting}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {inviting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Send size={16} />
        )}
        Send Invite
      </button>
    </div>
  );
}

/* ─── Section 3: Shared With Me ─── */

function SharedWithMeSection({
  items,
  onAccept,
  onDecline,
}: {
  items: SharedWithMeItem[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const pending = items.filter((i) => i.status === 'pending');
  const accepted = items.filter((i) => i.status === 'accepted');

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
        <Mail size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-50" />
        <p className="text-sm text-[var(--text3)]">No one has shared their forest with you yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending invitations */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-yellow-600 flex items-center gap-2">
            <Clock size={14} />
            Pending invitations ({pending.length})
          </h3>
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg2)] border border-[var(--border)]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)]">
                  <TreePine size={12} className="inline mr-1 text-[var(--green)]" />
                  {item.parcel_name}
                </p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  From {item.owner_name} ({item.owner_email})
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_STYLES[item.role]}`}>
                    {item.role}
                  </span>
                  {item.note && (
                    <span className="text-[10px] text-[var(--text3)] italic">"{item.note}"</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onAccept(item.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:brightness-110 transition"
                >
                  <Check size={12} />
                  Accept
                </button>
                <button
                  onClick={() => onDecline(item.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text3)] hover:text-red-500 hover:border-red-500/30 transition-colors"
                >
                  <X size={12} />
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accepted shares */}
      {accepted.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text2)] flex items-center gap-2">
            <Check size={14} className="text-[var(--green)]" />
            Active shared access ({accepted.length})
          </h3>
          {accepted.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)] hover:border-[var(--border2)] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                <TreePine size={14} className="text-[var(--green)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)]">{item.parcel_name}</p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  Owner: {item.owner_name}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${ROLE_STYLES[item.role]}`}>
                {item.role}
              </span>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-[var(--text3)]">
                  {new Date(item.invited_at).toLocaleDateString()}
                </p>
                {item.note && (
                  <p className="text-[9px] text-[var(--text3)] italic mt-0.5">"{item.note}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Section 4: Family Group ─── */

function FamilyGroupSection({
  familyName,
  setFamilyName,
  members,
  shareAll,
  setShareAll,
}: {
  familyName: string;
  setFamilyName: (v: string) => void;
  members: { name: string; email: string; role: ForestShareRole }[];
  shareAll: boolean;
  setShareAll: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 space-y-5">
      <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
        <UsersRound size={16} className="text-[var(--green)]" />
        Family Group
      </h2>

      <p className="text-xs text-[var(--text3)]">
        Create a family group to quickly manage shared access across all your parcels.
      </p>

      {/* Group name */}
      <div>
        <label className="text-[11px] text-[var(--text3)] block mb-1.5">Group name</label>
        <input
          type="text"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50 focus:ring-1 focus:ring-[var(--green)]/20"
        />
      </div>

      {/* Share all toggle */}
      <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={shareAll}
          onChange={(e) => setShareAll(e.target.checked)}
          className="rounded border-[var(--border)] bg-[var(--bg3)] text-[var(--green)] focus:ring-[var(--green)]"
        />
        <div>
          <p className="text-xs font-medium text-[var(--text)]">Share all parcels with this group</p>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            New parcels will automatically be shared with all family members
          </p>
        </div>
      </label>

      {/* Members */}
      <div>
        <h3 className="text-[11px] font-medium text-[var(--text3)] uppercase tracking-wide mb-2">
          Members ({members.length})
        </h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.email}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg3)]"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--green)]/10 border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-semibold text-[var(--green)]">
                  {member.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)]">{member.name}</p>
                <p className="text-[10px] text-[var(--text3)]">{member.email}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${ROLE_STYLES[member.role]}`}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add member button */}
      <button className="flex items-center gap-2 w-full px-4 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors">
        <UserPlus size={14} />
        Add family member
      </button>
    </div>
  );
}
