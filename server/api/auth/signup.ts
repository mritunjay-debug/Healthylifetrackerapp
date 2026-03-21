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

type SignupBody = {
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

  let body: SignupBody;
  try {
    body = parseJsonBody(req) as SignupBody;
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
  if (password.length < 8) {
    badRequest(res, "password must be at least 8 characters");
    return;
  }

  try {
    const env = getServerEnv();
    const supabase = createAnonClient(env);
    const { data, error } = await supabase.auth.signUp({
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
      message: data.session
        ? "Signed up and logged in"
        : "Check your email to confirm your account (if email confirmation is enabled)",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    serverError(res, msg);
  }
}
