import type { Metadata } from "next";
import FormResponsesClient from "./page-client";

export const metadata: Metadata = {
  title: "Responses | LifeOS",
};

export default function FormResponsesPage() {
  return <FormResponsesClient />;
}
