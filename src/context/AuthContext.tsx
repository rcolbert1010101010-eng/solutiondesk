import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Role = 'admin' | 'member';

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  active: boolean;
  passwordHash: string;
  mustChangePassword?: boolean;
}

interface AuthState {
  currentUser: Omit<AppUser, 'passwordHash'> | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getUsers: () => Omit<AppUser, 'passwordHash'>[];
  createUser: (email: string, password: string, role: Role) => Promise<{ success: boolean; error?: string }>;
}

const USERS_KEY = 'irm_users';
const SESSION_KEY = 'irm_session';

// Simple deterministic hash — not cryptographic, but not plaintext either.
// For a purely in-browser demo app with no backend this is the best we can do
// while still following "no external services" constraints.
function hashPassword(password: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < password.length; i++) {
    hash ^= password.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  // salt prefix so raw number is less obvious
  return 'h2$' + hash.toString(16).padStart(8, '0');
}

const SEED_ADMIN: AppUser = {
  id: 'user_seed_admin_001',
  email: 'randy.colbert@illinois.gov',
  role: 'admin',
  createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  active: true,
  passwordHash: hashPassword('Tal08!12Ray'),
  mustChangePassword: false,
};

function loadUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed: AppUser[] = JSON.parse(raw);
      // Ensure seed admin always exists
      const hasSeed = parsed.some(u => u.id === SEED_ADMIN.id);
      if (!hasSeed) {
        const withSeed = [SEED_ADMIN, ...parsed];
        localStorage.setItem(USERS_KEY, JSON.stringify(withSeed));
        return withSeed;
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  const initial = [SEED_ADMIN];
  localStorage.setItem(USERS_KEY, JSON.stringify(initial));
  return initial;
}

function saveUsers(users: AppUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function saveSession(userId: string | null) {
  if (userId) {
    localStorage.setItem(SESSION_KEY, userId);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Omit<AppUser, 'passwordHash'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    const users = loadUsers();
    const sessionUserId = loadSession();
    if (sessionUserId) {
      const found = users.find(u => u.id === sessionUserId && u.active);
      if (found) {
        const { passwordHash: _ph, ...rest } = found;
        setCurrentUser(rest);
      } else {
        saveSession(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }
    if (!user.active) {
      return { success: false, error: 'This account has been deactivated.' };
    }
    if (user.passwordHash !== hashPassword(password)) {
      return { success: false, error: 'Invalid email or password.' };
    }
    const { passwordHash: _ph, ...rest } = user;
    setCurrentUser(rest);
    saveSession(user.id);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    saveSession(null);
  }, []);

  const getUsers = useCallback((): Omit<AppUser, 'passwordHash'>[] => {
    return loadUsers().map(({ passwordHash: _ph, ...rest }) => rest);
  }, []);

  const createUser = useCallback(async (email: string, password: string, role: Role): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail) return { success: false, error: 'Email is required.' };
    if (!password) return { success: false, error: 'Password is required.' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    const users = loadUsers();
    const exists = users.some(u => u.email.toLowerCase() === trimmedEmail);
    if (exists) {
      return { success: false, error: 'A user with this email already exists.' };
    }

    const newUser: AppUser = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      email: trimmedEmail,
      role,
      createdAt: new Date().toISOString(),
      active: true,
      passwordHash: hashPassword(password),
      mustChangePassword: false,
    };

    const updated = [...users, newUser];
    saveUsers(updated);
    return { success: true };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, getUsers, createUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
