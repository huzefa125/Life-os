"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Distinct subtle colors for preset tags
const TAG_STYLES: Record<string, string> = {
  work: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
  personal: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
  college: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  project: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
};

const DEFAULT_STYLE = "bg-muted text-muted-foreground border-border hover:border-foreground/20";

export function formatTagName(tag: string) {
  const clean = tag.startsWith("#") ? tag.slice(1).trim() : tag.trim();
  return `#${clean}`;
}

export function TagBadge({
  tag,
  onRemove,
  onClick,
  active = false,
  className,
}: {
  tag: string;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const clean = tag.startsWith("#") ? tag.slice(1).toLowerCase().trim() : tag.toLowerCase().trim();
  const colorStyle = TAG_STYLES[clean] ?? DEFAULT_STYLE;

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all",
        colorStyle,
        onClick && "cursor-pointer hover:opacity-85 select-none",
        active && "ring-2 ring-primary ring-offset-1",
        className
      )}
    >
      <span>#{clean}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
