import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServerEnv } from "../../lib/env";
import { createAnonClient } from "../../lib/supabase";
import {
  badRequest,
  handleOptions,
  jsonOk,
  methodNotAllowed,
  parseJsonBody,
  serverError,
} from "../../lib/http";

type LoginBody = {
  email?: string;
  password?: string;
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

  let body: LoginBody;
  try {
    body = parseJsonBody(req) as LoginBody;
  } catch {
    badRequest(res, "Invalid JSON body");
    return;
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    badRequest(res, "email and password are required");
    return;
  }

  try {
    const env = getServerEnv();
    const supabase = createAnonClient(env);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      badRequest(res, error.message);
      return;
    }

    jsonOk(res, {
      user: data.user,
      session: data.session,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed";
    serverError(res, msg);
  }
}
