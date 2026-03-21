import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ServerEnv } from "./env";

/**
 * Anonymous Supabase client — use only for auth routes (signUp / signIn).
 * Uses the anon key; respects RLS when not acting as a user.
 */
export function createAnonClient(env: ServerEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * User-scoped client — pass the access_token from the client after login.
 * RLS policies using auth.uid() will apply.
 */
export function createUserClient(
  env: ServerEnv,
  accessToken: string
): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Optional admin client — bypasses RLS. Never send this key to the browser.
 */
export function createServiceRoleClient(env: ServerEnv): SupabaseClient {
  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
