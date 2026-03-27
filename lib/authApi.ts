import { getApiBaseUrl, getApiBaseUrlCandidates } from './config';

export type AuthSessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
};

export type AuthUserPayload = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type LoginResponse = {
  user: AuthUserPayload | null;
  session: AuthSessionPayload | null;
};

type SignupResponse = LoginResponse & {
  message?: string;
};

type GoogleStartResponse = {
  url: string;
};

function toErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const nested =
      (typeof obj.message === 'string' && obj.message) ||
      (typeof obj.error === 'string' && obj.error) ||
      (typeof obj.msg === 'string' && obj.msg) ||
      '';
    if (nested.trim()) return nested.trim();
  }
  return fallback;
}

async function postJson<T>(path: string, body: Record<string, string>): Promise<T> {
  const candidates = getApiBaseUrlCandidates();
  let lastError: Error | null = null;

  for (const base of candidates) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!res.ok) {
        const err = data as { error?: string; message?: string };
        const msg =
          toErrorMessage(err.error, '') ||
          toErrorMessage(err.message, '') ||
          `Request failed (${res.status})`;
        throw new Error(msg);
      }

      return data as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Network request failed');
      // Try next candidate for obvious connectivity/base-url issues.
      const transient =
        /network request failed/i.test(lastError.message) ||
        /failed to fetch/i.test(lastError.message) ||
        /404/.test(lastError.message);
      if (!transient) break;
    }
  }

  const base = getApiBaseUrl();
  if (lastError && /network request failed|failed to fetch/i.test(lastError.message)) {
    throw new Error(
      `Cannot reach auth server. Current API base: ${base}. ` +
        'If using Expo Go on phone, set EXPO_PUBLIC_API_URL to your computer LAN IP (for example http://192.168.x.x:3005).'
    );
  }
  throw lastError ?? new Error('Request failed');
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>('/api/auth/login', { email, password });
}

export async function signupRequest(email: string, password: string): Promise<SignupResponse> {
  return postJson<SignupResponse>('/api/auth/signup', { email, password });
}

export async function getGoogleAuthUrl(redirectTo: string): Promise<string> {
  const data = await postJson<GoogleStartResponse>('/api/auth/google/start', { redirectTo });
  if (!data.url) throw new Error('Missing Google auth URL');
  return data.url;
}

export async function getUserFromAccessToken(accessToken: string): Promise<AuthUserPayload> {
  const candidates = getApiBaseUrlCandidates();
  let lastError: Error | null = null;

  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/auth/session`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { user?: AuthUserPayload; error?: string }) : {};
      if (!res.ok) throw new Error(toErrorMessage(data.error, `Request failed (${res.status})`));
      if (!data.user?.id) throw new Error('Missing user in session response');
      return data.user;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Failed to fetch user');
    }
  }

  throw lastError ?? new Error('Failed to fetch user');
}

export async function syncPushTokenToAccount(accessToken: string, pushToken: string): Promise<void> {
  const candidates = getApiBaseUrlCandidates();
  let lastError: Error | null = null;
  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/notifications/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token: pushToken, platform: 'mobile' }),
      });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { error?: string }) : {};
      if (!res.ok) throw new Error(toErrorMessage(data.error, `Token sync failed (${res.status})`));
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Token sync failed');
    }
  }
  throw lastError ?? new Error('Could not sync push token');
}
