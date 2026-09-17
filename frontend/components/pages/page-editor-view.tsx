"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api-client";
import type { Block, Page } from "@/lib/types";
import { TagPicker } from "@/components/tags/tag-picker";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { BlockEditor } from "./block-editor";
import { cn } from "@/lib/utils";

export function PageEditorView({
  initialPage,
  onDeleted,
}: {
  initialPage: Page;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [page, setPage] = useState<Page>(initialPage);
  const [title, setTitle] = useState(initialPage.title);
  const [tags, setTags] = useState<string[]>(initialPage.tags ?? []);
  const [blocks, setBlocks] = useState<Block[]>(
    initialPage.properties?.blocks && initialPage.properties.blocks.length > 0
      ? initialPage.properties.blocks
      : [
          {
            id: `block-${Date.now()}`,
            type: "text",
            content: "",
          },
        ]
  );
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Mark dirty when title, tags, or blocks change
  function handleBlocksChange(newBlocks: Block[]) {
    setBlocks(newBlocks);
    setIsDirty(true);
  }

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    setIsDirty(true);
  }

  function handleTagsChange(newTags: string[]) {
    setTags(newTags);
    setIsDirty(true);
  }

  async function handleSave() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.pages.update(page.id, {
        title: title.trim(),
        tags,
        properties: { blocks },
      });
      setPage(updated);
      setIsDirty(false);
      setLastSaved(new Date());
      toast.success("Page saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save page");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    try {
      await api.archive.archive(page.id);
      toast.success("Page moved to archive");
      router.push("/pages");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't archive page");
    }
  }

  async function handleTrash() {
    try {
      await api.trash.move(page.id);
      toast.success("Page moved to trash");
      onDeleted?.(page.id);
      router.push("/pages");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete page");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      {/* Top action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/pages"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xs" }),
              "gap-1 text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowLeft className="size-3.5" />
            <span>Pages</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="max-w-[200px] truncate text-xs font-medium text-foreground sm:max-w-xs">
            {title || "Untitled"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <FavoriteButton
            objectId={page.id}
            initialFavorite={page.isFavorite ?? false}
          />

          <Button
            variant="ghost"
            size="xs"
            onClick={handleArchive}
            title="Archive page"
            className="text-muted-foreground hover:text-foreground"
          >
            <Archive className="size-3.5" />
            <span className="hidden sm:inline">Archive</span>
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={handleTrash}
            title="Move to trash"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-4" />

          <Button
            size="xs"
            onClick={handleSave}
            disabled={saving || !isDirty || !title.trim()}
            className="gap-1.5 shadow-xs"
          >
            {saving ? (
              <span>Saving…</span>
            ) : isDirty ? (
              <>
                <Save className="size-3" />
                <span>Save</span>
              </>
            ) : (
              <>
                <Check className="size-3 text-emerald-500" />
                <span>Saved</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Page Canvas */}
      <div className="rounded-xl border border-border/80 bg-background p-6 shadow-xs sm:p-10">
        {/* Page Title */}
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Page Title"
            className="border-none px-0 font-heading text-3xl font-bold tracking-tight text-foreground shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0 sm:text-4xl"
          />

          {/* Tags */}
          <div className="flex items-center gap-2 pb-2">
            <span className="text-xs text-muted-foreground">Tags:</span>
            <TagPicker tags={tags} onChange={handleTagsChange} />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Notion-style Blocks Canvas */}
        <div className="min-h-[400px]">
          <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
        </div>
      </div>
    </div>
  );
}
