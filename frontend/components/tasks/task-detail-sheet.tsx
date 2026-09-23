"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { findAssignee, findParentProject } from "@/lib/relations";
import { ensureSelfPerson } from "@/lib/self-person";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/task-meta";
import type { GenericObject, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { NO_PROJECT, ProjectSelect } from "@/components/projects/project-select";
import { AssigneeSelect, UNASSIGNED } from "./assignee-select";

const NO_PRIORITY = "none";

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  onAssigneeChanged,
  onProjectChanged,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
  onAssigneeChanged?: (taskId: string, person: GenericObject | null) => void;
  onProjectChanged?: (taskId: string, project: GenericObject | null) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {task ? (
          <TaskDetailForm
            key={task.id}
            task={task}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
            onAssigneeChanged={onAssigneeChanged}
            onProjectChanged={onProjectChanged}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TaskDetailForm({
  task,
  onOpenChange,
  onUpdated,
  onDeleted,
  onAssigneeChanged,
  onProjectChanged,
}: {
  task: Task;
  onOpenChange: (open: boolean) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
  onAssigneeChanged?: (taskId: string, person: GenericObject | null) => void;
  onProjectChanged?: (taskId: string, project: GenericObject | null) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.properties?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority | typeof NO_PRIORITY>(
    task.properties?.priority ?? NO_PRIORITY
  );
  const [dueDate, setDueDate] = useState(task.properties?.dueDate ?? "");
  const [notes, setNotes] = useState(task.properties?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { user } = useAuth();
  const [selfPerson, setSelfPerson] = useState<GenericObject | null>(null);
  const [assigneeId, setAssigneeId] = useState(UNASSIGNED);
  const [loadedAssigneeId, setLoadedAssigneeId] = useState(UNASSIGNED);
  const [selectedAssignee, setSelectedAssignee] = useState<GenericObject | null>(null);
  const [assigneeRelationId, setAssigneeRelationId] = useState<string | null>(null);
  const [assigneeLoading, setAssigneeLoading] = useState(true);

  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [loadedProjectId, setLoadedProjectId] = useState(NO_PROJECT);
  const [selectedProject, setSelectedProject] = useState<GenericObject | null>(null);
  const [projectRelationId, setProjectRelationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.people.list(), api.objects.connections(task.id)])
      .then(async ([peopleList, connections]) => {
        if (cancelled) return;
        const self = user ? await ensureSelfPerson(user, peopleList) : null;
        if (cancelled) return;
        setSelfPerson(self);
        const assignee = findAssignee(connections.connections);
        if (assignee) {
          setAssigneeId(assignee.person.id);
          setLoadedAssigneeId(assignee.person.id);
          setAssigneeRelationId(assignee.relationId);
          setSelectedAssignee(assignee.person);
        }
        const parent = findParentProject(connections.connections, "has_task");
        if (parent) {
          setProjectId(parent.project.id);
          setLoadedProjectId(parent.project.id);
          setProjectRelationId(parent.relationId);
          setSelectedProject(parent.project);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load assignee");
      })
      .finally(() => {
        if (!cancelled) setAssigneeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id, user]);

  function onAssigneePick(id: string, person: GenericObject | null) {
    setAssigneeId(id);
    setSelectedAssignee(person);
  }

  function onProjectPick(id: string, project: GenericObject | null) {
    setProjectId(id);
    setSelectedProject(project);
  }

  const dirty =
    title.trim() !== task.title ||
    status !== (task.properties?.status ?? "todo") ||
    priority !== (task.properties?.priority ?? NO_PRIORITY) ||
    dueDate !== (task.properties?.dueDate ?? "") ||
    notes.trim() !== (task.properties?.notes ?? "") ||
    assigneeId !== loadedAssigneeId ||
    projectId !== loadedProjectId;

  async function onSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await api.tasks.update(task.id, {
        title: title.trim(),
        properties: {
          status,
          ...(priority !== NO_PRIORITY ? { priority } : {}),
          ...(dueDate ? { dueDate } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      onUpdated(updated);

      if (assigneeId !== loadedAssigneeId) {
        if (assigneeRelationId) {
          await api.relations.remove(assigneeRelationId);
        }
        const nextRelationId =
          assigneeId !== UNASSIGNED
            ? (
                await api.relations.create({
                  sourceId: task.id,
                  targetId: assigneeId,
                  type: "assigned_to",
                })
              ).id
            : null;
        setAssigneeRelationId(nextRelationId);
        setLoadedAssigneeId(assigneeId);
        onAssigneeChanged?.(task.id, selectedAssignee);
      }

      if (projectId !== loadedProjectId) {
        if (projectRelationId) {
          await api.relations.remove(projectRelationId);
        }
        const nextRelationId =
          projectId !== NO_PROJECT
            ? (
                await api.relations.create({
                  sourceId: projectId,
                  targetId: task.id,
                  type: "has_task",
                })
              ).id
            : null;
        setProjectRelationId(nextRelationId);
        setLoadedProjectId(projectId);
        onProjectChanged?.(task.id, selectedProject);
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
      await api.tasks.remove(task.id);
      toast.success(`${task.title} deleted`);
      onDeleted(task.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete task");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </SheetHeader>

      <Separator />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label>Assignee</Label>
          <AssigneeSelect
            value={assigneeId}
            selected={selectedAssignee}
            selfPerson={selfPerson}
            onChange={onAssigneePick}
            disabled={assigneeLoading || saving}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label>Project</Label>
          <ProjectSelect
            value={projectId}
            selected={selectedProject}
            onChange={onProjectPick}
            disabled={saving}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: TaskStatus) => STATUS_LABEL[v]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TaskPriority | typeof NO_PRIORITY)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: TaskPriority | typeof NO_PRIORITY) =>
                    v === NO_PRIORITY ? "None" : PRIORITY_LABEL[v]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PRIORITY}>None</SelectItem>
                {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label>Due date</Label>
          <DatePicker value={dueDate || undefined} onChange={(v) => setDueDate(v ?? "")} />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="detail-notes">Notes</Label>
          <Textarea
            id="detail-notes"
            placeholder="Add any notes…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
          />
        </div>
      </div>

      <Separator />

      <SheetFooter className="flex-row items-center justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete {task.title}?</span>
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
