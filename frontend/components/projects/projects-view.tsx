"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, List, Plus, Search } from "lucide-react";
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
import {
  formatDeadline,
  isPastDeadline,
  projectStatusBadge,
  projectStatusLabel,
} from "@/lib/project-meta";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectDetailSheet } from "./project-detail-sheet";

export function ProjectsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.projects
      .list()
      .then((data) => {
        if (cancelled) return;
        setProjects(data);
        const focusId = searchParams.get("focus");
        if (focusId) {
          const match = data.find((p) => p.id === focusId);
          if (match) {
            setSelected(match);
            setDetailOpen(true);
          }
          router.replace("/projects");
        }
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't load projects");
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
    if (!q) return projects;
    return projects.filter(
      (project) =>
        project.title.toLowerCase().includes(q) ||
        (project.properties?.description ?? "").toLowerCase().includes(q)
    );
  }, [filter, projects]);

  function openProject(project: Project) {
    setSelected(project);
    setDetailOpen(true);
  }

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
  }

  function handleUpdated(project: Project) {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
    setSelected(project);
  }

  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-blue-100 text-blue-600">
          <FolderKanban className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Projects</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {projects.length}
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
        <span className="text-[13px] font-medium text-foreground/80">All Projects</span>

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
            <div className="flex size-11 items-center justify-center rounded-full bg-blue-100">
              <FolderKanban className="size-5 text-blue-600" />
            </div>
            {projects.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No projects yet</p>
                  <p className="text-sm text-muted-foreground">
                    Track something bigger than a single task.
                  </p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New project
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No projects match &quot;{filter}&quot;.
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px] font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">
                  Description
                </TableHead>
                <TableHead className="pr-0 text-right text-[13px] font-medium text-muted-foreground">
                  Deadline
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((project) => {
                const status = project.properties?.status;
                const deadline = project.properties?.deadline;
                const overdue = isPastDeadline(deadline, status);

                return (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer border-border/70"
                    onClick={() => openProject(project)}
                  >
                    <TableCell className="py-2 pl-0 text-[13px] font-medium">
                      {project.title}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          projectStatusBadge(status)
                        )}
                      >
                        {projectStatusLabel(status)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-[13px] text-muted-foreground">
                      {project.properties?.description ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "pr-0 text-right text-[13px]",
                        overdue ? "font-medium text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {deadline ? formatDeadline(deadline) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <ProjectDetailSheet
        project={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
