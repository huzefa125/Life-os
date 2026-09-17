"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, FolderKanban, List, Plus, Search } from "lucide-react";
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
import { findParentProject } from "@/lib/relations";
import type { GenericObject, Note } from "@/lib/types";
import { CreateNoteDialog } from "./create-note-dialog";
import { NoteDetailSheet } from "./note-detail-sheet";

export function NotesView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Note | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [projectByNote, setProjectByNote] = useState<Record<string, GenericObject | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadProjects(list: Note[]) {
      const entries = await Promise.all(
        list.map(async (n) => {
          try {
            const connections = await api.objects.connections(n.id);
            return [n.id, findParentProject(connections.connections, "has_note")?.project ?? null] as const;
          } catch {
            return [n.id, null] as const;
          }
        })
      );
      if (!cancelled) setProjectByNote(Object.fromEntries(entries));
    }

    api.notes
      .list()
      .then((data) => {
        if (cancelled) return;
        setNotes(data);
        const focusId = searchParams.get("focus");
        if (focusId) {
          const match = data.find((n) => n.id === focusId);
          if (match) {
            setSelected(match);
            setDetailOpen(true);
          }
          router.replace("/notes");
        }
        loadProjects(data);
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't load notes");
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
    if (!q) return notes;
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        (note.properties?.content ?? "").toLowerCase().includes(q)
    );
  }, [filter, notes]);

  function openNote(note: Note) {
    setSelected(note);
    setDetailOpen(true);
  }

  function handleCreated(note: Note, extra: { project: GenericObject | null }) {
    setNotes((prev) => [note, ...prev]);
    setProjectByNote((prev) => ({ ...prev, [note.id]: extra.project }));
  }

  function handleUpdated(note: Note) {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    setSelected(note);
  }

  function handleDeleted(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function handleProjectChanged(noteId: string, project: GenericObject | null) {
    setProjectByNote((prev) => ({ ...prev, [noteId]: project }));
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-amber-100 text-amber-600">
          <FileText className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Notes</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {notes.length}
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
        <span className="text-[13px] font-medium text-foreground/80">All Notes</span>

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
            <div className="flex size-11 items-center justify-center rounded-full bg-amber-100">
              <FileText className="size-5 text-amber-600" />
            </div>
            {notes.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No notes yet</p>
                  <p className="text-sm text-muted-foreground">Jot something down.</p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New note
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No notes match &quot;{filter}&quot;.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px] font-medium text-muted-foreground">
                  Title
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">
                  Preview
                </TableHead>
                <TableHead className="pr-0 text-[13px] font-medium text-muted-foreground">
                  Project
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((note) => (
                <TableRow
                  key={note.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => openNote(note)}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">{note.title}</TableCell>
                  <TableCell className="max-w-md truncate text-[13px] text-muted-foreground">
                    {note.properties?.content ?? "—"}
                  </TableCell>
                  <TableCell className="pr-0 text-[13px]">
                    {projectByNote[note.id] ? (
                      <span className="flex items-center gap-1.5 text-foreground/80">
                        <FolderKanban className="size-3.5 text-blue-600" />
                        <span className="truncate">{projectByNote[note.id]!.title}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateNoteDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <NoteDetailSheet
        note={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
        onProjectChanged={handleProjectChanged}
      />
    </div>
  );
}
