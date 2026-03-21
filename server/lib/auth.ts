import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getServerEnv } from "./env";
import { createAnonClient } from "./supabase";
import {
  badRequest,
  getBearerToken,
  unauthorized,
} from "./http";

export type AuthedContext = {
  accessToken: string;
  userId: string;
};

/**
 * Validates JWT via Supabase and returns user id. Use for CRUD routes.
 */
export async function requireUser(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthedContext | null> {
  const token = getBearerToken(req);
  if (!token) {
    unauthorized(res, "Missing Authorization: Bearer <access_token>");
    return null;
  }

  try {
    const env = getServerEnv();
    const supabase = createAnonClient(env);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.id) {
      unauthorized(res, error?.message || "Invalid or expired session");
      return null;
    }
    return { accessToken: token, userId: data.user.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Auth failed";
    badRequest(res, msg);
    return null;
  }
}
