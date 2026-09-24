"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Copy, Lock, Star, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingDots, PageLoader, Spinner } from "@/components/ui/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { evaluateCondition } from "@/lib/form-condition";
import { cn } from "@/lib/utils";
import type { FormField, FormSection, JsonValue, PublicFormSchema } from "@/lib/types";

type AddressValue = { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
type UploadedFile = { url: string; fileName: string; mimeType: string; size: number };

const OTHER_SENTINEL = "__other__";

function isEmptyAnswer(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value).every((v) => !v);
  return String(value).trim().length === 0;
}

function shuffled<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function useOptions(field: FormField): string[] {
  return useMemo(() => {
    const base = field.options ?? [];
    return field.randomizeOptions ? shuffled(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.id]);
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
  const options = useOptions(field);

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
          minLength={field.minLength}
          maxLength={field.maxLength}
        />
      );
    case "long_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          minLength={field.minLength}
          maxLength={field.maxLength}
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
      return <DateTimePicker value={(value as string) || undefined} onChange={(v) => onChange(v)} />;
    case "dropdown": {
      const isOther = value === OTHER_SENTINEL || (typeof value === "string" && value !== "" && !options.includes(value));
      return (
        <div className="flex flex-col gap-1.5">
          <Select value={isOther ? OTHER_SENTINEL : ((value as string) ?? "")} onValueChange={(v) => onChange(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder ?? "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
              {field.allowOther ? <SelectItem value={OTHER_SENTINEL}>Other</SelectItem> : null}
            </SelectContent>
          </Select>
          {isOther ? (
            <Input
              value={value === OTHER_SENTINEL ? "" : (value as string)}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Please specify"
              className="h-8 text-[13px]"
            />
          ) : null}
        </div>
      );
    }
    case "radio":
      return (
        <div className="flex flex-col gap-1.5">
          {options.map((opt) => (
            <label key={opt} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                required={field.required}
                className="mt-0.5 size-3.5 accent-primary"
              />
              <span className="flex flex-col">
                {opt}
                {field.optionDescriptions?.[opt] ? (
                  <span className="text-[12px] text-muted-foreground">{field.optionDescriptions[opt]}</span>
                ) : null}
              </span>
            </label>
          ))}
          {field.allowOther ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                checked={typeof value === "string" && !options.includes(value) && value !== ""}
                onChange={() => onChange("")}
                className="size-3.5 accent-primary"
              />
              <Input
                value={typeof value === "string" && !options.includes(value) ? value : ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Other"
                className="h-7 flex-1 text-[13px]"
              />
            </label>
          ) : null}
        </div>
      );
    case "checkbox": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const otherValue = selected.find((v) => !options.includes(v)) ?? "";
      return (
        <div className="flex flex-col gap-1.5">
          {options.map((opt) => (
            <label key={opt} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => onChange(e.target.checked ? [...selected, opt] : selected.filter((o) => o !== opt))}
                className="mt-0.5 size-3.5 accent-primary"
              />
              <span className="flex flex-col">
                {opt}
                {field.optionDescriptions?.[opt] ? (
                  <span className="text-[12px] text-muted-foreground">{field.optionDescriptions[opt]}</span>
                ) : null}
              </span>
            </label>
          ))}
          {field.allowOther ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!otherValue}
                onChange={(e) => {
                  const withoutOther = selected.filter((v) => options.includes(v));
                  onChange(e.target.checked ? [...withoutOther, ""] : withoutOther);
                }}
                className="size-3.5 accent-primary"
              />
              <Input
                value={otherValue}
                onChange={(e) => {
                  const withoutOther = selected.filter((v) => options.includes(v));
                  onChange([...withoutOther, e.target.value]);
                }}
                placeholder="Other"
                className="h-7 flex-1 text-[13px]"
              />
            </label>
          ) : null}
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
              <Spinner size={12} /> Uploading
              <LoadingDots />
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

interface Page {
  section?: FormSection;
  fields: FormField[];
}

function buildPages(schema: PublicFormSchema, answers: Record<string, unknown>): Page[] {
  const sections = schema.sections ?? [];
  if (sections.length === 0) return [{ fields: schema.fields }];

  const pages: Page[] = [];
  const unassigned = schema.fields.filter((f) => !f.sectionId);
  if (unassigned.length > 0) pages.push({ fields: unassigned });

  for (const section of sections) {
    if (evaluateCondition(section.skipIf, answers)) continue;
    pages.push({ section, fields: schema.fields.filter((f) => f.sectionId === section.id) });
  }
  return pages.length > 0 ? pages : [{ fields: schema.fields }];
}

function storageKeyFor(formId: string) {
  return `lifeos-form-${formId}`;
}

function readLocalRecord(formId: string): { responseId: string; submitted: boolean } | null {
  try {
    const raw = localStorage.getItem(storageKeyFor(formId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalRecord(formId: string, record: { responseId: string; submitted: boolean }) {
  try {
    localStorage.setItem(storageKeyFor(formId), JSON.stringify(record));
  } catch {
    // localStorage unavailable (private mode, etc.) — one-per-person/resume just won't persist
  }
}

export function PublicFormView({ schema }: { schema: PublicFormSchema }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [result, setResult] = useState<{ successMessage?: string; redirectUrl?: string; resumeUrl?: string } | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeParam = params.get("resume");
    const local = readLocalRecord(schema.id);

    if (schema.onePerPerson && local?.submitted && !schema.allowResponseEditing) {
      // Reading localStorage requires the client; can't be a lazy useState
      // initializer without mismatching the SSR'd markup.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlocked("You've already responded to this form.");
      setLoadingResume(false);
      return;
    }

    const canResume = schema.allowResponseEditing || schema.saveAndResumeLater;
    const targetId = resumeParam || (canResume && local && !local.submitted ? local.responseId : null) || (canResume && local?.submitted && schema.allowResponseEditing ? local.responseId : null);

    if (canResume && targetId) {
      setResumeId(targetId);
      api.publicForms
        .getResumable(schema.id, targetId)
        .then((data) => setAnswers(data.answers))
        .catch(() => {})
        .finally(() => setLoadingResume(false));
    } else {
      setLoadingResume(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.id]);

  const pages = useMemo(() => buildPages(schema, answers), [schema, answers]);
  const page = pages[pageIndex] ?? pages[0];
  const isLastPage = pageIndex === pages.length - 1;
  const visibleFields = useMemo(
    () => page.fields.filter((field) => evaluateCondition(field.visibleIf, answers)),
    [page, answers]
  );

  function setAnswer(fieldId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  function validatePage(fields: FormField[]): boolean {
    for (const field of fields) {
      if (field.required && isEmptyAnswer(answers[field.id])) {
        toast.error(`"${field.label}" is required`);
        return false;
      }
    }
    return true;
  }

  function relevantAnswers() {
    const allVisible = pages.flatMap((p) => p.fields).filter((f) => evaluateCondition(f.visibleIf, answers));
    return Object.fromEntries(allVisible.map((f) => [f.id, answers[f.id]]).filter(([, v]) => v !== undefined));
  }

  function goNext() {
    if (!validatePage(visibleFields)) return;
    setPageIndex((i) => Math.min(i + 1, pages.length - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePage(visibleFields)) return;

    setSubmitting(true);
    try {
      const response = await api.publicForms.submit(schema.id, relevantAnswers() as Record<string, JsonValue>, {
        resumeId: resumeId ?? undefined,
      });
      writeLocalRecord(schema.id, { responseId: response.responseId, submitted: true });
      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }
      setResult({ successMessage: response.successMessage });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't submit the form");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveForLater() {
    setSavingDraft(true);
    try {
      const response = await api.publicForms.submit(schema.id, relevantAnswers() as Record<string, JsonValue>, {
        draft: true,
        resumeId: resumeId ?? undefined,
      });
      writeLocalRecord(schema.id, { responseId: response.responseId, submitted: false });
      const url = `${window.location.origin}/f/${schema.id}?resume=${response.responseId}`;
      setResult({ resumeUrl: url });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save your progress");
    } finally {
      setSavingDraft(false);
    }
  }

  const accentColor = schema.design?.accentColor;
  const isCard = schema.layout === "card";

  if (loadingResume) {
    return <PageLoader fullScreen label="Loading form" />;
  }

  if (blocked) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-2 px-4 py-24 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{blocked}</p>
      </div>
    );
  }

  if (!resumeId && schema.availability.status !== "open") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-2 px-4 py-24 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-medium">{schema.title}</h1>
        <p className="text-sm text-muted-foreground">{schema.availability.message ?? "This form isn't available."}</p>
      </div>
    );
  }

  if (result?.resumeUrl) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <p className="text-lg font-medium">Your progress is saved.</p>
        <p className="text-sm text-muted-foreground">Use this link to come back and finish later:</p>
        <div className="flex items-center gap-2">
          <code className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-[12px]">{result.resumeUrl}</code>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(result.resumeUrl!);
              toast.success("Link copied");
            }}
          >
            <Copy className="size-3" />
          </Button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-24 text-center">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <p className="text-lg font-medium">{result.successMessage || "Thanks — your response was recorded."}</p>
      </div>
    );
  }

  const formBody = (
    <>
      {schema.design?.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={schema.design.coverImageUrl} alt="" className="mb-4 h-40 w-full rounded-lg object-cover" />
      ) : null}

      <div className="mb-6 flex items-center gap-2">
        {schema.design?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={schema.design.logoUrl} alt="" className="size-8 rounded-lg object-contain" />
        ) : (
          <div
            className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"
            style={accentColor ? { backgroundColor: `${accentColor}22`, color: accentColor } : undefined}
          >
            <ClipboardList className="size-4" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold">{schema.title}</h1>
          {schema.description ? <p className="text-sm text-muted-foreground">{schema.description}</p> : null}
        </div>
      </div>

      {pages.length > 1 && schema.showProgressBar !== false ? (
        <div className="mb-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((pageIndex + 1) / pages.length) * 100}%`, ...(accentColor ? { backgroundColor: accentColor } : {}) }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Page {pageIndex + 1} of {pages.length}
          </p>
        </div>
      ) : null}

      {page.section ? (
        <div className="mb-4">
          <h2 className="text-base font-semibold">{page.section.title}</h2>
          {page.section.description ? <p className="text-sm text-muted-foreground">{page.section.description}</p> : null}
        </div>
      ) : null}

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

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {pageIndex > 0 ? (
            <Button type="button" variant="outline" onClick={() => setPageIndex((i) => Math.max(0, i - 1))}>
              Back
            </Button>
          ) : null}
          {!isLastPage ? (
            <Button type="button" onClick={goNext} style={accentColor ? { backgroundColor: accentColor } : undefined}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={submitting} style={accentColor ? { backgroundColor: accentColor } : undefined}>
              {submitting ? "Submitting…" : schema.submitButtonLabel || "Submit"}
            </Button>
          )}
          {schema.saveAndResumeLater ? (
            <Button type="button" variant="ghost" disabled={savingDraft} onClick={handleSaveForLater}>
              {savingDraft ? "Saving…" : "Save for later"}
            </Button>
          ) : null}
        </div>
      </form>
    </>
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      {isCard ? <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">{formBody}</div> : formBody}
    </div>
  );
}
