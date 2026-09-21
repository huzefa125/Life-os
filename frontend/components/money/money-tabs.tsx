"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  Repeat,
  Tag,
  Target,
} from "lucide-react";
import { cn } from "cn";

const TABS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/money", icon: LayoutDashboard },
  { label: "Accounts", href: "/money/accounts", icon: Landmark },
  { label: "Transactions", href: "/money/transactions", icon: ArrowRightLeft },
  { label: "Budgets", href: "/money/budgets", icon: PiggyBank },
  { label: "Recurring", href: "/money/recurring", icon: Repeat },
  { label: "Goals", href: "/money/goals", icon: Target },
  { label: "Categories", href: "/money/categories", icon: Tag },
];

export function MoneyTabs() {
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
              "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <tab.icon className={cn("size-3.5", active ? "text-lime-600" : "text-muted-foreground")} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
