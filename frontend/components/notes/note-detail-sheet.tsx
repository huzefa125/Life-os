"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { findParentProject } from "@/lib/relations";
import type { GenericObject, Note } from "@/lib/types";
import { NO_PROJECT, ProjectSelect } from "@/components/projects/project-select";

export function NoteDetailSheet({
  note,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  onProjectChanged,
}: {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (note: Note) => void;
  onDeleted: (id: string) => void;
  onProjectChanged?: (noteId: string, project: GenericObject | null) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {note ? (
          <NoteDetailForm
            key={note.id}
            note={note}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
            onProjectChanged={onProjectChanged}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function NoteDetailForm({
  note,
  onOpenChange,
  onUpdated,
  onDeleted,
  onProjectChanged,
}: {
  note: Note;
  onOpenChange: (open: boolean) => void;
  onUpdated: (note: Note) => void;
  onDeleted: (id: string) => void;
  onProjectChanged?: (noteId: string, project: GenericObject | null) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.properties?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [loadedProjectId, setLoadedProjectId] = useState(NO_PROJECT);
  const [selectedProject, setSelectedProject] = useState<GenericObject | null>(null);
  const [projectRelationId, setProjectRelationId] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.objects
      .connections(note.id)
      .then((connections) => {
        if (cancelled) return;
        const parent = findParentProject(connections.connections, "has_note");
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
  }, [note.id]);

  function onProjectPick(id: string, project: GenericObject | null) {
    setProjectId(id);
    setSelectedProject(project);
  }

  const dirty =
    title.trim() !== note.title ||
    content.trim() !== (note.properties?.content ?? "") ||
    projectId !== loadedProjectId;

  async function onSave() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const updated = await api.notes.update(note.id, {
        title: title.trim(),
        properties: { content: content.trim() },
      });
      onUpdated(updated);

      if (projectId !== loadedProjectId) {
        if (projectRelationId) {
          await api.relations.remove(projectRelationId);
        }
        const nextRelationId =
          projectId !== NO_PROJECT
            ? (
                await api.relations.create({
                  sourceId: projectId,
                  targetId: note.id,
                  type: "has_note",
                })
              ).id
            : null;
        setProjectRelationId(nextRelationId);
        setLoadedProjectId(projectId);
        onProjectChanged?.(note.id, selectedProject);
      }

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
      await api.notes.remove(note.id);
      toast.success(`${note.title} deleted`);
      onDeleted(note.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete note");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{note.title}</SheetTitle>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </SheetHeader>

      <Separator />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex flex-col gap-1.5">
          <Label>Project</Label>
          <ProjectSelect
            value={projectId}
            selected={selectedProject}
            onChange={onProjectPick}
            disabled={projectLoading || saving}
          />
        </div>

        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={12}
          className="resize-none"
        />
      </div>

      <Separator />

      <SheetFooter className="flex-row items-center justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete {note.title}?</span>
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

        <Button
          size="sm"
          disabled={!dirty || saving || !title.trim() || !content.trim()}
          onClick={onSave}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
