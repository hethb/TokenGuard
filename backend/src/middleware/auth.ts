import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

/**
 * Pull a user identifier from the Authorization header. We treat the bearer
 * token as the user id when no API key requirement is configured. When
 * `TOKENGUARD_API_KEY` is set, the token must match it exactly and a separate
 * `x-user-id` header is consulted (defaults to "anonymous").
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = req.headers.authorization ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const userHeader =
    (req.headers["x-user-id"] as string | undefined)?.trim() || undefined;

  if (config.apiKey) {
    if (bearer !== config.apiKey) {
      res.status(401).json({ error: "invalid api key" });
      return;
    }
    (req as Request & { userId: string }).userId = userHeader ?? "anonymous";
  } else {
    (req as Request & { userId: string }).userId =
      bearer || userHeader || "anonymous";
  }
  next();
}
