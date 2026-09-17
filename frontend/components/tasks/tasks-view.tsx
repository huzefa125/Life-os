"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, FolderKanban, List, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { avatarColor, initials } from "@/lib/avatar-color";
import { findAssignee, findParentProject } from "@/lib/relations";
import { isSelf } from "@/lib/self-person";
import { formatDueDate, isOverdue, PRIORITY_BADGE, PRIORITY_LABEL, STATUS_BADGE, STATUS_LABEL } from "@/lib/task-meta";
import type { GenericObject, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskDetailSheet } from "./task-detail-sheet";

export function TasksView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assigneeByTask, setAssigneeByTask] = useState<Record<string, GenericObject | null>>({});
  const [projectByTask, setProjectByTask] = useState<Record<string, GenericObject | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadConnections(list: Task[]) {
      const entries = await Promise.all(
        list.map(async (t) => {
          try {
            const connections = await api.objects.connections(t.id);
            return [
              t.id,
              findAssignee(connections.connections)?.person ?? null,
              findParentProject(connections.connections, "has_task")?.project ?? null,
            ] as const;
          } catch {
            return [t.id, null, null] as const;
          }
        })
      );
      if (cancelled) return;
      setAssigneeByTask(Object.fromEntries(entries.map(([id, assignee]) => [id, assignee])));
      setProjectByTask(Object.fromEntries(entries.map(([id, , project]) => [id, project])));
    }

    api.tasks
      .list()
      .then((data) => {
        if (cancelled) return;
        setTasks(data);
        const focusId = searchParams.get("focus");
        if (focusId) {
          const match = data.find((t) => t.id === focusId);
          if (match) {
            setSelected(match);
            setDetailOpen(true);
          }
          router.replace("/tasks");
        }
        loadConnections(data);
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't load tasks");
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
    if (!q) return tasks;
    return tasks.filter((task) => task.title.toLowerCase().includes(q));
  }, [filter, tasks]);

  function openTask(task: Task) {
    setSelected(task);
    setDetailOpen(true);
  }

  function handleCreated(
    task: Task,
    extra: { assignee: GenericObject | null; project: GenericObject | null }
  ) {
    setTasks((prev) => [task, ...prev]);
    setAssigneeByTask((prev) => ({ ...prev, [task.id]: extra.assignee }));
    setProjectByTask((prev) => ({ ...prev, [task.id]: extra.project }));
  }

  function handleUpdated(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    setSelected(task);
  }

  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleAssigneeChanged(taskId: string, person: GenericObject | null) {
    setAssigneeByTask((prev) => ({ ...prev, [taskId]: person }));
  }

  function handleProjectChanged(taskId: string, project: GenericObject | null) {
    setProjectByTask((prev) => ({ ...prev, [taskId]: project }));
  }

  async function toggleComplete(task: Task, checked: boolean) {
    const previous = tasks;
    const nextStatus = checked ? "completed" : "todo";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, properties: { ...t.properties, status: nextStatus } as Task["properties"] }
          : t
      )
    );
    try {
      const updated = await api.tasks.update(task.id, {
        properties: {
          status: nextStatus,
          ...(task.properties?.priority ? { priority: task.properties.priority } : {}),
          ...(task.properties?.dueDate ? { dueDate: task.properties.dueDate } : {}),
        },
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (error) {
      setTasks(previous);
      toast.error(error instanceof ApiError ? error.message : "Couldn't update task");
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
          <CheckSquare className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Tasks</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {tasks.length}
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
        <span className="text-[13px] font-medium text-foreground/80">All Tasks</span>

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
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-emerald-100">
              <CheckSquare className="size-5 text-emerald-600" />
            </div>
            {tasks.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No tasks yet</p>
                  <p className="text-sm text-muted-foreground">Add your first task to get going.</p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New task
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks match &quot;{filter}&quot;.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 pl-0" />
                <TableHead className="text-[13px] font-medium text-muted-foreground">Name</TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">Assignee</TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">Project</TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">Priority</TableHead>
                <TableHead className="pr-0 text-right text-[13px] font-medium text-muted-foreground">
                  Due
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => {
                const status = task.properties?.status ?? "todo";
                const priority = task.properties?.priority;
                const dueDate = task.properties?.dueDate;
                const completed = status === "completed";
                const overdue = isOverdue(dueDate, status);

                return (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer border-border/70"
                    onClick={() => openTask(task)}
                  >
                    <TableCell className="w-8 py-2 pl-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={completed}
                        onCheckedChange={(checked) => toggleComplete(task, checked === true)}
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "py-2 text-[13px] font-medium",
                        completed && "text-muted-foreground line-through"
                      )}
                    >
                      {task.title}
                    </TableCell>
                    <TableCell className="text-[13px]">
                      {assigneeByTask[task.id] ? (
                        <span className="flex items-center gap-1.5">
                          <Avatar className="size-5">
                            <AvatarFallback
                              className={cn(
                                "text-[9px] font-semibold",
                                avatarColor(assigneeByTask[task.id]!.title)
                              )}
                            >
                              {initials(assigneeByTask[task.id]!.title)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-foreground/80">
                            {assigneeByTask[task.id]!.title}
                            {isSelf(assigneeByTask[task.id]!.properties) ? " (You)" : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <UserRound className="size-3.5" />
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[13px]">
                      {projectByTask[task.id] ? (
                        <span className="flex items-center gap-1.5 text-foreground/80">
                          <FolderKanban className="size-3.5 text-blue-600" />
                          <span className="truncate">{projectByTask[task.id]!.title}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          STATUS_BADGE[status]
                        )}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {priority ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            PRIORITY_BADGE[priority]
                          )}
                        >
                          {PRIORITY_LABEL[priority]}
                        </span>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "pr-0 text-right text-[13px]",
                        overdue ? "font-medium text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {dueDate ? formatDueDate(dueDate) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <TaskDetailSheet
        task={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
        onAssigneeChanged={handleAssigneeChanged}
        onProjectChanged={handleProjectChanged}
      />
    </div>
  );
}
