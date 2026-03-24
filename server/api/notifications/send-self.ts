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

type Body = {
  title?: string;
  body?: string;
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

  let body: Body = {};
  try {
    body = parseJsonBody(req) as Body;
  } catch {
    badRequest(res, "Invalid JSON body");
    return;
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "StreakForge reminder";
  const message =
    typeof body.body === "string" && body.body.trim()
      ? body.body.trim()
      : "Your personalized plan is ready for today.";

  try {
    const env = getServerEnv();
    const supabase = createUserClient(env, ctx.accessToken);
    const { data, error } = await supabase
      .from(USER_PUSH_TOKENS_TABLE)
      .select("token")
      .eq("user_id", ctx.userId);
    if (error) {
      serverError(res, error.message);
      return;
    }
    const tokens = (data ?? [])
      .map((r) => (r as { token?: string }).token || "")
      .filter((t) => /^ExpoPushToken\[.+\]$/.test(t));
    if (tokens.length === 0) {
      badRequest(res, "No push token synced for this account");
      return;
    }

    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        tokens.map((token) => ({
          to: token,
          title,
          body: message,
          sound: "default",
          data: { source: "send-self-api" },
        }))
      ),
    });
    const raw = await expoRes.text();
    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("Invalid response from Expo push API");
    }
    if (!expoRes.ok) throw new Error(`Expo push request failed (${expoRes.status})`);
    jsonOk(res, { ok: true, deliveredTo: tokens.length, expo: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not send push";
    serverError(res, msg);
  }
}
