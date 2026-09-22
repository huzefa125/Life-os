"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { FORM_TEMPLATES } from "@/lib/form-templates";
import { FormsTabs } from "./forms-tabs";

export function TemplatesGallery() {
  const router = useRouter();
  const [creatingId, setCreatingId] = useState<string | null>(null);

  async function applyTemplate(templateId: string) {
    const template = FORM_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setCreatingId(templateId);
    try {
      const form = await api.forms.create({ title: template.name });
      await api.forms.update(form.id, {
        properties: {
          description: template.formDescription,
          fields: template.fields,
          published: false,
          automations: template.automations,
        },
      });
      router.push(`/forms/${form.id}/edit`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create form from template");
      setCreatingId(null);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <LayoutTemplate className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Forms</h1>
      </div>

      <FormsTabs />

      <div className="grid gap-3 px-6 py-4 sm:grid-cols-2">
        {FORM_TEMPLATES.map((template) => (
          <div key={template.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <h3 className="text-[14px] font-semibold">{template.name}</h3>
            <p className="text-[13px] text-muted-foreground">{template.description}</p>
            <p className="text-[12px] text-muted-foreground">
              {template.fields.length} fields · {template.automations.length} automation{template.automations.length === 1 ? "" : "s"}
            </p>
            <Button size="sm" className="mt-1 w-fit" disabled={creatingId !== null} onClick={() => applyTemplate(template.id)}>
              {creatingId === template.id ? "Creating…" : "Use template"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
