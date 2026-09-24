"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FIELD_TYPE_META, isSortable, optionColorClass } from "@/lib/collection-meta";
import type { CollectionField, CollectionRecord, CollectionRelatedObject, CollectionSort, JsonValue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FieldValueDisplay } from "./field-value";

type Related = Record<string, CollectionRelatedObject>;

// ---------------- Table ----------------

export function RecordsTable({
  fields,
  records,
  related,
  selected,
  onSelectedChange,
  onOpen,
  sorts,
  onSort,
}: {
  fields: CollectionField[];
  records: CollectionRecord[];
  related: Related;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  onOpen: (record: CollectionRecord) => void;
  sorts: CollectionSort[];
  onSort: (sorts: CollectionSort[]) => void;
}) {
  const allSelected = records.length > 0 && records.every((r) => selected.has(r.id));
  const someSelected = records.some((r) => selected.has(r.id));

  function cycleSort(field: CollectionField) {
    const current = sorts[0]?.fieldId === field.id ? sorts[0].direction : null;
    if (current === null) onSort([{ fieldId: field.id, direction: "asc" }]);
    else if (current === "asc") onSort([{ fieldId: field.id, direction: "desc" }]);
    else onSort([]);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-9 pr-0">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onCheckedChange={(checked) => {
                  const next = new Set(selected);
                  for (const r of records) {
                    if (checked) next.add(r.id);
                    else next.delete(r.id);
                  }
                  onSelectedChange(next);
                }}
                aria-label="Select all on this page"
              />
            </TableHead>
            {fields.map((field) => {
              const Icon = FIELD_TYPE_META[field.type].icon;
              const sortDir = sorts[0]?.fieldId === field.id ? sorts[0].direction : null;
              const sortable = isSortable(field);
              return (
                <TableHead key={field.id} className="min-w-36 text-[12px] font-medium">
                  <button
                    type="button"
                    disabled={!sortable}
                    onClick={() => cycleSort(field)}
                    className={cn("flex items-center gap-1.5 text-muted-foreground", sortable && "hover:text-foreground")}
                    title={sortable ? "Sort" : undefined}
                  >
                    <Icon className="size-3.5" />
                    <span className="truncate">{field.name}</span>
                    {sortDir === "asc" ? <ArrowUp className="size-3" /> : sortDir === "desc" ? <ArrowDown className="size-3" /> : null}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <motion.tr
              key={record.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(index * 0.012, 0.2) }}
              data-state={selected.has(record.id) ? "selected" : undefined}
              className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40 data-[state=selected]:bg-teal-50/60 dark:data-[state=selected]:bg-teal-500/10"
              onClick={() => onOpen(record)}
            >
              <TableCell className="w-9 pr-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected.has(record.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(selected);
                    if (checked) next.add(record.id);
                    else next.delete(record.id);
                    onSelectedChange(next);
                  }}
                  aria-label="Select record"
                />
              </TableCell>
              {fields.map((field, i) => (
                <TableCell key={field.id} className={cn("max-w-72 py-2 text-[13px]", i === 0 && "font-medium")}>
                  <div className="truncate">
                    <FieldValueDisplay field={field} value={record.values[field.id]} related={related} />
                  </div>
                </TableCell>
              ))}
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------- Board ----------------

function RecordCard({
  record,
  fields,
  related,
  onOpen,
  draggable,
}: {
  record: CollectionRecord;
  fields: CollectionField[];
  related: Related;
  onOpen: () => void;
  draggable?: boolean;
}) {
  const shown = fields.filter((f) => {
    const v = record.values[f.id];
    return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0) && v !== false;
  });
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/record-id", record.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="flex cursor-pointer flex-col gap-1.5 rounded-lg border border-border/70 bg-card p-2.5 text-left shadow-xs transition-all hover:-translate-y-px hover:border-border hover:shadow-sm active:cursor-grabbing"
    >
      <p className="truncate text-[13px] font-medium">{record.title}</p>
      {shown.slice(0, 4).map((field) => (
        <div key={field.id} className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="shrink-0 text-muted-foreground/70">{field.name}</span>
          <div className="min-w-0 truncate text-foreground/90">
            <FieldValueDisplay field={field} value={record.values[field.id]} related={related} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecordsBoard({
  groupField,
  fields,
  records,
  related,
  total,
  onOpen,
  onMove,
  onCreate,
}: {
  groupField: CollectionField;
  fields: CollectionField[];
  records: CollectionRecord[];
  related: Related;
  total: number;
  onOpen: (record: CollectionRecord) => void;
  onMove: (recordId: string, value: string | null) => void;
  onCreate: (value: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const columns: { value: string | null; label: string; color?: string }[] = [
    { value: null, label: `No ${groupField.name}` },
    ...(groupField.config?.options ?? []).map((o) => ({ value: o.value, label: o.label, color: o.color })),
  ];
  const cardFields = fields.filter((f) => f.id !== groupField.id);
  const firstTextId = fields.find((f) => f.type === "text")?.id;

  return (
    <div className="flex flex-col gap-2">
      {total > records.length ? (
        <p className="text-[12px] text-muted-foreground">
          Showing the first {records.length} of {total} records — add a filter to narrow the board.
        </p>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((column) => {
          const key = column.value ?? "__none__";
          const items = records.filter((r) => (r.values[groupField.id] ?? null) === column.value);
          if (column.value === null && items.length === 0) return null;
          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(key);
              }}
              onDragLeave={() => setDragOver((k) => (k === key ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/record-id");
                const record = records.find((r) => r.id === id);
                if (record && (record.values[groupField.id] ?? null) !== column.value) onMove(id, column.value);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/40 p-2 transition-colors",
                dragOver === key && "bg-teal-50 ring-2 ring-teal-400/50 dark:bg-teal-500/10"
              )}
            >
              <div className="flex items-center gap-2 px-1">
                <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-medium", optionColorClass(column.color))}>{column.label}</span>
                <span className="text-[12px] text-muted-foreground tabular-nums">{items.length}</span>
                <button
                  type="button"
                  onClick={() => onCreate(column.value)}
                  className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`New record in ${column.label}`}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <div className="flex min-h-12 flex-col gap-2">
                {items.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    fields={cardFields.filter((f) => f.id !== firstTextId)}
                    related={related}
                    onOpen={() => onOpen(record)}
                    draggable
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Gallery ----------------

export function RecordsGallery({
  fields,
  records,
  related,
  onOpen,
}: {
  fields: CollectionField[];
  records: CollectionRecord[];
  related: Related;
  onOpen: (record: CollectionRecord) => void;
}) {
  const firstTextId = fields.find((f) => f.type === "text")?.id;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((record, index) => (
        <motion.div
          key={record.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.02, 0.3) }}
        >
          <RecordCard record={record} fields={fields.filter((f) => f.id !== firstTextId)} related={related} onOpen={() => onOpen(record)} />
        </motion.div>
      ))}
    </div>
  );
}

// ---------------- Calendar ----------------

/** The visible grid for a month (whole weeks), used both to render and to query records in range. */
export function calendarRange(month: Date) {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  return { start, end };
}

function recordDay(value: JsonValue | undefined, type: CollectionField["type"]): Date | null {
  if (typeof value !== "string" || !value) return null;
  const d = type === "date" ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function RecordsCalendar({
  month,
  onMonthChange,
  dateField,
  records,
  total,
  onOpen,
  onCreate,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
  dateField: CollectionField;
  records: CollectionRecord[];
  total: number;
  onOpen: (record: CollectionRecord) => void;
  onCreate: (day: Date) => void;
}) {
  const { start, end } = calendarRange(month);
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const today = new Date();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-[14px] font-semibold">{format(month, "MMMM yyyy")}</h2>
        <span className="text-[12px] text-muted-foreground">by {dateField.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onMonthChange(addDays(startOfMonth(month), -1))} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMonthChange(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onMonthChange(addDays(endOfMonth(month), 1))} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      {total > records.length ? (
        <p className="text-[12px] text-muted-foreground">Showing {records.length} of {total} records this month.</p>
      ) : null}
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border/70">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="border-b border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const items = records.filter((r) => {
            const d = recordDay(r.values[dateField.id], dateField.type);
            return d && isSameDay(d, day);
          });
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "group min-h-24 border-r border-b border-border/60 p-1 [&:nth-child(7n)]:border-r-0",
                !isSameMonth(day, month) && "bg-muted/20 text-muted-foreground"
              )}
            >
              <div className="mb-1 flex items-center">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[11px]",
                    isSameDay(day, today) && "bg-teal-600 font-semibold text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
                <button
                  type="button"
                  onClick={() => onCreate(day)}
                  className="ml-auto rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                  aria-label="New record on this day"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 4).map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => onOpen(record)}
                    className="truncate rounded bg-teal-100/70 px-1.5 py-0.5 text-left text-[11px] text-teal-900 hover:bg-teal-100 dark:bg-teal-500/15 dark:text-teal-200"
                  >
                    {record.title}
                  </button>
                ))}
                {items.length > 4 ? <span className="px-1 text-[11px] text-muted-foreground">+{items.length - 4} more</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
