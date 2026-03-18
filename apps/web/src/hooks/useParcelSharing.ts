import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isDemo } from '@/lib/demoData';

export type ShareRole = 'viewer' | 'commenter' | 'editor' | 'admin';
export type ShareStatus = 'pending' | 'accepted' | 'rejected';

export interface Collaborator {
  id: string;
  parcel_id: string;
  user_id: string | null;
  invited_email: string;
  role: ShareRole;
  status: ShareStatus;
  invited_by: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
}

export interface ParcelOwner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export interface SharedParcel {
  id: string;
  parcel_id: string;
  role: ShareRole;
  status: ShareStatus;
  created_at: string;
  parcel: {
    id: string;
    name: string;
    area_ha: number;
    status: string;
    municipality: string;
  } | null;
  invited_by_profile: {
    full_name: string | null;
    email: string;
  } | null;
}

export interface GeneratedLink {
  id: string;
  share_token: string;
  role: ShareRole;
  expires_at: string | null;
  has_password: boolean;
  created_at: string;
}

interface UseParcelSharingReturn {
  collaborators: Collaborator[];
  owner: ParcelOwner | null;
  pendingInvites: Collaborator[];
  sharedWithMe: SharedParcel[];
  isLoading: boolean;
  error: string | null;
  invite: (parcelId: string, email: string, role: ShareRole) => Promise<void>;
  remove: (shareId: string) => Promise<void>;
  updateRole: (shareId: string, role: ShareRole) => Promise<void>;
  generateLink: (
    parcelId: string,
    expiresIn: string,
    password?: string,
  ) => Promise<GeneratedLink | null>;
  fetchCollaborators: (parcelId: string) => Promise<void>;
  fetchSharedWithMe: () => Promise<void>;
}

// ─── Demo data ───

const DEMO_OWNER: ParcelOwner = {
  id: 'demo-user',
  full_name: 'Erik Lindström',
  avatar_url: null,
  email: 'erik.lindstrom@example.se',
};

const DEMO_COLLABORATORS: Collaborator[] = [
  {
    id: 'dc-1',
    parcel_id: 'p1',
    user_id: 'u-anna',
    invited_email: 'anna.svensson@skogsstyrelsen.se',
    role: 'editor',
    status: 'accepted',
    invited_by: 'demo-user',
    expires_at: null,
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-02-15T10:00:00Z',
    profile: {
      id: 'u-anna',
      full_name: 'Anna Svensson',
      avatar_url: null,
      email: 'anna.svensson@skogsstyrelsen.se',
    },
  },
  {
    id: 'dc-2',
    parcel_id: 'p1',
    user_id: 'u-lars',
    invited_email: 'lars.berg@sydved.se',
    role: 'viewer',
    status: 'accepted',
    invited_by: 'demo-user',
    expires_at: null,
    created_at: '2026-03-01T14:30:00Z',
    updated_at: '2026-03-01T14:30:00Z',
    profile: {
      id: 'u-lars',
      full_name: 'Lars Berg',
      avatar_url: null,
      email: 'lars.berg@sydved.se',
    },
  },
  {
    id: 'dc-3',
    parcel_id: 'p1',
    user_id: null,
    invited_email: 'maria.ek@example.se',
    role: 'commenter',
    status: 'pending',
    invited_by: 'demo-user',
    expires_at: null,
    created_at: '2026-03-14T09:00:00Z',
    updated_at: '2026-03-14T09:00:00Z',
    profile: null,
  },
];

const DEMO_SHARED_WITH_ME: SharedParcel[] = [
  {
    id: 'ds-1',
    parcel_id: 'p-shared-1',
    role: 'viewer',
    status: 'accepted',
    created_at: '2026-02-20T08:00:00Z',
    parcel: {
      id: 'p-shared-1',
      name: 'Björkudden',
      area_ha: 35.2,
      status: 'healthy',
      municipality: 'Gislaved',
    },
    invited_by_profile: {
      full_name: 'Karin Johansson',
      email: 'karin.johansson@example.se',
    },
  },
  {
    id: 'ds-2',
    parcel_id: 'p-shared-2',
    role: 'editor',
    status: 'accepted',
    created_at: '2026-03-05T12:00:00Z',
    parcel: {
      id: 'p-shared-2',
      name: 'Älgmon',
      area_ha: 58.7,
      status: 'at_risk',
      municipality: 'Värnamo',
    },
    invited_by_profile: {
      full_name: 'Olof Nilsson',
      email: 'olof.nilsson@example.se',
    },
  },
];

