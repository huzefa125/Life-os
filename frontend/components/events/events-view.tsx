"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Link2, List, MapPin, Plus, Search } from "lucide-react";
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
import { formatEventRange, isPastEvent } from "@/lib/event-meta";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateEventDialog } from "./create-event-dialog";
import { EventDetailSheet } from "./event-detail-sheet";

export function EventsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.events
      .list()
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
        const focusId = searchParams.get("focus");
        if (focusId) {
          const match = data.find((e) => e.id === focusId);
          if (match) {
            setSelected(match);
            setDetailOpen(true);
          }
          router.replace("/events");
        }
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't load events");
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
    const list = !q
      ? events
      : events.filter(
          (event) =>
            event.title.toLowerCase().includes(q) ||
            (event.properties?.location ?? "").toLowerCase().includes(q) ||
            (event.properties?.link ?? "").toLowerCase().includes(q)
        );
    return [...list].sort((a, b) => {
      const aStart = a.properties?.startAt ?? "";
      const bStart = b.properties?.startAt ?? "";
      return aStart.localeCompare(bStart);
    });
  }, [filter, events]);

  function openEvent(event: Event) {
    setSelected(event);
    setDetailOpen(true);
  }

  function handleCreated(event: Event) {
    setEvents((prev) => [event, ...prev]);
  }

  function handleUpdated(event: Event) {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    setSelected(event);
  }

  function handleDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-rose-100 text-rose-600">
          <CalendarDays className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Events</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {events.length}
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
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-rose-100">
              <CalendarDays className="size-5 text-rose-600" />
            </div>
            {events.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No events yet</p>
                  <p className="text-sm text-muted-foreground">Add something to your calendar.</p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New event
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No events match &quot;{filter}&quot;.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px] font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">When</TableHead>
                <TableHead className="pr-0 text-[13px] font-medium text-muted-foreground">
                  Where
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((event) => {
                const startAt = event.properties?.startAt;
                const endAt = event.properties?.endAt;
                const past = endAt ? isPastEvent(endAt) : false;

                return (
                  <TableRow
                    key={event.id}
                    className="cursor-pointer border-border/70"
                    onClick={() => openEvent(event)}
                  >
                    <TableCell
                      className={cn(
                        "py-2 pl-0 text-[13px] font-medium",
                        past && "text-muted-foreground"
                      )}
                    >
                      {event.title}
                    </TableCell>
                    <TableCell
                      className={cn("text-[13px]", past ? "text-muted-foreground" : "text-foreground/80")}
                    >
                      {startAt && endAt ? formatEventRange(startAt, endAt) : "—"}
                    </TableCell>
                    <TableCell className="pr-0 text-[13px] text-muted-foreground">
                      {event.properties?.mode === "online" && event.properties.link ? (
                        <a
                          href={event.properties.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-primary hover:underline"
                        >
                          <Link2 className="size-3.5" />
                          Join
                        </a>
                      ) : event.properties?.location ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {event.properties.location}
                        </span>
                      ) : event.properties?.mode === "online" ? (
                        <span className="flex items-center gap-1.5">
                          <Link2 className="size-3.5" />
                          Online
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <EventDetailSheet
        event={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
