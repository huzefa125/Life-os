import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { sendError } from "../utils/apiResponse";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return sendError(res, "Missing or invalid Authorization header", 401);
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return sendError(res, "Invalid or expired token", 401);
  }
}

/**
 * Non-throwing variant for public routes that behave differently for a
 * logged-in caller without requiring one — e.g. a form's "require login" or
 * "anonymous responses" setting. Returns null for a missing/invalid token
 * rather than rejecting the request.
 */
export function getOptionalUserId(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  try {
    const payload = jwt.verify(header.slice("Bearer ".length), env.JWT_SECRET) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}
