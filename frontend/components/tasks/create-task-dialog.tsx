"use client";

import { useEffect, useState } from "react";
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
import { ensureSelfPerson } from "@/lib/self-person";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/task-meta";
import type { GenericObject, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { NO_PROJECT, ProjectSelect } from "@/components/projects/project-select";
import { AssigneeSelect, UNASSIGNED } from "./assignee-select";

const NO_PRIORITY = "none";

export function CreateTaskDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (task: Task) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority | typeof NO_PRIORITY>(NO_PRIORITY);
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState(UNASSIGNED);
  const [selectedAssignee, setSelectedAssignee] = useState<GenericObject | null>(null);
  const [selfPerson, setSelfPerson] = useState<GenericObject | null>(null);
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [selectedProject, setSelectedProject] = useState<GenericObject | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.people
      .list()
      .then(async (data) => {
        if (cancelled) return;
        const self = user ? await ensureSelfPerson(user, data) : null;
        if (!cancelled) setSelfPerson(self);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  function onAssigneePick(id: string, person: GenericObject | null) {
    setAssigneeId(id);
    setSelectedAssignee(person);
  }

  function onProjectPick(id: string, project: GenericObject | null) {
    setProjectId(id);
    setSelectedProject(project);
  }

  function reset() {
    setTitle("");
    setStatus("todo");
    setPriority(NO_PRIORITY);
    setDueDate("");
    setAssigneeId(UNASSIGNED);
    setSelectedAssignee(null);
    setProjectId(NO_PROJECT);
    setSelectedProject(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const task = await api.tasks.create({
        title: title.trim(),
        properties: {
          status,
          ...(priority !== NO_PRIORITY ? { priority } : {}),
          ...(dueDate ? { dueDate } : {}),
        },
      });
      if (assigneeId !== UNASSIGNED) {
        try {
          await api.relations.create({ sourceId: task.id, targetId: assigneeId, type: "assigned_to" });
        } catch {
          toast.error("Task created, but couldn't set the assignee");
        }
      }
      if (projectId !== NO_PROJECT) {
        try {
          await api.relations.create({ sourceId: projectId, targetId: task.id, type: "has_task" });
        } catch {
          toast.error("Task created, but couldn't link the project");
        }
      }
      onCreated(task);
      toast.success(`${task.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create task");
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
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>Add something to get done.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              autoFocus
              placeholder="Follow up with Dylan"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Assignee</Label>
            <AssigneeSelect
              value={assigneeId}
              selected={selectedAssignee}
              selfPerson={selfPerson}
              onChange={onAssigneePick}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Project</Label>
            <ProjectSelect value={projectId} selected={selectedProject} onChange={onProjectPick} />
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-due-date">Due date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
