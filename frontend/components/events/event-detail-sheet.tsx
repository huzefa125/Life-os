"use client";

import { useState } from "react";
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
import { DateTimePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import type { CalendarEvent, EventMode } from "@/lib/types";
import { EventModeFields } from "./event-mode-fields";

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {event ? (
          <EventDetailForm
            key={event.id}
            event={event}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EventDetailForm({
  event,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  event: CalendarEvent;
  onOpenChange: (open: boolean) => void;
  onUpdated: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [startAt, setStartAt] = useState(event.properties?.startAt ?? "");
  const [endAt, setEndAt] = useState(event.properties?.endAt ?? "");
  const [mode, setMode] = useState<EventMode>(event.properties?.mode ?? "in_person");
  const [location, setLocation] = useState(event.properties?.location ?? "");
  const [link, setLink] = useState(event.properties?.link ?? "");
  const [description, setDescription] = useState(event.properties?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loadedStartAt = event.properties?.startAt ?? "";
  const loadedEndAt = event.properties?.endAt ?? "";

  const dirty =
    title.trim() !== event.title ||
    startAt !== loadedStartAt ||
    endAt !== loadedEndAt ||
    mode !== (event.properties?.mode ?? "in_person") ||
    location.trim() !== (event.properties?.location ?? "") ||
    link.trim() !== (event.properties?.link ?? "") ||
    description.trim() !== (event.properties?.description ?? "");

  async function onSave() {
    if (!title.trim() || !startAt || !endAt) return;
    setSaving(true);
    try {
      const updated = await api.events.update(event.id, {
        title: title.trim(),
        properties: {
          startAt,
          endAt,
          mode,
          ...(mode === "online"
            ? link.trim()
              ? { link: link.trim() }
              : {}
            : location.trim()
              ? { location: location.trim() }
              : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
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
      await api.events.remove(event.id);
      toast.success(`${event.title} deleted`);
      onDeleted(event.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete event");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{event.title}</SheetTitle>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </SheetHeader>

      <Separator />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Starts</Label>
            <DateTimePicker value={startAt} onChange={(v) => v && setStartAt(v)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ends</Label>
            <DateTimePicker value={endAt} onChange={(v) => v && setEndAt(v)} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <EventModeFields
            idPrefix="detail"
            mode={mode}
            onModeChange={setMode}
            location={location}
            onLocationChange={setLocation}
            link={link}
            onLinkChange={setLink}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="detail-description">Description</Label>
          <Textarea
            id="detail-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <Separator />

      <SheetFooter className="flex-row items-center justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete {event.title}?</span>
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
          disabled={!dirty || saving || !title.trim() || !startAt || !endAt}
          onClick={onSave}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
