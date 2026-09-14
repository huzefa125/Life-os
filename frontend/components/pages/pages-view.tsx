"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Calendar, Clock, Layers, Plus, Search, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import type { Page } from "@/lib/types";
import { TagBadge } from "@/components/tags/tag-badge";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { CreatePageDialog } from "./create-page-dialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PagesView() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadPages();
  }, [selectedTag]);

  async function loadPages() {
    setLoading(true);
    try {
      const data = await api.pages.list(selectedTag ?? undefined);
      setPages(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load pages");
    } finally {
      setLoading(false);
    }
  }

  const allTags = Array.from(
    new Set(pages.flatMap((p) => p.tags ?? []))
  );

  const filteredPages = pages.filter((page) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const titleMatch = page.title.toLowerCase().includes(q);
    const contentMatch = (page.properties?.blocks ?? []).some((b) =>
      b.content.toLowerCase().includes(q)
    );
    return titleMatch || contentMatch;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Pages
            </h1>
            <p className="text-xs text-muted-foreground">
              Notion-style documents with interactive blocks, tags, and relations
            </p>
          </div>
        </div>

        <Button size="sm" className="gap-1.5 shadow-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          <span>New Page</span>
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Tag filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedTag === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {["work", "personal", "college", "project"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSelectedTag(selectedTag === preset ? null : preset)}
            >
              <TagBadge
                tag={preset}
                active={selectedTag === preset}
                className={selectedTag === preset ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}
              />
            </button>
          ))}
          {allTags
            .filter((t) => !["work", "personal", "college", "project"].includes(t.toLowerCase()))
            .map((custom) => (
              <button
                key={custom}
                type="button"
                onClick={() => setSelectedTag(selectedTag === custom ? null : custom)}
              >
                <TagBadge
                  tag={custom}
                  active={selectedTag === custom}
                  className={selectedTag === custom ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}
                />
              </button>
            ))}
        </div>
      </div>

      {/* Pages Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <BookOpen className="size-6" />
          </div>
          <h3 className="mt-3 font-heading text-sm font-semibold">No pages found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {search || selectedTag
              ? "Try clearing your filters or search query"
              : "Create your first Notion-style block page to get started"}
          </p>
          {!search && !selectedTag && (
            <div className="mt-4">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create a page
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPages.map((page) => {
            const blocks = page.properties?.blocks ?? [];
            const firstSnippet =
              blocks.find((b) => b.content.trim().length > 0)?.content ?? "Empty page";

            return (
              <Link
                key={page.id}
                href={`/pages/${page.id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {page.title}
                    </h3>
                    <FavoriteButton
                      objectId={page.id}
                      initialFavorite={page.isFavorite ?? false}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {firstSnippet}
                  </p>
                </div>

                <div className="mt-4 space-y-2 border-t border-border/40 pt-3">
                  {/* Tags */}
                  {(page.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(page.tags ?? []).slice(0, 3).map((tag) => (
                        <TagBadge key={tag} tag={tag} className="text-[10px] py-0 px-1.5" />
                      ))}
                      {(page.tags ?? []).length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{(page.tags ?? []).length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                    <span className="flex items-center gap-1">
                      <Layers className="size-3" />
                      {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDate(page.updatedAt)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <CreatePageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(newPage) => setPages([newPage, ...pages])}
      />
    </div>
  );
}
