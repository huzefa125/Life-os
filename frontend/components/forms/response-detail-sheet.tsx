"use client";

import { useEffect, useState } from "react";
import { CheckSquare, ExternalLink, FolderKanban, Receipt, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loader";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, ApiError } from "@/lib/api-client";
import { AUTOMATION_TYPE_LABELS } from "@/lib/form-field-meta";
import { OBJECT_TYPE_META } from "@/lib/type-meta";
import type { Form, FormAutomationType, FormResponse } from "@/lib/types";
import { CreateObjectDialog } from "./create-object-dialog";

const MANUAL_ACTION_TYPES: { type: FormAutomationType; icon: typeof UserRound }[] = [
  { type: "create_person", icon: UserRound },
  { type: "create_task", icon: CheckSquare },
  { type: "create_project", icon: FolderKanban },
  { type: "create_transaction", icon: Receipt },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function answerText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    if ("fileName" in (value as Record<string, unknown>)) return String((value as { fileName: string }).fileName);
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(value);
}

export function ResponseDetailSheet({
  form,
  responseId,
  open,
  onOpenChange,
  onDeleted,
}: {
  form: Form;
  responseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {responseId ? (
          <ResponseDetailContent
            key={responseId}
            form={form}
            responseId={responseId}
            onOpenChange={onOpenChange}
            onDeleted={onDeleted}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ResponseDetailContent({
  form,
  responseId,
  onOpenChange,
  onDeleted,
}: {
  form: Form;
  responseId: string;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [response, setResponse] = useState<FormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [creatingType, setCreatingType] = useState<FormAutomationType | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.forms.responses
      .get(form.id, responseId)
      .then((data) => {
        if (!cancelled) setResponse(data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Couldn't load response");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.id, responseId]);

  async function handleDelete() {
    if (!response) return;
    setDeleting(true);
    try {
      await api.forms.responses.remove(form.id, response.id);
      toast.success("Response deleted");
      onDeleted(response.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete response");
    } finally {
      setDeleting(false);
    }
  }

  const fields = form.properties?.fields ?? [];

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size={22} />
      </div>
    );
  }

  if (!response) return null;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{response.title}</SheetTitle>
        <p className="text-[12px] text-muted-foreground">{formatDate(response.properties?.submittedAt ?? response.createdAt)}</p>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <dl className="flex flex-col gap-3 text-sm">
          {fields.map((field) => (
            <div key={field.id}>
              <dt className="text-[12px] text-muted-foreground">{field.label}</dt>
              <dd className="mt-0.5">{answerText(response.properties?.answers[field.id])}</dd>
            </div>
          ))}
        </dl>

        {response.properties?.createdObjects && response.properties.createdObjects.length > 0 ? (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-[12px] font-medium text-muted-foreground">Created in LifeOS</p>
            <ul className="flex flex-col gap-1.5">
              {response.properties.createdObjects.map((created) => {
                const meta = OBJECT_TYPE_META[created.objectType];
                return (
                  <li key={created.objectId}>
                    <a
                      href={meta ? `${meta.basePath}?focus=${created.objectId}` : "#"}
                      className="flex items-center gap-1.5 text-[13px] text-primary hover:underline"
                    >
                      {meta ? <meta.icon className="size-3.5" /> : null}
                      {created.objectTitle}
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 border-t pt-4">
          <p className="mb-2 text-[12px] font-medium text-muted-foreground">LifeOS Actions</p>
          <div className="flex flex-col gap-1.5">
            {MANUAL_ACTION_TYPES.map(({ type, icon: Icon }) => (
              <Button key={type} variant="outline" size="sm" className="justify-start gap-1.5" onClick={() => setCreatingType(type)}>
                <Icon className="size-3.5" />
                {AUTOMATION_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <CreateObjectDialog
        objectType={creatingType}
        fields={fields}
        formId={form.id}
        responseId={response.id}
        open={creatingType !== null}
        onOpenChange={(next) => !next && setCreatingType(null)}
        onCreated={(created) => {
          setResponse((prev) =>
            prev
              ? {
                  ...prev,
                  properties: prev.properties
                    ? { ...prev.properties, createdObjects: [...prev.properties.createdObjects, created] }
                    : prev.properties,
                }
              : prev
          );
        }}
      />

      <SheetFooter className="flex-row justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={deleting}
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </SheetFooter>
    </>
  );
}
