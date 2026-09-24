"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, ClipboardList, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { DEFAULT_FORM_SETTINGS, FORM_FIELD_TYPES, FIELD_TYPE_LABELS, newFieldId } from "@/lib/form-field-meta";
import type { Form, FormAutomation, FormDesign, FormField, FormSection, FormSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AutomationEditor } from "./automation-editor";
import { FieldEditor } from "./field-editor";
import { FormSettingsPanel } from "./form-settings-panel";
import { SectionsEditor } from "./sections-editor";
import { ShareFormPanel } from "./share-form-panel";

export function FormBuilderView({ initialForm }: { initialForm: Form }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [title, setTitle] = useState(initialForm.title);
  const [description, setDescription] = useState(initialForm.properties?.description ?? "");
  const [fields, setFields] = useState<FormField[]>(initialForm.properties?.fields ?? []);
  const [sections, setSections] = useState<FormSection[]>(initialForm.properties?.sections ?? []);
  const [automations, setAutomations] = useState<FormAutomation[]>(initialForm.properties?.automations ?? []);
  const [settings, setSettings] = useState<FormSettings>(initialForm.properties?.settings ?? DEFAULT_FORM_SETTINGS);
  const [design, setDesign] = useState<FormDesign>(initialForm.properties?.design ?? {});
  const [submitButtonLabel, setSubmitButtonLabel] = useState(initialForm.properties?.submitButtonLabel ?? "");
  const [successMessage, setSuccessMessage] = useState(initialForm.properties?.successMessage ?? "");
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const status = settings.status;

  function markDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setIsDirty(true);
    };
  }

  const setTitleDirty = markDirty(setTitle);
  const setDescriptionDirty = markDirty(setDescription);
  const setFieldsDirty = markDirty(setFields);
  const setSectionsDirty = markDirty(setSections);
  const setAutomationsDirty = markDirty(setAutomations);
  const setSettingsDirty = markDirty(setSettings);
  const setDesignDirty = markDirty(setDesign);
  const setSubmitButtonLabelDirty = markDirty(setSubmitButtonLabel);
  const setSuccessMessageDirty = markDirty(setSuccessMessage);

  function addField(type: FormField["type"]) {
    setFieldsDirty([
      ...fields,
      { id: newFieldId(), type, label: "", required: false, ...(type === "dropdown" || type === "radio" || type === "checkbox" ? { options: [""] } : {}) },
    ]);
  }

  function updateField(index: number, updated: FormField) {
    setFieldsDirty(fields.map((f, i) => (i === index ? updated : f)));
  }

  function deleteField(index: number) {
    const removedId = fields[index].id;
    setFieldsDirty(fields.filter((_, i) => i !== index));
    // Drop any conditions/mappings pointing at the field we just removed.
    setAutomationsDirty(
      automations.map((a) => (a.condition?.fieldId === removedId ? { ...a, condition: undefined } : a))
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFieldsDirty(next);
  }

  function buildProperties() {
    return {
      description: description || undefined,
      fields,
      sections: sections.length > 0 ? sections : undefined,
      settings,
      design: Object.values(design).some(Boolean) ? design : undefined,
      automations,
      submitButtonLabel: submitButtonLabel || undefined,
      successMessage: successMessage || undefined,
    };
  }

  async function handleSave() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.forms.update(form.id, { title: title.trim(), properties: buildProperties() });
      setForm(updated);
      setIsDirty(false);
      toast.success("Form saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save form");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusAction(action: "publish" | "unpublish" | "close" | "reopen") {
    setStatusChanging(true);
    try {
      if (isDirty) await handleSave();
      const updated = await api.forms[action](form.id);
      setForm(updated);
      setSettings(updated.properties?.settings ?? settings);
      toast.success(
        action === "publish" ? "Form published" : action === "unpublish" ? "Form set back to draft" : action === "close" ? "Form closed" : "Form reopened"
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update form status");
    } finally {
      setStatusChanging(false);
    }
  }

  async function handleDelete() {
    try {
      await api.forms.remove(form.id);
      toast.success("Form deleted");
      router.push("/forms");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete form");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/forms" className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "gap-1 text-muted-foreground hover:text-foreground")}>
            <ArrowLeft className="size-3.5" />
            <span>Forms</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="max-w-[220px] truncate text-xs font-medium text-foreground">{title || "Untitled"}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {status === "published" ? (
            <a
              href={`/f/${form.id}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "gap-1 text-muted-foreground hover:text-foreground")}
            >
              <ExternalLink className="size-3.5" />
              View live
            </a>
          ) : null}
          <Button variant="ghost" size="xs" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
            <Trash2 className="size-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-4" />
          {status === "draft" ? (
            <Button size="xs" disabled={statusChanging} onClick={() => handleStatusAction("publish")}>
              {statusChanging ? "…" : "Publish"}
            </Button>
          ) : status === "published" ? (
            <>
              <Button variant="outline" size="xs" disabled={statusChanging} onClick={() => handleStatusAction("close")}>
                Close
              </Button>
              <Button variant="outline" size="xs" disabled={statusChanging} onClick={() => handleStatusAction("unpublish")}>
                Unpublish
              </Button>
            </>
          ) : (
            <Button size="xs" disabled={statusChanging} onClick={() => handleStatusAction("reopen")}>
              {statusChanging ? "…" : "Reopen"}
            </Button>
          )}
          <Button size="xs" onClick={handleSave} disabled={saving || !isDirty || !title.trim()} className="gap-1.5 shadow-xs">
            {saving ? (
              <span>Saving…</span>
            ) : isDirty ? (
              <>
                <Save className="size-3" />
                <span>Save</span>
              </>
            ) : (
              <>
                <Check className="size-3 text-emerald-500" />
                <span>Saved</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {status === "published" ? <ShareFormPanel formId={form.id} /> : null}

      <div className="rounded-xl border border-border/80 bg-background p-6 shadow-xs sm:p-10">
        <div className="flex flex-col gap-3">
          <Input
            value={title}
            onChange={(e) => setTitleDirty(e.target.value)}
            placeholder="Form title"
            className="border-none px-0 font-heading text-2xl font-bold tracking-tight text-foreground shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescriptionDirty(e.target.value)}
            placeholder="Description (optional)"
            className="min-h-16 border-none px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
          />
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold text-foreground/80">Pages</h2>
          <SectionsEditor sections={sections} fields={fields} onChange={setSectionsDirty} />
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground/80">
            <ClipboardList className="size-3.5" />
            Fields
          </h2>
          {fields.map((field, index) => (
            <FieldEditor
              key={field.id}
              field={field}
              index={index}
              total={fields.length}
              earlierFields={fields.slice(0, index)}
              sections={sections}
              onChange={(updated) => updateField(index, updated)}
              onDelete={() => deleteField(index)}
              onMoveUp={() => moveField(index, -1)}
              onMoveDown={() => moveField(index, 1)}
            />
          ))}

          <div className="flex flex-wrap gap-1.5">
            {FORM_FIELD_TYPES.map((type) => (
              <Button key={type} variant="outline" size="xs" className="gap-1" onClick={() => addField(type)}>
                <Plus className="size-3" />
                {FIELD_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground/80">
              LifeOS automation
            </h2>
            <p className="text-[12px] text-muted-foreground">
              Turn every submission into real LifeOS objects — a Person, Project, Task, or Money Transaction.
            </p>
          </div>
          <AutomationEditor automations={automations} fields={fields} onChange={setAutomationsDirty} />
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold text-foreground/80">Settings</h2>
          <FormSettingsPanel settings={settings} onChange={setSettingsDirty} />
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold text-foreground/80">Design</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Accent color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.accentColor ?? "#4f46e5"}
                  onChange={(e) => setDesignDirty({ ...design, accentColor: e.target.value })}
                  className="h-8 w-10 rounded border"
                />
                <Input
                  value={design.accentColor ?? ""}
                  onChange={(e) => setDesignDirty({ ...design, accentColor: e.target.value || undefined })}
                  placeholder="#4f46e5"
                  className="h-8 flex-1 text-[13px]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-muted-foreground">Logo URL</Label>
              <Input
                value={design.logoUrl ?? ""}
                onChange={(e) => setDesignDirty({ ...design, logoUrl: e.target.value || undefined })}
                placeholder="https://…/logo.png"
                className="h-8 text-[13px]"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label className="text-[12px] text-muted-foreground">Cover image URL</Label>
              <Input
                value={design.coverImageUrl ?? ""}
                onChange={(e) => setDesignDirty({ ...design, coverImageUrl: e.target.value || undefined })}
                placeholder="https://…/cover.jpg"
                className="h-8 text-[13px]"
              />
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">Submit button label</Label>
            <Input
              value={submitButtonLabel}
              onChange={(e) => setSubmitButtonLabelDirty(e.target.value)}
              placeholder="Submit"
              className="h-8 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-muted-foreground">Confirmation message</Label>
            <Input
              value={successMessage}
              onChange={(e) => setSuccessMessageDirty(e.target.value)}
              placeholder="Thanks for submitting!"
              className="h-8 text-[13px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
