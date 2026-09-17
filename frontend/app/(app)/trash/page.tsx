import type { Metadata } from "next";
import { TrashView } from "@/components/trash/trash-view";

export const metadata: Metadata = {
  title: "Trash | LifeOS",
  description: "Restore soft-deleted items or permanently remove them",
};

export default function TrashPage() {
  return <TrashView />;
}
