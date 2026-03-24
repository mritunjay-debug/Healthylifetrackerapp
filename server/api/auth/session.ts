import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServerEnv } from "../../lib/env";
import { createAnonClient } from "../../lib/supabase";
import { handleOptions, jsonOk, methodNotAllowed, unauthorized } from "../../lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET", "OPTIONS"]);
    return;
  }

  const raw = req.headers.authorization;
  const token =
    typeof raw === "string" && /^Bearer\s+/i.test(raw) ? raw.replace(/^Bearer\s+/i, "").trim() : "";
  if (!token) {
    unauthorized(res, "Missing Authorization: Bearer <access_token>");
    return;
  }

  const env = getServerEnv();
  const supabase = createAnonClient(env);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    unauthorized(res, error?.message || "Invalid or expired session");
    return;
  }

  jsonOk(res, { user: data.user });
}
