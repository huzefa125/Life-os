"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api-client";
import type { StoredFile } from "@/lib/types";

const SIZE_UNITS = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 } as const;
type SizeUnit = keyof typeof SIZE_UNITS;

function deriveFileName(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : "";
  } catch {
    return "";
  }
}

export function CreateFileDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (file: StoredFile) => void;
}) {
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileNameTouched, setFileNameTouched] = useState(false);
  const [mimeType, setMimeType] = useState("");
  const [sizeValue, setSizeValue] = useState("");
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>("MB");
  const [submitting, setSubmitting] = useState(false);

  function onUrlChange(value: string) {
    setUrl(value);
    if (!fileNameTouched) {
      const derived = deriveFileName(value);
      if (derived) setFileName(derived);
    }
  }

  function reset() {
    setUrl("");
    setFileName("");
    setFileNameTouched(false);
    setMimeType("");
    setSizeValue("");
    setSizeUnit("MB");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const sizeNumber = parseFloat(sizeValue);
    if (!url.trim() || !fileName.trim() || !mimeType.trim() || !sizeNumber || sizeNumber <= 0) return;
    setSubmitting(true);
    try {
      const file = await api.files.create({
        properties: {
          url: url.trim(),
          fileName: fileName.trim(),
          mimeType: mimeType.trim(),
          size: Math.max(1, Math.round(sizeNumber * SIZE_UNITS[sizeUnit])),
        },
      });
      onCreated(file);
      toast.success(`${file.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't add file");
    } finally {
      setSubmitting(false);
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
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add file</DialogTitle>
            <DialogDescription>
              Link a file hosted elsewhere — this stores its details, not the file itself.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-url">URL</Label>
            <Input
              id="file-url"
              type="url"
              autoFocus
              placeholder="https://example.com/files/resume.pdf"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-name">File name</Label>
            <Input
              id="file-name"
              placeholder="resume.pdf"
              value={fileName}
              onChange={(event) => {
                setFileName(event.target.value);
                setFileNameTouched(true);
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file-mime">Type</Label>
              <Input
                id="file-mime"
                placeholder="application/pdf"
                value={mimeType}
                onChange={(event) => setMimeType(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file-size">Size</Label>
              <div className="flex gap-1.5">
                <Input
                  id="file-size"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="1.2"
                  value={sizeValue}
                  onChange={(event) => setSizeValue(event.target.value)}
                  required
                  className="min-w-0 flex-1"
                />
                <Select value={sizeUnit} onValueChange={(v) => setSizeUnit(v as SizeUnit)}>
                  <SelectTrigger className="w-20 shrink-0">
                    <SelectValue>{(v: SizeUnit) => v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SIZE_UNITS) as SizeUnit[]).map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                submitting || !url.trim() || !fileName.trim() || !mimeType.trim() || !sizeValue
              }
            >
              {submitting ? "Adding…" : "Add file"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
