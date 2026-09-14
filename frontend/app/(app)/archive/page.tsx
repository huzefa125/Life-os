import type { Metadata } from "next";
import { ArchiveView } from "@/components/archive/archive-view";

export const metadata: Metadata = {
  title: "Archive | LifeOS",
  description: "View and restore archived objects",
};

export default function ArchivePage() {
  return <ArchiveView />;
}
