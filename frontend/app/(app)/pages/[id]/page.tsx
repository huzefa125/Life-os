import type { Metadata } from "next";
import SinglePageClient from "./page-client";

export const metadata: Metadata = {
  title: "Page Editor | LifeOS",
};

export default function PageDetailPage() {
  return <SinglePageClient />;
}
