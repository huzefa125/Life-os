import { prisma } from "../../db";
import { Prisma } from "../../generated/prisma/client";
import type {
  CollectionField,
  CollectionFilter,
  CollectionProperties,
  CollectionSort,
  ListRecordsQuery,
} from "../../validation/collection.validation";
import { logActivity } from "../activity/activity.service";
import { evaluateCondition } from "../forms/condition.util";
import { runAutomations } from "../forms/automation.service";
import { toCsvRow } from "../../utils/csv";
import { COLLECTION_TYPE, loadOwnedCollection, type ServiceResult } from "./collection.service";
import { buildRecordQuery, COLLECTION_RECORD_TYPE } from "./record-query";
import { deriveRecordTitle, relationTargetIds, validateRecordValues } from "./record-values";

const LINK_RELATION = "collection_link";
const CSV_EXPORT_LIMIT = 10_000;

interface RawRecordRow {
  id: string;
  title: string;
  properties: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelatedObject {
  id: string;
  title: string;
  type: string;
  collectionId: string | null;
}

function recordValues(properties: unknown): Record<string, unknown> {
  const values = (properties as { values?: Record<string, unknown> } | null)?.values;
  return values && typeof values === "object" ? values : {};
}

/** Only values for fields that still exist are returned — values of deleted fields stay stored but hidden. */
function toRecord(row: RawRecordRow, fields: CollectionField[]) {
  const all = recordValues(row.properties);
  const values: Record<string, unknown> = {};
  for (const f of fields) if (f.id in all) values[f.id] = all[f.id];
  return { id: row.id, title: row.title, values, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

/** One batched lookup for every related object on a page (no N+1), scoped to the user and excluding trash. */
async function loadRelated(userId: string, fields: CollectionField[], valueMaps: Record<string, unknown>[]) {
  const ids = new Set<string>();
  for (const values of valueMaps) for (const id of relationTargetIds(fields, values)) ids.add(id);
  if (ids.size === 0) return {};
  const objs = await prisma.object.findMany({
    where: { id: { in: [...ids] }, userId, status: { not: "trash" } },
    select: { id: true, title: true, type: true, collectionId: true },
  });
  return Object.fromEntries(objs.map((o) => [o.id, o])) as Record<string, RelatedObject>;
}

/**
 * Relation values must point at the user's own, non-trashed objects of the
 * field's configured type (and, for record links, the configured collection).
 */
async function checkRelationValues(
  userId: string,
  fields: CollectionField[],
  values: Record<string, unknown>,
  selfId?: string
): Promise<string | null> {
  const relationFields = fields.filter((f) => f.type === "relation" && Array.isArray(values[f.id]) && (values[f.id] as string[]).length);
  if (relationFields.length === 0) return null;

  const allIds = [...new Set(relationFields.flatMap((f) => values[f.id] as string[]))];
  if (selfId && allIds.includes(selfId)) return "A record can't link to itself";
  const objs = await prisma.object.findMany({
    where: { id: { in: allIds }, userId, status: { not: "trash" } },
    select: { id: true, type: true, collectionId: true },
  });
  const byId = new Map(objs.map((o) => [o.id, o]));

  for (const field of relationFields) {
    for (const id of values[field.id] as string[]) {
      const target = byId.get(id);
      if (!target || target.type !== field.config?.targetType) return `"${field.name}" links to something that doesn't exist`;
      if (field.config.targetType === "collection_record" && target.collectionId !== field.config.targetCollectionId) {
        return `"${field.name}" links to a record from a different collection`;
      }
    }
  }
  return null;
}

/** Mirrors relation-field values into the shared Relation table so links show up across LifeOS (object detail, connections). */
async function syncRelations(userId: string, recordId: string, fields: CollectionField[], values: Record<string, unknown>) {
  await prisma.relation.deleteMany({ where: { userId, sourceId: recordId, type: LINK_RELATION } });
  const targets = relationTargetIds(fields, values).filter((id) => id !== recordId);
  if (targets.length) {
    await prisma.relation.createMany({
      data: targets.map((targetId) => ({ userId, sourceId: recordId, targetId, type: LINK_RELATION })),
    });
  }
}

/** Select values are stored as option values; automation triggers may be written against the visible label, so both match. */
function withSelectLabels(fields: CollectionField[], values: Record<string, unknown>): Record<string, unknown> {
  const out = { ...values };
  for (const f of fields) {
    if (f.type !== "select" || typeof values[f.id] !== "string") continue;
    const option = f.config?.options?.find((o) => o.value === values[f.id]);
    if (option) out[f.id] = option.label;
  }
  return out;
}

/**
 * Runs a collection's automations whose trigger condition *became* true with
 * this change (e.g. Status moved to "Won"), reusing the Forms automation
 * engine — created objects get a `created` relation back to the record.
 */
async function runCollectionAutomations(
  userId: string,
  props: CollectionProperties,
  recordId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
) {
  for (const automation of props.automations) {
    if (!automation.enabled) continue;
    const matches = (values: Record<string, unknown>) =>
      evaluateCondition(automation.trigger, values) || evaluateCondition(automation.trigger, withSelectLabels(props.fields, values));
    if (!matches(after) || (before && matches(before))) continue;
    try {
      await runAutomations(userId, recordId, automation.actions, withSelectLabels(props.fields, after));
    } catch (err) {
      console.error(`Collection automation "${automation.id}" failed:`, err);
    }
  }
}

export async function listRecords(userId: string, collectionId: string, query: ListRecordsQuery): Promise<ServiceResult<unknown>> {
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned) return { ok: false, status: 404, message: "Collection not found" };
  const { fields, views } = owned.props;

  let filters: CollectionFilter[] = query.filters ?? [];
  let sorts: CollectionSort[] = query.sorts ?? [];
  if (query.viewId) {
    const view = views.find((v) => v.id === query.viewId);
    if (!view) return { ok: false, status: 404, message: "View not found" };
    // Saved view filters always apply; ad-hoc filters narrow further; ad-hoc sorts override.
    filters = [...(view.filters ?? []), ...filters];
    if (!query.sorts?.length) sorts = view.sorts ?? [];
  }

  const built = buildRecordQuery({
    userId,
    collectionId,
    fields,
    filters,
    sorts,
    search: query.search || undefined,
    page: query.page,
    pageSize: query.pageSize,
  });
  if (!built.ok) return { ok: false, status: 400, message: built.message };

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<RawRecordRow[]>(built.dataQuery),
    prisma.$queryRaw<{ count: number }[]>(built.countQuery),
  ]);
  const records = rows.map((r) => toRecord(r, fields));
  const related = await loadRelated(userId, fields, records.map((r) => r.values));

