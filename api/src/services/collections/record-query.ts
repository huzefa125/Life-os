import { Prisma } from "../../generated/prisma/client";
import {
  BUILTIN_SORT_KEYS,
  type CollectionField,
  type CollectionFieldType,
  type CollectionFilter,
  type CollectionSort,
  type FilterOperator,
} from "../../validation/collection.validation";

export const COLLECTION_RECORD_TYPE = "collection_record";

const TEXT_OPS: FilterOperator[] = ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"];
const NUMBER_OPS: FilterOperator[] = ["equals", "not_equals", "gt", "gte", "lt", "lte", "is_empty", "is_not_empty"];
const DATE_OPS: FilterOperator[] = ["equals", "before", "after", "is_empty", "is_not_empty"];
const LIST_OPS: FilterOperator[] = ["contains", "not_contains", "is_empty", "is_not_empty"];

export const OPERATORS_BY_TYPE: Record<CollectionFieldType, FilterOperator[]> = {
  text: TEXT_OPS,
  long_text: TEXT_OPS,
  email: TEXT_OPS,
  phone: TEXT_OPS,
  url: TEXT_OPS,
  number: NUMBER_OPS,
  currency: NUMBER_OPS,
  rating: NUMBER_OPS,
  date: DATE_OPS,
  datetime: DATE_OPS,
  checkbox: ["is_checked", "is_not_checked"],
  select: ["equals", "not_equals", "in", "is_empty", "is_not_empty"],
  multi_select: LIST_OPS,
  relation: LIST_OPS,
};

const NUMERIC_TYPES = new Set<CollectionFieldType>(["number", "currency", "rating"]);

// jsonb / text accessors for one field's stored value. The field id is always
// a bound parameter (cast to text so Postgres picks the `->(text)` operator).
function jsonValue(fieldId: string) {
  return Prisma.sql`(o."properties"->'values'->(${fieldId}::text))`;
}
function textValue(fieldId: string) {
  return Prisma.sql`(o."properties"->'values'->>(${fieldId}::text))`;
}
function numericValue(fieldId: string) {
  // CASE guarantees evaluation order, so the cast never runs on a non-number.
  return Prisma.sql`(CASE WHEN jsonb_typeof(${jsonValue(fieldId)}) = 'number' THEN ${textValue(fieldId)}::numeric END)`;
}

/** LIKE-escapes with `!` (a backslash escape would need escaping inside tagged template literals). */
export function likePattern(value: string): string {
  return `%${value.replace(/[!%_]/g, "!$&")}%`;
}

function isEmptySql(fieldId: string) {
  const v = jsonValue(fieldId);
  return Prisma.sql`(${v} IS NULL OR ${v} = 'null'::jsonb OR ${v} = '""'::jsonb OR ${v} = '[]'::jsonb)`;
}

type SqlResult = { ok: true; sql: Prisma.Sql } | { ok: false; message: string };

function requireString(filter: CollectionFilter): string | null {
  return typeof filter.value === "string" && filter.value.trim() !== "" ? filter.value : null;
}

