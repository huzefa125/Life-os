import {
  AlignLeft,
  AtSign,
  Calendar,
  CalendarClock,
  CheckSquare,
  CircleDot,
  DollarSign,
  Hash,
  Link2,
  type LucideIcon,
  Phone,
  Star,
  Tags,
  Type,
  Unlink,
} from "lucide-react";

import type {
  CollectionField,
  CollectionFieldType,
  CollectionFilterOperator,
  CollectionRelatedObject,
  CollectionView,
  JsonValue,
  RelationTargetType,
} from "@/lib/types";

export const FIELD_TYPE_META: Record<CollectionFieldType, { label: string; icon: LucideIcon; description: string }> = {
  text: { label: "Text", icon: Type, description: "A short line of text" },
  long_text: { label: "Long text", icon: AlignLeft, description: "Paragraphs and notes" },
  number: { label: "Number", icon: Hash, description: "Any number" },
  currency: { label: "Currency", icon: DollarSign, description: "An amount of money" },
  email: { label: "Email", icon: AtSign, description: "An email address" },
  phone: { label: "Phone", icon: Phone, description: "A phone number" },
  url: { label: "URL", icon: Link2, description: "A web link" },
  date: { label: "Date", icon: Calendar, description: "A calendar day" },
  datetime: { label: "Date & time", icon: CalendarClock, description: "A day and a time" },
  checkbox: { label: "Checkbox", icon: CheckSquare, description: "Yes or no" },
  select: { label: "Select", icon: CircleDot, description: "One option from a list" },
  multi_select: { label: "Multi-select", icon: Tags, description: "Several options from a list" },
  rating: { label: "Rating", icon: Star, description: "1–5 stars (configurable)" },
  relation: { label: "Relation", icon: Unlink, description: "Link to People, Projects, records…" },
};

export const FIELD_TYPES = Object.keys(FIELD_TYPE_META) as CollectionFieldType[];

export const RELATION_TARGETS: { value: RelationTargetType; label: string }[] = [
  { value: "person", label: "People" },
  { value: "company", label: "Companies" },
  { value: "project", label: "Projects" },
  { value: "task", label: "Tasks" },
  { value: "note", label: "Notes" },
  { value: "event", label: "Events" },
  { value: "file", label: "Files" },
  { value: "transaction", label: "Transactions" },
  { value: "account", label: "Accounts" },
  { value: "collection_record", label: "Records in a collection" },
];

/** Tailwind classes for select option chips. Stored by name so the palette can change without migrating data. */
export const OPTION_COLORS: Record<string, string> = {
  gray: "bg-muted text-muted-foreground",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
};
export const OPTION_COLOR_NAMES = Object.keys(OPTION_COLORS);

export function optionColorClass(color?: string) {
  return OPTION_COLORS[color ?? "gray"] ?? OPTION_COLORS.gray;
}

export const COLLECTION_COLORS: Record<string, { chip: string; text: string }> = {
  teal: { chip: "bg-teal-100 dark:bg-teal-500/15", text: "text-teal-600" },
  blue: { chip: "bg-blue-100 dark:bg-blue-500/15", text: "text-blue-600" },
  violet: { chip: "bg-violet-100 dark:bg-violet-500/15", text: "text-violet-600" },
  amber: { chip: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-600" },
  rose: { chip: "bg-rose-100 dark:bg-rose-500/15", text: "text-rose-600" },
  emerald: { chip: "bg-emerald-100 dark:bg-emerald-500/15", text: "text-emerald-600" },
  slate: { chip: "bg-slate-100 dark:bg-slate-500/15", text: "text-slate-600" },
};
export function collectionColor(color?: string) {
  return COLLECTION_COLORS[color ?? "teal"] ?? COLLECTION_COLORS.teal;
}

export const OPERATOR_LABELS: Record<CollectionFilterOperator, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  not_contains: "doesn't contain",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  before: "is before",
  after: "is after",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  is_checked: "is checked",
  is_not_checked: "is not checked",
  in: "is any of",
};

const TEXT_OPS: CollectionFilterOperator[] = ["contains", "not_contains", "equals", "not_equals", "is_empty", "is_not_empty"];
const NUMBER_OPS: CollectionFilterOperator[] = ["equals", "not_equals", "gt", "gte", "lt", "lte", "is_empty", "is_not_empty"];
const DATE_OPS: CollectionFilterOperator[] = ["equals", "before", "after", "is_empty", "is_not_empty"];
const LIST_OPS: CollectionFilterOperator[] = ["contains", "not_contains", "is_empty", "is_not_empty"];

/** Mirrors the API's OPERATORS_BY_TYPE — the server re-validates every filter. */
export const OPERATORS_BY_TYPE: Record<CollectionFieldType, CollectionFilterOperator[]> = {
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
  select: ["equals", "not_equals", "is_empty", "is_not_empty"],
  multi_select: LIST_OPS,
  relation: LIST_OPS,
};

export const VALUELESS_OPERATORS = new Set<CollectionFilterOperator>(["is_empty", "is_not_empty", "is_checked", "is_not_checked"]);

export function isSortable(field: CollectionField) {
  return field.type !== "multi_select" && field.type !== "relation" && field.type !== "long_text";
}

export function newId(prefix = "f") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultView(): CollectionView {
  return { id: newId("v"), name: "All records", type: "table", filters: [], sorts: [] };
}

