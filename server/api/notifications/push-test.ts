import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  badRequest,
  handleOptions,
  jsonOk,
  methodNotAllowed,
  parseJsonBody,
  serverError,
} from "../../lib/http";

type PushTestBody = {
  token?: string;
  title?: string;
  body?: string;
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

  let body: PushTestBody;
  try {
    body = parseJsonBody(req) as PushTestBody;
  } catch {
    badRequest(res, "Invalid JSON body");
    return;
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || !/^ExpoPushToken\[.+\]$/.test(token)) {
    badRequest(res, "Valid Expo push token is required");
    return;
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "StreakForge test";
  const message =
    typeof body.body === "string" && body.body.trim()
      ? body.body.trim()
      : "Remote push is configured and working.";

  try {
    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: token,
        title,
        body: message,
        sound: "default",
        data: { source: "push-test-api" },
      }),
    });
    const raw = await expoRes.text();
    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("Invalid response from Expo push API");
    }
    if (!expoRes.ok) {
      throw new Error(`Expo push request failed (${expoRes.status})`);
    }
    jsonOk(res, { ok: true, expo: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not send push";
    serverError(res, msg);
  }
}
