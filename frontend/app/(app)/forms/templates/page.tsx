import type { Metadata } from "next";
import { TemplatesGallery } from "@/components/forms/templates-gallery";

export const metadata: Metadata = {
  title: "Form Templates | LifeOS",
};

export default function FormTemplatesPage() {
  return <TemplatesGallery />;
}
