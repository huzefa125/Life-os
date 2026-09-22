import type { Metadata } from "next";
import { AllResponsesView } from "@/components/forms/all-responses-view";

export const metadata: Metadata = {
  title: "Responses | LifeOS",
};

export default function AllResponsesPage() {
  return <AllResponsesView />;
}
