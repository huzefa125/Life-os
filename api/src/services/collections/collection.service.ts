import { randomUUID } from "crypto";
import { prisma } from "../../db";
import { Prisma } from "../../generated/prisma/client";
import {
  MAX_FIELDS,
  MAX_VIEWS,
  type CollectionField,
  type CollectionProperties,
  type CollectionView,
  type CreateCollectionBody,
  type UpdateCollectionBody,
  type UpdateFieldBody,
  type UpdateViewBody,
} from "../../validation/collection.validation";
import { logActivity } from "../activity/activity.service";
import { buildRecordQuery, COLLECTION_RECORD_TYPE } from "./record-query";

export const COLLECTION_TYPE = "collection";

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: 400 | 404; message: string };

const notFound = { ok: false as const, status: 404 as const, message: "Collection not found" };
const bad = (message: string) => ({ ok: false as const, status: 400 as const, message });

export function readProperties(raw: unknown): CollectionProperties {
  const p = (raw ?? {}) as Partial<CollectionProperties>;
  return {
    description: p.description,
    icon: p.icon,
    color: p.color,
    slug: p.slug ?? "",
    fields: p.fields ?? [],
    views: p.views ?? [],
    automations: p.automations ?? [],
  };
}

function slugify(value: string, separator: "-" | "_"): string {
  const s = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, "g"), "");
  return s.slice(0, 60) || (separator === "-" ? "collection" : "field");
}

function uniqueWithin(base: string, taken: Set<string>, separator: string): string {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${separator}${i}`)) i++;
  return `${base}${separator}${i}`;
}

/** Slugs are unique per user across their non-trashed collections (enforced here — slug lives in properties). */
async function uniqueSlug(userId: string, name: string, excludeId?: string): Promise<string> {
  const existing = await prisma.object.findMany({
    where: { userId, type: COLLECTION_TYPE, status: { not: "trash" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { properties: true },
  });
  const taken = new Set(existing.map((o) => readProperties(o.properties).slug));
  return uniqueWithin(slugify(name, "-"), taken, "-");
}

/** Field keys (stable snake_case names, used for CSV headers/import mapping) are unique within a collection. */
function assignFieldKeys(fields: CollectionField[]): CollectionField[] {
  const taken = new Set<string>();
  return fields.map((f) => {
    const key = uniqueWithin(slugify(f.name, "_"), taken, "_");
    taken.add(key);
    return { ...f, key };
  });
}

async function checkRelationTargets(userId: string, fields: CollectionField[], selfId?: string): Promise<string | null> {
  const targetCollectionIds = fields
    .filter((f) => f.type === "relation" && f.config?.targetType === "collection_record" && f.config.targetCollectionId)
    .map((f) => f.config!.targetCollectionId!)
    .filter((id) => id !== selfId);
  if (targetCollectionIds.length === 0) return null;
  const found = await prisma.object.findMany({
    where: { id: { in: targetCollectionIds }, userId, type: COLLECTION_TYPE, status: { not: "trash" } },
    select: { id: true },
  });
  const ok = new Set(found.map((o) => o.id));
  const missing = targetCollectionIds.find((id) => !ok.has(id));
  return missing ? "A relation field points at a collection that doesn't exist" : null;
}

function validateView(view: CollectionView, fields: CollectionField[]): string | null {
  const byId = new Map(fields.map((f) => [f.id, f]));
  for (const id of [...(view.visibleFieldIds ?? []), ...(view.fieldOrder ?? [])]) {
    if (!byId.has(id)) return `View "${view.name}" references a field that doesn't exist`;
  }
  if (view.groupByFieldId) {
    const f = byId.get(view.groupByFieldId);
    if (!f || f.type !== "select") return "Board views group by a Select field";
  }
  if (view.dateFieldId) {
    const f = byId.get(view.dateFieldId);
    if (!f || (f.type !== "date" && f.type !== "datetime")) return "Calendar views need a Date field";
  }
  if (view.type === "board" && !view.groupByFieldId) return "Pick a Select field to group the board by";
  if (view.type === "calendar" && !view.dateFieldId) return "Pick a Date field for the calendar";
  // Dry-run the real query builder so saved filters/sorts are guaranteed valid.
  const built = buildRecordQuery({
    userId: "_",
    collectionId: "_",
    fields,
    filters: view.filters ?? [],
    sorts: view.sorts ?? [],
    page: 1,
    pageSize: 1,
  });
  return built.ok ? null : built.message;
}

