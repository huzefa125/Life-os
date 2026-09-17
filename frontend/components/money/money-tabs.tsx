"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const TABS = [
  { label: "Accounts", href: "/money" },
  { label: "Transactions", href: "/money/transactions" },
  { label: "Categories", href: "/money/categories" },
];

export function MoneyTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-y bg-canvas px-6 py-1.5">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
