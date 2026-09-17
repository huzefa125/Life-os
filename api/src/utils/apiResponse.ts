import type { Response } from "express";

// Fields that are internal bookkeeping on a DB row and aren't rendered by
// the client — stripped from every response so the payload matches what's
// actually shown.
const INTERNAL_FIELDS = new Set(["userId", "createdAt", "updatedAt"]);

/**
 * Recursively strips internal fields from any DB row in the response tree
 * (objects that carry both `id` and `userId`). Every route is already scoped
 * to the authenticated user, so the client never needs to see who owns a
 * record or its raw timestamps. `properties` is left untouched since it
 * holds arbitrary user-entered data that must never be mutated.
 */
function stripInternalFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripInternalFields);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    const isDbRow = "id" in obj && "userId" in obj;
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      if (isDbRow && INTERNAL_FIELDS.has(key)) continue;
      result[key] = key === "properties" ? val : stripInternalFields(val);
    }

    return result;
  }

  return value;
}

export function sendSuccess<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data: stripInternalFields(data) });
}

export function sendError(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, message });
}
