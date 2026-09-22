function escapeCsvCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(",");
}

/**
 * One row per response, one column per form field (in builder order), plus
 * a leading "Submitted at" column. Field labels are used as headers rather
 * than field ids so the export reads naturally when opened in a spreadsheet.
 */
export function buildResponsesCsv(
  fields: { id: string; label: string }[],
  responses: { properties: { answers: Record<string, unknown>; submittedAt: string } | null }[]
): string {
  const header = toCsvRow(["Submitted at", ...fields.map((f) => f.label)]);
  const rows = responses.map((response) => {
    const answers = response.properties?.answers ?? {};
    return toCsvRow([response.properties?.submittedAt ?? "", ...fields.map((f) => answers[f.id])]);
  });
  return [header, ...rows].join("\r\n");
}
