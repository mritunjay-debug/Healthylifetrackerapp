import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  handleOptions,
  jsonOk,
  methodNotAllowed,
} from "../lib/http";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") {
    methodNotAllowed(res, ["GET", "OPTIONS"]);
    return;
  }
  jsonOk(res, { ok: true, service: "streakforge-api", ts: new Date().toISOString() });
}
