"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Archive, ArchiveRestore, Layers, MoreHorizontal, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { api, ApiError } from "@/lib/api-client";
import { collectionColor } from "@/lib/collection-meta";
import type { Collection } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "all" | "favorites" | "archived";

const TABS: { id: Tab; label: string; href: string }[] = [
  { id: "all", label: "All Collections", href: "/collections" },
  { id: "favorites", label: "Favorites", href: "/collections?tab=favorites" },
  { id: "archived", label: "Archived", href: "/collections?tab=archived" },
];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function CollectionsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: Tab = rawTab === "favorites" || rawTab === "archived" ? rawTab : "all";
  const status = tab === "archived" ? "archived" : "active";

  const [result, setResult] = useState<{ status: string; items: Collection[] } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loading = result?.status !== `${status}:${reloadKey}`;

  useEffect(() => {
    let cancelled = false;
    const key = `${status}:${reloadKey}`;
    api.collections
      .list(status)
      .then((items) => {
        if (!cancelled) setResult({ status: key, items });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(errorMessage(error, "Couldn't load collections"));
        setResult({ status: key, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);

  const all = result?.items ?? [];
  const collections = tab === "favorites" ? all.filter((c) => c.isFavorite) : all;
  const reload = () => setReloadKey((k) => k + 1);

  async function archive(collection: Collection) {
    try {
      await api.archive.archive(collection.id);
      toast.success(`Archived "${collection.title}"`);
      reload();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't archive"));
    }
  }

  async function restore(collection: Collection) {
    try {
      await api.archive.restore(collection.id);
      toast.success(`Restored "${collection.title}"`);
      reload();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't restore"));
    }
  }

  async function trash(collection: Collection) {
    if (!window.confirm(`Move "${collection.title}" and its records to Trash?`)) return;
    try {
      await api.collections.remove(collection.id);
      toast.success("Moved to Trash");
      reload();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete"));
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-teal-100 text-teal-600 dark:bg-teal-500/15">
          <Layers className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Collections</h1>
        {!loading ? <AnimatedNumber value={collections.length} className="text-[13px] text-muted-foreground" /> : null}
        <Button size="sm" className="ml-auto" onClick={() => router.push("/collections/new")}>
          <Plus className="size-3.5" />
          New collection
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border/70 px-6">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              "relative px-2.5 py-2 text-[13px] transition-colors",
              tab === t.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {tab === t.id ? (
              <motion.span layoutId="collections-tab-underline" className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-foreground" />
            ) : null}
          </Link>
        ))}
      </div>

      <div className="px-6 py-5">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/15">
              {tab === "favorites" ? <Star className="size-5 text-amber-500" /> : tab === "archived" ? <Archive className="size-5 text-teal-600" /> : <Layers className="size-5 text-teal-600" />}
            </div>
            <div>
              <p className="text-sm font-medium">
                {tab === "favorites" ? "No favorite collections" : tab === "archived" ? "Nothing archived" : "No collections yet"}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {tab === "all"
                  ? "Build your own database — a CRM, an inventory, a reading list — with the fields and views you need."
                  : tab === "favorites"
                    ? "Star a collection to pin it here."
                    : "Archived collections show up here."}
              </p>
            </div>
            {tab === "all" ? (
              <Button size="sm" onClick={() => router.push("/collections/new")}>
                <Plus className="size-3.5" />
                Create a collection
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection, index) => {
              const color = collectionColor(collection.properties.color);
              return (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
                >
                  <Link
                    href={`/collections/${collection.id}`}
                    className="group flex h-full flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", color.chip)}>
                        <Layers className={cn("size-4", color.text)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">{collection.title}</p>
                        <p className="line-clamp-2 text-[12px] text-muted-foreground">
                          {collection.properties.description || `${collection.properties.fields.length} fields`}
                        </p>
                      </div>
                      <div className="flex items-center opacity-70 transition-opacity group-hover:opacity-100" onClick={(e) => e.preventDefault()}>
                        {tab !== "archived" ? (
                          <FavoriteButton
                            objectId={collection.id}
                            initialFavorite={collection.isFavorite}
                            onToggle={(fav) =>
                              setResult((prev) =>
                                prev ? { ...prev, items: prev.items.map((c) => (c.id === collection.id ? { ...c, isFavorite: fav } : c)) } : prev
                              )
                            }
                          />
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Collection actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {tab === "archived" ? (
                              <DropdownMenuItem onClick={() => restore(collection)}>
                                <ArchiveRestore />
                                Restore
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => archive(collection)}>
                                <Archive />
                                Archive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => trash(collection)}>
                              <Trash2 />
                              Move to Trash
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center gap-3 text-[12px] text-muted-foreground">
                      <span>
                        <span className="font-medium text-foreground tabular-nums">{collection.recordCount}</span> records
                      </span>
                      <span>·</span>
                      <span>{collection.properties.views.length} views</span>
                      <span className="ml-auto">{new Date(collection.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
