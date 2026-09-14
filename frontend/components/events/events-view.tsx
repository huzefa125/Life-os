"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, List, Plus, Search, Trash2 } from "lucide-react";
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import type { CalendarEvent, EventProperties } from "@/lib/types";

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(local: string) {
  return new Date(local).toISOString();
}

function formatDateTime(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function defaultEnd(start: string) {
  const date = start ? new Date(start) : new Date();
  date.setHours(date.getHours() + 1);
  return toLocalInput(date.toISOString());
}

export function EventsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.events
      .list()
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
        const focusId = searchParams.get("focus");
        const match = focusId ? data.find((event) => event.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/events");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load events"))
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
    if (!q) return events;
    return events.filter((event) => {
      const properties = event.properties;
      return (
        event.title.toLowerCase().includes(q) ||
        (properties?.location ?? "").toLowerCase().includes(q) ||
        (properties?.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, filter]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-rose-100 text-rose-600">
          <CalendarDays className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Events</h1>
        {!loading ? <span className="text-[13px] text-muted-foreground">{events.length}</span> : null}
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New
        </Button>
      </div>

      <div className="flex items-center gap-1.5 border-y bg-canvas px-6 py-1.5">
        <List className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground/80">All Events</span>
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
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasItems={events.length > 0} filter={filter} onCreate={() => setCreateOpen(true)} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px]">Title</TableHead>
                <TableHead className="text-[13px]">When</TableHead>
                <TableHead className="text-[13px]">Location</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => {
                    setSelected(event);
                    setDetailOpen(true);
                  }}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">{event.title}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {formatDateTime(event.properties?.startAt)}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {event.properties?.location || "-"}
                  </TableCell>
                  <TableCell className="pr-0 text-right text-[13px] text-muted-foreground">
                    {formatDateTime(event.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(event) => setEvents((prev) => [event, ...prev])}
      />
      <EventDetailSheet
        event={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(event) => {
          setEvents((prev) => prev.map((item) => (item.id === event.id ? event : item)));
          setSelected(event);
        }}
        onDeleted={(id) => setEvents((prev) => prev.filter((event) => event.id !== id))}
      />
    </div>
  );
}

function EmptyState({ hasItems, filter, onCreate }: { hasItems: boolean; filter: string; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-rose-100">
        <CalendarDays className="size-5 text-rose-600" />
      </div>
      {hasItems ? (
        <p className="text-sm text-muted-foreground">No events match &quot;{filter}&quot;.</p>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium">No events yet</p>
            <p className="text-sm text-muted-foreground">Add meetings, appointments, and deadlines.</p>
          </div>
          <Button size="sm" onClick={onCreate}>
            <Plus className="size-3.5" />
            New event
          </Button>
        </>
      )}
    </div>
  );
}

function EventFields({
  title,
  setTitle,
  properties,
  setProperties,
}: {
  title: string;
  setTitle: (value: string) => void;
  properties: EventProperties;
  setProperties: (value: EventProperties) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-title">Title</Label>
        <Input id="event-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-start">Start</Label>
          <Input
            id="event-start"
            type="datetime-local"
            value={toLocalInput(properties.startAt)}
            onChange={(event) =>
              setProperties({ ...properties, startAt: toIso(event.target.value), endAt: properties.endAt || toIso(defaultEnd(event.target.value)) })
            }
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-end">End</Label>
          <Input
            id="event-end"
            type="datetime-local"
            value={toLocalInput(properties.endAt)}
            onChange={(event) => setProperties({ ...properties, endAt: toIso(event.target.value) })}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-location">Location</Label>
        <Input
          id="event-location"
          value={properties.location ?? ""}
          onChange={(event) => setProperties({ ...properties, location: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-description">Description</Label>
        <Textarea
          id="event-description"
          rows={4}
          value={properties.description ?? ""}
          onChange={(event) => setProperties({ ...properties, description: event.target.value })}
        />
      </div>
    </>
  );
}

function initialEventProperties(): EventProperties {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { startAt: start.toISOString(), endAt: end.toISOString(), location: "", description: "" };
}

function CreateEventDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (event: CalendarEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [properties, setProperties] = useState<EventProperties>(initialEventProperties);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setProperties(initialEventProperties());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.events.create({ title: title.trim(), properties });
      onCreated(created);
      toast.success(`${created.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
            <DialogDescription>Add something scheduled.</DialogDescription>
          </DialogHeader>
          <EventFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} />
          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Adding..." : "Add event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailSheet({
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
  if (!event) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <EventDetailForm key={event.id} event={event} onOpenChange={onOpenChange} onUpdated={onUpdated} onDeleted={onDeleted} />
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
  const [properties, setProperties] = useState<EventProperties>(event.properties ?? initialEventProperties());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await api.events.update(event.id, { title: title.trim(), properties });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save event");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.events.remove(event.id);
      onDeleted(event.id);
      onOpenChange(false);
      toast.success(`${event.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete event");
    } finally {
      setDeleting(false);
    }
  }

  const dirty = title.trim() !== event.title || JSON.stringify(properties) !== JSON.stringify(event.properties ?? {});

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{event.title}</SheetTitle>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0" />
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <EventFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} />
        </div>
        <div className="mt-6 text-xs text-muted-foreground">Updated {formatDateTime(event.updatedAt)}</div>
      </div>
      <SheetFooter className="flex-row items-center justify-between">
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={onDelete}>
          <Trash2 className="size-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
        <Button size="sm" disabled={!dirty || saving || !title.trim()} onClick={onSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
