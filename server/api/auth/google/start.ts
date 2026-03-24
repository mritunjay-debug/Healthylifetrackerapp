import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServerEnv } from "../../../lib/env";
import {
  badRequest,
  handleOptions,
  jsonOk,
  methodNotAllowed,
  parseJsonBody,
  serverError,
} from "../../../lib/http";

type StartBody = {
  redirectTo?: string;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST", "OPTIONS"]);
    return;
  }

  let body: StartBody;
  try {
    body = parseJsonBody(req) as StartBody;
  } catch {
    badRequest(res, "Invalid JSON body");
    return;
  }

  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo.trim() : "";
  if (!redirectTo) {
    badRequest(res, "redirectTo is required");
    return;
  }

  try {
    const env = getServerEnv();
    const params = new URLSearchParams({
      provider: "google",
      redirect_to: redirectTo,
    });
    jsonOk(res, { url: `${env.supabaseUrl}/auth/v1/authorize?${params.toString()}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to start Google sign-in";
    serverError(res, msg);
  }
}
