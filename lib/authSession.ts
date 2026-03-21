import * as SecureStore from 'expo-secure-store';

import type { AuthSessionPayload, AuthUserPayload } from './authApi';

const KEY = 'habit_hero_auth_session_v1';

export type StoredAuth = {
  session: AuthSessionPayload;
  user: AuthUserPayload | null;
};

export async function loadStoredAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed?.session?.access_token) return parsed;
  } catch {
    // ignore
  }
  return null;
}

export async function saveStoredAuth(auth: StoredAuth): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(auth));
}

export async function clearStoredAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
