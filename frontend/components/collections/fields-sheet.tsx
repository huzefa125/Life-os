"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, ApiError } from "@/lib/api-client";
import { FIELD_TYPE_META, newId } from "@/lib/collection-meta";
import type { Collection, CollectionField } from "@/lib/types";
import { FieldEditor, defaultConfigFor, fieldProblem } from "./field-editor";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function FieldsSheet({
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
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-border/70 pb-3">
          <SheetTitle className="text-[15px]">Fields</SheetTitle>
          <p className="text-[12px] text-muted-foreground">
            A field&apos;s type is fixed once created. Deleting a field hides its values and removes it from views and automations.
          </p>
        </SheetHeader>
        {open ? <FieldsList collection={collection} onChange={onChange} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function FieldsList({ collection, onChange }: { collection: Collection; onChange: (collection: Collection) => void }) {
  const saved = collection.properties.fields;
  const [drafts, setDrafts] = useState<Record<string, CollectionField>>({});
  const [newField, setNewField] = useState<CollectionField | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [collections, setCollections] = useState<Pick<Collection, "id" | "title">[]>([]);

  useEffect(() => {
    api.collections
      .list()
      .then((items) => setCollections(items.map((c) => ({ id: c.id, title: c.title }))))
      .catch(() => setCollections([]));
  }, []);

  async function run(action: () => Promise<Collection>, success: string) {
    setBusy(true);
    try {
      const updated = await action();
      onChange(updated);
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update fields"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveField(field: CollectionField) {
    const problem = fieldProblem(field);
    if (problem) return toast.error(problem);
    const ok = await run(
      () =>
        api.collections.fields.update(collection.id, field.id, {
          name: field.name.trim(),
          description: field.description,
          required: field.required,
          config: field.config,
        }),
      "Field saved"
    );
    if (ok) {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[field.id];
        return next;
      });
    }
  }

  async function addField() {
    if (!newField) return;
    const problem = fieldProblem(newField);
    if (problem) return toast.error(problem);
    const ok = await run(() => api.collections.fields.add(collection.id, { ...newField, name: newField.name.trim() }), "Field added");
    if (ok) setNewField(null);
  }

  async function deleteField(field: CollectionField) {
    if (!window.confirm(`Delete the "${field.name}" field? Its values will be hidden from every record.`)) return;
    await run(() => api.collections.fields.remove(collection.id, field.id), "Field deleted");
  }

  async function move(index: number, delta: number) {
    const ids = saved.map((f) => f.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id);
    await run(() => api.collections.fields.reorder(collection.id, ids), "Order saved");
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      {saved.map((savedField, index) => {
        const field = drafts[savedField.id] ?? savedField;
        const Icon = FIELD_TYPE_META[field.type].icon;
        const isOpen = expanded === field.id;
        const isDirty = Boolean(drafts[field.id]);
        return (
          <div key={field.id} className="rounded-xl border border-border/70 bg-card">
            <div className="flex items-center gap-2 px-3 py-2">
              <Icon className="size-3.5 text-muted-foreground" />
              <button type="button" className="flex-1 truncate text-left text-[13px] font-medium" onClick={() => setExpanded(isOpen ? null : field.id)}>
                {field.name}
                <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                  {FIELD_TYPE_META[field.type].label}
                  {field.required ? " · required" : ""}
                </span>
              </button>
              <Button variant="ghost" size="icon-sm" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled={busy || index === saved.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                <ArrowDown className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => deleteField(field)} aria-label="Delete field">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {isOpen ? (
              <div className="flex flex-col gap-3 border-t border-border/70 px-3 py-3">
                <FieldEditor
                  field={field}
                  lockType
                  lockRelationTarget
                  collections={collections}
                  onChange={(next) => setDrafts((prev) => ({ ...prev, [field.id]: next }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy || !isDirty} onClick={() => saveField(field)}>
                    Save field
                  </Button>
                  {isDirty ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDrafts((prev) => {
                          const next = { ...prev };
                          delete next[field.id];
                          return next;
                        })
                      }
                    >
                      Discard
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {newField ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-foreground/30 bg-card px-3 py-3">
          <FieldEditor field={newField} collections={collections} onChange={setNewField} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={addField}>
              Add field
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNewField(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setNewField({ id: newId("f"), name: "", type: "text", required: false, config: defaultConfigFor("text") })}
        >
          <Plus className="size-3.5" />
          New field
        </Button>
      )}
    </div>
  );
}
