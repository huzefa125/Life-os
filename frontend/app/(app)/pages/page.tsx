import type { Metadata } from "next";
import { PagesView } from "@/components/pages/pages-view";

export const metadata: Metadata = {
  title: "Pages | LifeOS",
  description: "Notion-style documents with interactive blocks",
};

export default function PagesPage() {
  return <PagesView />;
}
