import {
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  Landmark,
  type LucideIcon,
  Paperclip,
  Receipt,
  Tag,
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
  task: { label: "Tasks", icon: CheckSquare, basePath: "/tasks", color: "text-emerald-600" },
  project: { label: "Projects", icon: FolderKanban, basePath: "/projects", color: "text-blue-600" },
  note: { label: "Notes", icon: FileText, basePath: "/notes", color: "text-amber-600" },
  event: { label: "Events", icon: CalendarDays, basePath: "/events", color: "text-rose-600" },
  file: { label: "Files", icon: Paperclip, basePath: "/files", color: "text-cyan-600" },
  account: { label: "Accounts", icon: Landmark, basePath: "/money", color: "text-lime-600" },
  category: { label: "Categories", icon: Tag, basePath: "/money/categories", color: "text-lime-600" },
  transaction: { label: "Transactions", icon: Receipt, basePath: "/money/transactions", color: "text-lime-600" },
};
