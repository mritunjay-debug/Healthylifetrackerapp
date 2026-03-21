import type { VercelRequest, VercelResponse } from "@vercel/node";

const JSON_BODY_LIMIT_BYTES = 1024 * 64; // 64KB

export function setCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
}

export function handleOptions(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  if (req.method === "OPTIONS") {
    setCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}

export function methodNotAllowed(
  res: VercelResponse,
  allowed: string[]
): void {
  setCors(res);
  res.setHeader("Allow", allowed.join(", "));
  res.status(405).json({ error: "Method not allowed", allowed });
}

export function badRequest(res: VercelResponse, message: string): void {
  setCors(res);
  res.status(400).json({ error: message });
}

export function unauthorized(res: VercelResponse, message = "Unauthorized"): void {
  setCors(res);
  res.status(401).json({ error: message });
}

export function notFound(res: VercelResponse, message = "Not found"): void {
  setCors(res);
  res.status(404).json({ error: message });
}

export function serverError(res: VercelResponse, message: string): void {
  setCors(res);
  res.status(500).json({ error: message });
}

export function jsonOk(res: VercelResponse, data: unknown, status = 200): void {
  setCors(res);
  res.status(status).json(data);
}

export function parseJsonBody(req: VercelRequest): unknown {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > JSON_BODY_LIMIT_BYTES) {
      throw new Error("Payload too large");
    }
    if (!req.body.trim()) return {};
    return JSON.parse(req.body) as unknown;
  }
  return req.body as unknown;
}

export function getBearerToken(req: VercelRequest): string | null {
  const h = req.headers.authorization;
  if (!h || typeof h !== "string") return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}
