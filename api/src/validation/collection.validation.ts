import { z } from "zod";
import { formAutomationSchema, formConditionSchema } from "./form.validation";

export const COLLECTION_FIELD_TYPES = [
  "text",
  "long_text",
  "number",
  "currency",
  "email",
  "phone",
  "url",
  "date",
  "datetime",
  "checkbox",
  "select",
  "multi_select",
  "rating",
  "relation",
] as const;
export type CollectionFieldType = (typeof COLLECTION_FIELD_TYPES)[number];

/** LifeOS object types a RELATION field may point at — every one is an `Object` row, so links reuse the Relation table. */
export const RELATION_TARGET_TYPES = [
  "person",
  "project",
  "task",
  "note",
  "event",
  "file",
  "transaction",
  "account",
  "collection_record",
] as const;
export type RelationTargetType = (typeof RELATION_TARGET_TYPES)[number];

export const VIEW_TYPES = ["table", "board", "gallery", "calendar"] as const;

export const FILTER_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "before",
  "after",
  "is_empty",
  "is_not_empty",
  "is_checked",
  "is_not_checked",
  "in",
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

/** Built-in sortable columns that exist on every record, alongside user-defined field ids. */
export const BUILTIN_SORT_KEYS = ["createdAt", "updatedAt", "title"] as const;

export const MAX_FIELDS = 100;
export const MAX_VIEWS = 50;

// Ids are client-generated opaque strings used as JSON keys and bound SQL
// parameters (never interpolated) — the character set is still restricted.
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Invalid id");

const selectOptionSchema = z
  .object({
    value: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(100),
    color: z.string().max(20).optional(),
  })
  .strict();

const fieldConfigSchema = z
  .object({
    options: z.array(selectOptionSchema).max(200).optional(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/, "currencyCode must be a 3-letter ISO code").optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    decimals: z.number().int().min(0).max(6).optional(),
    ratingMax: z.number().int().min(1).max(10).optional(),
    targetType: z.enum(RELATION_TARGET_TYPES).optional(),
    targetCollectionId: z.uuid().optional(),
    multiple: z.boolean().optional(),
  })
  .strict();

function refineFieldConfig(
  field: { type: CollectionFieldType; config?: z.infer<typeof fieldConfigSchema> },
  ctx: z.RefinementCtx
) {
  const config = field.config ?? {};
  if (field.type === "select" || field.type === "multi_select") {
    const options = config.options ?? [];
    if (options.length === 0) {
      ctx.addIssue({ code: "custom", message: `${field.type} fields need at least one option`, path: ["config", "options"] });
    }
    const values = options.map((o) => o.value);
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: "custom", message: "Option values must be unique", path: ["config", "options"] });
    }
  }
  if (field.type === "relation") {
    if (!config.targetType) {
      ctx.addIssue({ code: "custom", message: "Relation fields need a target type", path: ["config", "targetType"] });
    } else if (config.targetType === "collection_record" && !config.targetCollectionId) {
      ctx.addIssue({ code: "custom", message: "Pick which collection this field links to", path: ["config", "targetCollectionId"] });
    }
  }
  if (config.min !== undefined && config.max !== undefined && config.min > config.max) {
    ctx.addIssue({ code: "custom", message: "min cannot be greater than max", path: ["config", "min"] });
  }
}

const fieldBaseShape = {
  id: idSchema,
  // Always recomputed server-side from the name (unique within the collection); accepted only so stored fields round-trip.
  key: z.string().max(64).optional(),
  name: z.string().trim().min(1, "Field name is required").max(100),
  type: z.enum(COLLECTION_FIELD_TYPES),
  description: z.string().max(500).optional(),
  required: z.boolean().default(false),
  config: fieldConfigSchema.optional(),
};

export const createFieldSchema = z.object(fieldBaseShape).strict().superRefine(refineFieldConfig);

// A field's type is fixed once created: stored values were validated against
// it, and the record query casts values per type — changing it would leave
// existing values unqueryable.
export const updateFieldSchema = z
  .object({
    name: fieldBaseShape.name.optional(),
    description: fieldBaseShape.description,
    required: z.boolean().optional(),
    config: fieldConfigSchema.optional(),
  })
  .strict();

export const reorderFieldsSchema = z.object({ fieldIds: z.array(idSchema).min(1).max(MAX_FIELDS) }).strict();

export const filterSchema = z
  .object({
    fieldId: z.string().min(1).max(64),
    operator: z.enum(FILTER_OPERATORS),
    value: z.union([z.string().max(500), z.number(), z.boolean(), z.array(z.string().max(200)).max(50)]).optional(),
  })
  .strict();

