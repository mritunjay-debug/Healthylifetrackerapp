import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../lib/auth";
import { getServerEnv } from "../../lib/env";
import { createUserClient } from "../../lib/supabase";
import { USER_PUSH_TOKENS_TABLE } from "../../lib/pushTokens";
import {
  badRequest,
  handleOptions,
  jsonOk,
  methodNotAllowed,
  parseJsonBody,
  serverError,
} from "../../lib/http";

type TokenBody = {
  token?: string;
  platform?: string;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleOptions(req, res)) return;

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST", "OPTIONS"]);
    return;
  }

  let body: TokenBody;
  try {
    body = parseJsonBody(req) as TokenBody;
  } catch {
    badRequest(res, "Invalid JSON body");
    return;
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform.trim() : "mobile";
  if (!token || !/^ExpoPushToken\[.+\]$/.test(token)) {
    badRequest(res, "Valid Expo push token is required");
    return;
  }

  try {
    const env = getServerEnv();
    const supabase = createUserClient(env, ctx.accessToken);
    const { error } = await supabase.from(USER_PUSH_TOKENS_TABLE).upsert(
      {
        user_id: ctx.userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    );
    if (error) {
      serverError(res, error.message);
      return;
    }
    jsonOk(res, { ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Push token sync failed";
    serverError(res, msg);
  }
}