export function useParcelSharing(parcelId?: string): UseParcelSharingReturn {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [owner, setOwner] = useState<ParcelOwner | null>(null);
  const [sharedWithMe, setSharedWithMe] = useState<SharedParcel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useAuthStore((s) => s.session);

  const pendingInvites = collaborators.filter((c) => c.status === 'pending');

  const getAuthHeaders = useCallback(() => {
    const token = session?.access_token;
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    };
  }, [session]);

  const fetchCollaborators = useCallback(
    async (pid: string) => {
      setIsLoading(true);
      setError(null);

      // Demo fallback
      if (!isSupabaseConfigured || !session || isDemo()) {
        const demoCollabs = DEMO_COLLABORATORS.filter((c) => c.parcel_id === pid || pid === 'p1');
        setCollaborators(demoCollabs);
        setOwner(DEMO_OWNER);
        setIsLoading(false);
        return;
      }

      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(
          `${baseUrl}/functions/v1/parcel-share?parcel_id=${pid}`,
          {
            method: 'GET',
            headers: getAuthHeaders(),
          },
        );

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          throw new Error(errBody?.error ?? 'Failed to fetch collaborators');
        }

        const json = await response.json();
        setCollaborators(json.data?.collaborators ?? []);
        setOwner(json.data?.owner ?? null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load collaborators';
        setError(msg);
        console.error('fetchCollaborators error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [session, getAuthHeaders],
  );

  const fetchSharedWithMe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Demo fallback
    if (!isSupabaseConfigured || !session || isDemo()) {
      setSharedWithMe(DEMO_SHARED_WITH_ME);
      setIsLoading(false);
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${baseUrl}/functions/v1/parcel-share?shared_with_me=true`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error ?? 'Failed to fetch shared parcels');
      }

      const json = await response.json();
      setSharedWithMe(json.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load shared parcels';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [session, getAuthHeaders]);

  const invite = useCallback(
    async (pid: string, email: string, role: ShareRole) => {
      setError(null);

      // Demo fallback — add to local state
      if (!isSupabaseConfigured || !session || isDemo()) {
        const now = new Date().toISOString();
        const newCollab: Collaborator = {
          id: `dc-${Date.now()}`,
          parcel_id: pid,
          user_id: null,
          invited_email: email,
          role,
          status: 'pending',
          invited_by: 'demo-user',
          expires_at: null,
          created_at: now,
          updated_at: now,
          profile: null,
        };
        setCollaborators((prev) => [...prev, newCollab]);
        return;
      }

      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${baseUrl}/functions/v1/parcel-share`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ parcel_id: pid, email, role }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          throw new Error(errBody?.error ?? 'Failed to send invitation');
        }

        // Refresh collaborator list
        await fetchCollaborators(pid);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send invitation';
        setError(msg);
        throw err;
      }
    },
    [session, getAuthHeaders, fetchCollaborators],
  );

  const remove = useCallback(
    async (shareId: string) => {
      setError(null);

      // Demo fallback — remove from local state
      if (!isSupabaseConfigured || !session || isDemo()) {
        setCollaborators((prev) => prev.filter((c) => c.id !== shareId));
        return;
      }

      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${baseUrl}/functions/v1/parcel-share`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          body: JSON.stringify({ share_id: shareId }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          throw new Error(errBody?.error ?? 'Failed to remove collaborator');
        }

        setCollaborators((prev) => prev.filter((c) => c.id !== shareId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove collaborator';
        setError(msg);
        throw err;
      }
    },
    [session, getAuthHeaders],
  );

  const updateRole = useCallback(
    async (shareId: string, role: ShareRole) => {
      setError(null);

      // Demo fallback — update local state
      if (!isSupabaseConfigured || !session || isDemo()) {
        setCollaborators((prev) =>
          prev.map((c) => (c.id === shareId ? { ...c, role } : c)),
        );
        return;
      }

      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${baseUrl}/functions/v1/parcel-share`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ share_id: shareId, role }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          throw new Error(errBody?.error ?? 'Failed to update role');
        }

        setCollaborators((prev) =>
          prev.map((c) => (c.id === shareId ? { ...c, role } : c)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update role';
        setError(msg);
        throw err;
      }
    },
    [session, getAuthHeaders],
  );

  const generateLink = useCallback(
    async (
      pid: string,
      expiresIn: string,
      password?: string,
    ): Promise<GeneratedLink | null> => {
      setError(null);

      // Demo fallback — return a fake share link
      if (!isSupabaseConfigured || !session || isDemo()) {
        const expiryMap: Record<string, number> = {
          '24h': 1,
          '7d': 7,
          '30d': 30,
        };
        const days = expiryMap[expiresIn];
        const expiresAt = days
          ? new Date(Date.now() + days * 86400000).toISOString()
          : null;
        return {
          id: `dl-${Date.now()}`,
          share_token: `demo-${Math.random().toString(36).slice(2, 10)}`,
          role: 'viewer',
          expires_at: expiresAt,
          has_password: !!password,
          created_at: new Date().toISOString(),
        };
      }

      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${baseUrl}/functions/v1/parcel-share`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            generate_link: true,
            parcel_id: pid,
            expires_in: expiresIn,
            password: password || undefined,
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          throw new Error(errBody?.error ?? 'Failed to generate share link');
        }

        const json = await response.json();
        return json.data as GeneratedLink;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate share link';
        setError(msg);
        throw err;
      }
    },
    [session, getAuthHeaders],
  );

  // Auto-fetch collaborators when parcelId is provided
  useEffect(() => {
    if (parcelId) {
      fetchCollaborators(parcelId);
    }
  }, [parcelId, fetchCollaborators]);

  return {
    collaborators,
    owner,
    pendingInvites,
    sharedWithMe,
    isLoading,
    error,
    invite,
    remove,
    updateRole,
    generateLink,
    fetchCollaborators,
    fetchSharedWithMe,
  };
}