function defaultView(): CollectionView {
  return { id: `view-${randomUUID().slice(0, 8)}`, name: "All records", type: "table", filters: [], sorts: [] };
}

async function loadOwned(userId: string, id: string, { allowArchived = true } = {}) {
  const obj = await prisma.object.findFirst({
    where: { id, userId, type: COLLECTION_TYPE, status: allowArchived ? { in: ["active", "archived"] } : "active" },
  });
  if (!obj) return null;
  return { obj, props: readProperties(obj.properties) };
}

async function saveProperties(id: string, props: CollectionProperties) {
  return prisma.object.update({ where: { id }, data: { properties: props as unknown as Prisma.InputJsonValue } });
}

async function withMeta(userId: string, objs: Awaited<ReturnType<typeof prisma.object.findMany>>) {
  const ids = objs.map((o) => o.id);
  const [counts, favorites] = await Promise.all([
    ids.length
      ? prisma.object.groupBy({
          by: ["collectionId"],
          where: { userId, type: COLLECTION_RECORD_TYPE, status: "active", collectionId: { in: ids } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    ids.length ? prisma.favorite.findMany({ where: { userId, objectId: { in: ids } }, select: { objectId: true } }) : Promise.resolve([]),
  ]);
  const countById = new Map(counts.map((c) => [c.collectionId, c._count._all]));
  const favSet = new Set(favorites.map((f) => f.objectId));
  return objs.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    archivedAt: o.archivedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    properties: readProperties(o.properties),
    recordCount: countById.get(o.id) ?? 0,
    isFavorite: favSet.has(o.id),
  }));
}

export async function listCollections(userId: string, status: "active" | "archived") {
  const objs = await prisma.object.findMany({
    where: { userId, type: COLLECTION_TYPE, status },
    orderBy: { createdAt: "asc" },
  });
  return withMeta(userId, objs);
}

export async function getCollection(userId: string, id: string) {
  const owned = await loadOwned(userId, id);
  if (!owned) return null;
  const [result] = await withMeta(userId, [owned.obj]);
  return result;
}

export async function createCollection(userId: string, input: CreateCollectionBody): Promise<ServiceResult<unknown>> {
  const fieldIds = input.fields.map((f) => f.id);
  if (new Set(fieldIds).size !== fieldIds.length) return bad("Field ids must be unique");

  const fields = assignFieldKeys(input.fields);
  const relationError = await checkRelationTargets(userId, fields);
  if (relationError) return bad(relationError);

  const views = input.views?.length ? input.views : [defaultView()];
  const viewIds = views.map((v) => v.id);
  if (new Set(viewIds).size !== viewIds.length) return bad("View ids must be unique");
  for (const view of views) {
    const error = validateView(view, fields);
    if (error) return bad(error);
  }

  const props: CollectionProperties = {
    description: input.description,
    icon: input.icon,
    color: input.color,
    slug: await uniqueSlug(userId, input.name),
    fields,
    views,
    automations: [],
  };

  const obj = await prisma.object.create({
    data: {
      userId,
      type: COLLECTION_TYPE,
      title: input.name,
      status: "active",
      properties: props as unknown as Prisma.InputJsonValue,
    },
  });
  await logActivity(userId, obj.id, "created", { title: obj.title });
  const [result] = await withMeta(userId, [obj]);
  return { ok: true, data: result };
}

