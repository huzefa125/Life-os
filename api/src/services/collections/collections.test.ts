import { test } from "node:test";
import assert from "node:assert/strict";
import type { CollectionField } from "../../validation/collection.validation";
import {
  createCollectionSchema,
  createFieldSchema,
  listRecordsQuerySchema,
  updateFieldSchema,
} from "../../validation/collection.validation";
import { deriveRecordTitle, normalizeFieldValue, relationTargetIds, validateRecordValues } from "./record-values";
import { buildRecordQuery, likePattern } from "./record-query";

const USER = "11111111-1111-4111-8111-111111111111";
const COLLECTION = "22222222-2222-4222-8222-222222222222";

const fields: CollectionField[] = [
  { id: "name", name: "Name", type: "text", required: true },
  { id: "email", name: "Email", type: "email", required: false },
  { id: "amount", name: "Amount", type: "currency", required: false, config: { min: 0 } },
  { id: "stage", name: "Stage", type: "select", required: false, config: { options: [{ value: "lead", label: "Lead" }, { value: "won", label: "Won" }] } },
  { id: "tags", name: "Tags", type: "multi_select", required: false, config: { options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] } },
  { id: "due", name: "Due", type: "date", required: false },
  { id: "done", name: "Done", type: "checkbox", required: false },
  { id: "stars", name: "Stars", type: "rating", required: false, config: { ratingMax: 5 } },
  { id: "owner", name: "Owner", type: "relation", required: false, config: { targetType: "person" } },
  { id: "notes", name: "Notes", type: "long_text", required: false },
] as CollectionField[];

const f = (id: string) => fields.find((x) => x.id === id)!;

function sqlOf(input: Partial<Parameters<typeof buildRecordQuery>[0]> = {}) {
  const built = buildRecordQuery({ userId: USER, collectionId: COLLECTION, fields, filters: [], sorts: [], page: 1, pageSize: 50, ...input });
  return built;
}

// ---------- Value validation ----------

test("normalizes values per field type", () => {
  assert.deepEqual(normalizeFieldValue(f("amount"), "12.345"), { ok: true, value: 12.35 });
  assert.deepEqual(normalizeFieldValue(f("done"), undefined), { ok: true, value: false });
  assert.deepEqual(normalizeFieldValue(f("owner"), "33333333-3333-4333-8333-333333333333"), {
    ok: true,
    value: ["33333333-3333-4333-8333-333333333333"],
  });
  assert.deepEqual(normalizeFieldValue(f("tags"), ["a", "a", "b"]), { ok: true, value: ["a", "b"] });
  assert.deepEqual(normalizeFieldValue(f("stars"), 0), { ok: true, value: null });
  assert.deepEqual(normalizeFieldValue(f("name"), "   "), { ok: true, value: null });
});

