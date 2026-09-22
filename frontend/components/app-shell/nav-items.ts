import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  FolderKanban,
  History,
  type LucideIcon,
  Paperclip,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  color: string;
}

export const navItems: NavItem[] = [
  { label: "Pages", href: "/pages", icon: BookOpen, enabled: true, color: "text-orange-500" },
  { label: "People", href: "/people", icon: Users, enabled: true, color: "text-violet-600" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, enabled: true, color: "text-emerald-600" },
  { label: "Projects", href: "/projects", icon: FolderKanban, enabled: true, color: "text-blue-600" },
  { label: "Notes", href: "/notes", icon: FileText, enabled: true, color: "text-amber-600" },
  { label: "Events", href: "/events", icon: CalendarDays, enabled: true, color: "text-rose-600" },
  { label: "Files", href: "/files", icon: Paperclip, enabled: true, color: "text-cyan-600" },
  { label: "Money", href: "/money", icon: Wallet, enabled: true, color: "text-lime-600" },
  { label: "Forms", href: "/forms", icon: ClipboardList, enabled: true, color: "text-indigo-600" },
  { label: "Timeline", href: "/timeline", icon: History, enabled: true, color: "text-slate-500" },
];

export const secondaryNavItems: NavItem[] = [
  { label: "Archive", href: "/archive", icon: Archive, enabled: true, color: "text-slate-500" },
  { label: "Trash", href: "/trash", icon: Trash2, enabled: true, color: "text-rose-500" },
];
