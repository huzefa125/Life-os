"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Star, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { evaluateCondition } from "@/lib/form-condition";
import { cn } from "@/lib/utils";
import type { FormField, JsonValue, PublicFormSchema } from "@/lib/types";

type AddressValue = { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
type UploadedFile = { url: string; fileName: string; mimeType: string; size: number };

function isEmptyAnswer(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value).every((v) => !v);
  return String(value).trim().length === 0;
}

function FieldRenderer({
  field,
  value,
  onChange,
  formId,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  formId: string;
}) {
  const [uploading, setUploading] = useState(false);

  switch (field.type) {
    case "short_text":
    case "email":
    case "phone":
    case "url":
      return (
        <Input
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      );
    case "long_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className="min-h-24"
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={(value as number | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          min={field.min}
          max={field.max}
          step={field.step ?? "any"}
          placeholder={field.placeholder}
          required={field.required}
        />
      );
    case "currency":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{field.currencyCode ?? "USD"}</span>
          <Input
            type="number"
            value={(value as number | undefined) ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            min={field.min ?? 0}
            max={field.max}
            step={field.step ?? "0.01"}
            placeholder={field.placeholder}
            required={field.required}
          />
        </div>
      );
    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      );
    case "dropdown":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            {field.placeholder ?? "Select an option"}
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                required={field.required}
                className="size-3.5 accent-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      );
    case "checkbox": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) =>
                  onChange(e.target.checked ? [...selected, opt] : selected.filter((o) => o !== opt))
                }
                className="size-3.5 accent-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    case "rating": {
      const max = field.ratingMax ?? 5;
      const current = (value as number) ?? 0;
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
              <Star className={cn("size-5", n <= current ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
            </button>
          ))}
        </div>
      );
    }
    case "address": {
      const address = (value as AddressValue) ?? {};
      function update(patch: Partial<AddressValue>) {
        onChange({ ...address, ...patch });
      }
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Address line 1" value={address.line1 ?? ""} onChange={(e) => update({ line1: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="Address line 2" value={address.line2 ?? ""} onChange={(e) => update({ line2: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="City" value={address.city ?? ""} onChange={(e) => update({ city: e.target.value })} />
          <Input placeholder="State / Province" value={address.state ?? ""} onChange={(e) => update({ state: e.target.value })} />
          <Input placeholder="Postal code" value={address.postalCode ?? ""} onChange={(e) => update({ postalCode: e.target.value })} />
          <Input placeholder="Country" value={address.country ?? ""} onChange={(e) => update({ country: e.target.value })} />
        </div>
      );
    }
    case "file": {
      const uploaded = value as UploadedFile | undefined;
      return (
        <div className="flex flex-col gap-1.5">
          <input
            type="file"
            accept={field.acceptedMimeTypes?.join(",")}
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (field.maxSizeMB && file.size > field.maxSizeMB * 1024 * 1024) {
                toast.error(`File must be under ${field.maxSizeMB} MB`);
                return;
              }
              setUploading(true);
              try {
                const result = await api.publicForms.upload(formId, file);
                onChange(result);
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Couldn't upload file");
              } finally {
                setUploading(false);
              }
            }}
            className="text-sm"
          />
          {uploading ? (
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Uploading…
            </span>
          ) : uploaded ? (
            <span className="flex items-center gap-1.5 text-[12px] text-emerald-600">
              <Upload className="size-3" /> {uploaded.fileName}
            </span>
          ) : null}
        </div>
      );
    }
    default:
      return null;
  }
}

export function PublicFormView({ schema }: { schema: PublicFormSchema }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ successMessage?: string } | null>(null);

  const visibleFields = useMemo(
    () => schema.fields.filter((field) => evaluateCondition(field.visibleIf, answers)),
    [schema.fields, answers]
  );

  function setAnswer(fieldId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    for (const field of visibleFields) {
      if (field.required && isEmptyAnswer(answers[field.id])) {
        toast.error(`"${field.label}" is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const relevantAnswers = Object.fromEntries(
        visibleFields.map((field) => [field.id, answers[field.id]]).filter(([, value]) => value !== undefined)
      );
      const response = await api.publicForms.submit(schema.id, relevantAnswers as Record<string, JsonValue>);
      setResult({ successMessage: response.successMessage });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't submit the form");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <p className="text-lg font-medium">{result.successMessage || "Thanks — your response was recorded."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <ClipboardList className="size-4" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{schema.title}</h1>
          {schema.description ? <p className="text-sm text-muted-foreground">{schema.description}</p> : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {visibleFields.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {field.label}
              {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
            </Label>
            {field.helpText ? <p className="text-[12px] text-muted-foreground">{field.helpText}</p> : null}
            <FieldRenderer field={field} value={answers[field.id]} onChange={(v) => setAnswer(field.id, v)} formId={schema.id} />
          </div>
        ))}

        <Button type="submit" disabled={submitting} className="mt-2 w-fit">
          {submitting ? "Submitting…" : schema.submitButtonLabel || "Submit"}
        </Button>
      </form>
    </div>
  );
}
