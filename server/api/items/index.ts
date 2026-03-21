import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../lib/auth";
import { getServerEnv } from "../../lib/env";
import { createUserClient } from "../../lib/supabase";
import {
  badRequest,
  handleOptions,
  jsonOk,
  methodNotAllowed,
  parseJsonBody,
  serverError,
} from "../../lib/http";
import { APP_ITEMS_TABLE, type AppItemInsert } from "../../lib/items";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleOptions(req, res)) return;

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  try {
    const env = getServerEnv();
    const supabase = createUserClient(env, ctx.accessToken);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(APP_ITEMS_TABLE)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        serverError(res, error.message);
        return;
      }
      jsonOk(res, { items: data ?? [] });
      return;
    }

    if (req.method === "POST") {
      let body: { title?: string; body?: string };
      try {
        body = parseJsonBody(req) as { title?: string; body?: string };
      } catch {
        badRequest(res, "Invalid JSON body");
        return;
      }
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        badRequest(res, "title is required");
        return;
      }
      const row: AppItemInsert = {
        user_id: ctx.userId,
        title,
        body: typeof body.body === "string" ? body.body : null,
      };

      const { data, error } = await supabase
        .from(APP_ITEMS_TABLE)
        .insert(row)
        .select("*")
        .single();

      if (error) {
        serverError(res, error.message);
        return;
      }
      jsonOk(res, { item: data }, 201);
      return;
    }

    methodNotAllowed(res, ["GET", "POST", "OPTIONS"]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    serverError(res, msg);
  }
}
