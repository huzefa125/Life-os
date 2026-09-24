"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, EyeOff, ListFilter, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FIELD_TYPE_META,
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  isSortable,
} from "@/lib/collection-meta";
import type { CollectionField, CollectionFilter, CollectionFilterOperator, CollectionSort, CollectionView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OptionSelect } from "./field-value";

const BUILTIN_SORTS = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Last edited" },
  { value: "title", label: "Title" },
];

/** Relation filters need an object id, which there's no good way to type here — offer emptiness checks only. */
function operatorsFor(field: CollectionField): CollectionFilterOperator[] {
  if (field.type === "relation") return ["is_empty", "is_not_empty"];
  return OPERATORS_BY_TYPE[field.type];
}

function isComplete(filter: CollectionFilter) {
  if (VALUELESS_OPERATORS.has(filter.operator)) return true;
  if (Array.isArray(filter.value)) return filter.value.length > 0;
  return filter.value !== undefined && filter.value !== "";
}

/** Lets the caller count what's actually applied (incomplete rows are dropped on apply). */
export function activeFilterCount(filters: CollectionFilter[]) {
  return filters.filter(isComplete).length;
}

function FilterValueInput({ field, filter, onChange }: { field: CollectionField; filter: CollectionFilter; onChange: (value: CollectionFilter["value"]) => void }) {
  if (VALUELESS_OPERATORS.has(filter.operator)) return null;
  if (field.type === "select" || field.type === "multi_select") {
    return (
      <OptionSelect
        value={typeof filter.value === "string" ? filter.value : ""}
        onChange={onChange}
        options={(field.config?.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
        className="h-7 w-36"
      />
    );
  }
  if (field.type === "date" || field.type === "datetime") {
    return (
      <DatePicker
        value={typeof filter.value === "string" ? filter.value.slice(0, 10) : undefined}
        onChange={(v) => onChange(v ?? "")}
        className="h-7 w-40"
      />
    );
  }
  if (field.type === "number" || field.type === "currency" || field.type === "rating") {
    return (
      <Input
        type="number"
        value={typeof filter.value === "number" ? filter.value : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="h-7 w-28 text-[13px]"
      />
    );
  }
  return (
    <Input
      value={typeof filter.value === "string" ? filter.value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      className="h-7 w-36 text-[13px]"
      maxLength={500}
    />
  );
}

const TRIGGER_CLASS =
  "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[active=true]:bg-teal-50 data-[active=true]:text-teal-700 dark:data-[active=true]:bg-teal-500/10 dark:data-[active=true]:text-teal-300";

export function FilterPopover({
  fields,
  filters,
  onApply,
}: {
  fields: CollectionField[];
  filters: CollectionFilter[];
  onApply: (filters: CollectionFilter[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CollectionFilter[]>(filters);
  const count = activeFilterCount(filters);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(filters);
    } else {
      const complete = draft.filter(isComplete);
      if (JSON.stringify(complete) !== JSON.stringify(filters)) onApply(complete);
    }
    setOpen(next);
  }

  function addFilter() {
    const field = fields[0];
    if (!field) return;
    setDraft((prev) => [...prev, { fieldId: field.id, operator: operatorsFor(field)[0] }]);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className={TRIGGER_CLASS} data-active={count > 0}>
        <ListFilter className="size-3.5" />
        Filter{count > 0 ? ` · ${count}` : ""}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-80 max-w-[calc(100vw-2rem)] p-3">
        <div className="flex flex-col gap-2">
          {draft.length === 0 ? <p className="text-[13px] text-muted-foreground">No filters. Records in this view match everything.</p> : null}
          {draft.map((filter, index) => {
            const field = fields.find((f) => f.id === filter.fieldId);
            if (!field) return null;
            return (
              <div key={index} className="flex flex-wrap items-center gap-1.5">
                <span className="w-10 text-[12px] text-muted-foreground">{index === 0 ? "Where" : "and"}</span>
                <OptionSelect
                  value={filter.fieldId}
                  onChange={(fieldId) => {
                    const next = fields.find((f) => f.id === fieldId);
                    if (!next) return;
                    setDraft((prev) => prev.map((f, i) => (i === index ? { fieldId, operator: operatorsFor(next)[0] } : f)));
                  }}
                  options={fields.map((f) => ({ value: f.id, label: f.name }))}
                  className="h-7 w-36"
                />
                <OptionSelect
                  value={filter.operator}
                  onChange={(op) =>
                    setDraft((prev) =>
                      prev.map((f, i) => (i === index ? { ...f, operator: op as CollectionFilterOperator, ...(VALUELESS_OPERATORS.has(op as CollectionFilterOperator) ? { value: undefined } : {}) } : f))
                    )
                  }
                  options={operatorsFor(field).map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))}
                  className="h-7 w-32"
                />
                <FilterValueInput
                  field={field}
                  filter={filter}
                  onChange={(value) => setDraft((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)))}
                />
                <button
                  type="button"
                  onClick={() => setDraft((prev) => prev.filter((_, i) => i !== index))}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label="Remove filter"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={addFilter} disabled={draft.length >= 20 || fields.length === 0}>
              <Plus className="size-3.5" />
              Add filter
            </Button>
            <Button size="sm" className="ml-auto" onClick={() => handleOpenChange(false)}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SortPopover({
  fields,
  sorts,
  onApply,
}: {
  fields: CollectionField[];
  sorts: CollectionSort[];
  onApply: (sorts: CollectionSort[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CollectionSort[]>(sorts);
  const options = [...fields.filter(isSortable).map((f) => ({ value: f.id, label: f.name })), ...BUILTIN_SORTS];

  function handleOpenChange(next: boolean) {
    if (next) setDraft(sorts);
    else if (JSON.stringify(draft) !== JSON.stringify(sorts)) onApply(draft);
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className={TRIGGER_CLASS} data-active={sorts.length > 0}>
        <ArrowUpDown className="size-3.5" />
        Sort{sorts.length > 0 ? ` · ${sorts.length}` : ""}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-72 p-3">
        <div className="flex flex-col gap-2">
          {draft.length === 0 ? <p className="text-[13px] text-muted-foreground">Newest records first.</p> : null}
          {draft.map((sort, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <OptionSelect
                value={sort.fieldId}
                onChange={(fieldId) => setDraft((prev) => prev.map((s, i) => (i === index ? { ...s, fieldId } : s)))}
                options={options}
                className="h-7 w-40"
              />
              <OptionSelect
                value={sort.direction}
                onChange={(direction) => setDraft((prev) => prev.map((s, i) => (i === index ? { ...s, direction: direction as "asc" | "desc" } : s)))}
                options={[
                  { value: "asc", label: "Ascending" },
                  { value: "desc", label: "Descending" },
                ]}
                className="h-7 w-32"
              />
              <button
                type="button"
                onClick={() => setDraft((prev) => prev.filter((_, i) => i !== index))}
                className="ml-auto text-muted-foreground hover:text-foreground"
                aria-label="Remove sort"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={draft.length >= 3}
              onClick={() => setDraft((prev) => [...prev, { fieldId: options[0]?.value ?? "createdAt", direction: "asc" }])}
            >
              <Plus className="size-3.5" />
              Add sort
            </Button>
            <Button size="sm" className="ml-auto" onClick={() => handleOpenChange(false)}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Ordered fields for a view: its saved order first, then any fields added since. */
export function orderedFields(fields: CollectionField[], view: CollectionView) {
  const order = view.fieldOrder ?? [];
  const byId = new Map(fields.map((f) => [f.id, f]));
  const ordered = order.map((id) => byId.get(id)).filter((f): f is CollectionField => Boolean(f));
  return [...ordered, ...fields.filter((f) => !order.includes(f.id))];
}

export function visibleFields(fields: CollectionField[], view: CollectionView) {
  const visible = view.visibleFieldIds ? new Set(view.visibleFieldIds) : null;
  return orderedFields(fields, view).filter((f) => !visible || visible.has(f.id));
}

export function FieldsPopover({
  fields,
  view,
  onApply,
}: {
  fields: CollectionField[];
  view: CollectionView;
  onApply: (patch: { visibleFieldIds: string[]; fieldOrder: string[] }) => void;
}) {
  const ordered = orderedFields(fields, view);
  const visible = new Set(view.visibleFieldIds ?? fields.map((f) => f.id));
  const hiddenCount = fields.filter((f) => !visible.has(f.id)).length;

  function apply(order: CollectionField[], nextVisible: Set<string>) {
    onApply({ fieldOrder: order.map((f) => f.id), visibleFieldIds: order.filter((f) => nextVisible.has(f.id)).map((f) => f.id) });
  }

  function move(index: number, delta: number) {
    const next = [...ordered];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    apply(next, visible);
  }

  return (
    <Popover>
      <PopoverTrigger className={TRIGGER_CLASS} data-active={hiddenCount > 0}>
        <EyeOff className="size-3.5" />
        {hiddenCount > 0 ? `${hiddenCount} hidden` : "Fields"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <div className="flex flex-col">
          {ordered.map((field, index) => {
            const Icon = FIELD_TYPE_META[field.type].icon;
            const isVisible = visible.has(field.id);
            return (
              <div key={field.id} className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted/60">
                <Icon className="size-3.5 text-muted-foreground" />
                <span className={cn("flex-1 truncate text-[13px]", !isVisible && "text-muted-foreground")}>{field.name}</span>
                <button type="button" className="opacity-0 group-hover:opacity-100 disabled:opacity-0" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                  <ArrowUp className="size-3 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 disabled:opacity-0"
                  disabled={index === ordered.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-3 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(visible);
                    if (isVisible) next.delete(field.id);
                    else next.add(field.id);
                    apply(ordered, next);
                  }}
                  aria-label={isVisible ? "Hide field" : "Show field"}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
