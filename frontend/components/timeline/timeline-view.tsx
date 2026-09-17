"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History, Search } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api-client";
import { OBJECT_TYPE_META } from "@/lib/type-meta";
import type { GenericObject } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TimelineView() {
  const router = useRouter();

  const [items, setItems] = useState<GenericObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.timeline
      .list()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't load timeline");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const presentTypes = useMemo(() => {
    const set = new Set(items.map((i) => i.type));
    return Object.keys(OBJECT_TYPE_META).filter((t) => set.has(t));
  }, [items]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (!q) return true;
      return item.title.toLowerCase().includes(q);
    });
  }, [filter, typeFilter, items]);

  function openItem(item: GenericObject) {
    const meta = OBJECT_TYPE_META[item.type];
    if (!meta) return;
    router.push(`${meta.basePath}?focus=${item.id}`);
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <History className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Timeline</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {items.length}
          </span>
        ) : null}

        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-7 w-44 pl-7 text-[13px] shadow-none"
          />
        </div>
      </div>

      {presentTypes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-y bg-canvas px-6 py-2">
          <button
            type="button"
            onClick={() => setTypeFilter(null)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
              typeFilter === null ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
            )}
          >
            All
          </button>
          {presentTypes.map((type) => {
            const meta = OBJECT_TYPE_META[type];
            const Icon = meta.icon;
            const active = typeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(active ? null : type)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                  active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("size-3", !active && meta.color)} />
                {meta.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-slate-100">
              <History className="size-5 text-slate-600" />
            </div>
            {items.length === 0 ? (
              <div>
                <p className="text-sm font-medium">Nothing yet</p>
                <p className="text-sm text-muted-foreground">
                  Everything you create shows up here, most recent first.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No matches.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((item) => {
              const meta = OBJECT_TYPE_META[item.type];
              const Icon = meta?.icon ?? History;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className="flex items-center gap-3 border-b px-2 py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                >
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted",
                      meta?.color
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="flex-1 truncate text-[13px] font-medium">{item.title}</span>
                  <span className="text-[12px] text-muted-foreground">{meta?.label ?? item.type}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
