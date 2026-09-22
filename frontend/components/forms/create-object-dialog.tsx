"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api-client";
import { AUTOMATION_PROPERTY_KEYS, AUTOMATION_TYPE_LABELS } from "@/lib/form-field-meta";
import type { FormAutomationType, FormField, FormFieldMapping, FormResponseCreatedObject } from "@/lib/types";
import { MappingPicker } from "./automation-editor";

export function CreateObjectDialog({
  objectType,
  fields,
  formId,
  responseId,
  open,
  onOpenChange,
  onCreated,
}: {
  objectType: FormAutomationType | null;
  fields: FormField[];
  formId: string;
  responseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: FormResponseCreatedObject) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {objectType ? (
          <CreateObjectForm
            key={objectType}
            objectType={objectType}
            fields={fields}
            formId={formId}
            responseId={responseId}
            onOpenChange={onOpenChange}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateObjectForm({
  objectType,
  fields,
  formId,
  responseId,
  onOpenChange,
  onCreated,
}: {
  objectType: FormAutomationType;
  fields: FormField[];
  formId: string;
  responseId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: FormResponseCreatedObject) => void;
}) {
  const [titleMapping, setTitleMapping] = useState<FormFieldMapping | undefined>(undefined);
  const [propertyMappings, setPropertyMappings] = useState<Record<string, FormFieldMapping>>({});
  const [accounts, setAccounts] = useState<{ label: string; value: string }[]>([]);
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (objectType !== "create_transaction") return;
    api.accounts.list().then((data) => setAccounts(data.map((a) => ({ label: a.title, value: a.id })))).catch(() => setAccounts([]));
    api.categories.list().then((data) => setCategories(data.map((c) => ({ label: c.title, value: c.id })))).catch(() => setCategories([]));
  }, [objectType]);

  const propertyKeys = AUTOMATION_PROPERTY_KEYS[objectType];

  async function handleCreate() {
    if (!titleMapping) return;
    setSubmitting(true);
    try {
      const created = await api.forms.responses.createObject(formId, responseId, {
        type: objectType,
        titleMapping,
        propertyMappings,
      });
      onCreated(created);
      toast.success(`${created.objectTitle} created`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create that object");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{AUTOMATION_TYPE_LABELS[objectType]}</DialogTitle>
        <DialogDescription>Pick which answers from this response fill in the new object.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">{objectType === "create_person" ? "Name" : "Title"}</Label>
          <MappingPicker mapping={titleMapping} onChange={setTitleMapping} fields={fields} priorActions={[]} />
        </div>

        {propertyKeys.map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">{key}</Label>
            <MappingPicker
              mapping={propertyMappings[key]}
              onChange={(mapping) => setPropertyMappings((prev) => ({ ...prev, [key]: mapping }))}
              fields={fields}
              priorActions={[]}
              staticOptions={
                objectType === "create_transaction" && (key === "accountId" || key === "toAccountId")
                  ? accounts
                  : objectType === "create_transaction" && key === "categoryId"
                    ? categories
                    : undefined
              }
            />
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button disabled={!titleMapping || submitting} onClick={handleCreate}>
          {submitting ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}
