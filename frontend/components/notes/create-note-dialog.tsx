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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import type { GenericObject, Note } from "@/lib/types";
import { NO_PROJECT, ProjectSelect } from "@/components/projects/project-select";

export function CreateNoteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (note: Note, extra: { project: GenericObject | null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [selectedProject, setSelectedProject] = useState<GenericObject | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onProjectPick(id: string, project: GenericObject | null) {
    setProjectId(id);
    setSelectedProject(project);
  }

  function reset() {
    setTitle("");
    setContent("");
    setProjectId(NO_PROJECT);
    setSelectedProject(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const note = await api.notes.create({
        title: title.trim(),
        properties: { content: content.trim() },
      });
      if (projectId !== NO_PROJECT) {
        try {
          await api.relations.create({ sourceId: projectId, targetId: note.id, type: "has_note" });
        } catch {
          toast.error("Note created, but couldn't link the project");
        }
      }
      onCreated(note, { project: selectedProject });
      toast.success(`${note.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create note");
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
            <DialogTitle>New note</DialogTitle>
            <DialogDescription>Jot something down.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              autoFocus
              placeholder="Dashboard ideas"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Project</Label>
            <ProjectSelect value={projectId} selected={selectedProject} onChange={onProjectPick} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              placeholder="Write your note…"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim() || !content.trim()}>
              {submitting ? "Adding…" : "Add note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