export async function updateCollection(userId: string, id: string, input: UpdateCollectionBody): Promise<ServiceResult<unknown>> {
  const owned = await loadOwned(userId, id);
  if (!owned) return notFound;
  const props = { ...owned.props };

  if (input.description !== undefined) props.description = input.description;
  if (input.icon !== undefined) props.icon = input.icon;
  if (input.color !== undefined) props.color = input.color;
  if (input.name !== undefined && input.name !== owned.obj.title) props.slug = await uniqueSlug(userId, input.name, id);
  if (input.automations !== undefined) {
    const fieldIds = new Set(props.fields.map((f) => f.id));
    for (const automation of input.automations) {
      if (!fieldIds.has(automation.trigger.fieldId)) return bad(`Automation "${automation.name}" watches a field that doesn't exist`);
    }
    props.automations = input.automations;
  }

  await prisma.object.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { title: input.name } : {}),
      properties: props as unknown as Prisma.InputJsonValue,
    },
  });
  await logActivity(userId, id, "updated");
  return { ok: true, data: await getCollection(userId, id) };
}

/** Moves the collection to Trash (the existing trash system handles restore/permanent delete; permanent delete cascades to records). */
export async function deleteCollection(userId: string, id: string) {
  const owned = await loadOwned(userId, id);
  if (!owned) return null;
  const trashed = await prisma.object.update({ where: { id }, data: { status: "trash", deletedAt: new Date() } });
  await logActivity(userId, id, "trashed");
  return trashed;
}

export async function addField(userId: string, id: string, field: CollectionField): Promise<ServiceResult<unknown>> {
  const owned = await loadOwned(userId, id);
  if (!owned) return notFound;
  if (owned.props.fields.length >= MAX_FIELDS) return bad(`A collection can have at most ${MAX_FIELDS} fields`);
  if (owned.props.fields.some((f) => f.id === field.id)) return bad("A field with this id already exists");

  const relationError = await checkRelationTargets(userId, [field], id);
  if (relationError) return bad(relationError);

  const fields = assignFieldKeys([...owned.props.fields, field]);
  await saveProperties(id, { ...owned.props, fields });
  await logActivity(userId, id, "updated", { fieldAdded: field.name });
  return { ok: true, data: fields[fields.length - 1] };
}

export async function updateField(userId: string, id: string, fieldId: string, patch: UpdateFieldBody): Promise<ServiceResult<unknown>> {
  const owned = await loadOwned(userId, id);
  if (!owned) return notFound;
  const index = owned.props.fields.findIndex((f) => f.id === fieldId);
  if (index === -1) return { ok: false, status: 404, message: "Field not found" };

  const current = owned.props.fields[index];
  const next: CollectionField = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.required !== undefined ? { required: patch.required } : {}),
    ...(patch.config !== undefined ? { config: patch.config } : {}),
  };

  if ((next.type === "select" || next.type === "multi_select") && !(next.config?.options?.length)) {
    return bad("Select fields need at least one option");
  }
  if (next.type === "relation") {
    if (next.config?.targetType !== current.config?.targetType || next.config?.targetCollectionId !== current.config?.targetCollectionId) {
      return bad("A relation field's target can't be changed — create a new relation field instead");
    }
  }

  const fields = [...owned.props.fields];
  fields[index] = next;
  const keyed = assignFieldKeys(fields);
  for (const view of owned.props.views) {
    const error = validateView(view, keyed);
    if (error) return bad(`This change would break view "${view.name}": ${error}`);
  }
  await saveProperties(id, { ...owned.props, fields: keyed });
  await logActivity(userId, id, "updated", { fieldUpdated: next.name });
  return { ok: true, data: keyed[index] };
}

/**
 * Removes a field and every view/automation reference to it. Stored values
 * for the field stay on records (harmless — unknown ids are ignored on read
 * and excluded from export) so the delete is cheap and never rewrites rows.
 */
