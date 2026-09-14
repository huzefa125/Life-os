"use client";

import { useEffect, useState } from "react";
import { Archive, ArrowUpRight, Clock, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import type { GenericObject } from "@/lib/types";
import { TagBadge } from "@/components/tags/tag-badge";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ArchiveView() {
  const [archived, setArchived] = useState<GenericObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchived();
  }, []);

  async function loadArchived() {
    setLoading(true);
    try {
      const data = await api.archive.list();
      setArchived(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load archived items");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnarchive(id: string) {
    try {
      await api.archive.restore(id);
      setArchived(archived.filter((item) => item.id !== id));
      toast.success("Restored to active");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't restore object");
    }
  }

  async function handleMoveToTrash(id: string) {
    try {
      await api.trash.move(id);
      setArchived(archived.filter((item) => item.id !== id));
      toast.success("Moved to trash");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't trash object");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
            <Archive className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Archive
            </h1>
            <p className="text-xs text-muted-foreground">
              Temporarily archived objects. Hidden from normal lists and searches.
            </p>
          </div>
        </div>

        <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
          {archived.length} {archived.length === 1 ? "item" : "items"}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border bg-muted/40" />
          ))}
        </div>
      ) : archived.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Archive className="size-8 text-muted-foreground/40" />
          <h3 className="mt-3 font-heading text-sm font-semibold">Archive is empty</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            When you archive projects, tasks, or pages, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {archived.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-3.5 shadow-xs transition-colors hover:border-border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  {item.type}
                </span>
                <span className="truncate font-medium text-sm text-foreground">
                  {item.title}
                </span>

                {(item.tags ?? []).length > 0 && (
                  <div className="hidden sm:flex items-center gap-1">
                    {(item.tags ?? []).slice(0, 2).map((tag) => (
                      <TagBadge key={tag} tag={tag} className="text-[10px] py-0 px-1.5" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {item.archivedAt && (
                  <span className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground mr-2">
                    <Clock className="size-3" />
                    Archived {formatDate(item.archivedAt)}
                  </span>
                )}

                <Button
                  variant="outline"
                  size="xs"
                  className="gap-1 text-xs"
                  onClick={() => handleUnarchive(item.id)}
                >
                  <RotateCcw className="size-3" />
                  <span>Unarchive</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleMoveToTrash(item.id)}
                  title="Move to trash"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
