import { getApiBaseUrl } from './config';

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

async function postJson<T>(path: string, body: Record<string, string>): Promise<T> {
  const base = getApiBaseUrl();
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
    const msg = err.error || err.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>('/api/auth/login', { email, password });
}

export async function signupRequest(email: string, password: string): Promise<SignupResponse> {
  return postJson<SignupResponse>('/api/auth/signup', { email, password });
}
