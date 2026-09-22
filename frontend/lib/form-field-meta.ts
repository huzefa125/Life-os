import type { FormFieldType, FormConditionOperator, FormAutomationType, FormSettings } from "@/lib/types";

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  status: "draft",
  acceptResponses: true,
  onePerPerson: false,
  allowResponseEditing: false,
  saveAndResumeLater: false,
  requireLogin: false,
  anonymousResponses: true,
  spamProtectionEnabled: false,
};

export const FORM_FIELD_TYPES: FormFieldType[] = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "datetime",
  "dropdown",
  "radio",
  "checkbox",
  "rating",
  "url",
  "currency",
  "address",
  "file",
];

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  datetime: "Date / Time",
  dropdown: "Dropdown",
  radio: "Radio",
  checkbox: "Checkbox",
  rating: "Rating",
  url: "URL",
  currency: "Currency",
  address: "Address",
  file: "File upload",
};

/** Field types that need an editable options list (dropdown/radio/checkbox). */
export const CHOICE_FIELD_TYPES = new Set<FormFieldType>(["dropdown", "radio", "checkbox"]);

export const CONDITION_OPERATOR_LABELS: Record<FormConditionOperator, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

export const AUTOMATION_TYPE_LABELS: Record<FormAutomationType, string> = {
  create_person: "Create a Person",
  create_company: "Create a Company",
  create_project: "Create a Project",
  create_task: "Create a Task",
  create_transaction: "Create a Transaction",
};

/** Property keys each automation action type accepts, mirroring each domain's own properties shape. */
export const AUTOMATION_PROPERTY_KEYS: Record<FormAutomationType, string[]> = {
  create_person: ["email", "phone", "company", "role", "notes"],
  create_company: ["website", "industry", "size", "notes"],
  create_project: ["status", "description", "deadline"],
  create_task: ["status", "priority", "dueDate", "notes"],
  create_transaction: ["transactionType", "amount", "currency", "date", "description", "accountId", "categoryId", "toAccountId"],
};

/** Mirrors the backend's RELATION_TYPES allow-list (api/src/validation/relation.validation.ts) — kept in sync manually. */
export const RELATION_TYPE_OPTIONS = [
  "works_on",
  "has_task",
  "has_file",
  "has_note",
  "has_event",
  "knows",
  "related_to",
  "assigned_to",
  "in_account",
  "in_category",
  "transfer_to",
  "for_category",
  "funds_from",
  "has_response",
  "created",
] as const;

/**
 * `<input type="datetime-local">` reads/writes a naive local-time string with
 * no timezone (e.g. "2026-09-22T18:35"). Storing that raw would make a date
 * mean different instants depending on which machine's clock reads it later
 * (e.g. the server). These convert to/from an absolute ISO-with-offset string
 * (`Date#toISOString()`) at the UI boundary, so everything stored/compared
 * server-side is an unambiguous instant.
 */
export function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function newFieldId() {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newActionId() {
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
