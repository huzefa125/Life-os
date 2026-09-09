"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, List, Mail, Plus, Search, Tag, Users } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { avatarColor, initials } from "@/lib/avatar-color";
import { isSelf } from "@/lib/self-person";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreatePersonDialog } from "./create-person-dialog";
import { PersonDetailSheet } from "./person-detail-sheet";

function propertyValue(person: Person, key: string) {
  const value = person.properties?.[key];
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

const BUILT_IN_KEYS = ["email", "company", "self"];

function capitalize(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function PeopleView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Person | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.people
      .list()
      .then((data) => {
        if (cancelled) return;
        setPeople(data);
        const focusId = searchParams.get("focus");
        if (focusId) {
          const match = data.find((p) => p.id === focusId);
          if (match) {
            setSelected(match);
            setDetailOpen(true);
          }
          router.replace("/people");
        }
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't load people");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extraKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const person of people) {
      for (const key of Object.keys(person.properties ?? {})) {
        if (!BUILT_IN_KEYS.includes(key)) keys.add(key);
      }
    }
    return Array.from(keys).sort();
  }, [people]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return people;
    return people.filter((person) => {
      if (person.title.toLowerCase().includes(q)) return true;
      const props = person.properties ?? {};
      return Object.values(props).some((value) =>
        typeof value === "string" ? value.toLowerCase().includes(q) : false
      );
    });
  }, [filter, people]);

  function openPerson(person: Person) {
    setSelected(person);
    setDetailOpen(true);
  }

  function handleCreated(person: Person) {
    setPeople((prev) => [person, ...prev]);
  }

  function handleUpdated(person: Person) {
    setPeople((prev) => prev.map((p) => (p.id === person.id ? person : p)));
    setSelected(person);
  }

  function handleDeleted(id: string) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-violet-100 text-violet-600">
          <Users className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">People</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {people.length}
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
        <span className="text-[13px] font-medium text-foreground/80">All People</span>

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
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-violet-100">
              <Users className="size-5 text-violet-600" />
            </div>
            {people.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No people yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add the first person to your workspace.
                  </p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New person
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No people match &quot;{filter}&quot;.
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    Name
                  </span>
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    Email
                  </span>
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    Company
                  </span>
                </TableHead>
                {extraKeys.map((key) => (
                  <TableHead key={key} className="text-[13px] font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Tag className="size-3.5" />
                      {capitalize(key)}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="pr-0 text-right text-[13px] font-medium text-muted-foreground">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((person) => (
                <TableRow
                  key={person.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => openPerson(person)}
                >
                  <TableCell className="py-2 pl-0 text-[13px]">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarFallback
                          className={cn("text-[9px] font-semibold", avatarColor(person.title))}
                        >
                          {initials(person.title)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{person.title}</span>
                      {isSelf(person.properties) ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          You
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {propertyValue(person, "email") ?? "—"}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {propertyValue(person, "company") ?? "—"}
                  </TableCell>
                  {extraKeys.map((key) => (
                    <TableCell key={key} className="text-[13px] text-muted-foreground">
                      {propertyValue(person, key) ?? "—"}
                    </TableCell>
                  ))}
                  <TableCell className="pr-0 text-right text-[13px] text-muted-foreground">
                    {formatDate(person.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreatePersonDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <PersonDetailSheet
        person={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
