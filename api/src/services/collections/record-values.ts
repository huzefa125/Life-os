import type { CollectionField } from "../../validation/collection.validation";

type Normalized = { ok: true; value: unknown } | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d\s().-]{3,30}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TEXT_MAX = 10_000;
const LONG_TEXT_MAX = 50_000;
const MAX_RELATION_TARGETS = 50;

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function toFiniteNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function checkRange(field: CollectionField, n: number): string | null {
  const { min, max } = field.config ?? {};
  if (min !== undefined && n < min) return `"${field.name}" must be at least ${min}`;
  if (max !== undefined && n > max) return `"${field.name}" must be at most ${max}`;
  return null;
}

/**
 * Coerces one incoming value into the canonical stored form for its field's
 * type, rejecting anything that doesn't fit. Empty input normalizes to null
 * (checkboxes to false) so "cleared" is stored consistently.
 */
export function normalizeFieldValue(field: CollectionField, raw: unknown): Normalized {
  const name = field.name;

  if (field.type === "checkbox") {
    if (raw === undefined || raw === null) return { ok: true, value: false };
    if (typeof raw !== "boolean") return { ok: false, message: `"${name}" must be true or false` };
    return { ok: true, value: raw };
  }

  if (isEmptyValue(raw)) return { ok: true, value: null };

  switch (field.type) {
    case "text":
    case "long_text": {
      if (typeof raw !== "string") return { ok: false, message: `"${name}" must be text` };
      const limit = field.type === "text" ? TEXT_MAX : LONG_TEXT_MAX;
      if (raw.length > limit) return { ok: false, message: `"${name}" is too long` };
      return { ok: true, value: field.type === "text" ? raw.trim() : raw };
    }
    case "email": {
      if (typeof raw !== "string" || !EMAIL_RE.test(raw.trim())) return { ok: false, message: `"${name}" must be a valid email` };
      return { ok: true, value: raw.trim() };
    }
    case "phone": {
      if (typeof raw !== "string" || !PHONE_RE.test(raw.trim())) return { ok: false, message: `"${name}" must be a valid phone number` };
      return { ok: true, value: raw.trim() };
    }
    case "url": {
      if (typeof raw !== "string") return { ok: false, message: `"${name}" must be a valid URL` };
      try {
        const url = new URL(raw.trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
        return { ok: true, value: url.toString() };
      } catch {
        return { ok: false, message: `"${name}" must be a valid http(s) URL` };
      }
    }
    case "number": {
      const n = toFiniteNumber(raw);
      if (n === null) return { ok: false, message: `"${name}" must be a number` };
      const rangeError = checkRange(field, n);
      if (rangeError) return { ok: false, message: rangeError };
      const decimals = field.config?.decimals;
      return { ok: true, value: decimals === undefined ? n : Number(n.toFixed(decimals)) };
    }
    case "currency": {
      const n = toFiniteNumber(raw);
      if (n === null) return { ok: false, message: `"${name}" must be an amount` };
      const rangeError = checkRange(field, n);
      if (rangeError) return { ok: false, message: rangeError };
      return { ok: true, value: Math.round(n * 100) / 100 };
    }
    case "rating": {
      const n = toFiniteNumber(raw);
      const max = field.config?.ratingMax ?? 5;
      if (n === null || !Number.isInteger(n) || n < 0 || n > max) {
        return { ok: false, message: `"${name}" must be a whole number from 0 to ${max}` };
      }
      return { ok: true, value: n === 0 ? null : n };
    }
    case "date": {
      if (typeof raw !== "string" || !DATE_RE.test(raw) || Number.isNaN(new Date(`${raw}T00:00:00Z`).getTime())) {
        return { ok: false, message: `"${name}" must be a date (YYYY-MM-DD)` };
      }
      return { ok: true, value: raw };
    }
    case "datetime": {
      const d = typeof raw === "string" ? new Date(raw) : null;
      if (!d || Number.isNaN(d.getTime())) return { ok: false, message: `"${name}" must be a valid date & time` };
      // Stored as a UTC instant in one fixed format so values sort/compare correctly.
      return { ok: true, value: d.toISOString() };
    }
    case "select": {
      const allowed = new Set((field.config?.options ?? []).map((o) => o.value));
      if (typeof raw !== "string" || !allowed.has(raw)) return { ok: false, message: `"${name}" has an option that doesn't exist` };
      return { ok: true, value: raw };
    }
    case "multi_select": {
      const allowed = new Set((field.config?.options ?? []).map((o) => o.value));
      if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string" || !allowed.has(v))) {
        return { ok: false, message: `"${name}" has an option that doesn't exist` };
      }
      return { ok: true, value: [...new Set(raw as string[])] };
    }
    case "relation": {
      const ids = Array.isArray(raw) ? raw : [raw];
      if (ids.some((id) => typeof id !== "string" || !UUID_RE.test(id))) {
        return { ok: false, message: `"${name}" must reference LifeOS objects` };
      }
      const unique = [...new Set(ids as string[])];
      if (!field.config?.multiple && unique.length > 1) return { ok: false, message: `"${name}" links to only one object` };
      if (unique.length > MAX_RELATION_TARGETS) return { ok: false, message: `"${name}" has too many links` };
      // Always stored as an array so single/multiple relations read the same way.
      return { ok: true, value: unique };
    }
    default:
      return { ok: false, message: `"${name}" has an unsupported type` };
  }
}

export type ValidateValuesResult = { ok: true; values: Record<string, unknown> } | { ok: false; message: string };

/**
 * Validates client-supplied values against a collection's fields.
 * - Unknown field ids are rejected (never blindly store arbitrary JSON).
 * - On create (`partial: false`) every required field must be filled.
 * - On update (`partial: true`) only the keys sent are validated/returned, and a
 *   required field can't be cleared — but existing records aren't retroactively
 *   rejected when a field later becomes required.
 */
export function validateRecordValues(
  fields: CollectionField[],
  input: Record<string, unknown>,
  { partial }: { partial: boolean }
): ValidateValuesResult {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const values: Record<string, unknown> = {};

  for (const [fieldId, raw] of Object.entries(input)) {
    const field = byId.get(fieldId);
    if (!field) return { ok: false, message: `Unknown field "${fieldId}"` };
    const normalized = normalizeFieldValue(field, raw);
    if (!normalized.ok) return normalized;
    if (field.required && field.type !== "checkbox" && isEmptyValue(normalized.value)) {
      return { ok: false, message: `"${field.name}" is required` };
    }
    values[fieldId] = normalized.value;
  }

  if (!partial) {
    for (const field of fields) {
      if (field.required && field.type !== "checkbox" && isEmptyValue(values[field.id])) {
        return { ok: false, message: `"${field.name}" is required` };
      }
    }
  }

  return { ok: true, values };
}

/** The record's display title: the first non-empty text field, else "Untitled". Kept on Object.title for search/timeline. */
export function deriveRecordTitle(fields: CollectionField[], values: Record<string, unknown>): string {
  for (const field of fields) {
    if (field.type !== "text") continue;
    const v = values[field.id];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 200);
  }
  for (const field of fields) {
    const v = values[field.id];
    if ((field.type === "email" || field.type === "url" || field.type === "phone") && typeof v === "string" && v) return v.slice(0, 200);
  }
  return "Untitled";
}

export function relationTargetIds(fields: CollectionField[], values: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  for (const field of fields) {
    if (field.type !== "relation") continue;
    const v = values[field.id];
    if (Array.isArray(v)) for (const id of v) if (typeof id === "string") ids.add(id);
  }
  return [...ids];
}
