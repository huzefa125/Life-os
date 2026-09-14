"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, FileText, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { PROJECT_STATUS_LABEL, PROJECT_STATUSES, type ProjectStatus } from "@/lib/project-meta";
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/task-meta";
import type { GenericObject, Project, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const NO_STATUS = "none";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ProjectDetailSheet({
  project,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (project: Project) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {project ? (
          <ProjectDetailForm
            key={project.id}
            project={project}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ProjectDetailForm({
  project,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  project: Project;
  onOpenChange: (open: boolean) => void;
  onUpdated: (project: Project) => void;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [status, setStatus] = useState<ProjectStatus | typeof NO_STATUS>(
    (project.properties?.status as ProjectStatus | undefined) ?? NO_STATUS
  );
  const [description, setDescription] = useState(project.properties?.description ?? "");
  const [deadline, setDeadline] = useState(project.properties?.deadline ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [linkedTasks, setLinkedTasks] = useState<GenericObject[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<GenericObject[]>([]);
  const [linkedEvents, setLinkedEvents] = useState<GenericObject[]>([]);
  const [linkedFiles, setLinkedFiles] = useState<GenericObject[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.objects
      .connections(project.id)
      .then((data) => {
        if (cancelled) return;
        setLinkedTasks(
          data.connections
            .filter((c) => c.relation.type === "has_task" && c.relation.direction === "outgoing")
            .map((c) => c.object)
        );
        setLinkedNotes(
          data.connections
            .filter((c) => c.relation.type === "has_note" && c.relation.direction === "outgoing")
            .map((c) => c.object)
        );
        setLinkedEvents(
          data.connections
            .filter((c) => c.relation.type === "has_event" && c.relation.direction === "outgoing")
            .map((c) => c.object)
        );
        setLinkedFiles(
          data.connections
            .filter((c) => c.relation.type === "has_file" && c.relation.direction === "outgoing")
            .map((c) => c.object)
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load linked items");
      })
      .finally(() => {
        if (!cancelled) setLinkedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  function goTo(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  const dirty =
    title.trim() !== project.title ||
    status !== ((project.properties?.status as ProjectStatus | undefined) ?? NO_STATUS) ||
    description.trim() !== (project.properties?.description ?? "") ||
    deadline !== (project.properties?.deadline ?? "");

  async function onSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await api.projects.update(project.id, {
        title: title.trim(),
        properties: {
          ...(status !== NO_STATUS ? { status } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(deadline ? { deadline } : {}),
        },
      });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.projects.remove(project.id);
      toast.success(`${project.title} deleted`);
      onDeleted(project.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{project.title}</SheetTitle>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </SheetHeader>

      <Separator />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: ProjectStatus | typeof NO_STATUS) =>
                    v === NO_STATUS ? "None" : PROJECT_STATUS_LABEL[v]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STATUS}>None</SelectItem>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-deadline">Deadline</Label>
            <Input
              id="detail-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="detail-description">Description</Label>
          <Textarea
            id="detail-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <CheckSquare className="size-3.5" />
            Tasks
            {!linkedLoading ? (
              <span className="text-muted-foreground">({linkedTasks.length})</span>
            ) : null}
          </Label>
          {linkedLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : linkedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks linked yet.</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-lg border">
              {linkedTasks.map((task) => {
                const taskStatus = (task.properties?.status as TaskStatus | undefined) ?? "todo";
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => goTo(`/tasks?focus=${task.id}`)}
                    className="flex items-center gap-2 border-b px-2.5 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
                  >
                    <span className="flex-1 truncate">{task.title}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        STATUS_BADGE[taskStatus]
                      )}
                    >
                      {STATUS_LABEL[taskStatus]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <FileText className="size-3.5" />
            Notes
            {!linkedLoading ? (
              <span className="text-muted-foreground">({linkedNotes.length})</span>
            ) : null}
          </Label>
          {linkedLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : linkedNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes linked yet.</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-lg border">
              {linkedNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => goTo(`/notes?focus=${note.id}`)}
                  className="flex items-center gap-2 border-b px-2.5 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
                >
                  <span className="truncate">{note.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Events
            {!linkedLoading ? (
              <span className="text-muted-foreground">({linkedEvents.length})</span>
            ) : null}
          </Label>
          {linkedLoading ? (
            <p className="text-sm text-muted-foreground">Loadingâ€¦</p>
          ) : linkedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events linked yet.</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-lg border">
              {linkedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => goTo(`/events?focus=${event.id}`)}
                  className="flex items-center gap-2 border-b px-2.5 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
                >
                  <span className="truncate">{event.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <Paperclip className="size-3.5" />
            Files
            {!linkedLoading ? (
              <span className="text-muted-foreground">({linkedFiles.length})</span>
            ) : null}
          </Label>
          {linkedLoading ? (
            <p className="text-sm text-muted-foreground">Loadingâ€¦</p>
          ) : linkedFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files linked yet.</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-lg border">
              {linkedFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => goTo(`/files?focus=${file.id}`)}
                  className="flex items-center gap-2 border-b px-2.5 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
                >
                  <span className="truncate">{file.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Created {formatDate(project.createdAt)}</span>
          <span>Updated {formatDate(project.updatedAt)}</span>
        </div>
      </div>

      <Separator />

      <SheetFooter className="flex-row items-center justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete {project.title}?</span>
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

        <Button size="sm" disabled={!dirty || saving || !title.trim()} onClick={onSave}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
