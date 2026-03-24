import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServerEnv } from "../../lib/env";
import { createAnonClient, createServiceRoleClient } from "../../lib/supabase";
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
    if (env.supabaseServiceRoleKey) {
      const admin = createServiceRoleClient(env);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError && !/already registered|already exists/i.test(createError.message)) {
        badRequest(res, createError.message);
        return;
      }
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError || !loginData.session) {
        badRequest(res, loginError?.message || "Could not sign in after account creation");
        return;
      }
      jsonOk(res, {
        user: loginData.user ?? created?.user ?? null,
        session: loginData.session,
        message: "Signed up and logged in",
      });
      return;
    }

    const { data: signupData, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      badRequest(res, error.message);
      return;
    }

    // If signup does not return a session, try immediate sign-in.
    // This enables auto-login on projects that allow it.
    let session = signupData.session;
    let user = signupData.user;
    let message = "Signed up and logged in";

    if (!session) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!loginError && loginData.session) {
        session = loginData.session;
        user = loginData.user ?? user;
      } else {
        message =
          loginError?.message ||
          "Check your email to confirm your account (email confirmation is enabled).";
      }
    }

    jsonOk(res, { user, session, message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    serverError(res, msg);
  }
}
