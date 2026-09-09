"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-px px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        if (!item.enabled) {
          return (
            <div
              key={item.href}
              className="flex items-center gap-2 rounded-md px-2 py-[5px] text-[13px] text-muted-foreground/40"
              title="Coming soon"
            >
              <Icon className="size-[15px] shrink-0" />
              <span className="flex-1">{item.label}</span>
              <span className="size-1 rounded-full bg-muted-foreground/25" />
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-[5px] text-[13px] font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-foreground"
                : "text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <Icon className={cn("size-[15px] shrink-0", item.color)} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
