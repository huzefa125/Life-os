"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITION_OPERATOR_LABELS } from "@/lib/form-field-meta";
import type { FormCondition, FormConditionOperator, FormField, FormSection } from "@/lib/types";

const NO_CONDITION = "__none__";

function newSectionId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SectionsEditor({
  sections,
  fields,
  onChange,
}: {
  sections: FormSection[];
  fields: FormField[];
  onChange: (sections: FormSection[]) => void;
}) {
  function update(index: number, patch: Partial<FormSection>) {
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSection() {
    onChange([...sections, { id: newSectionId(), title: `Page ${sections.length + 1}` }]);
  }

  function removeSection(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function updateSkipCondition(index: number, patch: Partial<FormCondition> | null) {
    if (patch === null) {
      update(index, { skipIf: undefined });
      return;
    }
    const base: FormCondition = sections[index].skipIf ?? { fieldId: fields[0]?.id ?? "", operator: "equals", value: "" };
    update(index, { skipIf: { ...base, ...patch } });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[12px] text-muted-foreground">
        Split this form into multiple pages. Assign each field to a page below (in the field editor), and optionally
        skip a page based on an earlier answer — e.g. skip &quot;Business Information&quot; unless someone said they&apos;re a
        business.
      </p>

      {sections.map((section, index) => (
        <div key={section.id} className="flex flex-col gap-2 rounded-lg border bg-background p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
              {index + 1}
            </span>
            <Input value={section.title} onChange={(e) => update(index, { title: e.target.value })} placeholder="Page title" className="h-7 flex-1 text-[13px]" />
            <Button variant="ghost" size="icon-xs" onClick={() => move(index, -1)} disabled={index === 0}>
              <ArrowUp className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => move(index, 1)} disabled={index === sections.length - 1}>
              <ArrowDown className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" className="text-destructive hover:bg-destructive/10" onClick={() => removeSection(index)}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <Input
            value={section.description ?? ""}
            onChange={(e) => update(index, { description: e.target.value || undefined })}
            placeholder="Page description (optional)"
            className="h-7 text-[13px]"
          />

          {fields.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/40 p-2">
              <Label className="text-[11px] text-muted-foreground">Skip this page if</Label>
              <Select
                value={section.skipIf?.fieldId ?? NO_CONDITION}
                onValueChange={(value) => (!value || value === NO_CONDITION ? updateSkipCondition(index, null) : updateSkipCondition(index, { fieldId: value }))}
              >
                <SelectTrigger size="sm" className="h-6 w-36 text-[12px]">
                  <SelectValue placeholder="Never" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONDITION}>Never</SelectItem>
                  {fields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label || "Untitled question"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {section.skipIf ? (
                <>
                  <Select
                    value={section.skipIf.operator}
                    onValueChange={(value) => value && updateSkipCondition(index, { operator: value as FormConditionOperator })}
                  >
                    <SelectTrigger size="sm" className="h-6 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_OPERATOR_LABELS).map(([op, label]) => (
                        <SelectItem key={op} value={op}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {section.skipIf.operator === "is_empty" || section.skipIf.operator === "is_not_empty" ? null : (
                    <Input
                      value={section.skipIf.value ?? ""}
                      onChange={(e) => updateSkipCondition(index, { value: e.target.value })}
                      placeholder="Value"
                      className="h-6 w-28 text-[12px]"
                    />
                  )}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}

      <Button variant="outline" size="xs" className="w-fit gap-1" onClick={addSection}>
        <Plus className="size-3" />
        Add page
      </Button>
    </div>
  );
}
