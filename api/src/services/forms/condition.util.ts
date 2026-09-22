import type { FormCondition } from "../../validation/form.validation";

function toComparableString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(String).join(",");
  return String(value);
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim().length === 0;
}

/**
 * Evaluates one field-visibility/automation-gate condition against a submission's
 * answers. Shared by the public form renderer (client-side, a small ported copy)
 * and the server (automation gating + required-field validation) so both sides
 * agree on what "visible"/"should run" means.
 */
export function evaluateCondition(condition: FormCondition | undefined, answers: Record<string, unknown>): boolean {
  if (!condition) return true;

  const actual = answers[condition.fieldId];

  switch (condition.operator) {
    case "is_empty":
      return isEmpty(actual);
    case "is_not_empty":
      return !isEmpty(actual);
    case "equals":
      return toComparableString(actual) === (condition.value ?? "");
    case "not_equals":
      return toComparableString(actual) !== (condition.value ?? "");
    case "contains":
      return toComparableString(actual).toLowerCase().includes((condition.value ?? "").toLowerCase());
    default:
      return true;
  }
}
