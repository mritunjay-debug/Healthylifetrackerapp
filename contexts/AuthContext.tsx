import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loginRequest, signupRequest, type AuthSessionPayload, type AuthUserPayload } from '../lib/authApi';
import { clearStoredAuth, loadStoredAuth, saveStoredAuth, type StoredAuth } from '../lib/authSession';
import { clearAuthSkipped, isAuthSkipped, setAuthSkipped } from '../lib/storage';

type AuthContextValue = {
  loading: boolean;
  session: AuthSessionPayload | null;
  user: AuthUserPayload | null;
  /** True when user chose “continue without account” (optional login). */
  guestMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean; message?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  /** Clear guest flag so Login can be shown (e.g. “Sign in” from Settings). */
  exitGuestMode: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSessionPayload | null>(null);
  const [user, setUser] = useState<AuthUserPayload | null>(null);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stored, skipped] = await Promise.all([loadStoredAuth(), isAuthSkipped()]);
        if (cancelled) return;
        if (stored?.session?.access_token) {
          setSession(stored.session);
          setUser(stored.user);
          setGuestMode(false);
        } else if (skipped) {
          setGuestMode(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const continueAsGuest = useCallback(async () => {
    await setAuthSkipped(true);
    setGuestMode(true);
    setSession(null);
    setUser(null);
  }, []);

  const exitGuestMode = useCallback(async () => {
    await clearAuthSkipped();
    setGuestMode(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email.trim(), password);
    if (!data.session?.access_token) {
      throw new Error('No session returned');
    }
    await clearAuthSkipped();
    setGuestMode(false);
    const bundle: StoredAuth = {
      session: data.session,
      user: data.user,
    };
    await saveStoredAuth(bundle);
    setSession(data.session);
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const data = await signupRequest(email.trim(), password);
    if (data.session?.access_token) {
      await clearAuthSkipped();
      setGuestMode(false);
      const bundle: StoredAuth = {
        session: data.session,
        user: data.user,
      };
      await saveStoredAuth(bundle);
      setSession(data.session);
      setUser(data.user);
      return { needsEmailConfirmation: false, message: data.message };
    }
    return {
      needsEmailConfirmation: true,
      message:
        data.message ||
        'Check your email to confirm your account, then sign in.',
    };
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredAuth();
    await clearAuthSkipped();
    setSession(null);
    setUser(null);
    setGuestMode(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      guestMode,
      signIn,
      signUp,
      signOut,
      continueAsGuest,
      exitGuestMode,
    }),
    [loading, session, user, guestMode, signIn, signUp, signOut, continueAsGuest, exitGuestMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