const DATE_ONLY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export function buildFilterSql(field: CollectionField, filter: CollectionFilter): SqlResult {
  const op = filter.operator;
  if (!OPERATORS_BY_TYPE[field.type].includes(op)) {
    return { ok: false, message: `"${op}" isn't a valid filter for "${field.name}"` };
  }

  if (op === "is_empty") return { ok: true, sql: isEmptySql(field.id) };
  if (op === "is_not_empty") return { ok: true, sql: Prisma.sql`NOT ${isEmptySql(field.id)}` };
  if (op === "is_checked") return { ok: true, sql: Prisma.sql`${jsonValue(field.id)} = 'true'::jsonb` };
  if (op === "is_not_checked") return { ok: true, sql: Prisma.sql`${jsonValue(field.id)} IS DISTINCT FROM 'true'::jsonb` };

  if (NUMERIC_TYPES.has(field.type)) {
    const n = typeof filter.value === "number" ? filter.value : Number(filter.value);
    if (filter.value === undefined || filter.value === "" || !Number.isFinite(n)) {
      return { ok: false, message: `Filter on "${field.name}" needs a number` };
    }
    const lhs = numericValue(field.id);
    const map: Partial<Record<FilterOperator, Prisma.Sql>> = {
      equals: Prisma.sql`${lhs} = ${n}::numeric`,
      not_equals: Prisma.sql`${lhs} IS DISTINCT FROM ${n}::numeric`,
      gt: Prisma.sql`${lhs} > ${n}::numeric`,
      gte: Prisma.sql`${lhs} >= ${n}::numeric`,
      lt: Prisma.sql`${lhs} < ${n}::numeric`,
      lte: Prisma.sql`${lhs} <= ${n}::numeric`,
    };
    return { ok: true, sql: map[op]! };
  }

  if (field.type === "date" || field.type === "datetime") {
    const raw = requireString(filter);
    if (!raw || Number.isNaN(new Date(raw).getTime())) return { ok: false, message: `Filter on "${field.name}" needs a date` };
    const t = textValue(field.id);
    if (op === "equals") {
      // Datetimes are stored as UTC ISO instants; "equals" matches the calendar day.
      return { ok: true, sql: Prisma.sql`left(${t}, 10) = ${raw.slice(0, 10)}` };
    }
    const cmp = op === "before" ? Prisma.raw("<") : Prisma.raw(">");
    if (field.type === "date") {
      if (!DATE_ONLY.test(raw)) return { ok: false, message: `Filter on "${field.name}" needs a YYYY-MM-DD date` };
      return {
        ok: true,
        sql: Prisma.sql`(CASE WHEN ${t} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN ${t}::date END) ${cmp} ${raw}::date`,
      };
    }
    return {
      ok: true,
      sql: Prisma.sql`(CASE WHEN ${t} ~ '^[0-9]{4}-' THEN ${t}::timestamptz END) ${cmp} ${new Date(raw).toISOString()}::timestamptz`,
    };
  }

  if (field.type === "multi_select" || field.type === "relation") {
    const raw = requireString(filter);
    if (!raw) return { ok: false, message: `Filter on "${field.name}" needs a value` };
    const contains = Prisma.sql`COALESCE(${jsonValue(field.id)} @> ${JSON.stringify([raw])}::jsonb, false)`;
    return { ok: true, sql: op === "contains" ? contains : Prisma.sql`NOT ${contains}` };
  }

  if (field.type === "select") {
    const t = textValue(field.id);
    if (op === "in") {
      const values = Array.isArray(filter.value) ? filter.value.filter((v) => typeof v === "string" && v) : [];
      if (values.length === 0) return { ok: false, message: `Filter on "${field.name}" needs at least one option` };
      return { ok: true, sql: Prisma.sql`${t} IN (${Prisma.join(values)})` };
    }
    const raw = requireString(filter);
    if (!raw) return { ok: false, message: `Filter on "${field.name}" needs an option` };
    return { ok: true, sql: op === "equals" ? Prisma.sql`${t} = ${raw}` : Prisma.sql`${t} IS DISTINCT FROM ${raw}` };
  }

  // Text-like fields.
  const raw = requireString(filter);
  if (!raw) return { ok: false, message: `Filter on "${field.name}" needs a value` };
  const t = textValue(field.id);
  switch (op) {
    case "equals":
      return { ok: true, sql: Prisma.sql`lower(${t}) = lower(${raw})` };
    case "not_equals":
      return { ok: true, sql: Prisma.sql`lower(${t}) IS DISTINCT FROM lower(${raw})` };
    case "contains":
      return { ok: true, sql: Prisma.sql`${t} ILIKE ${likePattern(raw)} ESCAPE '!'` };
    case "not_contains":
      return { ok: true, sql: Prisma.sql`COALESCE(${t}, '') NOT ILIKE ${likePattern(raw)} ESCAPE '!'` };
    default:
      return { ok: false, message: `"${op}" isn't a valid filter for "${field.name}"` };
  }
}

