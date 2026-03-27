import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_USAGE_TABLE = "ai_message_usage";

export type AiUsageRow = {
  user_id: string;
  context: string;
  focus: string | null;
  source: "external" | "local-fallback";
  status: "ok" | "blocked";
};

export async function countUserUsageThisMonth(
  client: SupabaseClient,
  userId: string,
  sinceIso: string
): Promise<number> {
  const { count, error } = await client
    .from(AI_USAGE_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ok")
    .gte("created_at", sinceIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function insertUsage(
  client: SupabaseClient,
  row: AiUsageRow
): Promise<void> {
  const { error } = await client.from(AI_USAGE_TABLE).insert(row);
  if (error) throw new Error(error.message);
}

export function monthStartIso(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  return d.toISOString();
}

