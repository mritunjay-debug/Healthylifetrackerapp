import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../../lib/auth";
import { getServerEnv } from "../../lib/env";
import { createUserClient } from "../../lib/supabase";
import {
  badRequest,
  handleOptions,
  jsonOk,
  methodNotAllowed,
  notFound,
  parseJsonBody,
  serverError,
} from "../../lib/http";
import { APP_ITEMS_TABLE, type AppItemUpdate } from "../../lib/items";

function getId(req: VercelRequest): string | null {
  const raw = req.query.id;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleOptions(req, res)) return;

  const id = getId(req);
  if (!id) {
    badRequest(res, "Missing item id");
    return;
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  try {
    const env = getServerEnv();
    const supabase = createUserClient(env, ctx.accessToken);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(APP_ITEMS_TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        serverError(res, error.message);
        return;
      }
      if (!data) {
        notFound(res, "Item not found");
        return;
      }
      jsonOk(res, { item: data });
      return;
    }

    if (req.method === "PATCH") {
      let patch: AppItemUpdate;
      try {
        patch = parseJsonBody(req) as AppItemUpdate;
      } catch {
        badRequest(res, "Invalid JSON body");
        return;
      }
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (typeof patch.title === "string") update.title = patch.title.trim();
      if (patch.body !== undefined) update.body = patch.body;

      if (Object.keys(update).length <= 1) {
        badRequest(res, "No valid fields to update (title or body)");
        return;
      }

      const { data, error } = await supabase
        .from(APP_ITEMS_TABLE)
        .update(update)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) {
        serverError(res, error.message);
        return;
      }
      if (!data) {
        notFound(res, "Item not found");
        return;
      }
      jsonOk(res, { item: data });
      return;
    }

    if (req.method === "DELETE") {
      const { data, error } = await supabase
        .from(APP_ITEMS_TABLE)
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        serverError(res, error.message);
        return;
      }
      if (!data) {
        notFound(res, "Item not found");
        return;
      }
      jsonOk(res, { deleted: true, id: data.id });
      return;
    }

    methodNotAllowed(res, ["GET", "PATCH", "DELETE", "OPTIONS"]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    serverError(res, msg);
  }
}
