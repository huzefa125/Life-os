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
import { fromDatetimeLocal } from "@/lib/event-meta";
import type { CalendarEvent, EventMode } from "@/lib/types";
import { EventModeFields } from "./event-mode-fields";

function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultEnd(start: string) {
  const d = new Date(start);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (event: CalendarEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(() => defaultEnd(defaultStart()));
  const [mode, setMode] = useState<EventMode>("in_person");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    const start = defaultStart();
    setTitle("");
    setStartAt(start);
    setEndAt(defaultEnd(start));
    setMode("in_person");
    setLocation("");
    setLink("");
    setDescription("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !startAt || !endAt) return;
    setSubmitting(true);
    try {
      const created = await api.events.create({
        title: title.trim(),
        properties: {
          startAt: fromDatetimeLocal(startAt),
          endAt: fromDatetimeLocal(endAt),
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
      onCreated(created);
      toast.success(`${created.title} added`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create event");
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
            <DialogTitle>New event</DialogTitle>
            <DialogDescription>Add something to your calendar.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              autoFocus
              placeholder="Client meeting"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-start">Starts</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-end">Ends</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                required
              />
            </div>
          </div>

          <EventModeFields
            idPrefix="event"
            mode={mode}
            onModeChange={setMode}
            location={location}
            onLocationChange={setLocation}
            link={link}
            onLinkChange={setLink}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              placeholder="What's this about?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Adding…" : "Add event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
