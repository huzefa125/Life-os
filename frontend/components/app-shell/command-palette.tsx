"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api } from "@/lib/api-client";
import type { GenericObject } from "@/lib/types";
import { OBJECT_TYPE_META } from "@/lib/type-meta";
import { navItems } from "./nav-items";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GenericObject[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    let cancelled = false;

    if (trimmed.length < 2) {
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
        .query(trimmed)
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

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      setResults([]);
    }
    onOpenChange(next);
  }

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const enabledNavItems = navItems.filter(
    (item) => item.enabled && item.label.toLowerCase().includes(query.toLowerCase())
  );

  const groupedResults = Object.entries(OBJECT_TYPE_META).map(([type, meta]) => ({
    type,
    meta,
    items: results.filter((r) => r.type === type),
  }));
  const hasSearchableResults = groupedResults.some((group) => group.items.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search LifeOS…" value={query} onValueChange={setQuery} />
        <CommandList>
          {query.trim().length >= 2 && !searching && !hasSearchableResults ? (
            <CommandEmpty>No results for &quot;{query}&quot;</CommandEmpty>
          ) : null}

          {enabledNavItems.length > 0 ? (
            <CommandGroup heading="Go to">
              {enabledNavItems.map((item) => (
                <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {groupedResults.map(({ type, meta, items }) =>
            items.length > 0 ? (
              <CommandGroup key={type} heading={meta.label}>
                {items.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => go(meta.href ? meta.href(result) : `${meta.basePath}?focus=${result.id}`)}
                  >
                    <meta.icon />
                    <span className="flex-1 truncate">{result.title}</span>
                    <ArrowRight className="size-3.5 opacity-40" />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
