"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { api } from "@/lib/api-client";
import {
  AUTOMATION_PROPERTY_KEYS,
  AUTOMATION_TYPE_LABELS,
  CONDITION_OPERATOR_LABELS,
  RELATION_TYPE_OPTIONS,
  newActionId,
} from "@/lib/form-field-meta";
import type {
  FormAutomation,
  FormAutomationType,
  FormCondition,
  FormConditionOperator,
  FormField,
  FormFieldMapping,
  RelationType,
} from "@/lib/types";

const NONE = "__none__";

function MappingPicker({
  mapping,
  onChange,
  fields,
  priorActions,
  staticOptions,
}: {
  mapping: FormFieldMapping | undefined;
  onChange: (mapping: FormFieldMapping) => void;
  fields: FormField[];
  priorActions: { id: string; label: string }[];
  /** When set, the "Fixed value" branch renders a Select of these instead of a free-text input. */
  staticOptions?: { label: string; value: string }[];
}) {
  const source = mapping?.source ?? "field";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select
        value={source}
        onValueChange={(value) => {
          if (value === "field") onChange({ source: "field", fieldId: fields[0]?.id ?? "" });
          else if (value === "static") onChange({ source: "static", value: "" });
          else onChange({ source: "action_object_id", actionId: priorActions[0]?.id ?? "" });
        }}
      >
        <SelectTrigger size="sm" className="h-6 w-36 text-[12px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="field">From a form answer</SelectItem>
          <SelectItem value="static">Fixed value</SelectItem>
          {priorActions.length > 0 ? <SelectItem value="action_object_id">Created earlier in this submission</SelectItem> : null}
        </SelectContent>
      </Select>

      {source === "field" ? (
        <Select
          value={mapping && mapping.source === "field" ? mapping.fieldId : ""}
          onValueChange={(value) => onChange({ source: "field", fieldId: value ?? "" })}
        >
          <SelectTrigger size="sm" className="h-6 w-40 text-[12px]">
            <SelectValue placeholder="Pick a question" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label || "Untitled question"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : source === "static" ? (
        staticOptions ? (
          <Select
            value={mapping && mapping.source === "static" ? String(mapping.value ?? "") : ""}
            onValueChange={(value) => onChange({ source: "static", value: value ?? "" })}
          >
            <SelectTrigger size="sm" className="h-6 w-40 text-[12px]">
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              {staticOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={mapping && mapping.source === "static" ? String(mapping.value ?? "") : ""}
            onChange={(e) => onChange({ source: "static", value: e.target.value })}
            placeholder="Value"
            className="h-6 w-40 text-[12px]"
          />
        )
      ) : (
        <Select
          value={mapping && mapping.source === "action_object_id" ? mapping.actionId : ""}
          onValueChange={(value) => onChange({ source: "action_object_id", actionId: value ?? "" })}
        >
          <SelectTrigger size="sm" className="h-6 w-40 text-[12px]">
            <SelectValue placeholder="Pick a step" />
          </SelectTrigger>
          <SelectContent>
            {priorActions.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function ConditionEditor({
  condition,
  onChange,
  fields,
}: {
  condition: FormCondition | undefined;
  onChange: (condition: FormCondition | undefined) => void;
  fields: FormField[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/40 p-2">
      <Label className="text-[11px] text-muted-foreground">Only run if</Label>
      <Select
        value={condition?.fieldId ?? NONE}
        onValueChange={(value) =>
          !value || value === NONE ? onChange(undefined) : onChange({ fieldId: value, operator: "equals", value: "" })
        }
      >
        <SelectTrigger size="sm" className="h-6 w-40 text-[12px]">
          <SelectValue placeholder="Always" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Always</SelectItem>
          {fields.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.label || "Untitled question"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {condition ? (
        <>
          <Select
            value={condition.operator}
            onValueChange={(value) => onChange({ ...condition, operator: value as FormConditionOperator })}
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
          {condition.operator === "is_empty" || condition.operator === "is_not_empty" ? null : (
            <Input
              value={condition.value ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              placeholder="Value"
              className="h-6 w-32 text-[12px]"
            />
          )}
        </>
      ) : null}
    </div>
  );
}

export function AutomationEditor({
  automations,
  fields,
  onChange,
}: {
  automations: FormAutomation[];
  fields: FormField[];
  onChange: (automations: FormAutomation[]) => void;
}) {
  const [accounts, setAccounts] = useState<{ label: string; value: string }[]>([]);
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (!automations.some((a) => a.type === "create_transaction")) return;
    api.accounts
      .list()
      .then((data) => setAccounts(data.map((a) => ({ label: a.title, value: a.id }))))
      .catch(() => setAccounts([]));
    api.categories
      .list()
      .then((data) => setCategories(data.map((c) => ({ label: c.title, value: c.id }))))
      .catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automations.some((a) => a.type === "create_transaction")]);

  function update(index: number, patch: Partial<FormAutomation>) {
    onChange(automations.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function addAction() {
    const action: FormAutomation = {
      id: newActionId(),
      type: "create_person",
      titleMapping: { source: "field", fieldId: fields[0]?.id ?? "" },
      propertyMappings: {},
    };
    onChange([...automations, action]);
  }

  function removeAction(index: number) {
    onChange(automations.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {automations.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-[13px] text-muted-foreground">
          No automations yet. Add one to create a Person, Project, Task, or Money Transaction whenever this form is
          submitted.
        </p>
      ) : null}

      {automations.map((action, index) => {
        const priorActions = automations
          .slice(0, index)
          .map((a) => ({ id: a.id, label: a.label || AUTOMATION_TYPE_LABELS[a.type] }));
        const propertyKeys = AUTOMATION_PROPERTY_KEYS[action.type];

        return (
          <div key={action.id} className="flex flex-col gap-2.5 rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2">
              <Select value={action.type} onValueChange={(value) => update(index, { type: value as FormAutomationType, propertyMappings: {} })}>
                <SelectTrigger size="sm" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AUTOMATION_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={action.label ?? ""}
                onChange={(e) => update(index, { label: e.target.value || undefined })}
                placeholder="Step name (optional)"
                className="h-7 flex-1 text-[13px]"
              />
              <Button variant="ghost" size="icon-xs" className="text-destructive hover:bg-destructive/10" onClick={() => removeAction(index)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            <ConditionEditor condition={action.condition} onChange={(condition) => update(index, { condition })} fields={fields} />

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] text-muted-foreground">
                {action.type === "create_person" ? "Name" : "Title"}
              </Label>
              <MappingPicker
                mapping={action.titleMapping}
                onChange={(titleMapping) => update(index, { titleMapping })}
                fields={fields}
                priorActions={priorActions}
              />
            </div>

            {propertyKeys.map((key) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label className="text-[11px] text-muted-foreground">{key}</Label>
                <MappingPicker
                  mapping={action.propertyMappings[key]}
                  onChange={(mapping) =>
                    update(index, { propertyMappings: { ...action.propertyMappings, [key]: mapping } })
                  }
                  fields={fields}
                  priorActions={priorActions}
                  staticOptions={
                    action.type === "create_transaction" && (key === "accountId" || key === "toAccountId")
                      ? accounts
                      : action.type === "create_transaction" && key === "categoryId"
                        ? categories
                        : undefined
                  }
                />
              </div>
            ))}

            {priorActions.length > 0 ? (
              <RelationsEditor
                action={action}
                priorActions={priorActions}
                onChange={(relations) => update(index, { relations })}
              />
            ) : null}
          </div>
        );
      })}

      <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={addAction}>
        <Plus className="size-3.5" />
        Add automation step
      </Button>
    </div>
  );
}

function RelationsEditor({
  action,
  priorActions,
  onChange,
}: {
  action: FormAutomation;
  priorActions: { id: string; label: string }[];
  onChange: (relations: FormAutomation["relations"]) => void;
}) {
  const relations = action.relations ?? [];
  const refOptions = [{ id: "self", label: "This step" }, ...priorActions];

  function updateRelation(i: number, patch: Partial<NonNullable<FormAutomation["relations"]>[number]>) {
    onChange(relations.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRelation() {
    onChange([...relations, { relationType: "related_to", sourceActionId: priorActions[0]?.id ?? "self", targetActionId: "self" }]);
  }

  function removeRelation(i: number) {
    onChange(relations.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] text-muted-foreground">Link to objects created earlier</Label>
      {relations.map((rel, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5">
          <Select value={rel.sourceActionId} onValueChange={(value) => updateRelation(i, { sourceActionId: value ?? "self" })}>
            <SelectTrigger size="sm" className="h-6 w-32 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {refOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rel.relationType} onValueChange={(value) => updateRelation(i, { relationType: value as RelationType })}>
            <SelectTrigger size="sm" className="h-6 w-32 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATION_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rel.targetActionId} onValueChange={(value) => updateRelation(i, { targetActionId: value ?? "self" })}>
            <SelectTrigger size="sm" className="h-6 w-32 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {refOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon-xs" onClick={() => removeRelation(i)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="xs" className="w-fit" onClick={addRelation}>
        Add link
      </Button>
    </div>
  );
}
