import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'owner' | 'pilot' | 'inspector' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  organization: string | null;
  locale: string;
  created_at: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      if (!isSupabaseConfigured) {
        set({ isLoading: false, isInitialized: true });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({
          session,
          user: session.user,
          profile,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({ isLoading: false, isInitialized: true });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          const profile = await fetchProfile(newSession.user.id);
          set({ session: newSession, user: newSession.user, profile });
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, profile: null });
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          set({ session: newSession });
        }
      });
    } catch (err) {
      console.error('Auth initialization failed:', err);
      set({ isLoading: false, isInitialized: true, error: 'Failed to initialize authentication' });
    }
  },

  signInWithMagicLink: async (email: string) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
    set({ isLoading: false });
  },

  signInWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
    if (data.session?.user) {
      const profile = await fetchProfile(data.session.user.id);
      set({
        session: data.session,
        user: data.session.user,
        profile,
        isLoading: false,
      });
    }
  },

  signUp: async (email: string, password: string, role: UserRole, fullName: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { role, full_name: fullName },
      },
    });
    if (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
    if (data.session?.user) {
      const profile = await fetchProfile(data.session.user.id);
      set({
        session: data.session,
        user: data.session.user,
        profile,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, organization, locale, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('Profile fetch failed:', error.message);
    return null;
  }
  return data as UserProfile;
}
