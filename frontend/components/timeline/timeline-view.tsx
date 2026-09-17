"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  History,
  Paperclip,
  Receipt,
  Search,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api-client";
import type { GenericObject } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_META = {
  person: { label: "Person", icon: User, color: "bg-violet-100 text-violet-600" },
  task: { label: "Task", icon: CheckSquare, color: "bg-emerald-100 text-emerald-600" },
  project: { label: "Project", icon: FolderKanban, color: "bg-blue-100 text-blue-600" },
  note: { label: "Note", icon: FileText, color: "bg-amber-100 text-amber-600" },
  event: { label: "Event", icon: CalendarDays, color: "bg-rose-100 text-rose-600" },
  file: { label: "File", icon: Paperclip, color: "bg-cyan-100 text-cyan-600" },
  expense: { label: "Expense", icon: Receipt, color: "bg-lime-100 text-lime-700" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function metaFor(type: string) {
  return TYPE_META[type as keyof typeof TYPE_META] ?? { label: type, icon: History, color: "bg-slate-100 text-slate-600" };
}

function summarize(item: GenericObject) {
  const properties = item.properties ?? {};
  if (item.type === "task" && typeof properties.status === "string") return properties.status.replaceAll("_", " ");
  if (item.type === "expense" && typeof properties.amount === "number") return `${properties.currency ?? ""} ${properties.amount}`;
  if (item.type === "event" && typeof properties.startAt === "string") return formatDateTime(properties.startAt);
  if (item.type === "file" && typeof properties.mimeType === "string") return properties.mimeType;
  if (item.type === "note" && typeof properties.content === "string") return properties.content;
  return "Created";
}

export function TimelineView() {
  const [items, setItems] = useState<GenericObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.timeline
      .list()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load timeline"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        summarize(item).toLowerCase().includes(q)
    );
  }, [filter, items]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <History className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Timeline</h1>
        {!loading ? <span className="text-[13px] text-muted-foreground">{items.length}</span> : null}
      </div>

      <div className="flex items-center gap-1.5 border-y bg-canvas px-6 py-1.5">
        <History className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground/80">Recent Activity</span>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-7 w-44 border-none bg-transparent pl-7 text-[13px] shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-slate-100">
              <History className="size-5 text-slate-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "No activity yet." : `No timeline items match "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="relative flex flex-col gap-1">
            {filtered.map((item) => {
              const meta = metaFor(item.type);
              const Icon = meta.icon;
              return (
                <div key={item.id} className="grid grid-cols-[28px_1fr_auto] items-start gap-3 border-b border-border/70 py-3 last:border-b-0">
                  <div className={cn("mt-0.5 flex size-7 items-center justify-center rounded-md", meta.color)}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-medium">{item.title}</p>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{meta.label}</span>
                    </div>
                    <p className="mt-1 truncate text-[13px] text-muted-foreground">{summarize(item)}</p>
                  </div>
                  <time className="whitespace-nowrap text-right text-[12px] text-muted-foreground">{formatDateTime(item.createdAt)}</time>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
