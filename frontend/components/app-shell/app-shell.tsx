"use client";

import { useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CommandPalette } from "./command-palette";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

function Brand() {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <div className="flex size-6 items-center justify-center rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground shadow-sm">
        L
      </div>
      <span className="font-heading text-sm font-semibold tracking-tight">LifeOS</span>
    </div>
  );
}

function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-2 flex items-center gap-2 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-sm text-muted-foreground shadow-xs transition-colors hover:border-border hover:text-foreground"
    >
      <Search className="size-3.5" />
      <span className="flex-1 text-left">Search</span>
      <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-2 md:flex">
        <Brand />
        <SearchTrigger onClick={() => setPaletteOpen(true)} />
        <div className="mt-3 flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border px-2 pt-2">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur md:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileNavOpen(true)}>
            <Menu />
          </Button>
          <div className="flex size-5 items-center justify-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground">
            L
          </div>
          <span className="font-heading text-sm font-semibold">LifeOS</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={() => setPaletteOpen(true)}
          >
            <Search />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex flex-col bg-sidebar p-0 py-2">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Brand />
          <SearchTrigger
            onClick={() => {
              setMobileNavOpen(false);
              setPaletteOpen(true);
            }}
          />
          <div className="mt-3 flex-1 overflow-y-auto">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <div className="border-t px-2 pt-2">
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
