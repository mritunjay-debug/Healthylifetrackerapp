import type { SupabaseClient } from "@supabase/supabase-js";

export const APP_USERS_TABLE = "app_users";
export const GUEST_USERS_TABLE = "guest_users";
export const AI_LIMITS_CONFIG_TABLE = "ai_limits_config";
export const AI_REQUESTS_TABLE = "ai_requests";
export const AI_CREDIT_TRANSACTIONS_TABLE = "ai_credit_transactions";

export type CreditBand = "small" | "medium" | "large";
export type WarningLevel = "75" | "90" | "100" | null;

type AppUserRow = {
  id: string;
  plan_type: string;
  monthly_credit_limit: number;
  credits_used: number;
  credit_reset_date: string;
};

type FeatureConfigRow = {
  feature_name: string;
  credit_cost_small: number;
  credit_cost_medium: number;
  credit_cost_large: number;
  max_input_tokens: number;
  max_output_tokens: number;
};

export type CreditEstimateInput = {
  feature: string;
  promptTokens: number | null;
  completionTokens: number | null;
  complexity: CreditBand;
};

export type CreditConsumptionResult =
  | {
      allowed: true;
      chargedCredits: number;
      remainingCredits: number;
      warningLevel: WarningLevel;
      limit: number;
      used: number;
      resetDate: string;
    }
  | {
      allowed: false;
      remainingCredits: 0;
      warningLevel: "100";
      limit: number;
      used: number;
      resetDate: string;
    };

function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

function nextMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
}

function warningFromRatio(ratio: number): WarningLevel {
  if (ratio >= 1) return "100";
  if (ratio >= 0.9) return "90";
  if (ratio >= 0.75) return "75";
  return null;
}

async function getFeatureConfig(client: SupabaseClient, feature: string): Promise<FeatureConfigRow> {
  const { data, error } = await client
    .from(AI_LIMITS_CONFIG_TABLE)
    .select("feature_name, credit_cost_small, credit_cost_medium, credit_cost_large, max_input_tokens, max_output_tokens")
    .eq("feature_name", feature)
    .maybeSingle<FeatureConfigRow>();
  if (error) throw new Error(error.message);
  if (data) return data;
  return {
    feature_name: feature,
    credit_cost_small: 1,
    credit_cost_medium: 2,
    credit_cost_large: 4,
    max_input_tokens: 3000,
    max_output_tokens: 600,
  };
}

export async function ensureAppUser(client: SupabaseClient, userId: string): Promise<AppUserRow> {
  const { data, error } = await client
    .from(APP_USERS_TABLE)
    .select("id, plan_type, monthly_credit_limit, credits_used, credit_reset_date")
    .eq("id", userId)
    .maybeSingle<AppUserRow>();
  if (error) throw new Error(error.message);
  if (data) return data;

  const inserted = await client
    .from(APP_USERS_TABLE)
    .insert({
      id: userId,
      plan_type: "free",
      monthly_credit_limit: 50,
      credits_used: 0,
      credit_reset_date: nextMonthStart().toISOString().slice(0, 10),
    })
    .select("id, plan_type, monthly_credit_limit, credits_used, credit_reset_date")
    .single<AppUserRow>();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data;
}

async function maybeResetMonthlyCredits(client: SupabaseClient, row: AppUserRow): Promise<AppUserRow> {
  const today = new Date().toISOString().slice(0, 10);
  if (row.credit_reset_date > today) return row;

  const nextReset = nextMonthStart().toISOString().slice(0, 10);
  const { data, error } = await client
    .from(APP_USERS_TABLE)
    .update({ credits_used: 0, credit_reset_date: nextReset, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .select("id, plan_type, monthly_credit_limit, credits_used, credit_reset_date")
    .single<AppUserRow>();
  if (error) throw new Error(error.message);

  await client.from(AI_CREDIT_TRANSACTIONS_TABLE).insert({
    user_id: row.id,
    credits_added: row.monthly_credit_limit,
    credits_deducted: 0,
    reason: "monthly_reset",
    metadata: { month_start: monthStart().toISOString() },
  });

  return data;
}

export async function estimateCredits(
  client: SupabaseClient,
  input: CreditEstimateInput
): Promise<{ credits: number; config: FeatureConfigRow }> {
  const config = await getFeatureConfig(client, input.feature);
  const totalTokens =
    input.promptTokens != null && input.completionTokens != null
      ? input.promptTokens + input.completionTokens
      : null;

  if (totalTokens == null) {
    const fallback =
      input.complexity === "small"
        ? config.credit_cost_small
        : input.complexity === "medium"
        ? config.credit_cost_medium
        : config.credit_cost_large;
    return { credits: fallback, config };
  }

  if (totalTokens <= 1200) return { credits: config.credit_cost_small, config };
  if (totalTokens <= 2800) return { credits: config.credit_cost_medium, config };
  return { credits: config.credit_cost_large, config };
}

export async function consumeUserCredits(
  client: SupabaseClient,
  userId: string,
  feature: string,
  chargedCredits: number,
  requestId?: string
): Promise<CreditConsumptionResult> {
  let row = await ensureAppUser(client, userId);
  row = await maybeResetMonthlyCredits(client, row);

  const remaining = Math.max(0, row.monthly_credit_limit - row.credits_used);
  if (remaining < chargedCredits) {
    return {
      allowed: false,
      remainingCredits: 0,
      warningLevel: "100",
      limit: row.monthly_credit_limit,
      used: row.credits_used,
      resetDate: row.credit_reset_date,
    };
  }

  const nextUsed = row.credits_used + chargedCredits;
  const { error } = await client
    .from(APP_USERS_TABLE)
    .update({ credits_used: nextUsed, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  await client.from(AI_CREDIT_TRANSACTIONS_TABLE).insert({
    user_id: userId,
    request_id: requestId ?? null,
    credits_added: 0,
    credits_deducted: chargedCredits,
    reason: "request_deduction",
    metadata: { feature },
  });

  const ratio = nextUsed / row.monthly_credit_limit;
  return {
    allowed: true,
    chargedCredits,
    remainingCredits: Math.max(0, row.monthly_credit_limit - nextUsed),
    warningLevel: warningFromRatio(ratio),
    limit: row.monthly_credit_limit,
    used: nextUsed,
    resetDate: row.credit_reset_date,
  };
}

