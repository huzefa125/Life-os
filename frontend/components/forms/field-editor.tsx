"use client";

import { ArrowDown, ArrowUp, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHOICE_FIELD_TYPES,
  CONDITION_OPERATOR_LABELS,
  FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
} from "@/lib/form-field-meta";
import type { FormCondition, FormConditionOperator, FormField, FormSection } from "@/lib/types";

const NO_CONDITION = "__none__";
const NO_SECTION = "__none__";

export function FieldEditor({
  field,
  index,
  total,
  earlierFields,
  sections,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: FormField;
  index: number;
  total: number;
  earlierFields: FormField[];
  sections: FormSection[];
  onChange: (field: FormField) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isChoice = CHOICE_FIELD_TYPES.has(field.type);
  const needsRange = field.type === "number" || field.type === "currency" || field.type === "rating";
  const isText = field.type === "short_text" || field.type === "long_text";
  const supportsPattern = field.type === "short_text" || field.type === "email" || field.type === "url";

  function update(patch: Partial<FormField>) {
    onChange({ ...field, ...patch });
  }

  function updateOption(i: number, value: string) {
    const options = [...(field.options ?? [])];
    options[i] = value;
    update({ options });
  }

  function addOption() {
    update({ options: [...(field.options ?? []), ""] });
  }

  function removeOption(i: number) {
    update({ options: (field.options ?? []).filter((_, idx) => idx !== i) });
  }

  function updateCondition(patch: Partial<FormCondition> | null) {
    if (patch === null) {
      update({ visibleIf: undefined });
      return;
    }
    const base: FormCondition = field.visibleIf ?? {
      fieldId: earlierFields[0]?.id ?? "",
      operator: "equals",
      value: "",
    };
    update({ visibleIf: { ...base, ...patch } });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
      <div className="flex items-start gap-2">
        <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
          {index + 1}
        </span>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Input
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="Question"
              className="min-w-[180px] flex-1 text-[13px]"
            />
            <Select value={field.type} onValueChange={(value) => update({ type: value as FormField["type"] })}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_FIELD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {FIELD_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sections.length > 0 ? (
              <Select
                value={field.sectionId ?? NO_SECTION}
                onValueChange={(value) => update({ sectionId: !value || value === NO_SECTION ? undefined : value })}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue placeholder="Page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SECTION}>Page 1</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          <Input
            value={field.helpText ?? ""}
            onChange={(e) => update({ helpText: e.target.value || undefined })}
            placeholder="Help text (optional)"
            className="text-[13px]"
          />

          {isChoice ? (
            <div className="flex flex-col gap-1.5">
              {(field.options ?? []).map((option, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="h-7 flex-1 text-[13px]"
                  />
                  <Input
                    value={field.optionDescriptions?.[option] ?? ""}
                    onChange={(e) =>
                      update({ optionDescriptions: { ...field.optionDescriptions, [option]: e.target.value } })
                    }
                    placeholder="Description (optional)"
                    className="h-7 flex-1 text-[13px] text-muted-foreground"
                  />
                  <Button variant="ghost" size="icon-xs" onClick={() => removeOption(i)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="xs" className="w-fit" onClick={addOption}>
                Add option
              </Button>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Checkbox checked={field.allowOther ?? false} onCheckedChange={(c) => update({ allowOther: c === true })} />
                  Allow &quot;Other&quot;
                </label>
                <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Checkbox checked={field.randomizeOptions ?? false} onCheckedChange={(c) => update({ randomizeOptions: c === true })} />
                  Randomize order
                </label>
              </div>

              {field.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={field.minSelections ?? ""}
                    onChange={(e) => update({ minSelections: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="Min selections"
                    className="h-7 w-32 text-[13px]"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={field.maxSelections ?? ""}
                    onChange={(e) => update({ maxSelections: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="Max selections"
                    className="h-7 w-32 text-[13px]"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {isText ? (
            <div className="flex flex-wrap gap-2">
              <Input
                type="number"
                min={0}
                value={field.minLength ?? ""}
                onChange={(e) => update({ minLength: e.target.value === "" ? undefined : Number(e.target.value) })}
                placeholder="Min characters"
                className="h-7 w-32 text-[13px]"
              />
              <Input
                type="number"
                min={1}
                value={field.maxLength ?? ""}
                onChange={(e) => update({ maxLength: e.target.value === "" ? undefined : Number(e.target.value) })}
                placeholder="Max characters"
                className="h-7 w-32 text-[13px]"
              />
            </div>
          ) : null}

          {supportsPattern ? (
            <div className="flex flex-wrap gap-2">
              <Input
                value={field.pattern ?? ""}
                onChange={(e) => update({ pattern: e.target.value || undefined })}
                placeholder="Custom regex (optional)"
                className="h-7 flex-1 min-w-[160px] font-mono text-[12px]"
              />
              <Input
                value={field.patternMessage ?? ""}
                onChange={(e) => update({ patternMessage: e.target.value || undefined })}
                placeholder="Error message"
                className="h-7 flex-1 min-w-[160px] text-[13px]"
              />
            </div>
          ) : null}

          {needsRange ? (
            <div className="flex flex-wrap gap-2">
              <Input
                type="number"
                value={field.min ?? ""}
                onChange={(e) => update({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
                placeholder="Min"
                className="h-7 w-24 text-[13px]"
              />
              <Input
                type="number"
                value={field.max ?? ""}
                onChange={(e) => update({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
                placeholder="Max"
                className="h-7 w-24 text-[13px]"
              />
              {field.type === "currency" ? (
                <Input
                  value={field.currencyCode ?? ""}
                  onChange={(e) => update({ currencyCode: e.target.value || undefined })}
                  placeholder="USD"
                  className="h-7 w-20 text-[13px]"
                />
              ) : null}
              {field.type === "rating" ? (
                <Input
                  type="number"
                  value={field.ratingMax ?? ""}
                  onChange={(e) => update({ ratingMax: e.target.value === "" ? undefined : Number(e.target.value) })}
                  placeholder="Max stars (default 5)"
                  className="h-7 w-40 text-[13px]"
                />
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Checkbox checked={field.required} onCheckedChange={(checked) => update({ required: checked === true })} />
              Required
            </label>
          </div>

          {earlierFields.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/40 p-2">
              <Label className="text-[11px] text-muted-foreground">Show only if</Label>
              <Select
                value={field.visibleIf?.fieldId ?? NO_CONDITION}
                onValueChange={(value) => (!value || value === NO_CONDITION ? updateCondition(null) : updateCondition({ fieldId: value }))}
              >
                <SelectTrigger size="sm" className="h-6 text-[12px]">
                  <SelectValue placeholder="No condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONDITION}>No condition</SelectItem>
                  {earlierFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label || "Untitled question"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {field.visibleIf ? (
                <>
                  <Select
                    value={field.visibleIf.operator}
                    onValueChange={(value) => updateCondition({ operator: value as FormConditionOperator })}
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
                  {field.visibleIf.operator === "is_empty" || field.visibleIf.operator === "is_not_empty" ? null : (
                    <Input
                      value={field.visibleIf.value ?? ""}
                      onChange={(e) => updateCondition({ value: e.target.value })}
                      placeholder="Value"
                      className="h-6 w-32 text-[12px]"
                    />
                  )}
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-0.5">
          <Button variant="ghost" size="icon-xs" onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onMoveDown} disabled={index === total - 1}>
            <ArrowDown className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" className="text-destructive hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
