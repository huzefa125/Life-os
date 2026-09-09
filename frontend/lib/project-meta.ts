export const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

export const PROJECT_STATUS_BADGE: Record<ProjectStatus, string> = {
  planning: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

export function projectStatusLabel(status: string | undefined): string {
  if (!status) return "—";
  return PROJECT_STATUS_LABEL[status as ProjectStatus] ?? status;
}

export function projectStatusBadge(status: string | undefined): string {
  if (!status) return "bg-muted text-muted-foreground";
  return PROJECT_STATUS_BADGE[status as ProjectStatus] ?? "bg-muted text-muted-foreground";
}

export function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isPastDeadline(deadline: string | undefined, status: string | undefined): boolean {
  if (!deadline || status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(deadline) < today;
}
