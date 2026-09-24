import { CalendarDays, Columns3, LayoutGrid, Table2 } from "lucide-react";

import type { CollectionViewType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ViewIcon({ type, className }: { type: CollectionViewType; className?: string }) {
  const Icon = type === "board" ? Columns3 : type === "gallery" ? LayoutGrid : type === "calendar" ? CalendarDays : Table2;
  return <Icon className={cn("size-3.5 text-muted-foreground", className)} />;
}
