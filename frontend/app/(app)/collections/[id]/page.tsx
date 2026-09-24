import { Suspense } from "react";
import type { Metadata } from "next";
import { CollectionView } from "@/components/collections/collection-view";

export const metadata: Metadata = {
  title: "Collection | LifeOS",
};

export default function CollectionPage() {
  return (
    <Suspense fallback={null}>
      <CollectionView />
    </Suspense>
  );
}
