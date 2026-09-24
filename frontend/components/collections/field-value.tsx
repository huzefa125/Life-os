"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Plus, Star, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { formatValue, optionColorClass } from "@/lib/collection-meta";
import { OBJECT_TYPE_META } from "@/lib/type-meta";
import type { CollectionField, CollectionRelatedObject, JsonValue } from "@/lib/types";
import { cn } from "@/lib/utils";

type Related = Record<string, CollectionRelatedObject>;

/** Base UI's Select shows the raw value unless given `items`; this keeps labels visible in the trigger. */
export function OptionSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  size = "sm",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  size?: "sm" | "default";
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || null}
      onValueChange={(next) => onChange((next as string | null) ?? "")}
      items={options}
      disabled={disabled}
    >
      <SelectTrigger size={size} className={cn("text-[13px]", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function OptionChip({ label, color, className }: { label: string; color?: string; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium", optionColorClass(color), className)}>
      {label}
    </span>
  );
}

function RelatedChip({ obj, onRemove }: { obj: CollectionRelatedObject | undefined; onRemove?: () => void }) {
  const meta = obj ? OBJECT_TYPE_META[obj.type] : undefined;
  const Icon = meta?.icon;
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[12px]">
      {Icon ? <Icon className={cn("size-3 shrink-0", meta?.color)} /> : null}
      <span className="truncate">{obj?.title ?? "Unavailable"}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Remove link"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function RatingStars({ value, max = 5, onChange, size = 14 }: { value: number; max?: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        const star = (
          <Star
            style={{ width: size, height: size }}
            className={cn("transition-transform", filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40", onChange && "hover:scale-110")}
          />
        );
        return onChange ? (
          <button key={i} type="button" onClick={() => onChange(value === i + 1 ? 0 : i + 1)} aria-label={`${i + 1} stars`}>
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </span>
  );
}

/** Read-only rendering of one value (table cells, cards). */
export function FieldValueDisplay({ field, value, related = {} }: { field: CollectionField; value: JsonValue | undefined; related?: Related }) {
  if (field.type === "checkbox") {
    return value ? (
      <span className="inline-flex size-4 items-center justify-center rounded-[4px] bg-primary text-primary-foreground">
        <Check className="size-3" />
      </span>
    ) : (
      <span className="inline-flex size-4 rounded-[4px] border border-input" />
    );
  }
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  switch (field.type) {
    case "select": {
      const opt = field.config?.options?.find((o) => o.value === value);
      return <OptionChip label={opt?.label ?? String(value)} color={opt?.color} />;
    }
    case "multi_select":
      return (
        <span className="flex flex-wrap gap-1">
          {(value as string[]).map((v) => {
            const opt = field.config?.options?.find((o) => o.value === v);
            return <OptionChip key={v} label={opt?.label ?? v} color={opt?.color} />;
          })}
        </span>
      );
    case "relation":
      return (
        <span className="flex flex-wrap gap-1">
          {(value as string[]).map((id) => (
            <RelatedChip key={id} obj={related[id]} />
          ))}
        </span>
      );
    case "rating":
      return <RatingStars value={Number(value)} max={field.config?.ratingMax ?? 5} size={12} />;
    case "url":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex max-w-full items-center gap-1 truncate text-blue-600 hover:underline dark:text-blue-400"
        >
          <span className="truncate">{String(value).replace(/^https?:\/\//, "")}</span>
          <ExternalLink className="size-3 shrink-0" />
        </a>
      );
    case "email":
      return (
        <a href={`mailto:${value}`} onClick={(e) => e.stopPropagation()} className="truncate text-blue-600 hover:underline dark:text-blue-400">
          {String(value)}
        </a>
      );
    case "long_text":
      return <span className="line-clamp-2 whitespace-pre-wrap">{String(value)}</span>;
    case "number":
    case "currency":
      return <span className="tabular-nums">{formatValue(field, value, related)}</span>;
    default:
      return <span className="truncate">{formatValue(field, value, related)}</span>;
  }
}

function RelationPicker({
  field,
  value,
  related,
  onChange,
  onResolve,
}: {
  field: CollectionField;
  value: string[];
  related: Related;
  onChange: (ids: string[]) => void;
  onResolve: (objs: CollectionRelatedObject[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; items: CollectionRelatedObject[] } | null>(null);
  const targetType = field.config?.targetType;
  const multiple = Boolean(field.config?.multiple);
  const trimmed = query.trim();
  const searching = open && results?.q !== trimmed;

  useEffect(() => {
    if (!open || !targetType) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      const request: Promise<CollectionRelatedObject[]> =
        targetType === "collection_record" && field.config?.targetCollectionId
          ? api.collections.records
              .list(field.config.targetCollectionId, { search: trimmed || undefined, pageSize: 20 })
              .then((page) =>
                page.records.map((r) => ({ id: r.id, title: r.title, type: "collection_record", collectionId: field.config?.targetCollectionId ?? null }))
              )
          : trimmed
            ? api.search
                .query(trimmed, targetType)
                .then((objs) => objs.slice(0, 20).map((o) => ({ id: o.id, title: o.title, type: o.type, collectionId: o.collectionId ?? null })))
            : Promise.resolve([]);
      request
        .then((items) => {
          if (!cancelled) setResults({ q: trimmed, items });
        })
        .catch(() => {
          if (!cancelled) setResults({ q: trimmed, items: [] });
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [open, trimmed, targetType, field.config?.targetCollectionId]);

  function toggle(obj: CollectionRelatedObject) {
    onResolve([obj]);
    if (value.includes(obj.id)) {
      onChange(value.filter((id) => id !== obj.id));
    } else {
      onChange(multiple ? [...value, obj.id] : [obj.id]);
      if (!multiple) setOpen(false);
    }
  }

  const items = results?.items ?? [];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {value.map((id) => (
        <RelatedChip key={id} obj={related[id]} onRemove={() => onChange(value.filter((x) => x !== id))} />
      ))}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-input px-1.5 text-[12px] text-muted-foreground hover:border-foreground/40 hover:text-foreground">
          <Plus className="size-3" />
          {value.length && !multiple ? "Change" : "Link"}
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-72 p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search…" value={query} onValueChange={setQuery} />
            <CommandList className="max-h-60">
              {searching ? (
                <div className="flex justify-center py-4">
                  <Spinner size={16} />
                </div>
              ) : items.length === 0 ? (
                <CommandEmpty>{trimmed || targetType === "collection_record" ? "Nothing found" : "Type to search"}</CommandEmpty>
              ) : (
                items.map((obj) => {
                  const meta = OBJECT_TYPE_META[obj.type];
                  const Icon = meta?.icon;
                  return (
                    <CommandItem key={obj.id} value={obj.id} onSelect={() => toggle(obj)}>
                      {Icon ? <Icon className={meta?.color} /> : null}
                      <span className="flex-1 truncate">{obj.title}</span>
                      {value.includes(obj.id) ? <Check className="size-3.5" /> : null}
                    </CommandItem>
                  );
                })
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Editable input for one value, per field type. */
export function FieldValueInput({
  field,
  value,
  onChange,
  related,
  onResolveRelated,
}: {
  field: CollectionField;
  value: JsonValue | undefined;
  onChange: (value: JsonValue) => void;
  related: Related;
  onResolveRelated: (objs: CollectionRelatedObject[]) => void;
}) {
  const str = value === null || value === undefined ? "" : String(value);
  const inputClass = "h-8 text-[13px]";

  switch (field.type) {
    case "long_text":
      return <Textarea value={str} onChange={(e) => onChange(e.target.value)} rows={3} className="text-[13px]" />;
    case "number":
    case "currency":
      return (
        <Input
          type="number"
          inputMode="decimal"
          value={str}
          step={field.type === "currency" ? "0.01" : "any"}
          min={field.config?.min}
          max={field.config?.max}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={inputClass}
          placeholder={field.type === "currency" ? (field.config?.currencyCode ?? "USD") : undefined}
        />
      );
    case "email":
      return <Input type="email" value={str} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="name@example.com" />;
    case "phone":
      return <Input type="tel" value={str} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="+1 555 000 0000" />;
    case "url":
      return <Input type="url" value={str} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="https://" />;
    case "date":
      return <DatePicker value={str || undefined} onChange={(v) => onChange(v ?? null)} />;
    case "datetime":
      return <DateTimePicker value={str || undefined} onChange={(v) => onChange(v ?? null)} />;
    case "checkbox":
      return (
        <label className="flex h-8 items-center gap-2 text-[13px]">
          <Checkbox checked={Boolean(value)} onCheckedChange={(checked) => onChange(Boolean(checked))} />
          {value ? "Yes" : "No"}
        </label>
      );
    case "rating":
      return (
        <div className="flex h-8 items-center">
          <RatingStars value={Number(value ?? 0)} max={field.config?.ratingMax ?? 5} onChange={(v) => onChange(v || null)} size={18} />
        </div>
      );
    case "select":
      return (
        <div className="flex items-center gap-1.5">
          <OptionSelect
            value={str}
            onChange={(v) => onChange(v || null)}
            options={(field.config?.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
            className="h-8 w-full"
          />
          {str ? (
            <button type="button" onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      );
    case "multi_select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.config?.options ?? []).map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(active ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 transition-all",
                  active ? cn(optionColorClass(o.color), "ring-transparent") : "text-muted-foreground ring-border hover:ring-foreground/30"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    case "relation":
      return (
        <RelationPicker
          field={field}
          value={Array.isArray(value) ? (value as string[]) : []}
          related={related}
          onChange={(ids) => onChange(ids)}
          onResolve={onResolveRelated}
        />
      );
    default:
      return <Input value={str} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
  }
}
