"use client";

import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AutomationEditor } from "@/components/forms/automation-editor";
import { api, ApiError } from "@/lib/api-client";
import { newId } from "@/lib/collection-meta";
import type { Collection, CollectionAutomation, FormConditionOperator, FormField } from "@/lib/types";
import { OptionSelect } from "./field-value";

const TRIGGER_OPERATORS: { value: FormConditionOperator; label: string }[] = [
  { value: "equals", label: "becomes" },
  { value: "not_equals", label: "is no longer" },
  { value: "contains", label: "contains" },
  { value: "is_not_empty", label: "is filled in" },
  { value: "is_empty", label: "is cleared" },
];

export function AutomationsSheet({
  collection,
  open,
  onOpenChange,
  onChange,
}: {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (collection: Collection) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b border-border/70 pb-3">
          <SheetTitle className="flex items-center gap-1.5 text-[15px]">
            <Zap className="size-4 text-amber-500" />
            Automations
          </SheetTitle>
          <p className="text-[12px] text-muted-foreground">
            When a record changes so a condition becomes true, create People, Projects, Tasks or Transactions — linked back to the record.
          </p>
        </SheetHeader>
        {open ? <AutomationsEditor collection={collection} onChange={onChange} onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function AutomationsEditor({
  collection,
  onChange,
  onDone,
}: {
  collection: Collection;
  onChange: (collection: Collection) => void;
  onDone: () => void;
}) {
  const fields = collection.properties.fields;
  const [automations, setAutomations] = useState<CollectionAutomation[]>(collection.properties.automations);
  const [saving, setSaving] = useState(false);

  // The Forms automation editor maps "answers" by field id — record values are keyed the same way.
  const asFormFields = fields.map((f) => ({ id: f.id, label: f.name, type: "short_text", required: false }) as FormField);

  function update(index: number, patch: Partial<CollectionAutomation>) {
    setAutomations((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  async function save() {
    for (const a of automations) {
      if (!a.name.trim()) return toast.error("Every automation needs a name");
      if (!a.trigger.fieldId) return toast.error(`"${a.name}" needs a field to watch`);
      if (a.actions.length === 0) return toast.error(`"${a.name}" needs at least one step`);
    }
    setSaving(true);
    try {
      const updated = await api.collections.update(collection.id, {
        automations: automations.map((a) => ({ ...a, name: a.name.trim() })),
      });
      onChange(updated);
      toast.success("Automations saved");
      onDone();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save automations");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {automations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-5 text-center text-[13px] text-muted-foreground">
          No automations yet. Example: when <strong>Stage</strong> becomes <strong>Won</strong>, create a Project and a kickoff Task.
        </p>
      ) : null}

      {automations.map((automation, index) => {
        const watched = fields.find((f) => f.id === automation.trigger.fieldId);
        const needsValue = automation.trigger.operator !== "is_empty" && automation.trigger.operator !== "is_not_empty";
        return (
          <div key={automation.id} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={automation.enabled} onCheckedChange={(checked) => update(index, { enabled: Boolean(checked) })} aria-label="Enabled" />
              <Input
                value={automation.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Automation name"
                className="h-8 flex-1 text-[13px] font-medium"
                maxLength={100}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setAutomations((prev) => prev.filter((_, i) => i !== index))}
                aria-label="Delete automation"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">When</span>
              <OptionSelect
                value={automation.trigger.fieldId}
                onChange={(fieldId) => update(index, { trigger: { ...automation.trigger, fieldId, value: undefined } })}
                options={fields.map((f) => ({ value: f.id, label: f.name }))}
                placeholder="a field"
                className="h-7 w-40"
              />
              <OptionSelect
                value={automation.trigger.operator}
                onChange={(op) => update(index, { trigger: { ...automation.trigger, operator: op as FormConditionOperator } })}
                options={TRIGGER_OPERATORS}
                className="h-7 w-36"
              />
              {needsValue ? (
                watched?.type === "select" ? (
                  <OptionSelect
                    value={automation.trigger.value ?? ""}
                    onChange={(value) => update(index, { trigger: { ...automation.trigger, value } })}
                    options={(watched.config?.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
                    placeholder="an option"
                    className="h-7 w-36"
                  />
                ) : watched?.type === "checkbox" ? (
                  <OptionSelect
                    value={automation.trigger.value ?? ""}
                    onChange={(value) => update(index, { trigger: { ...automation.trigger, value } })}
                    options={[
                      { value: "true", label: "checked" },
                      { value: "false", label: "unchecked" },
                    ]}
                    className="h-7 w-32"
                  />
                ) : (
                  <Input
                    value={automation.trigger.value ?? ""}
                    onChange={(e) => update(index, { trigger: { ...automation.trigger, value: e.target.value } })}
                    placeholder="value"
                    className="h-7 w-40 text-[13px]"
                  />
                )
              ) : null}
            </div>

            <div className="rounded-lg bg-muted/40 p-2">
              <p className="mb-2 text-[12px] font-medium text-muted-foreground">Then</p>
              <AutomationEditor
                automations={automation.actions}
                fields={asFormFields}
                onChange={(actions) => update(index, { actions })}
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setAutomations((prev) => [
              ...prev,
              {
                id: newId("a"),
                name: `Automation ${prev.length + 1}`,
                enabled: true,
                trigger: { fieldId: fields.find((f) => f.type === "select")?.id ?? fields[0]?.id ?? "", operator: "equals" },
                actions: [],
              },
            ])
          }
          disabled={fields.length === 0}
        >
          <Plus className="size-3.5" />
          New automation
        </Button>
        <Button size="sm" className="ml-auto" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save automations"}
        </Button>
      </div>
    </div>
  );
}
