"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import type { GenericObject } from "@/lib/types";

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

export function TrashView() {
  const [trashItems, setTrashItems] = useState<GenericObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [emptying, setEmptying] = useState(false);

  useEffect(() => {
    loadTrash();
  }, []);

  async function loadTrash() {
    setLoading(true);
    try {
      const data = await api.trash.list();
      setTrashItems(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load trash");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    try {
      await api.trash.restore(id);
      setTrashItems(trashItems.filter((item) => item.id !== id));
      toast.success("Restored to active");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't restore object");
    }
  }

  async function handlePermanentDelete(id: string) {
    try {
      await api.trash.permanentDelete(id);
      setTrashItems(trashItems.filter((item) => item.id !== id));
      toast.success("Permanently deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete permanently");
    }
  }

  async function handleEmptyTrash() {
    if (!confirm("Are you sure you want to permanently delete all items in trash?")) return;
    setEmptying(true);
    try {
      await api.trash.empty();
      setTrashItems([]);
      toast.success("Trash emptied");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't empty trash");
    } finally {
      setEmptying(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Trash
            </h1>
            <p className="text-xs text-muted-foreground">
              Soft-deleted objects. Restore them anytime or delete them permanently.
            </p>
          </div>
        </div>

        {trashItems.length > 0 && (
          <Button
            variant="destructive"
            size="xs"
            onClick={handleEmptyTrash}
            disabled={emptying}
            className="gap-1.5 shadow-xs"
          >
            <Trash2 className="size-3" />
            <span>{emptying ? "Emptying…" : "Empty Trash"}</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border bg-muted/40" />
          ))}
        </div>
      ) : trashItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Trash2 className="size-8 text-muted-foreground/40" />
          <h3 className="mt-3 font-heading text-sm font-semibold">Trash is empty</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Deleted items will be safely stored here before permanent removal.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {trashItems.map((item) => (
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
              </div>

              <div className="flex items-center gap-2">
                {item.deletedAt && (
                  <span className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground mr-2">
                    <Clock className="size-3" />
                    Deleted {formatDate(item.deletedAt)}
                  </span>
                )}

                <Button
                  variant="outline"
                  size="xs"
                  className="gap-1 text-xs"
                  onClick={() => handleRestore(item.id)}
                >
                  <RotateCcw className="size-3" />
                  <span>Restore</span>
                </Button>

                <Button
                  variant="ghost"
                  size="xs"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handlePermanentDelete(item.id)}
                >
                  Delete permanently
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
