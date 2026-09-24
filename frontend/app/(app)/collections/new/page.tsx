import type { Metadata } from "next";
import { CreateCollectionWizard } from "@/components/collections/create-collection-wizard";

export const metadata: Metadata = {
  title: "New collection | LifeOS",
};

export default function NewCollectionPage() {
  return <CreateCollectionWizard />;
}
