"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { avatarColor, initials } from "@/lib/avatar-color";
import { findAssignedTasks } from "@/lib/relations";
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/task-meta";
import { cn } from "@/lib/utils";
import type { GenericObject, JsonValue, Person, TaskStatus } from "@/lib/types";
import {
  extractString,
  PropertyEditor,
  propertiesToRows,
  rowsToProperties,
  type PropertyRow,
} from "./property-editor";

const NAMED_FIELDS = ["email", "company", "notes"];
// Not user-editable, but must survive a save since properties are replaced wholesale.
const HIDDEN_FIELDS = ["self"];

export function PersonDetailSheet({
  person,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (person: Person) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {person ? (
          <PersonDetailForm
            key={person.id}
            person={person}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PersonDetailForm({
  person,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  person: Person;
  onOpenChange: (open: boolean) => void;
  onUpdated: (person: Person) => void;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(person.title);
  const [email, setEmail] = useState(() => extractString(person.properties, "email"));
  const [company, setCompany] = useState(() => extractString(person.properties, "company"));
  const [notes, setNotes] = useState(() => extractString(person.properties, "notes"));
  const [rows, setRows] = useState<PropertyRow[]>(() =>
    propertiesToRows(person.properties, [...NAMED_FIELDS, ...HIDDEN_FIELDS])
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [assignedTasks, setAssignedTasks] = useState<GenericObject[]>([]);
  const [assignedTasksLoading, setAssignedTasksLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.objects
      .connections(person.id)
      .then((data) => {
        if (!cancelled) setAssignedTasks(findAssignedTasks(data.connections));
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load assigned tasks");
      })
      .finally(() => {
        if (!cancelled) setAssignedTasksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [person.id]);

  function goToTask(taskId: string) {
    onOpenChange(false);
    router.push(`/tasks?focus=${taskId}`);
  }

  function buildProperties() {
    const hidden: Record<string, JsonValue> = {};
    for (const key of HIDDEN_FIELDS) {
      if (person.properties && key in person.properties) {
        hidden[key] = person.properties[key];
      }
    }
    return {
      ...hidden,
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(company.trim() ? { company: company.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...rowsToProperties(rows),
    };
  }

  const dirty =
    title.trim() !== person.title ||
    JSON.stringify(buildProperties()) !== JSON.stringify(person.properties ?? {});

  async function onSave() {
    if (!person || !title.trim()) return;
    setSaving(true);
    try {
      const updated = await api.people.update(person.id, {
        name: title.trim(),
        properties: buildProperties(),
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
    if (!person) return;
    setDeleting(true);
    try {
      await api.people.remove(person.id);
      toast.success(`${person.title} deleted`);
      onDeleted(person.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete person");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{person.title}</SheetTitle>
        <div className="flex items-center gap-3">
          <Avatar className="size-11">
            <AvatarFallback className={cn("text-sm font-semibold", avatarColor(person.title))}>
              {initials(person.title)}
            </AvatarFallback>
          </Avatar>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0"
          />
        </div>
      </SheetHeader>

      <Separator />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-email">Email</Label>
            <Input
              id="detail-email"
              type="email"
              placeholder="—"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-company">Company</Label>
            <Input
              id="detail-company"
              placeholder="—"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="detail-notes">Notes</Label>
          <Textarea
            id="detail-notes"
            placeholder="Add any notes…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label>Other properties</Label>
          <PropertyEditor rows={rows} onChange={setRows} />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <CheckSquare className="size-3.5" />
            Assigned tasks
            {!assignedTasksLoading ? (
              <span className="text-muted-foreground">({assignedTasks.length})</span>
            ) : null}
          </Label>
          {assignedTasksLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : assignedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
          ) : (
            <div className="flex flex-col gap-1 rounded-lg border">
              {assignedTasks.map((task) => {
                const taskStatus = (task.properties?.status as TaskStatus | undefined) ?? "todo";
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => goToTask(task.id)}
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
      </div>

      <Separator />

      <SheetFooter className="flex-row items-center justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete {person.title}?</span>
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
