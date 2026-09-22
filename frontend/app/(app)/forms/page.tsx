import type { Metadata } from "next";
import { FormsListView } from "@/components/forms/forms-list-view";

export const metadata: Metadata = {
  title: "Forms | LifeOS",
  description: "Build forms that create real LifeOS objects on submission",
};

export default function FormsPage() {
  return <FormsListView />;
}
