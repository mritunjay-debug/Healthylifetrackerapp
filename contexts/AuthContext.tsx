import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import {
  getGoogleAuthUrl,
  getUserFromAccessToken,
  loginRequest,
  syncPushTokenToAccount,
  signupRequest,
  type AuthSessionPayload,
  type AuthUserPayload,
} from '../lib/authApi';
import { clearStoredAuth, loadStoredAuth, saveStoredAuth, type StoredAuth } from '../lib/authSession';
import { clearAuthSkipped, isAuthSkipped, setAuthSkipped } from '../lib/storage';
import { getStoredPushToken } from '../lib/pushNotifications';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  loading: boolean;
  session: AuthSessionPayload | null;
  user: AuthUserPayload | null;
  /** True when user chose “continue without account” (optional login). */
  guestMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

  const consumeOAuthCallback = useCallback(async (url: string) => {
    const hash = url.split('#')[1] || '';
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresInRaw = params.get('expires_in');
    if (!accessToken || !refreshToken) return;

    const user = await getUserFromAccessToken(accessToken);
    const expiresIn = expiresInRaw ? Number(expiresInRaw) : undefined;
    const session: AuthSessionPayload = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Number.isFinite(expiresIn) ? expiresIn : undefined,
      token_type: params.get('token_type') || 'bearer',
    };
    const bundle: StoredAuth = { session, user };
    await clearAuthSkipped();
    setGuestMode(false);
    await saveStoredAuth(bundle);
    setSession(session);
    setUser(user);
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      consumeOAuthCallback(url).catch(() => {
        // Ignore callback parsing errors and keep app responsive.
      });
    });
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      consumeOAuthCallback(url).catch(() => {
        // Ignore callback parsing errors and keep app responsive.
      });
    });
    return () => sub.remove();
  }, [consumeOAuthCallback]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    getStoredPushToken()
      .then((pushToken) => {
        if (!pushToken) return;
        return syncPushTokenToAccount(token, pushToken);
      })
      .catch(() => {
        // Keep auth flow resilient if token sync fails.
      });
  }, [session?.access_token]);

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

  const signInWithGoogle = useCallback(async () => {
    const appOwnership = (Constants as { appOwnership?: string }).appOwnership ?? '';
    const isExpoGo = appOwnership === 'expo';
    const redirectTo = isExpoGo
      ? AuthSession.makeRedirectUri()
      : AuthSession.makeRedirectUri({ scheme: 'streakforge', path: 'auth/callback' });
    const authUrl = await getGoogleAuthUrl(redirectTo);
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
    if (result.type === 'success' && result.url) {
      await consumeOAuthCallback(result.url);
      return;
    }
    if (result.type === 'dismiss' || result.type === 'cancel') {
      throw new Error('Google sign in was cancelled');
    }
    throw new Error('Google sign in did not complete');
  }, [consumeOAuthCallback]);

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
      signInWithGoogle,
      signUp,
      signOut,
      continueAsGuest,
      exitGuestMode,
    }),
    [loading, session, user, guestMode, signIn, signInWithGoogle, signUp, signOut, continueAsGuest, exitGuestMode]
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
