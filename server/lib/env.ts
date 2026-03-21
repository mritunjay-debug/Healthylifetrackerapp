/**
 * Validated environment for serverless handlers.
 * Loads `.env` / `.env.local` from the server folder (and cwd) when present so
 * `vercel dev` and local runs see SUPABASE_* without relying only on the CLI.
 */
import { existsSync } from 'fs';
import { resolve } from 'path';

import { config as loadEnv } from 'dotenv';

function loadLocalEnvFiles(): void {
  const roots = new Set<string>([process.cwd(), resolve(process.cwd(), 'server')]);
  for (const root of roots) {
    const envPath = resolve(root, '.env');
    const localPath = resolve(root, '.env.local');
    if (existsSync(envPath)) {
      loadEnv({ path: envPath });
    }
    if (existsSync(localPath)) {
      loadEnv({ path: localPath, override: true });
    }
  }
}

loadLocalEnvFiles();

export type ServerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
};

/** Some tools use lowercase names; we accept both. */
const ALIASES: Record<string, string[]> = {
  SUPABASE_URL: ['SUPABASE_URL', 'supabase_url'],
  SUPABASE_ANON_KEY: ['SUPABASE_ANON_KEY', 'supabase_anon_key'],
};

function required(primaryName: string): string {
  const keys = ALIASES[primaryName] ?? [primaryName];
  for (const k of keys) {
    const v = process.env[k];
    if (v?.trim()) return v.trim();
  }
  throw new Error(
    `Missing required environment variable: ${primaryName}. ` +
      `Set it in Vercel → Project → Settings → Environment Variables (names: SUPABASE_URL, SUPABASE_ANON_KEY), ` +
      `or add server/.env.local from server/.env.example for local dev.`
  );
}

export function getServerEnv(): ServerEnv {
  const serviceKeys = ['SUPABASE_SERVICE_ROLE_KEY', 'supabase_service_role_key'] as const;
  let service: string | undefined;
  for (const k of serviceKeys) {
    const v = process.env[k];
    if (v?.trim()) {
      service = v.trim();
      break;
    }
  }
  return {
    supabaseUrl: required('SUPABASE_URL'),
    supabaseAnonKey: required('SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: service,
  };
}
