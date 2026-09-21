"use client";

import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api-client";
import { formatFileSize } from "@/lib/file-meta";
import type { StoredFile } from "@/lib/types";
import { FileTypeIcon } from "./file-type-icon";

export function FileDetailSheet({
  file,
  open,
  onOpenChange,
  onDeleted,
}: {
  file: StoredFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {file ? (
          <FileDetailContent
            key={file.id}
            file={file}
            onOpenChange={onOpenChange}
            onDeleted={onDeleted}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function FileDetailContent({
  file,
  onOpenChange,
  onDeleted,
}: {
  file: StoredFile;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const props = file.properties;

  async function onDelete() {
    setDeleting(true);
    try {
      await api.files.remove(file.id);
      toast.success(`${file.title} deleted`);
      onDeleted(file.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete file");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 font-heading text-lg font-semibold">
          <FileTypeIcon mimeType={props?.mimeType ?? ""} className="size-5 shrink-0 text-cyan-600" />
          <span className="truncate">{file.title}</span>
        </SheetTitle>
      </SheetHeader>

      <Separator />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">Type</Label>
            <p className="text-sm">{props?.mimeType ?? "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">Size</Label>
            <p className="text-sm">{props ? formatFileSize(props.size) : "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">URL</Label>
            {props?.url ? (
              <a
                href={props.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <span className="truncate">{props.url}</span>
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <SheetFooter className="flex-row items-center justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete {file.title}?</span>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
              {deleting ? "Deleting…" : "Confirm"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </SheetFooter>
    </>
  );
}
