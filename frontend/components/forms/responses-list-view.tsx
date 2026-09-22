"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Inbox, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api-client";
import type { Form, FormField, FormResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ResponseDetailSheet } from "./response-detail-sheet";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function readSeenIds(formId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`lifeos-form-${formId}-seen`);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeenIds(formId: string, ids: Set<string>) {
  try {
    localStorage.setItem(`lifeos-form-${formId}-seen`, JSON.stringify([...ids]));
  } catch {
    // best-effort only
  }
}

function ratingField(fields: FormField[]): FormField | undefined {
  return fields.find((f) => f.type === "rating");
}

export function ResponsesListView({ form }: { form: Form }) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.forms.responses
      .list(form.id)
      .then((data) => {
        if (!cancelled) setResponses(data);
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load responses"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // Reading localStorage requires the client; can't be a lazy useState
    // initializer without mismatching the SSR'd markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(readSeenIds(form.id));
    return () => {
      cancelled = true;
    };
  }, [form.id]);

  const fields = form.properties?.fields ?? [];
  const rating = ratingField(fields);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let week = 0;
    let month = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    for (const r of responses) {
      const at = new Date(r.properties?.submittedAt ?? r.createdAt);
      if (at >= startOfToday) today++;
      if (at >= startOfWeek) week++;
      if (at >= startOfMonth) month++;
      if (rating) {
        const value = r.properties?.answers[rating.id];
        if (typeof value === "number") {
          ratingSum += value;
          ratingCount++;
        }
      }
    }

    return { today, week, month, avgRating: ratingCount > 0 ? ratingSum / ratingCount : null };
  }, [responses, rating]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter((r) => {
      const answers = r.properties?.answers ?? {};
      return Object.values(answers).some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [responses, filter]);

  function markSeen(id: string) {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      writeSeenIds(form.id, next);
      return next;
    });
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map((id) => api.forms.responses.remove(form.id, id)));
      setResponses((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
      toast.success("Responses deleted");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete some responses");
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await api.forms.responses.exportCsv(form.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-responses.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't export CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <Link href="/forms" className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }))}>
          <ArrowLeft className="size-3.5" />
        </Link>
        <div className="flex size-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <Inbox className="size-3" />
        </div>
        <h1 className="truncate text-[15px] font-semibold">{form.title} — Responses</h1>
        {!loading ? <AnimatedNumber value={responses.length} className="text-[13px] text-muted-foreground" /> : null}
        <Button size="sm" variant="outline" className="ml-auto gap-1.5" disabled={exporting || responses.length === 0} onClick={handleExport}>
          <Download className="size-3.5" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      {!loading && responses.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-b bg-canvas px-6 py-3">
          <StatTile label="Today" value={stats.today} />
          <StatTile label="This week" value={stats.week} />
          <StatTile label="This month" value={stats.month} />
          {stats.avgRating !== null ? (
            <div className="flex flex-col gap-0.5 rounded-md border bg-background px-3 py-1.5">
              <span className="text-[11px] text-muted-foreground">Avg rating</span>
              <span className="flex items-center gap-1 text-sm font-semibold">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                {stats.avgRating.toFixed(1)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-b bg-canvas px-6 py-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search responses"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 w-56 border-none bg-transparent pl-7 text-[13px] shadow-none focus-visible:ring-0"
          />
        </div>
        {selected.size > 0 ? (
          <Button size="xs" variant="outline" className="ml-auto gap-1.5 text-destructive hover:bg-destructive/10" disabled={bulkDeleting} onClick={handleBulkDelete}>
            <Trash2 className="size-3.5" />
            Delete {selected.size}
          </Button>
        ) : null}
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : responses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No responses yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No responses match &quot;{filter}&quot;.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 pl-0" />
                <TableHead className="text-[13px]">Submitted</TableHead>
                {fields.slice(0, 3).map((field) => (
                  <TableHead key={field.id} className="text-[13px]">
                    {field.label}
                  </TableHead>
                ))}
                <TableHead className="text-[13px]">Status</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((response) => (
                <TableRow
                  key={response.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => {
                    setSelectedId(response.id);
                    setDetailOpen(true);
                    markSeen(response.id);
                  }}
                >
                  <TableCell className="w-8 py-2 pl-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(response.id)} onCheckedChange={(c) => toggleSelected(response.id, c === true)} />
                  </TableCell>
                  <TableCell className={cn("py-2 text-[13px] font-medium", !seen.has(response.id) && "font-semibold")}>
                    {formatDate(response.properties?.submittedAt ?? response.createdAt)}
                  </TableCell>
                  {fields.slice(0, 3).map((field) => {
                    const value = response.properties?.answers[field.id];
                    return (
                      <TableCell key={field.id} className="max-w-40 truncate text-[13px] text-muted-foreground">
                        {value === undefined || value === null || value === "" ? "—" : Array.isArray(value) ? value.join(", ") : String(value)}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        seen.has(response.id) ? "bg-muted text-muted-foreground" : "bg-indigo-100 text-indigo-700"
                      )}
                    >
                      {seen.has(response.id) ? "Read" : "New"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-0 text-right text-[13px] text-muted-foreground">
                    {response.properties?.createdObjects.length ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ResponseDetailSheet
        form={form}
        responseId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={(id) => setResponses((prev) => prev.filter((r) => r.id !== id))}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border bg-background px-3 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <AnimatedNumber value={value} className="text-sm font-semibold" />
    </div>
  );
}
