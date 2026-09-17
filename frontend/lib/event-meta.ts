import type { EventMode } from "@/lib/types";

export const EVENT_MODE_LABEL: Record<EventMode, string> = {
  online: "Online",
  in_person: "In person",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Converts an ISO datetime string to the value a `<input type="datetime-local">` expects, in local time. */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converts a `<input type="datetime-local">` value (local time) to an ISO datetime string for the API. */
export function fromDatetimeLocal(local: string): string {
  return new Date(local).toISOString();
}

export function formatEventRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  const dateFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

  if (sameDay) {
    return `${start.toLocaleDateString(undefined, dateFmt)} · ${start.toLocaleTimeString(undefined, timeFmt)}–${end.toLocaleTimeString(undefined, timeFmt)}`;
  }
  return `${start.toLocaleDateString(undefined, dateFmt)} – ${end.toLocaleDateString(undefined, dateFmt)}`;
}

export function isPastEvent(endAt: string): boolean {
  return new Date(endAt) < new Date();
}
