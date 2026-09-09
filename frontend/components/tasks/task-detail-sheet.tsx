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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api-client";
import { findAssignee } from "@/lib/relations";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/task-meta";
import type { GenericObject, Person, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { AssigneeSelect, UNASSIGNED } from "./assignee-select";

const NO_PRIORITY = "none";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  onAssigneeChanged,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
  onAssigneeChanged?: (taskId: string, person: GenericObject | null) => void;
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
}: {
  task: Task;
  onOpenChange: (open: boolean) => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: string) => void;
  onAssigneeChanged?: (taskId: string, person: GenericObject | null) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.properties?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority | typeof NO_PRIORITY>(
    task.properties?.priority ?? NO_PRIORITY
  );
  const [dueDate, setDueDate] = useState(task.properties?.dueDate ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [people, setPeople] = useState<Person[]>([]);
  const [assigneeId, setAssigneeId] = useState(UNASSIGNED);
  const [assigneeRelationId, setAssigneeRelationId] = useState<string | null>(null);
  const [assigneeLoading, setAssigneeLoading] = useState(true);
  const [assigneeSaving, setAssigneeSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.people.list(), api.objects.connections(task.id)])
      .then(([peopleList, connections]) => {
        if (cancelled) return;
        setPeople(peopleList);
        const assignee = findAssignee(connections.connections);
        if (assignee) {
          setAssigneeId(assignee.person.id);
          setAssigneeRelationId(assignee.relationId);
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
  }, [task.id]);

  async function onAssigneeChange(nextId: string) {
    const previousId = assigneeId;
    const previousRelationId = assigneeRelationId;
    setAssigneeSaving(true);
    setAssigneeId(nextId);
    try {
      if (previousRelationId) {
        await api.relations.remove(previousRelationId);
        setAssigneeRelationId(null);
      }
      if (nextId !== UNASSIGNED) {
        const relation = await api.relations.create({
          sourceId: task.id,
          targetId: nextId,
          type: "assigned_to",
        });
        setAssigneeRelationId(relation.id);
      }
      onAssigneeChanged?.(task.id, people.find((p) => p.id === nextId) ?? null);
    } catch (error) {
      setAssigneeId(previousId);
      setAssigneeRelationId(previousRelationId);
      toast.error(error instanceof ApiError ? error.message : "Couldn't update assignee");
    } finally {
      setAssigneeSaving(false);
    }
  }

  const dirty =
    title.trim() !== task.title ||
    status !== (task.properties?.status ?? "todo") ||
    priority !== (task.properties?.priority ?? NO_PRIORITY) ||
    dueDate !== (task.properties?.dueDate ?? "");

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
            people={people}
            value={assigneeId}
            onChange={onAssigneeChange}
            disabled={assigneeLoading || assigneeSaving}
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
          <Label htmlFor="detail-due-date">Due date</Label>
          <Input
            id="detail-due-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        <div className="mt-6 flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Created {formatDate(task.createdAt)}</span>
          <span>Updated {formatDate(task.updatedAt)}</span>
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
