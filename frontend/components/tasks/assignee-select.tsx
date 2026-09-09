"use client";

import { UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { avatarColor, initials } from "@/lib/avatar-color";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export const UNASSIGNED = "unassigned";

export function AssigneeSelect({
  people,
  value,
  onChange,
  disabled,
}: {
  people: Person[];
  value: string;
  onChange: (personId: string) => void;
  disabled?: boolean;
}) {
  function label(personId: string | null) {
    if (!personId || personId === UNASSIGNED) return "Unassigned";
    return people.find((p) => p.id === personId)?.title ?? "Unassigned";
  }

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next ?? UNASSIGNED)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue>{(v: string | null) => label(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>
          <span className="flex items-center gap-2 text-muted-foreground">
            <UserRound className="size-3.5" />
            Unassigned
          </span>
        </SelectItem>
        {people.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            <span className="flex items-center gap-2">
              <Avatar className="size-5">
                <AvatarFallback
                  className={cn("text-[9px] font-semibold", avatarColor(person.title))}
                >
                  {initials(person.title)}
                </AvatarFallback>
              </Avatar>
              {person.title}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