  return {
    ok: true,
    data: { records, total: countRows[0]?.count ?? 0, page: query.page, pageSize: query.pageSize, related },
  };
}

async function loadOwnedRecord(userId: string, collectionId: string, recordId: string) {
  return prisma.object.findFirst({
    where: { id: recordId, userId, collectionId, type: COLLECTION_RECORD_TYPE, status: { in: ["active", "archived"] } },
  });
}

export async function getRecord(userId: string, collectionId: string, recordId: string): Promise<ServiceResult<unknown>> {
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned) return { ok: false, status: 404, message: "Collection not found" };
  const row = await loadOwnedRecord(userId, collectionId, recordId);
  if (!row) return { ok: false, status: 404, message: "Record not found" };
  const record = toRecord(row, owned.props.fields);
  return { ok: true, data: { ...record, related: await loadRelated(userId, owned.props.fields, [record.values]) } };
}

export async function createRecord(userId: string, collectionId: string, input: Record<string, unknown>): Promise<ServiceResult<unknown>> {
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned || owned.obj.status !== "active") return { ok: false, status: 404, message: "Collection not found" };
  const { fields } = owned.props;

  const validation = validateRecordValues(fields, input, { partial: false });
  if (!validation.ok) return { ok: false, status: 400, message: validation.message };
  const relationError = await checkRelationValues(userId, fields, validation.values);
  if (relationError) return { ok: false, status: 400, message: relationError };

  const row = await prisma.object.create({
    data: {
      userId,
      type: COLLECTION_RECORD_TYPE,
      collectionId,
      title: deriveRecordTitle(fields, validation.values),
      status: "active",
      properties: { values: validation.values } as unknown as Prisma.InputJsonValue,
    },
  });
  await syncRelations(userId, row.id, fields, validation.values);
  await logActivity(userId, row.id, "created", { title: row.title, collection: owned.obj.title });
  await runCollectionAutomations(userId, owned.props, row.id, null, validation.values);

  return getRecord(userId, collectionId, row.id);
}

