import {
  Building2,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  Landmark,
  type LucideIcon,
  Paperclip,
  PiggyBank,
  Receipt,
  Repeat,
  Tag,
  Target,
  User,
} from "lucide-react";

export interface ObjectTypeMeta {
  label: string;
  icon: LucideIcon;
  basePath: string;
  color: string;
}

export const OBJECT_TYPE_META: Record<string, ObjectTypeMeta> = {
  person: { label: "People", icon: User, basePath: "/people", color: "text-violet-600" },
  company: { label: "Companies", icon: Building2, basePath: "/companies", color: "text-fuchsia-600" },
  task: { label: "Tasks", icon: CheckSquare, basePath: "/tasks", color: "text-emerald-600" },
  project: { label: "Projects", icon: FolderKanban, basePath: "/projects", color: "text-blue-600" },
  note: { label: "Notes", icon: FileText, basePath: "/notes", color: "text-amber-600" },
  event: { label: "Events", icon: CalendarDays, basePath: "/events", color: "text-rose-600" },
  file: { label: "Files", icon: Paperclip, basePath: "/files", color: "text-cyan-600" },
  account: { label: "Accounts", icon: Landmark, basePath: "/money/accounts", color: "text-lime-600" },
  category: { label: "Categories", icon: Tag, basePath: "/money/categories", color: "text-lime-600" },
  transaction: { label: "Transactions", icon: Receipt, basePath: "/money/transactions", color: "text-lime-600" },
  budget: { label: "Budgets", icon: PiggyBank, basePath: "/money/budgets", color: "text-lime-600" },
  recurring_transaction: { label: "Recurring", icon: Repeat, basePath: "/money/recurring", color: "text-lime-600" },
  goal: { label: "Goals", icon: Target, basePath: "/money/goals", color: "text-lime-600" },
};
