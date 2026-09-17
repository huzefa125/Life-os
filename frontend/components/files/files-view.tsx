"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, List, Paperclip, Plus, Search, Trash2 } from "lucide-react";
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { NO_PROJECT, ProjectSelect } from "@/components/projects/project-select";
import { findParentProject } from "@/lib/relations";
import type { FileProperties, GenericObject, StoredFile } from "@/lib/types";

function formatBytes(bytes?: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function FilesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<StoredFile | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.files
      .list()
      .then((data) => {
        if (cancelled) return;
        setFiles(data);
        const focusId = searchParams.get("focus");
        const match = focusId ? data.find((file) => file.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/files");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load files"))
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
    return files.filter((file) => {
      const properties = file.properties;
      return (
        file.title.toLowerCase().includes(q) ||
        (properties?.fileName ?? "").toLowerCase().includes(q) ||
        (properties?.mimeType ?? "").toLowerCase().includes(q) ||
        (properties?.url ?? "").toLowerCase().includes(q)
      );
    });
  }, [files, filter]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-cyan-100 text-cyan-600">
          <Paperclip className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Files</h1>
        {!loading ? <span className="text-[13px] text-muted-foreground">{files.length}</span> : null}
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New
        </Button>
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
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
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
                  <p className="text-sm text-muted-foreground">Save references, links, and attachments.</p>
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
                <TableHead className="pl-0 text-[13px]">Name</TableHead>
                <TableHead className="text-[13px]">Type</TableHead>
                <TableHead className="text-[13px]">Size</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((file) => (
                <TableRow
                  key={file.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => {
                    setSelected(file);
                    setDetailOpen(true);
                  }}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">{file.title}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{file.properties?.mimeType ?? "-"}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{formatBytes(file.properties?.size)}</TableCell>
                  <TableCell className="pr-0 text-right text-[13px] text-muted-foreground">{formatDate(file.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateFileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(file) => setFiles((prev) => [file, ...prev])}
      />
      <FileDetailSheet
        file={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={(id) => setFiles((prev) => prev.filter((file) => file.id !== id))}
      />
    </div>
  );
}

function CreateFileDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (file: StoredFile) => void;
}) {
  const [properties, setProperties] = useState<FileProperties>({
    url: "",
    fileName: "",
    mimeType: "",
    size: 1,
  });
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [selectedProject, setSelectedProject] = useState<GenericObject | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setProperties({ url: "", fileName: "", mimeType: "", size: 1 });
    setProjectId(NO_PROJECT);
    setSelectedProject(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const file = await api.files.create({
        properties: {
          ...properties,
          fileName: properties.fileName.trim(),
          mimeType: properties.mimeType.trim(),
          url: properties.url.trim(),
          size: Number(properties.size),
        },
      });
      if (projectId !== NO_PROJECT) {
        try {
          await api.relations.create({ sourceId: projectId, targetId: file.id, type: "has_file" });
        } catch {
          toast.error("File created, but couldn't link the project");
        }
      }
      onCreated(file);
      toast.success(`${file.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create file");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New file</DialogTitle>
            <DialogDescription>Add a file reference.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-name">Name</Label>
            <Input id="file-name" value={properties.fileName} onChange={(event) => setProperties({ ...properties, fileName: event.target.value })} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Project</Label>
            <ProjectSelect
              value={projectId}
              selected={selectedProject}
              onChange={(id, project) => {
                setProjectId(id);
                setSelectedProject(project);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-url">URL</Label>
            <Input id="file-url" type="url" value={properties.url} onChange={(event) => setProperties({ ...properties, url: event.target.value })} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file-mime">MIME type</Label>
              <Input id="file-mime" value={properties.mimeType} onChange={(event) => setProperties({ ...properties, mimeType: event.target.value })} placeholder="application/pdf" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file-size">Size bytes</Label>
              <Input id="file-size" type="number" min={1} step={1} value={properties.size} onChange={(event) => setProperties({ ...properties, size: Number(event.target.value) })} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !properties.fileName.trim() || !properties.url.trim() || !properties.mimeType.trim()}>
              {submitting ? "Adding..." : "Add file"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FileDetailSheet({
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
  const [deleting, setDeleting] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [loadedProjectId, setLoadedProjectId] = useState(NO_PROJECT);
  const [selectedProject, setSelectedProject] = useState<GenericObject | null>(null);
  const [projectRelationId, setProjectRelationId] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setProjectLoading(true);
      setProjectId(NO_PROJECT);
      setLoadedProjectId(NO_PROJECT);
      setSelectedProject(null);
      setProjectRelationId(null);
    });
    api.objects
      .connections(file.id)
      .then((connections) => {
        if (cancelled) return;
        const parent = findParentProject(connections.connections, "has_file");
        if (parent) {
          setProjectId(parent.project.id);
          setLoadedProjectId(parent.project.id);
          setProjectRelationId(parent.relationId);
          setSelectedProject(parent.project);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load project link");
      })
      .finally(() => {
        if (!cancelled) setProjectLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  async function onDelete() {
    if (!file) return;
    setDeleting(true);
    try {
      await api.files.remove(file.id);
      onDeleted(file.id);
      onOpenChange(false);
      toast.success(`${file.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete file");
    } finally {
      setDeleting(false);
    }
  }

  async function onSaveProject() {
    if (!file || projectId === loadedProjectId) return;
    setSavingProject(true);
    try {
      if (projectRelationId) {
        await api.relations.remove(projectRelationId);
      }
      const nextRelationId =
        projectId !== NO_PROJECT
          ? (
              await api.relations.create({
                sourceId: projectId,
                targetId: file.id,
                type: "has_file",
              })
            ).id
          : null;
      setProjectRelationId(nextRelationId);
      setLoadedProjectId(projectId);
      toast.success("Project link saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save project link");
    } finally {
      setSavingProject(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {file ? (
          <>
            <SheetHeader>
              <SheetTitle>{file.title}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-4 flex flex-col gap-1.5">
                <Label>Project</Label>
                <ProjectSelect
                  value={projectId}
                  selected={selectedProject}
                  disabled={projectLoading || savingProject}
                  onChange={(id, project) => {
                    setProjectId(id);
                    setSelectedProject(project);
                  }}
                />
              </div>
              <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-3 text-sm">
                <dt className="text-muted-foreground">URL</dt>
                <dd className="min-w-0">
                  <a className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline" href={file.properties?.url} target="_blank" rel="noreferrer">
                    <span className="truncate">{file.properties?.url}</span>
                    <ExternalLink className="size-3.5 shrink-0" />
                  </a>
                </dd>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{file.properties?.mimeType ?? "-"}</dd>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{formatBytes(file.properties?.size)}</dd>
                <dt className="text-muted-foreground">Added</dt>
                <dd>{formatDate(file.createdAt)}</dd>
              </dl>
            </div>
            <SheetFooter className="flex-row justify-between">
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={onDelete}>
                <Trash2 className="size-3.5" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
              <Button size="sm" disabled={savingProject || projectId === loadedProjectId} onClick={onSaveProject}>
                {savingProject ? "Saving..." : "Save link"}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
