import type { Metadata } from "next";
import FormBuilderClient from "./page-client";

export const metadata: Metadata = {
  title: "Form Builder | LifeOS",
};

export default function FormBuilderPage() {
  return <FormBuilderClient />;
}
