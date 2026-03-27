import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleOptions, jsonOk, methodNotAllowed, serverError } from "../../lib/http";
import { requireUser } from "../../lib/auth";
import { getServerEnv } from "../../lib/env";
import { createServiceRoleClient } from "../../lib/supabase";
import { ensureAppUser } from "../../lib/aiCredits";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET", "OPTIONS"]);
    return;
  }
  try {
    const authed = await requireUser(req, res);
    if (!authed) return;
    const env = getServerEnv();
    const admin = createServiceRoleClient(env);
    const user = await ensureAppUser(admin, authed.userId);
    const remaining = Math.max(0, user.monthly_credit_limit - user.credits_used);
    jsonOk(res, {
      status: "ok",
      credits_used: user.credits_used,
      credits_limit: user.monthly_credit_limit,
      credits_remaining: remaining,
      reset_date: user.credit_reset_date,
    });
  } catch (e) {
    serverError(res, e instanceof Error ? e.message : "Could not fetch credits");
  }
}

