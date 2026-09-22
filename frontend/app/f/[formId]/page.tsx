import type { Metadata } from "next";
import PublicFormClient from "./page-client";

export const metadata: Metadata = {
  title: "Form | LifeOS",
};

export default function PublicFormPage() {
  return <PublicFormClient />;
}
