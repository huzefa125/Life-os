"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JsonValue } from "@/lib/types";

export interface PropertyRow {
  id: string;
  key: string;
  value: string;
}

let rowIdCounter = 0;
function nextRowId() {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

function stringifyValue(value: JsonValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function propertiesToRows(
  properties: Record<string, JsonValue> | null | undefined,
  excludeKeys: string[] = []
): PropertyRow[] {
  if (!properties) return [];
  return Object.entries(properties)
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([key, value]) => ({
      id: nextRowId(),
      key,
      value: stringifyValue(value),
    }));
}

export function extractString(
  properties: Record<string, JsonValue> | null | undefined,
  key: string
): string {
  const value = properties?.[key];
  return typeof value === "string" ? value : value != null ? stringifyValue(value) : "";
}

export function rowsToProperties(rows: PropertyRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    result[key] = row.value;
  }
  return result;
}

export function PropertyEditor({
  rows,
  onChange,
}: {
  rows: PropertyRow[];
  onChange: (rows: PropertyRow[]) => void;
}) {
  function updateRow(id: string, patch: Partial<PropertyRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id));
  }

  function addRow() {
    onChange([...rows, { id: nextRowId(), key: "", value: "" }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-1.5">
          <Input
            placeholder="Property"
            value={row.key}
            onChange={(event) => updateRow(row.id, { key: event.target.value })}
            className="w-[35%] text-sm"
          />
          <Input
            placeholder="Value"
            value={row.value}
            onChange={(event) => updateRow(row.id, { value: event.target.value })}
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeRow(row.id)}
            aria-label="Remove property"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="self-start">
        <Plus className="size-3.5" />
        Add property
      </Button>
    </div>
  );
}
