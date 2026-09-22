"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ code, className }: { code: string; className?: string }) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    if (!hasCopied) return;
    const timeout = setTimeout(() => {
      setHasCopied(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [hasCopied]);

  return (
    <button
      type="button"
      className={cn(
        "relative z-10 flex h-7 w-7 items-center justify-center rounded-md border bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={() => {
        navigator.clipboard.writeText(code);
        setHasCopied(true);
      }}
    >
      <span className="sr-only">Copy</span>
      {hasCopied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
