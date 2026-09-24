"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import {
  COLLECTION_COLORS,
  COLLECTION_TEMPLATES,
  FIELD_TYPE_META,
  collectionColor,
  newId,
  type CollectionTemplate,
} from "@/lib/collection-meta";
import type { Collection, CollectionField, CollectionView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FieldEditor, defaultConfigFor, fieldProblem } from "./field-editor";
import { OptionSelect } from "./field-value";
import { ViewIcon } from "./view-icon";

const STEPS = ["Name", "Fields", "Views", "Finish"] as const;

interface ViewChoice {
  board: boolean;
  boardFieldId: string;
  gallery: boolean;
  calendar: boolean;
  calendarFieldId: string;
}

function blankField(): CollectionField {
  return { id: newId("f"), name: "", type: "text", required: false };
}

export function CreateCollectionWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("teal");
  const [fields, setFields] = useState<CollectionField[]>([{ id: newId("f"), name: "Name", type: "text", required: true }]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [views, setViews] = useState<ViewChoice>({ board: false, boardFieldId: "", gallery: false, calendar: false, calendarFieldId: "" });
  const [templateViews, setTemplateViews] = useState<CollectionView[] | null>(null);
  const [existing, setExisting] = useState<Pick<Collection, "id" | "title">[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.collections
      .list()
      .then((items) => setExisting(items.map((c) => ({ id: c.id, title: c.title }))))
      .catch(() => setExisting([]));
  }, []);

  const selectFields = fields.filter((f) => f.type === "select" && f.name.trim());
  const dateFields = fields.filter((f) => (f.type === "date" || f.type === "datetime") && f.name.trim());

  function applyTemplate(template: CollectionTemplate | null) {
    if (!template) {
      setTemplateId(null);
      setFields([{ id: newId("f"), name: "Name", type: "text", required: true }]);
      setTemplateViews(null);
      return;
    }
    setTemplateId(template.id);
    if (!name.trim() || COLLECTION_TEMPLATES.some((t) => t.name === name)) setName(template.name);
    if (!description.trim() || COLLECTION_TEMPLATES.some((t) => t.description === description)) setDescription(template.description);
    setColor(template.color);
    setFields(template.fields.map((f) => ({ ...f, config: f.config ? structuredClone(f.config) : undefined })));
    setTemplateViews(template.views());
  }

  function buildViews(): CollectionView[] {
    if (templateViews) {
      // Template views reference template field ids; drop any whose field was removed or retyped.
      return templateViews.filter((v) => {
        if (v.type === "board") return fields.some((f) => f.id === v.groupByFieldId && f.type === "select");
        if (v.type === "calendar") return fields.some((f) => f.id === v.dateFieldId && (f.type === "date" || f.type === "datetime"));
        return true;
      });
    }
    const result: CollectionView[] = [{ id: newId("v"), name: "All records", type: "table", filters: [], sorts: [] }];
    if (views.board && views.boardFieldId) {
      result.push({ id: newId("v"), name: "Board", type: "board", filters: [], sorts: [], groupByFieldId: views.boardFieldId });
    }
    if (views.gallery) result.push({ id: newId("v"), name: "Gallery", type: "gallery", filters: [], sorts: [] });
    if (views.calendar && views.calendarFieldId) {
      result.push({ id: newId("v"), name: "Calendar", type: "calendar", filters: [], sorts: [], dateFieldId: views.calendarFieldId });
    }
    return result;
  }

  const stepProblem = (() => {
    if (step === 0 && !name.trim()) return "Give your collection a name";
    if (step === 1) {
      if (fields.length === 0) return "Add at least one field";
      for (const f of fields) {
        const problem = fieldProblem(f);
        if (problem) return problem;
      }
    }
    return null;
  })();

  async function create() {
    setCreating(true);
    try {
      const collection = await api.collections.create({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        fields: fields.map((f) => ({ ...f, name: f.name.trim() })),
        views: buildViews(),
      });
      toast.success(`Created "${collection.title}"`);
      router.push(`/collections/${collection.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create the collection");
      setCreating(false);
    }
  }

  function moveField(index: number, delta: number) {
    setFields((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }

  const finalViews = step === 3 ? buildViews() : [];

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-teal-100 text-teal-600 dark:bg-teal-500/15">
          <Layers className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">New collection</h1>
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 pb-16">
        {/* Stepper */}
        <ol className="mb-6 flex items-center gap-2">
          {STEPS.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  index < step ? "bg-teal-600 text-white" : index === step ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                )}
              >
                {index < step ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span className={cn("text-[13px]", index === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
              {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-5"
          >
            {step === 0 ? (
              <>
                <div>
                  <p className="mb-2 text-[13px] font-medium">Start from</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => applyTemplate(null)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:border-foreground/30",
                        templateId === null ? "border-foreground/60 ring-1 ring-foreground/20" : "border-border/70"
                      )}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Plus className="size-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium">Start from scratch</p>
                        <p className="text-[12px] text-muted-foreground">An empty collection with a single Name field.</p>
                      </div>
                    </button>
                    {COLLECTION_TEMPLATES.map((template) => {
                      const c = collectionColor(template.color);
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:border-foreground/30",
                            templateId === template.id ? "border-foreground/60 ring-1 ring-foreground/20" : "border-border/70"
                          )}
                        >
                          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", c.chip)}>
                            <Sparkles className={cn("size-4", c.text)} />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium">{template.name}</p>
                            <p className="text-[12px] text-muted-foreground">{template.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium" htmlFor="collection-name">
                    Name
                  </label>
                  <Input id="collection-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Clients, Inventory, Reading list" maxLength={100} autoFocus />
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this collection for? (optional)" rows={2} maxLength={1000} />
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="mr-1 text-[12px] text-muted-foreground">Color</span>
                    {Object.entries(COLLECTION_COLORS).map(([key, c]) => (
                      <button
                        key={key}
                        type="button"
                        aria-label={key}
                        onClick={() => setColor(key)}
                        className={cn("flex size-6 items-center justify-center rounded-md transition-transform hover:scale-110", c.chip, color === key && "ring-2 ring-foreground/40")}
                      >
                        <Layers className={cn("size-3", c.text)} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-muted-foreground">
                  Define the fields every record will have. The first text field becomes each record&apos;s title.
                </p>
                {fields.map((field, index) => {
                  const Icon = FIELD_TYPE_META[field.type].icon;
                  const open = expanded === field.id;
                  return (
                    <div key={field.id} className="rounded-xl border border-border/70 bg-card">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <Icon className="size-3.5 text-muted-foreground" />
                        <button type="button" className="flex-1 truncate text-left text-[13px] font-medium" onClick={() => setExpanded(open ? null : field.id)}>
                          {field.name || <span className="text-muted-foreground">Untitled field</span>}
                          <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                            {FIELD_TYPE_META[field.type].label}
                            {field.required ? " · required" : ""}
                          </span>
                        </button>
                        <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => moveField(index, -1)} aria-label="Move up">
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)} aria-label="Move down">
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setFields((prev) => prev.filter((f) => f.id !== field.id))}
                          aria-label="Remove field"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      {open ? (
                        <div className="border-t border-border/70 px-3 py-3">
                          <FieldEditor
                            field={field}
                            collections={existing}
                            onChange={(next) => setFields((prev) => prev.map((f) => (f.id === field.id ? next : f)))}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => {
                    const field = blankField();
                    setFields((prev) => [...prev, { ...field, config: defaultConfigFor(field.type) }]);
                    setExpanded(field.id);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add field
                </Button>
              </div>
            ) : null}

            {step === 2 ? (
              templateViews ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-muted-foreground">This template comes with these views. You can add, rename or remove views any time.</p>
                  {buildViews().map((v) => (
                    <div key={v.id} className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-[13px]">
                      <ViewIcon type={v.type} />
                      {v.name}
                      <span className="text-[12px] capitalize text-muted-foreground">{v.type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-muted-foreground">A table view is always included. Pick any extra ways to see your records.</p>
                  <div className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-3 opacity-80">
                    <Checkbox checked disabled />
                    <ViewIcon type="table" />
                    <span className="text-[13px] font-medium">Table</span>
                    <span className="text-[12px] text-muted-foreground">Rows and columns with sorting, filters and bulk actions</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 px-3 py-3">
                    <Checkbox
                      checked={views.board}
                      disabled={selectFields.length === 0}
                      onCheckedChange={(checked) => setViews((v) => ({ ...v, board: Boolean(checked), boardFieldId: v.boardFieldId || selectFields[0]?.id || "" }))}
                    />
                    <ViewIcon type="board" />
                    <span className="text-[13px] font-medium">Board</span>
                    {selectFields.length === 0 ? (
                      <span className="text-[12px] text-muted-foreground">Needs a Select field to group cards by</span>
                    ) : views.board ? (
                      <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        grouped by
                        <OptionSelect
                          value={views.boardFieldId}
                          onChange={(id) => setViews((v) => ({ ...v, boardFieldId: id }))}
                          options={selectFields.map((f) => ({ value: f.id, label: f.name }))}
                          className="h-7 w-40"
                        />
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">Kanban columns by a Select field</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-3">
                    <Checkbox checked={views.gallery} onCheckedChange={(checked) => setViews((v) => ({ ...v, gallery: Boolean(checked) }))} />
                    <ViewIcon type="gallery" />
                    <span className="text-[13px] font-medium">Gallery</span>
                    <span className="text-[12px] text-muted-foreground">Records as cards</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 px-3 py-3">
                    <Checkbox
                      checked={views.calendar}
                      disabled={dateFields.length === 0}
                      onCheckedChange={(checked) =>
                        setViews((v) => ({ ...v, calendar: Boolean(checked), calendarFieldId: v.calendarFieldId || dateFields[0]?.id || "" }))
                      }
                    />
                    <ViewIcon type="calendar" />
                    <span className="text-[13px] font-medium">Calendar</span>
                    {dateFields.length === 0 ? (
                      <span className="text-[12px] text-muted-foreground">Needs a Date field</span>
                    ) : views.calendar ? (
                      <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        by
                        <OptionSelect
                          value={views.calendarFieldId}
                          onChange={(id) => setViews((v) => ({ ...v, calendarFieldId: id }))}
                          options={dateFields.map((f) => ({ value: f.id, label: f.name }))}
                          className="h-7 w-40"
                        />
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">Records on a month grid</span>
                    )}
                  </div>
                </div>
              )
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className={cn("flex size-10 items-center justify-center rounded-lg", collectionColor(color).chip)}>
                    <Layers className={cn("size-5", collectionColor(color).text)} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold">{name.trim()}</p>
                    {description.trim() ? <p className="text-[13px] text-muted-foreground">{description.trim()}</p> : null}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">{fields.length} fields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {fields.map((f) => {
                      const Icon = FIELD_TYPE_META[f.type].icon;
                      return (
                        <span key={f.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[12px]">
                          <Icon className="size-3 text-muted-foreground" />
                          {f.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">{finalViews.length} views</p>
                  <div className="flex flex-wrap gap-1.5">
                    {finalViews.map((v) => (
                      <span key={v.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[12px]">
                        <ViewIcon type={v.type} />
                        {v.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => (step === 0 ? router.push("/collections") : setStep(step - 1))}>
            <ArrowLeft className="size-3.5" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {stepProblem ? <span className="ml-auto text-[12px] text-muted-foreground">{stepProblem}</span> : null}
          {step < STEPS.length - 1 ? (
            <Button size="sm" className={stepProblem ? "" : "ml-auto"} disabled={Boolean(stepProblem)} onClick={() => setStep(step + 1)}>
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" className="ml-auto" disabled={creating} onClick={create}>
              <Check className="size-3.5" />
              {creating ? "Creating…" : "Create collection"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
