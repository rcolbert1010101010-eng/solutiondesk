import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type Role = 'admin' | 'user';

type AuthResult = {
  success: boolean;
  error?: string;
  message?: string;
  requiresEmailConfirmation?: boolean;
};

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  currentUser: AppUser | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  listProfiles: () => Promise<{ success: boolean; data: Profile[]; error?: string }>;
  updateProfileRole: (id: string, role: Role) => Promise<AuthResult>;
  refreshCurrentUser: () => Promise<void>;
}

const SHARED_ADMIN_EMAIL = 'iema.user@illinois.gov';

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? '';
}

function normalizeRole(role: string | null | undefined): Role {
  return role === 'admin' ? 'admin' : 'user';
}

function adminRoleForEmail(email: string): Role {
  return normalizeEmail(email) === SHARED_ADMIN_EMAIL ? 'admin' : 'user';
}

function getDisplayNameFromAuthUser(user: User): string | null {
  const metadata = user.user_metadata as Record<string, unknown> | null;
  const candidate = metadata?.display_name ?? metadata?.full_name ?? metadata?.name;
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toProfile(row: ProfileRow): Profile {
  const email = normalizeEmail(row.email);
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    role: adminRoleForEmail(email),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAppUser(profile: Profile): AppUser {
  const email = normalizeEmail(profile.email);
  return {
    id: profile.id,
    email,
    role: adminRoleForEmail(email),
    displayName: profile.displayName,
  };
}

function mapSupabaseError(error: { message?: string } | null | undefined, fallback: string): string {
  return error?.message?.trim() || fallback;
}

function isProfilesAccessDenied(error: { message?: string; details?: string; code?: string } | null | undefined): boolean {
  const combined = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return (
    error?.code === '42501' ||
    combined.includes('row-level security') ||
    combined.includes('permission denied')
  );
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profilesSyncBlocked, setProfilesSyncBlocked] = useState(false);

  const loadProfileForUser = useCallback(async (user: User, displayNameOverride?: string | null): Promise<Profile | null> => {
    const email = normalizeEmail(user.email);
    if (!email) return null;
    if (profilesSyncBlocked) return null;

    const providedDisplayName = displayNameOverride?.trim();
    const displayName = providedDisplayName || getDisplayNameFromAuthUser(user);

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email,
          display_name: displayName ?? null,
        },
        { onConflict: 'id' },
      );

    if (upsertError) {
      if (isProfilesAccessDenied(upsertError)) {
        setProfilesSyncBlocked(true);
        console.warn('Profiles access denied by RLS. Skipping profile sync and using auth fallback.', upsertError.message);
      } else {
        console.warn('Profile upsert skipped. Using fallback role.', upsertError.message);
      }
      return null;
    }

    const { error: bootstrapError } = await supabase.rpc('claim_first_admin', { target_email: email });
    if (bootstrapError) {
      console.warn('Admin bootstrap RPC not applied.', bootstrapError.message);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,display_name,role,created_at,updated_at')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>();

    if (error) {
      if (isProfilesAccessDenied(error)) {
        setProfilesSyncBlocked(true);
        console.warn('Profiles access denied during fetch. Skipping profile sync and using auth fallback.', error.message);
      } else {
        console.warn('Profile fetch skipped. Using fallback role.', error.message);
      }
      return null;
    }

    if (!data) return null;
    return toProfile(data);
  }, [profilesSyncBlocked]);

  const syncSession = useCallback(async (session: Session | null, displayNameOverride?: string | null) => {
    if (!session?.user) {
      setCurrentUser(null);
      return;
    }

    const sessionEmail = normalizeEmail(session.user.email);
    const profile = await loadProfileForUser(session.user, displayNameOverride);

    if (profile) {
      setCurrentUser(toAppUser(profile));
      return;
    }

    setCurrentUser({
      id: session.user.id,
      email: sessionEmail,
      role: adminRoleForEmail(sessionEmail),
      displayName: getDisplayNameFromAuthUser(session.user),
    });
  }, [loadProfileForUser]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        console.error('Unable to restore Supabase session.', error);
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      await syncSession(data.session);
      if (isMounted) setIsLoading(false);
    };

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [syncSession]);

  const refreshCurrentUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await syncSession(data.session);
  }, [syncSession]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return { success: false, error: 'Email is required.' };
    if (!password) return { success: false, error: 'Password is required.' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return {
        success: false,
        error: mapSupabaseError(error, 'Login failed.'),
      };
    }

    await syncSession(data.session);
    return { success: true };
  }, [syncSession]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string): Promise<AuthResult> => {
    const normalizedEmail = normalizeEmail(email);
    const cleanedDisplayName = displayName?.trim() || undefined;

    if (!normalizedEmail) return { success: false, error: 'Email is required.' };
    if (!password) return { success: false, error: 'Password is required.' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          ...(cleanedDisplayName ? { display_name: cleanedDisplayName } : {}),
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: mapSupabaseError(error, 'Sign up failed.'),
      };
    }

    const requiresEmailConfirmation = !data.session;

    if (data.session) {
      await syncSession(data.session, cleanedDisplayName ?? null);
    }

    return {
      success: true,
      requiresEmailConfirmation,
      message: requiresEmailConfirmation
        ? 'Account created. Check your email to confirm your account before signing in.'
        : 'Account created. You are now signed in.',
    };
  }, [syncSession]);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return {
        success: false,
        error: mapSupabaseError(error, 'Sign out failed.'),
      };
    }

    setCurrentUser(null);
    return { success: true };
  }, []);

  const listProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,display_name,role,created_at,updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      return {
        success: false as const,
        data: [] as Profile[],
        error: mapSupabaseError(error, 'Failed to load users.'),
      };
    }

    const profiles = (data ?? []).map(row => toProfile(row as ProfileRow));
    return {
      success: true as const,
      data: profiles,
    };
  }, []);

  const updateProfileRole = useCallback(async (id: string, role: Role): Promise<AuthResult> => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id);

    if (error) {
      return {
        success: false,
        error: mapSupabaseError(error, 'Failed to update role.'),
      };
    }

    if (currentUser?.id === id) {
      setCurrentUser(prev => (prev ? { ...prev, role: adminRoleForEmail(prev.email) } : prev));
    }

    return { success: true };
  }, [currentUser?.id]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        signIn,
        signUp,
        signOut,
        listProfiles,
        updateProfileRole,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
