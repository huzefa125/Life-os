"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  FIELD_TYPE_META,
  FIELD_TYPES,
  OPTION_COLOR_NAMES,
  RELATION_TARGETS,
  optionColorClass,
} from "@/lib/collection-meta";
import type { Collection, CollectionField, CollectionFieldConfig, CollectionFieldType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OptionSelect } from "./field-value";

function optionValue(label: string, taken: string[]) {
  const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "option";
  let candidate = base;
  let n = 2;
  while (taken.includes(candidate)) candidate = `${base}_${n++}`;
  return candidate;
}

/** Sensible default config when a field's type is picked, so it's valid immediately. */
export function defaultConfigFor(type: CollectionFieldType): CollectionFieldConfig | undefined {
  switch (type) {
    case "select":
    case "multi_select":
      return { options: [{ value: "option_1", label: "Option 1", color: "blue" }] };
    case "currency":
      return { currencyCode: "USD" };
    case "rating":
      return { ratingMax: 5 };
    case "relation":
      return { targetType: "person" };
    default:
      return undefined;
  }
}

/** Client-side mirror of the API's field rules, for inline feedback before saving. */
export function fieldProblem(field: CollectionField): string | null {
  if (!field.name.trim()) return "Every field needs a name";
  const config = field.config ?? {};
  if ((field.type === "select" || field.type === "multi_select") && !(config.options ?? []).length) {
    return `"${field.name}" needs at least one option`;
  }
  if ((field.type === "select" || field.type === "multi_select") && (config.options ?? []).some((o) => !o.label.trim())) {
    return `"${field.name}" has an option without a label`;
  }
  if (field.type === "relation" && config.targetType === "collection_record" && !config.targetCollectionId) {
    return `Pick which collection "${field.name}" links to`;
  }
  if (config.min !== undefined && config.max !== undefined && config.min > config.max) {
    return `"${field.name}": min can't exceed max`;
  }
  return null;
}

export function FieldEditor({
  field,
  onChange,
  lockType = false,
  lockRelationTarget = false,
  collections = [],
}: {
  field: CollectionField;
  onChange: (field: CollectionField) => void;
  /** A saved field's type can't change (stored values were validated against it). */
  lockType?: boolean;
  lockRelationTarget?: boolean;
  collections?: Pick<Collection, "id" | "title">[];
}) {
  const config = field.config ?? {};
  const setConfig = (patch: Partial<CollectionFieldConfig>) => onChange({ ...field, config: { ...config, ...patch } });
  const numberOrUndefined = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input
          value={field.name}
          onChange={(e) => onChange({ ...field, name: e.target.value })}
          placeholder="Field name"
          className="h-8 text-[13px]"
          maxLength={100}
        />
        <OptionSelect
          value={field.type}
          disabled={lockType}
          onChange={(v) => {
            const type = v as CollectionFieldType;
            onChange({ ...field, type, config: defaultConfigFor(type) });
          }}
          options={FIELD_TYPES.map((t) => ({ value: t, label: FIELD_TYPE_META[t].label }))}
          className="h-8 w-36"
        />
      </div>

      <Input
        value={field.description ?? ""}
        onChange={(e) => onChange({ ...field, description: e.target.value || undefined })}
        placeholder="Description (optional)"
        className="h-8 text-[13px]"
        maxLength={500}
      />

      {field.type === "select" || field.type === "multi_select" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted-foreground">Options</span>
          {(config.options ?? []).map((opt, index) => (
            <div key={opt.value} className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {OPTION_COLOR_NAMES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => {
                      const options = [...(config.options ?? [])];
                      options[index] = { ...opt, color };
                      setConfig({ options });
                    }}
                    className={cn(
                      "size-3.5 rounded-full ring-offset-1 ring-offset-background transition-transform hover:scale-110",
                      optionColorClass(color),
                      (opt.color ?? "gray") === color && "ring-2 ring-foreground/40"
                    )}
                  />
                ))}
              </div>
              <Input
                value={opt.label}
                onChange={(e) => {
                  const options = [...(config.options ?? [])];
                  options[index] = { ...opt, label: e.target.value };
                  setConfig({ options });
                }}
                className="h-7 flex-1 text-[13px]"
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => setConfig({ options: (config.options ?? []).filter((_, i) => i !== index) })}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove option"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-[12px]"
            onClick={() => {
              const options = config.options ?? [];
              const label = `Option ${options.length + 1}`;
              setConfig({
                options: [
                  ...options,
                  { value: optionValue(label, options.map((o) => o.value)), label, color: OPTION_COLOR_NAMES[(options.length + 1) % OPTION_COLOR_NAMES.length] },
                ],
              });
            }}
          >
            <Plus className="size-3.5" />
            Add option
          </Button>
        </div>
      ) : null}

      {field.type === "currency" ? (
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          Currency
          <Input
            value={config.currencyCode ?? ""}
            onChange={(e) => setConfig({ currencyCode: e.target.value.toUpperCase().slice(0, 3) || undefined })}
            placeholder="USD"
            className="h-7 w-20 text-[13px] uppercase"
          />
        </label>
      ) : null}

      {field.type === "number" || field.type === "currency" ? (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          <span>Min</span>
          <Input type="number" value={config.min ?? ""} onChange={(e) => setConfig({ min: numberOrUndefined(e.target.value) })} className="h-7 w-24 text-[13px]" />
          <span>Max</span>
          <Input type="number" value={config.max ?? ""} onChange={(e) => setConfig({ max: numberOrUndefined(e.target.value) })} className="h-7 w-24 text-[13px]" />
          {field.type === "number" ? (
            <>
              <span>Decimals</span>
              <Input
                type="number"
                min={0}
                max={6}
                value={config.decimals ?? ""}
                onChange={(e) => setConfig({ decimals: numberOrUndefined(e.target.value) })}
                className="h-7 w-16 text-[13px]"
              />
            </>
          ) : null}
        </div>
      ) : null}

      {field.type === "rating" ? (
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          Max stars
          <OptionSelect
            value={String(config.ratingMax ?? 5)}
            onChange={(v) => setConfig({ ratingMax: Number(v) })}
            options={[3, 4, 5, 7, 10].map((n) => ({ value: String(n), label: String(n) }))}
            className="h-7 w-20"
          />
        </label>
      ) : null}

      {field.type === "relation" ? (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          Links to
          <OptionSelect
            value={config.targetType ?? ""}
            disabled={lockRelationTarget}
            onChange={(v) => setConfig({ targetType: v as CollectionFieldConfig["targetType"], targetCollectionId: undefined })}
            options={RELATION_TARGETS.filter((t) => t.value !== "collection_record" || collections.length > 0)}
            className="h-7 w-48"
          />
          {config.targetType === "collection_record" ? (
            <OptionSelect
              value={config.targetCollectionId ?? ""}
              disabled={lockRelationTarget}
              onChange={(v) => setConfig({ targetCollectionId: v || undefined })}
              options={collections.map((c) => ({ value: c.id, label: c.title }))}
              placeholder="Pick a collection"
              className="h-7 w-44"
            />
          ) : null}
          <label className="flex items-center gap-1.5">
            <Checkbox checked={Boolean(config.multiple)} onCheckedChange={(checked) => setConfig({ multiple: Boolean(checked) })} />
            Allow multiple
          </label>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Checkbox checked={field.required} onCheckedChange={(checked) => onChange({ ...field, required: Boolean(checked) })} />
        Required
      </label>
    </div>
  );
}
