"use client";

import { Link2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_MODE_LABEL } from "@/lib/event-meta";
import type { EventMode } from "@/lib/types";

export function EventModeFields({
  idPrefix,
  mode,
  onModeChange,
  location,
  onLocationChange,
  link,
  onLinkChange,
}: {
  idPrefix: string;
  mode: EventMode;
  onModeChange: (mode: EventMode) => void;
  location: string;
  onLocationChange: (value: string) => void;
  link: string;
  onLinkChange: (value: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>Type</Label>
        <Select value={mode} onValueChange={(v) => onModeChange(v as EventMode)}>
          <SelectTrigger className="w-full">
            <SelectValue>{(v: EventMode) => EVENT_MODE_LABEL[v]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_person">
              <MapPin className="size-3.5" />
              {EVENT_MODE_LABEL.in_person}
            </SelectItem>
            <SelectItem value="online">
              <Link2 className="size-3.5" />
              {EVENT_MODE_LABEL.online}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "online" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-link`}>Meeting link</Label>
          <Input
            id={`${idPrefix}-link`}
            type="url"
            placeholder="https://meet.google.com/…"
            value={link}
            onChange={(e) => onLinkChange(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-location`}>Location</Label>
          <Input
            id={`${idPrefix}-location`}
            placeholder="Ahmedabad"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </div>
      )}
    </>
  );
}
