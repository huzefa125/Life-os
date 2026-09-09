"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { avatarColor, initials } from "@/lib/avatar-color";
import { isSelf } from "@/lib/self-person";
import type { GenericObject } from "@/lib/types";
import { cn } from "@/lib/utils";

export const UNASSIGNED = "unassigned";

function displayName(person: GenericObject) {
  return isSelf(person.properties) ? `${person.title} (You)` : person.title;
}

function PersonRow({ person, checked }: { person: GenericObject; checked: boolean }) {
  return (
    <>
      <Avatar className="size-5">
        <AvatarFallback className={cn("text-[9px] font-semibold", avatarColor(person.title))}>
          {initials(person.title)}
        </AvatarFallback>
      </Avatar>
      <span className="flex-1 truncate">{displayName(person)}</span>
      {checked ? <Check className="size-3.5" /> : null}
    </>
  );
}

export function AssigneeSelect({
  value,
  selected,
  selfPerson,
  onChange,
  disabled,
}: {
  value: string;
  selected: GenericObject | null;
  selfPerson: GenericObject | null;
  onChange: (personId: string, person: GenericObject | null) => void;
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
    const request = api.people.list();
    queueMicrotask(() => {
      if (!cancelled) setBrowseLoading(true);
    });
    request
      .then((data) => {
        if (!cancelled) setBrowseList(data);
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
        .query(trimmed, "person")
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

  function select(id: string, person: GenericObject | null) {
    onChange(id, person);
    setOpen(false);
    setQuery("");
  }

  const searchResults = results.filter((r) => r.id !== selfPerson?.id);
  const browseResults = (browseList ?? []).filter((r) => r.id !== selfPerson?.id);
  const showingSearch = query.trim().length > 0;

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
            <Avatar className="size-5 shrink-0">
              <AvatarFallback
                className={cn("text-[9px] font-semibold", avatarColor(selected.title))}
              >
                {initials(selected.title)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{displayName(selected)}</span>
          </span>
        ) : (
          <span className="flex flex-1 items-center gap-2 text-left text-muted-foreground">
            <UserRound className="size-3.5" />
            Unassigned
          </span>
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-(--anchor-width) min-w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search people…" value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56">
            {showingSearch && !searching && searchResults.length === 0 ? (
              <CommandEmpty>No matches for &quot;{query}&quot;</CommandEmpty>
            ) : null}
            {!showingSearch && !browseLoading && browseResults.length === 0 ? (
              <CommandEmpty>No people yet</CommandEmpty>
            ) : null}

            <CommandGroup>
              <CommandItem value="unassigned" onSelect={() => select(UNASSIGNED, null)}>
                <UserRound className="size-3.5 text-muted-foreground" />
                <span className="flex-1">Unassigned</span>
                {value === UNASSIGNED ? <Check className="size-3.5" /> : null}
              </CommandItem>
              {selfPerson ? (
                <CommandItem value="self" onSelect={() => select(selfPerson.id, selfPerson)}>
                  <PersonRow person={selfPerson} checked={value === selfPerson.id} />
                </CommandItem>
              ) : null}
            </CommandGroup>

            {showingSearch ? (
              searchResults.length > 0 ? (
                <CommandGroup heading="Search results">
                  {searchResults.map((person) => (
                    <CommandItem
                      key={person.id}
                      value={`result-${person.id}`}
                      onSelect={() => select(person.id, person)}
                    >
                      <PersonRow person={person} checked={value === person.id} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null
            ) : browseResults.length > 0 ? (
              <CommandGroup heading="People">
                {browseResults.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={`browse-${person.id}`}
                    onSelect={() => select(person.id, person)}
                  >
                    <PersonRow person={person} checked={value === person.id} />
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
