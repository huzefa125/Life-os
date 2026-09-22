"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ClipboardList, Inbox, LayoutTemplate, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "All Forms", href: "/forms", icon: ClipboardList },
  { label: "Responses", href: "/forms/responses", icon: Inbox },
  { label: "Templates", href: "/forms/templates", icon: LayoutTemplate },
];

export function FormsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-y bg-canvas px-6 py-1.5">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            {active ? (
              <motion.div
                layoutId="forms-tabs-active-pill"
                className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
            <tab.icon className={cn("size-3.5", active ? "text-indigo-600" : "text-muted-foreground")} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
