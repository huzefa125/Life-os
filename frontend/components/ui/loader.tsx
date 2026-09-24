import { cn } from "cn"

/** Inline spinner — a soft track with a gradient arc, for buttons, sheets and small areas. */
function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span
      data-slot="loader"
      role="status"
      aria-label="Loading"
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 rounded-full border-2 border-foreground/10" />
      <span
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-foreground/70 border-r-foreground/30"
        style={{ animation: "lifeos-orbit 0.75s cubic-bezier(0.5, 0.15, 0.5, 0.85) infinite" }}
      />
    </span>
  )
}

/** Three bouncing dots — for "working…" states inside text. */
function LoadingDots({ className }: { className?: string }) {
  return (
    <span data-slot="loader" className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1 rounded-full bg-current"
          style={{ animation: `lifeos-dot 1.1s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </span>
  )
}

/** Full-area branded loader: the LifeOS mark breathing inside an orbiting ring. */
function PageLoader({ label = "Loading", className, fullScreen = false }: { label?: string; className?: string; fullScreen?: boolean }) {
  return (
    <div
      data-slot="loader"
      role="status"
      aria-label={label}
      className={cn("flex flex-col items-center justify-center gap-4", fullScreen ? "min-h-screen" : "h-96", className)}
    >
      <div className="relative size-14">
        <span className="absolute inset-0 rounded-2xl border border-foreground/10" />
        <span
          className="absolute -inset-1.5 rounded-[1.1rem] border-2 border-transparent border-t-foreground/60 border-l-foreground/20"
          style={{ animation: "lifeos-orbit 1.1s linear infinite" }}
        />
        <span
          className="absolute inset-1.5 flex items-center justify-center rounded-xl bg-foreground text-lg font-semibold text-background shadow-sm"
          style={{ animation: "lifeos-breathe 1.8s ease-in-out infinite" }}
        >
          L
        </span>
      </div>
      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {label}
        <LoadingDots />
      </p>
    </div>
  )
}

export { LoadingDots, PageLoader, Spinner }