test("rejects invalid values", () => {
  assert.equal(normalizeFieldValue(f("email"), "not-an-email").ok, false);
  assert.equal(normalizeFieldValue(f("amount"), -5).ok, false);
  assert.equal(normalizeFieldValue(f("amount"), "abc").ok, false);
  assert.equal(normalizeFieldValue(f("stage"), "lost").ok, false);
  assert.equal(normalizeFieldValue(f("tags"), ["c"]).ok, false);
  assert.equal(normalizeFieldValue(f("due"), "2026-13-45").ok, false);
  assert.equal(normalizeFieldValue(f("done"), "yes").ok, false);
  assert.equal(normalizeFieldValue(f("stars"), 6).ok, false);
  assert.equal(normalizeFieldValue(f("owner"), "not-a-uuid").ok, false);
  assert.equal(
    normalizeFieldValue(f("owner"), ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"]).ok,
    false,
    "single relation accepts one target"
  );
  assert.equal(normalizeFieldValue({ ...f("name"), type: "url" } as CollectionField, "javascript:alert(1)").ok, false);
});

test("validateRecordValues enforces required fields and rejects unknown keys", () => {
  assert.equal(validateRecordValues(fields, {}, { partial: false }).ok, false);
  assert.equal(validateRecordValues(fields, { name: "Acme", hacker: 1 }, { partial: false }).ok, false);
  assert.equal(validateRecordValues(fields, { name: "" }, { partial: true }).ok, false, "can't clear a required field");
  const ok = validateRecordValues(fields, { email: "a@b.co" }, { partial: true });
  assert.deepEqual(ok, { ok: true, values: { email: "a@b.co" } });
});

test("derives titles and relation targets", () => {
  assert.equal(deriveRecordTitle(fields, { name: " Acme " }), "Acme");
  assert.equal(deriveRecordTitle(fields, { email: "a@b.co" }), "a@b.co");
  assert.equal(deriveRecordTitle(fields, {}), "Untitled");
  assert.deepEqual(relationTargetIds(fields, { owner: ["x", "y"], name: "z" }), ["x", "y"]);
});

// ---------- Schema validation ----------

test("field schema requires options for select and a target for relation", () => {
  assert.equal(createFieldSchema.safeParse({ id: "s", name: "S", type: "select" }).success, false);
  assert.equal(createFieldSchema.safeParse({ id: "r", name: "R", type: "relation" }).success, false);
  assert.equal(
    createFieldSchema.safeParse({ id: "r", name: "R", type: "relation", config: { targetType: "collection_record" } }).success,
    false
  );
  assert.equal(
    createFieldSchema.safeParse({ id: "s", name: "S", type: "select", config: { options: [{ value: "x", label: "X" }, { value: "x", label: "Y" }] } }).success,
    false,
    "duplicate option values"
  );
  assert.equal(createFieldSchema.safeParse({ id: "bad id!", name: "S", type: "text" }).success, false);
  assert.equal(createFieldSchema.safeParse({ id: "t", name: "T", type: "text", extra: true }).success, false, "strict");
  assert.equal(updateFieldSchema.safeParse({ type: "number" }).success, false, "type is immutable");
});

test("collection schema rejects unknown keys (no userId from body)", () => {
  assert.equal(createCollectionSchema.safeParse({ name: "CRM", userId: USER }).success, false);
  assert.equal(createCollectionSchema.safeParse({ name: "CRM" }).success, true);
});

test("list query parses JSON filters/sorts and bounds page size", () => {
  const parsed = listRecordsQuerySchema.safeParse({
    page: "2",
    pageSize: "25",
    filters: JSON.stringify([{ fieldId: "stage", operator: "equals", value: "won" }]),
    sorts: JSON.stringify([{ fieldId: "amount", direction: "desc" }]),
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.page, 2);
  assert.equal(listRecordsQuerySchema.safeParse({ pageSize: "5000" }).success, false);
  assert.equal(listRecordsQuerySchema.safeParse({ filters: "{not json" }).success, false);
  assert.equal(listRecordsQuerySchema.safeParse({ filters: JSON.stringify([{ fieldId: "x", operator: "drop table" }]) }).success, false);
});

// ---------- Query building ----------

test("query is always scoped to the user, collection and active status", () => {
  const built = sqlOf();
  assert.ok(built.ok);
  if (!built.ok) return;
  assert.match(built.dataQuery.text, /o\."userId" = \$1/);
  assert.match(built.dataQuery.text, /o\."collectionId" = \$2/);
  assert.ok(built.dataQuery.values.includes(USER));
  assert.ok(built.dataQuery.values.includes(COLLECTION));
  assert.match(built.dataQuery.text, /LIMIT \$\d+ OFFSET \$\d+/);
});

test("pagination offset is computed server-side", () => {
  const built = sqlOf({ page: 3, pageSize: 20 });
  assert.ok(built.ok);
  if (!built.ok) return;
  assert.deepEqual(built.dataQuery.values.slice(-2), [20, 40]);
});

test("filter/sort values are bound parameters, never interpolated", () => {
  const evil = "x'; DROP TABLE \"Object\"; --";
  const built = sqlOf({ filters: [{ fieldId: "name", operator: "contains", value: evil }], search: evil });
  assert.ok(built.ok);
  if (!built.ok) return;
  assert.ok(!built.dataQuery.sql.includes("DROP TABLE"));
  assert.ok(built.dataQuery.values.some((v) => typeof v === "string" && v.includes("DROP TABLE")));
});

test("rejects unknown fields and operators that don't fit the field type", () => {
  assert.equal(sqlOf({ filters: [{ fieldId: "nope", operator: "equals", value: "x" }] }).ok, false);
  assert.equal(sqlOf({ filters: [{ fieldId: "amount", operator: "contains", value: "x" }] }).ok, false);
  assert.equal(sqlOf({ filters: [{ fieldId: "amount", operator: "gt", value: "abc" }] }).ok, false);
  assert.equal(sqlOf({ filters: [{ fieldId: "done", operator: "equals", value: "x" }] }).ok, false);
  assert.equal(sqlOf({ sorts: [{ fieldId: "nope", direction: "asc" }] }).ok, false);
  assert.equal(sqlOf({ sorts: [{ fieldId: "tags", direction: "asc" }] }).ok, false, "multi-select isn't sortable");
});

test("accepts every valid filter/sort combination", () => {
  const built = sqlOf({
    filters: [
      { fieldId: "amount", operator: "gte", value: 10 },
      { fieldId: "stage", operator: "in", value: ["lead", "won"] },
      { fieldId: "tags", operator: "contains", value: "a" },
      { fieldId: "due", operator: "before", value: "2026-12-31" },
      { fieldId: "done", operator: "is_checked" },
      { fieldId: "email", operator: "is_empty" },
    ],
    sorts: [
      { fieldId: "stage", direction: "asc" },
      { fieldId: "createdAt", direction: "desc" },
    ],
  });
  assert.ok(built.ok, built.ok ? "" : built.message);
});

test("LIKE patterns escape wildcards", () => {
  assert.equal(likePattern("50%_off!"), "%50!%!_off!!%");
});