function sortExpression(field: CollectionField): Prisma.Sql {
  if (NUMERIC_TYPES.has(field.type)) return numericValue(field.id);
  if (field.type === "checkbox") return Prisma.sql`(${jsonValue(field.id)} = 'true'::jsonb)`;
  if (field.type === "date" || field.type === "datetime") return textValue(field.id);
  if (field.type === "select") {
    // Sort by the option's position in the field's configured list, not alphabetically.
    const options = field.config?.options ?? [];
    if (options.length === 0) return textValue(field.id);
    const whens = options.map((o, i) => Prisma.sql`WHEN ${o.value} THEN ${i}::int`);
    return Prisma.sql`(CASE ${textValue(field.id)} ${Prisma.join(whens, " ")} END)`;
  }
  return Prisma.sql`lower(${textValue(field.id)})`;
}

export function buildOrderBySql(fields: CollectionField[], sorts: CollectionSort[]): SqlResult {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const parts: Prisma.Sql[] = [];

  for (const sort of sorts) {
    const dir = Prisma.raw(sort.direction === "asc" ? "ASC" : "DESC");
    if ((BUILTIN_SORT_KEYS as readonly string[]).includes(sort.fieldId)) {
      const col =
        sort.fieldId === "title"
          ? Prisma.sql`lower(o."title")`
          : sort.fieldId === "updatedAt"
            ? Prisma.sql`o."updatedAt"`
            : Prisma.sql`o."createdAt"`;
      parts.push(Prisma.sql`${col} ${dir}`);
      continue;
    }
    const field = byId.get(sort.fieldId);
    if (!field) return { ok: false, message: `Can't sort by unknown field "${sort.fieldId}"` };
    if (field.type === "multi_select" || field.type === "relation" || field.type === "long_text") {
      return { ok: false, message: `"${field.name}" can't be sorted` };
    }
    parts.push(Prisma.sql`${sortExpression(field)} ${dir} NULLS LAST`);
  }

  // Deterministic tie-breakers keep pagination stable.
  parts.push(Prisma.sql`o."createdAt" DESC`, Prisma.sql`o."id" ASC`);
  return { ok: true, sql: Prisma.join(parts, ", ") };
}

export interface RecordQueryInput {
  userId: string;
  collectionId: string;
  fields: CollectionField[];
  filters: CollectionFilter[];
  sorts: CollectionSort[];
  search?: string;
  page: number;
  pageSize: number;
}

export type BuiltRecordQuery = { ok: true; dataQuery: Prisma.Sql; countQuery: Prisma.Sql } | { ok: false; message: string };

export function buildRecordQuery(input: RecordQueryInput): BuiltRecordQuery {
  const byId = new Map(input.fields.map((f) => [f.id, f]));

  const conditions: Prisma.Sql[] = [
    Prisma.sql`o."userId" = ${input.userId}`,
    Prisma.sql`o."collectionId" = ${input.collectionId}`,
    Prisma.sql`o."type" = ${COLLECTION_RECORD_TYPE}`,
    Prisma.sql`o."status" = 'active'`,
  ];

  for (const filter of input.filters) {
    const field = byId.get(filter.fieldId);
    if (!field) return { ok: false, message: `Can't filter by unknown field "${filter.fieldId}"` };
    const built = buildFilterSql(field, filter);
    if (!built.ok) return built;
    conditions.push(built.sql);
  }

  if (input.search) {
    const pattern = likePattern(input.search);
    conditions.push(
      Prisma.sql`(o."title" ILIKE ${pattern} ESCAPE '!' OR EXISTS (SELECT 1 FROM jsonb_each_text(COALESCE(o."properties"->'values', '{}'::jsonb)) AS e WHERE e.value ILIKE ${pattern} ESCAPE '!'))`
    );
  }

  const orderBy = buildOrderBySql(input.fields, input.sorts);
  if (!orderBy.ok) return orderBy;

  const where = Prisma.join(conditions, " AND ");
  const offset = (input.page - 1) * input.pageSize;

  return {
    ok: true,
    dataQuery: Prisma.sql`SELECT o."id", o."title", o."properties", o."status", o."createdAt", o."updatedAt"
      FROM "Object" o
      WHERE ${where}
      ORDER BY ${orderBy.sql}
      LIMIT ${input.pageSize} OFFSET ${offset}`,
    countQuery: Prisma.sql`SELECT COUNT(*)::int AS "count" FROM "Object" o WHERE ${where}`,
  };
}
