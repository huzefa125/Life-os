"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Paperclip, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api-client";
import { formatFileSize } from "@/lib/file-meta";
import type { FileRecord } from "@/lib/types";
import { CreateFileDialog } from "./create-file-dialog";
import { FileDetailSheet } from "./file-detail-sheet";
import { FileTypeIcon } from "./file-type-icon";

export function FilesView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<FileRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.files
      .list()
      .then((data) => {
        if (cancelled) return;
        setFiles(data);
        const focusId = searchParams.get("focus");
        if (focusId) {
          const match = data.find((f) => f.id === focusId);
          if (match) {
            setSelected(match);
            setDetailOpen(true);
          }
          router.replace("/files");
        }
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't load files");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (file) =>
        file.title.toLowerCase().includes(q) ||
        (file.properties?.mimeType ?? "").toLowerCase().includes(q)
    );
  }, [filter, files]);

  function openFile(file: FileRecord) {
    setSelected(file);
    setDetailOpen(true);
  }

  function handleCreated(file: FileRecord) {
    setFiles((prev) => [file, ...prev]);
  }

  function handleDeleted(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-cyan-100 text-cyan-600">
          <Paperclip className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Files</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {files.length}
          </span>
        ) : null}

        <div className="ml-auto">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-y bg-canvas px-6 py-1.5">
        <List className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground/80">All Files</span>

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

      <div className="px-6">
        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-cyan-100">
              <Paperclip className="size-5 text-cyan-600" />
            </div>
            {files.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No files yet</p>
                  <p className="text-sm text-muted-foreground">
                    Link a file hosted elsewhere to keep track of it.
                  </p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New file
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No files match &quot;{filter}&quot;.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px] font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">Type</TableHead>
                <TableHead className="pr-0 text-right text-[13px] font-medium text-muted-foreground">
                  Size
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((file) => {
                return (
                  <TableRow
                    key={file.id}
                    className="cursor-pointer border-border/70"
                    onClick={() => openFile(file)}
                  >
                    <TableCell className="py-2 pl-0 text-[13px] font-medium">
                      <span className="flex items-center gap-2">
                        <FileTypeIcon
                          mimeType={file.properties?.mimeType ?? ""}
                          className="size-4 shrink-0 text-cyan-600"
                        />
                        <span className="truncate">{file.title}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {file.properties?.mimeType ?? "—"}
                    </TableCell>
                    <TableCell className="pr-0 text-right text-[13px] text-muted-foreground">
                      {file.properties ? formatFileSize(file.properties.size) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateFileDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <FileDetailSheet
        file={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
