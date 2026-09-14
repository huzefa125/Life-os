"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api-client";
import type { Page } from "@/lib/types";
import { TagPicker } from "@/components/tags/tag-picker";

export function CreatePageDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (page: Page) => void;
}) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function reset() {
    setTitle("");
    setTags([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const page = await api.pages.create({
        title: title.trim(),
        tags,
        properties: {
          blocks: [
            {
              id: `block-${Date.now()}`,
              type: "text",
              content: "",
            },
          ],
        },
      });
      toast.success("Page created");
      onCreated(page);
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create page");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="page-title">Title</Label>
              <Input
                id="page-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. LifeOS Architecture, Meeting Notes..."
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tags</Label>
              <TagPicker tags={tags} onChange={setTags} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creating…" : "Create Page"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
