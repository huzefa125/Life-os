"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, FolderKanban } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api-client";
import type { GenericObject, JsonValue, Project } from "@/lib/types";

export const NO_PROJECT = "none";

function toGenericObject(project: Project): GenericObject {
  return { ...project, properties: project.properties as unknown as Record<string, JsonValue> | null };
}

function ProjectIcon() {
  return (
    <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-600">
      <FolderKanban className="size-3" />
    </div>
  );
}

function ProjectRow({ project, checked }: { project: GenericObject; checked: boolean }) {
  return (
    <>
      <ProjectIcon />
      <span className="flex-1 truncate">{project.title}</span>
      {checked ? <Check className="size-3.5" /> : null}
    </>
  );
}

export function ProjectSelect({
  value,
  selected,
  onChange,
  disabled,
}: {
  value: string;
  selected: GenericObject | null;
  onChange: (projectId: string, project: GenericObject | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GenericObject[]>([]);
  const [searching, setSearching] = useState(false);
  const [browseList, setBrowseList] = useState<GenericObject[] | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);

  useEffect(() => {
    if (!open || browseList !== null) return;
    let cancelled = false;
    const request = api.projects.list();
    queueMicrotask(() => {
      if (!cancelled) setBrowseLoading(true);
    });
    request
      .then((data) => {
        if (!cancelled) setBrowseList(data.map(toGenericObject));
      })
      .catch(() => {
        if (!cancelled) setBrowseList([]);
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, browseList]);

  useEffect(() => {
    const trimmed = query.trim();
    let cancelled = false;

    if (!trimmed) {
      queueMicrotask(() => {
        if (!cancelled) setResults([]);
      });
      return () => {
        cancelled = true;
      };
    }

    const timeout = setTimeout(() => {
      setSearching(true);
      api.search
        .query(trimmed, "project")
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  function select(id: string, project: GenericObject | null) {
    onChange(id, project);
    setOpen(false);
    setQuery("");
  }

  const showingSearch = query.trim().length > 0;
  const list = showingSearch ? results : (browseList ?? []);
  const empty = showingSearch ? !searching && list.length === 0 : !browseLoading && list.length === 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selected ? (
          <span className="flex flex-1 items-center gap-2 overflow-hidden text-left">
            <ProjectIcon />
            <span className="truncate">{selected.title}</span>
          </span>
        ) : (
          <span className="flex flex-1 items-center gap-2 text-left text-muted-foreground">
            <FolderKanban className="size-3.5" />
            No project
          </span>
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-(--anchor-width) min-w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search projects…" value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56">
            {empty ? (
              <CommandEmpty>
                {showingSearch ? `No matches for "${query}"` : "No projects yet"}
              </CommandEmpty>
            ) : null}

            <CommandGroup>
              <CommandItem value="none" onSelect={() => select(NO_PROJECT, null)}>
                <FolderKanban className="size-3.5 text-muted-foreground" />
                <span className="flex-1">No project</span>
                {value === NO_PROJECT ? <Check className="size-3.5" /> : null}
              </CommandItem>
            </CommandGroup>

            {list.length > 0 ? (
              <CommandGroup heading={showingSearch ? "Search results" : "Projects"}>
                {list.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`${showingSearch ? "result" : "browse"}-${project.id}`}
                    onSelect={() => select(project.id, project)}
                  >
                    <ProjectRow project={project} checked={value === project.id} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