/** PATCH semantics: only the sent keys change (null clears one); untouched values are kept as-is. */
export async function updateRecord(
  userId: string,
  collectionId: string,
  recordId: string,
  input: Record<string, unknown>
): Promise<ServiceResult<unknown>> {
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned) return { ok: false, status: 404, message: "Collection not found" };
  const existing = await loadOwnedRecord(userId, collectionId, recordId);
  if (!existing) return { ok: false, status: 404, message: "Record not found" };
  const { fields } = owned.props;

  const validation = validateRecordValues(fields, input, { partial: true });
  if (!validation.ok) return { ok: false, status: 400, message: validation.message };
  const relationError = await checkRelationValues(userId, fields, validation.values, recordId);
  if (relationError) return { ok: false, status: 400, message: relationError };

  const before = recordValues(existing.properties);
  const after = { ...before, ...validation.values };

  await prisma.object.update({
    where: { id: recordId },
    data: {
      title: deriveRecordTitle(fields, after),
      properties: { ...((existing.properties as object | null) ?? {}), values: after } as unknown as Prisma.InputJsonValue,
    },
  });
  await syncRelations(userId, recordId, fields, after);
  await logActivity(userId, recordId, "updated", { fields: Object.keys(validation.values).length });
  await runCollectionAutomations(userId, owned.props, recordId, before, after);

  return getRecord(userId, collectionId, recordId);
}

/** Soft delete to Trash; relations are kept so restoring brings the record back intact. */
export async function deleteRecord(userId: string, collectionId: string, recordId: string): Promise<ServiceResult<unknown>> {
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned) return { ok: false, status: 404, message: "Collection not found" };
  const existing = await loadOwnedRecord(userId, collectionId, recordId);
  if (!existing) return { ok: false, status: 404, message: "Record not found" };
  await prisma.object.update({ where: { id: recordId }, data: { status: "trash", deletedAt: new Date() } });
  await logActivity(userId, recordId, "trashed");
  return { ok: true, data: { id: recordId } };
}

export async function bulkRecordAction(
  userId: string,
  collectionId: string,
  action: "trash" | "archive",
  recordIds: string[]
): Promise<ServiceResult<unknown>> {
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned) return { ok: false, status: 404, message: "Collection not found" };
  const now = new Date();
  // userId + collectionId in the WHERE clause means ids from anywhere else are silently skipped, never touched.
  const result = await prisma.object.updateMany({
    where: { id: { in: recordIds }, userId, collectionId, type: COLLECTION_RECORD_TYPE, status: { not: "trash" } },
    data: action === "trash" ? { status: "trash", deletedAt: now } : { status: "archived", archivedAt: now },
  });
  return { ok: true, data: { count: result.count } };
}

function formatForCsv(field: CollectionField, value: unknown, related: Record<string, RelatedObject>): string {
  if (value === null || value === undefined) return "";
  switch (field.type) {
    case "select":
      return field.config?.options?.find((o) => o.value === value)?.label ?? String(value);
    case "multi_select":
      return (value as string[]).map((v) => field.config?.options?.find((o) => o.value === v)?.label ?? v).join("; ");
    case "relation":
      return (value as string[]).map((id) => related[id]?.title ?? id).join("; ");
    case "checkbox":
      return value ? "true" : "false";
    default:
      return String(value);
  }
}

export async function exportRecordsCsv(userId: string, collectionId: string): Promise<{ name: string; csv: string } | null> {
  const owned = await loadOwnedCollection(userId, collectionId);
  if (!owned) return null;
  const { fields } = owned.props;

  const rows = await prisma.object.findMany({
    where: { userId, collectionId, type: COLLECTION_RECORD_TYPE, status: "active" },
    orderBy: { createdAt: "asc" },
    take: CSV_EXPORT_LIMIT,
    select: { id: true, title: true, properties: true, status: true, createdAt: true, updatedAt: true },
  });
  const records = rows.map((r) => toRecord(r, fields));
  const related = await loadRelated(userId, fields, records.map((r) => r.values));

  const lines = [
    toCsvRow([...fields.map((f) => f.name), "Created at"]),
    ...records.map((r) => toCsvRow([...fields.map((f) => formatForCsv(f, r.values[f.id], related)), r.createdAt.toISOString()])),
  ];
  return { name: owned.props.slug || owned.obj.title, csv: lines.join("\r\n") };
}

export { COLLECTION_TYPE };