export async function deleteField(userId: string, id: string, fieldId: string): Promise<ServiceResult<unknown>> {
  const owned = await loadOwned(userId, id);
  if (!owned) return notFound;
  const field = owned.props.fields.find((f) => f.id === fieldId);
  if (!field) return { ok: false, status: 404, message: "Field not found" };

  const fields = owned.props.fields.filter((f) => f.id !== fieldId);
  const views = owned.props.views.map((v) => {
    const next: CollectionView = {
      ...v,
      filters: (v.filters ?? []).filter((f) => f.fieldId !== fieldId),
      sorts: (v.sorts ?? []).filter((s) => s.fieldId !== fieldId),
      visibleFieldIds: v.visibleFieldIds?.filter((x) => x !== fieldId),
      fieldOrder: v.fieldOrder?.filter((x) => x !== fieldId),
    };
    // A board/calendar that depended on this field falls back to a table.
    if (v.groupByFieldId === fieldId || v.dateFieldId === fieldId) {
      return { ...next, type: "table" as const, groupByFieldId: undefined, dateFieldId: undefined };
    }
    return next;
  });
  const automations = owned.props.automations.filter((a) => a.trigger.fieldId !== fieldId);

  await saveProperties(id, { ...owned.props, fields, views, automations });
  await logActivity(userId, id, "updated", { fieldRemoved: field.name });
  return { ok: true, data: field };
}

export async function reorderFields(userId: string, id: string, fieldIds: string[]): Promise<ServiceResult<unknown>> {
  const owned = await loadOwned(userId, id);
  if (!owned) return notFound;
  const byId = new Map(owned.props.fields.map((f) => [f.id, f]));
  if (fieldIds.length !== byId.size || fieldIds.some((fid) => !byId.has(fid))) {
    return bad("fieldIds must list every field exactly once");
  }
  const fields = fieldIds.map((fid) => byId.get(fid)!);
  await saveProperties(id, { ...owned.props, fields });
  return { ok: true, data: fields };
}

export async function addView(userId: string, id: string, view: CollectionView): Promise<ServiceResult<unknown>> {
  const owned = await loadOwned(userId, id);
  if (!owned) return notFound;
  if (owned.props.views.length >= MAX_VIEWS) return bad(`A collection can have at most ${MAX_VIEWS} views`);
  if (owned.props.views.some((v) => v.id === view.id)) return bad("A view with this id already exists");
  const error = validateView(view, owned.props.fields);
  if (error) return bad(error);

  await saveProperties(id, { ...owned.props, views: [...owned.props.views, view] });
  return { ok: true, data: view };
}

export async function updateView(userId: string, id: string, viewId: string, patch: UpdateViewBody): Promise<ServiceResult<unknown>> {
  const owned = await loadOwned(userId, id);
  if (!owned) return notFound;
  const index = owned.props.views.findIndex((v) => v.id === viewId);
  if (index === -1) return { ok: false, status: 404, message: "View not found" };

  const current = owned.props.views[index];
  const next: CollectionView = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.filters !== undefined ? { filters: patch.filters } : {}),
    ...(patch.sorts !== undefined ? { sorts: patch.sorts } : {}),
    ...(patch.visibleFieldIds !== undefined ? { visibleFieldIds: patch.visibleFieldIds } : {}),
    ...(patch.fieldOrder !== undefined ? { fieldOrder: patch.fieldOrder } : {}),
    ...(patch.groupByFieldId !== undefined ? { groupByFieldId: patch.groupByFieldId ?? undefined } : {}),
    ...(patch.dateFieldId !== undefined ? { dateFieldId: patch.dateFieldId ?? undefined } : {}),
  };
  const error = validateView(next, owned.props.fields);
  if (error) return bad(error);

  const views = [...owned.props.views];
  views[index] = next;
  await saveProperties(id, { ...owned.props, views });
  return { ok: true, data: next };
}

export async function deleteView(userId: string, id: string, viewId: string): Promise<ServiceResult<unknown>> {
  const owned = await loadOwned(userId, id);
  if (!owned) return notFound;
  const view = owned.props.views.find((v) => v.id === viewId);
  if (!view) return { ok: false, status: 404, message: "View not found" };
  if (owned.props.views.length === 1) return bad("A collection needs at least one view");

  await saveProperties(id, { ...owned.props, views: owned.props.views.filter((v) => v.id !== viewId) });
  return { ok: true, data: view };
}

export async function loadOwnedCollection(userId: string, id: string) {
  return loadOwned(userId, id);
}