export const sortSchema = z
  .object({
    fieldId: z.string().min(1).max(64),
    direction: z.enum(["asc", "desc"]),
  })
  .strict();

const viewShape = {
  id: idSchema,
  name: z.string().trim().min(1, "View name is required").max(100),
  type: z.enum(VIEW_TYPES),
  filters: z.array(filterSchema).max(20).default([]),
  sorts: z.array(sortSchema).max(3).default([]),
  visibleFieldIds: z.array(idSchema).max(MAX_FIELDS).optional(),
  fieldOrder: z.array(idSchema).max(MAX_FIELDS).optional(),
  groupByFieldId: idSchema.optional(),
  dateFieldId: idSchema.optional(),
};

export const createViewSchema = z.object(viewShape).strict();
export const updateViewSchema = z
  .object({
    name: viewShape.name.optional(),
    filters: z.array(filterSchema).max(20).optional(),
    sorts: z.array(sortSchema).max(3).optional(),
    visibleFieldIds: viewShape.visibleFieldIds,
    fieldOrder: viewShape.fieldOrder,
    groupByFieldId: viewShape.groupByFieldId.nullable(),
    dateFieldId: viewShape.dateFieldId.nullable(),
  })
  .strict();

/** When a record's field changes so this condition becomes true, run the actions (Forms' automation actions, reused). */
export const collectionAutomationSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(100),
    enabled: z.boolean().default(true),
    trigger: formConditionSchema,
    actions: z.array(formAutomationSchema).min(1).max(10),
  })
  .strict();

export const createCollectionSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    description: z.string().max(1000).optional(),
    icon: z.string().max(50).optional(),
    color: z.string().max(20).optional(),
    fields: z.array(createFieldSchema).max(MAX_FIELDS).default([]),
    views: z.array(createViewSchema).max(MAX_VIEWS).optional(),
  })
  .strict();

export const updateCollectionSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    icon: z.string().max(50).optional(),
    color: z.string().max(20).optional(),
    automations: z.array(collectionAutomationSchema).max(20).optional(),
  })
  .strict();

export const collectionIdParamSchema = z.object({ id: z.uuid("id must be a valid UUID") });
export const fieldIdParamSchema = z.object({ id: z.uuid("id must be a valid UUID"), fieldId: idSchema });
export const viewIdParamSchema = z.object({ id: z.uuid("id must be a valid UUID"), viewId: idSchema });
export const recordIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
  recordId: z.uuid("recordId must be a valid UUID"),
});

export const listCollectionsQuerySchema = z.object({
  status: z.enum(["active", "archived"]).default("active"),
});

// Record values are validated against the collection's field definitions in
// the service (dynamic per collection) — this only bounds the shape.
export const recordValuesSchema = z.record(idSchema, z.unknown()).refine((v) => Object.keys(v).length <= MAX_FIELDS, {
  message: "Too many values",
});

export const createRecordSchema = z.object({ values: recordValuesSchema }).strict();
export const updateRecordSchema = z.object({ values: recordValuesSchema }).strict();

export const bulkRecordActionSchema = z
  .object({
    action: z.enum(["trash", "archive"]),
    recordIds: z.array(z.uuid()).min(1).max(200),
  })
  .strict();

function parseJsonParam(value: unknown): unknown {
  if (typeof value !== "string" || value === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return "__invalid__";
  }
}

/**
 * Filters/sorts arrive as JSON-encoded query params. They're parsed and
 * shape-validated here; the service additionally checks every fieldId against
 * the collection's actual fields (and operators against each field's type)
 * before anything reaches SQL.
 */
export const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  search: z.string().trim().max(200).optional(),
  viewId: idSchema.optional(),
  filters: z.preprocess(parseJsonParam, z.array(filterSchema).max(20).optional()),
  sorts: z.preprocess(parseJsonParam, z.array(sortSchema).max(3).optional()),
});

export type CollectionField = z.infer<typeof createFieldSchema>;
export type CollectionView = z.infer<typeof createViewSchema>;
export type CollectionFilter = z.infer<typeof filterSchema>;
export type CollectionSort = z.infer<typeof sortSchema>;
export type CollectionAutomation = z.infer<typeof collectionAutomationSchema>;
export type CreateCollectionBody = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionBody = z.infer<typeof updateCollectionSchema>;
export type UpdateFieldBody = z.infer<typeof updateFieldSchema>;
export type UpdateViewBody = z.infer<typeof updateViewSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;

export interface CollectionProperties {
  description?: string;
  icon?: string;
  color?: string;
  slug: string;
  fields: CollectionField[];
  views: CollectionView[];
  automations: CollectionAutomation[];
}