/** Human-readable text for a stored value (table cells, gallery cards, CSV-like previews). */
export function formatValue(
  field: CollectionField,
  value: JsonValue | undefined,
  related: Record<string, CollectionRelatedObject> = {}
): string {
  if (value === null || value === undefined || value === "") return "";
  switch (field.type) {
    case "currency": {
      const n = Number(value);
      try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: field.config?.currencyCode ?? "USD" }).format(n);
      } catch {
        return n.toFixed(2);
      }
    }
    case "number":
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: field.config?.decimals ?? 6 });
    case "date": {
      const d = new Date(`${value}T00:00:00`);
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined, { dateStyle: "medium" });
    }
    case "datetime": {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }
    case "checkbox":
      return value ? "Yes" : "No";
    case "select":
      return field.config?.options?.find((o) => o.value === value)?.label ?? String(value);
    case "multi_select":
      return (Array.isArray(value) ? value : [])
        .map((v) => field.config?.options?.find((o) => o.value === v)?.label ?? String(v))
        .join(", ");
    case "relation":
      return (Array.isArray(value) ? value : [])
        .map((id) => related[String(id)]?.title ?? "Unknown")
        .join(", ");
    case "rating":
      return "★".repeat(Number(value));
    default:
      return String(value);
  }
}

// ---------- Templates ----------

export interface CollectionTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  fields: CollectionField[];
  views: () => CollectionView[];
}

function option(label: string, color: string) {
  return { value: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label, color };
}

/**
 * Optional starting points only — each is copied into a brand-new collection
 * with fresh ids when chosen. Nothing here is referenced by production logic.
 */
export const COLLECTION_TEMPLATES: CollectionTemplate[] = [
  {
    id: "sales_pipeline",
    name: "Sales pipeline",
    description: "Track deals from lead to won, with contacts and values.",
    color: "emerald",
    fields: [
      { id: "deal", name: "Deal", type: "text", required: true },
      { id: "stage", name: "Stage", type: "select", required: false, config: { options: [option("Lead", "gray"), option("Qualified", "blue"), option("Proposal", "amber"), option("Won", "green"), option("Lost", "red")] } },
      { id: "value", name: "Value", type: "currency", required: false, config: { currencyCode: "USD", min: 0 } },
      { id: "contact", name: "Contact", type: "relation", required: false, config: { targetType: "person" } },
      { id: "company", name: "Company", type: "relation", required: false, config: { targetType: "company" } },
      { id: "close", name: "Expected close", type: "date", required: false },
    ],
    views: () => [
      { id: newId("v"), name: "All deals", type: "table", filters: [], sorts: [] },
      { id: newId("v"), name: "Pipeline", type: "board", filters: [], sorts: [], groupByFieldId: "stage" },
      { id: newId("v"), name: "Closing", type: "calendar", filters: [], sorts: [], dateFieldId: "close" },
    ],
  },
  {
    id: "content_calendar",
    name: "Content calendar",
    description: "Plan posts across channels and publish dates.",
    color: "violet",
    fields: [
      { id: "title", name: "Title", type: "text", required: true },
      { id: "status", name: "Status", type: "select", required: false, config: { options: [option("Idea", "gray"), option("Drafting", "amber"), option("Scheduled", "blue"), option("Published", "green")] } },
      { id: "channels", name: "Channels", type: "multi_select", required: false, config: { options: [option("Blog", "violet"), option("Instagram", "pink"), option("LinkedIn", "blue"), option("YouTube", "red")] } },
      { id: "publish", name: "Publish date", type: "date", required: false },
      { id: "link", name: "Link", type: "url", required: false },
    ],
    views: () => [
      { id: newId("v"), name: "All content", type: "table", filters: [], sorts: [] },
      { id: newId("v"), name: "By status", type: "board", filters: [], sorts: [], groupByFieldId: "status" },
      { id: newId("v"), name: "Calendar", type: "calendar", filters: [], sorts: [], dateFieldId: "publish" },
    ],
  },
  {
    id: "reading_list",
    name: "Reading list",
    description: "Books and articles with ratings and notes.",
    color: "amber",
    fields: [
      { id: "title", name: "Title", type: "text", required: true },
      { id: "author", name: "Author", type: "text", required: false },
      { id: "status", name: "Status", type: "select", required: false, config: { options: [option("To read", "gray"), option("Reading", "blue"), option("Finished", "green")] } },
      { id: "rating", name: "Rating", type: "rating", required: false, config: { ratingMax: 5 } },
      { id: "notes", name: "Notes", type: "long_text", required: false },
    ],
    views: () => [
      { id: newId("v"), name: "Shelf", type: "gallery", filters: [], sorts: [] },
      { id: newId("v"), name: "All books", type: "table", filters: [], sorts: [] },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Items, quantities, prices and suppliers.",
    color: "blue",
    fields: [
      { id: "item", name: "Item", type: "text", required: true },
      { id: "sku", name: "SKU", type: "text", required: false },
      { id: "qty", name: "Quantity", type: "number", required: false, config: { min: 0, decimals: 0 } },
      { id: "price", name: "Unit price", type: "currency", required: false, config: { currencyCode: "USD", min: 0 } },
      { id: "supplier", name: "Supplier", type: "relation", required: false, config: { targetType: "company" } },
      { id: "reorder", name: "Needs reorder", type: "checkbox", required: false },
    ],
    views: () => [{ id: newId("v"), name: "All items", type: "table", filters: [], sorts: [] }],
  },
];
