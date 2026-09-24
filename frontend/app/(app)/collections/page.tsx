import { Suspense } from "react";
import type { Metadata } from "next";
import { CollectionsListView } from "@/components/collections/collections-list-view";

export const metadata: Metadata = {
  title: "Collections | LifeOS",
};

export default function CollectionsPage() {
  return (
    <Suspense fallback={null}>
      <CollectionsListView />
    </Suspense>
  );
}
