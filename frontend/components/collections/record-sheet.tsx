"use client";

import { useEffect, useState } from "react";
import { Archive, History, Link2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/loader";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { api, ApiError } from "@/lib/api-client";
import { FIELD_TYPE_META } from "@/lib/collection-meta";
import { OBJECT_TYPE_META } from "@/lib/type-meta";
import type {
  Collection,
  CollectionRecord,
  CollectionRecordValues,
  CollectionRelatedObject,
  DetailedObject,
  JsonValue,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { FieldValueInput } from "./field-value";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

const ACTIVITY_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  trashed: "Moved to Trash",
  archived: "Archived",
  restored: "Restored",
};

export function RecordSheet({
  collection,
  recordId,
  open,
  onOpenChange,
  initialValues,
  onSaved,
  onRemoved,
}: {
  collection: Collection;
  /** null = create a new record */
  recordId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: CollectionRecordValues;
  onSaved: (record: CollectionRecord) => void;
  onRemoved: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {open ? (
          <RecordSheetBody
            key={recordId ?? "new"}
            collection={collection}
            recordId={recordId}
            initialValues={initialValues}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
            onRemoved={onRemoved}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function RecordSheetBody({
  collection,
  recordId,
  initialValues,
  onClose,
  onSaved,
  onRemoved,
}: {
  collection: Collection;
  recordId: string | null;
  initialValues?: CollectionRecordValues;
  onClose: () => void;
  onSaved: (record: CollectionRecord) => void;
  onRemoved: (id: string) => void;
}) {
  const fields = collection.properties.fields;
  const isNew = recordId === null;
  const [record, setRecord] = useState<CollectionRecord | null>(null);
  const [values, setValues] = useState<CollectionRecordValues>(initialValues ?? {});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [related, setRelated] = useState<Record<string, CollectionRelatedObject>>({});
  const [detail, setDetail] = useState<DetailedObject | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailKey, setDetailKey] = useState(0);
  const loading = !isNew && record === null;

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    api.collections.records
      .get(collection.id, recordId)
      .then((data) => {
        if (cancelled) return;
        setRecord(data);
        setValues(data.values);
        setRelated(data.related);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(errorMessage(error, "Couldn't load the record"));
        onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.id, recordId]);

  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    api.objects
      .detail(recordId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        // Connections are supplementary; the record form still works without them.
      });
    return () => {
      cancelled = true;
    };
  }, [recordId, detailKey]);

  function setValue(fieldId: string, value: JsonValue) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setDirty((prev) => new Set(prev).add(fieldId));
  }

  async function save() {
    setSaving(true);
    try {
      if (isNew) {
        // Only send what the user filled in; the server fills the rest (checkboxes → false, others → null).
        const payload = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== undefined && v !== ""));
        const created = await api.collections.records.create(collection.id, payload);
        toast.success("Record created");
        onSaved(created);
        onClose();
      } else {
        const patch = Object.fromEntries([...dirty].map((id) => [id, values[id] ?? null]));
        const updated = await api.collections.records.update(collection.id, recordId, patch);
        setRecord(updated);
        setValues(updated.values);
        setRelated(updated.related);
        setDirty(new Set());
        setDetailKey((k) => k + 1);
        toast.success("Saved");
        onSaved(updated);
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!recordId) return;
    try {
      await api.collections.records.bulk(collection.id, "archive", [recordId]);
      toast.success("Record archived");
      onRemoved(recordId);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't archive"));
    }
  }

  async function remove() {
    if (!recordId) return;
    try {
      await api.collections.records.remove(collection.id, recordId);
      toast.success("Moved to Trash");
      onRemoved(recordId);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete"));
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  // Links made by relation fields are already shown in the form above.
  const relationFieldTargets = new Set(
    fields.filter((f) => f.type === "relation").flatMap((f) => (Array.isArray(values[f.id]) ? (values[f.id] as string[]) : []))
  );
  const otherConnections = (detail?.relations ?? []).filter(
    (r) => !(r.type === "collection_link" && r.direction === "outgoing" && relationFieldTargets.has(r.otherObject.id))
  );

  return (
    <>
      <SheetHeader className="border-b border-border/70 pb-3">
        <div className="flex items-center gap-2 pr-8">
          <SheetTitle className="flex-1 truncate text-[15px]">{isNew ? `New ${collection.title} record` : (record?.title ?? "Record")}</SheetTitle>
          {!isNew && detail ? <FavoriteButton objectId={recordId} initialFavorite={detail.object.isFavorite} /> : null}
        </div>
        <p className="text-[12px] text-muted-foreground">
          {collection.title}
          {record ? ` · updated ${new Date(record.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : ""}
        </p>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4 py-4">
        {fields.length === 0 ? <p className="text-[13px] text-muted-foreground">This collection has no fields yet.</p> : null}
        {fields.map((field) => {
          const Icon = FIELD_TYPE_META[field.type].icon;
          return (
            <div key={field.id} className="grid gap-1.5 sm:grid-cols-[150px_1fr] sm:items-start sm:gap-3">
              <label className="flex items-center gap-1.5 pt-1.5 text-[12px] text-muted-foreground" title={field.description}>
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{field.name}</span>
                {field.required ? <span className="text-rose-500">*</span> : null}
              </label>
              <div className="min-w-0">
                <FieldValueInput
                  field={field}
                  value={values[field.id]}
                  onChange={(v) => setValue(field.id, v)}
                  related={related}
                  onResolveRelated={(objs) => setRelated((prev) => ({ ...prev, ...Object.fromEntries(objs.map((o) => [o.id, o])) }))}
                />
                {field.description ? <p className="mt-1 text-[11px] text-muted-foreground">{field.description}</p> : null}
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={save} disabled={saving || (!isNew && dirty.size === 0)}>
            {saving ? "Saving…" : isNew ? "Create record" : "Save changes"}
          </Button>
          {!isNew ? (
            <>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={archive}>
                <Archive className="size-3.5" />
                Archive
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {!isNew ? (
        <div className="flex flex-col gap-5 border-t border-border/70 px-4 py-4">
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
              <Link2 className="size-3.5" />
              Connected objects
            </h3>
            {!detail ? (
              <Spinner size={16} />
            ) : otherConnections.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nothing else links here yet. Automations and relation fields in other collections show up here.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {otherConnections.map((rel) => {
                  const meta = OBJECT_TYPE_META[rel.otherObject.type];
                  const Icon = meta?.icon ?? Link2;
                  return (
                    <li key={rel.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] hover:bg-muted/60">
                      <Icon className={cn("size-3.5", meta?.color)} />
                      <span className="flex-1 truncate">{rel.otherObject.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {rel.direction === "incoming" ? "← " : "→ "}
                        {rel.type.replace(/_/g, " ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {detail && detail.files.length > 0 ? (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
                <Paperclip className="size-3.5" />
                Files
              </h3>
              <ul className="flex flex-col gap-1">
                {detail.files.map((file) => {
                  const url = typeof file.properties?.url === "string" ? file.properties.url : null;
                  return (
                    <li key={file.id} className="text-[13px]">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer noopener" className="text-blue-600 hover:underline dark:text-blue-400">
                          {file.title}
                        </a>
                      ) : (
                        file.title
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
              <History className="size-3.5" />
              Activity
            </h3>
            {!detail ? (
              <Spinner size={16} />
            ) : detail.activities.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="relative flex flex-col gap-2 border-l border-border pl-4">
                {detail.activities.map((activity) => (
                  <li key={activity.id} className="relative text-[13px]">
                    <span className="absolute top-1.5 -left-[20.5px] size-2 rounded-full bg-muted-foreground/40" />
                    <span className="font-medium">{ACTIVITY_LABELS[activity.action] ?? activity.action}</span>
                    <span className="ml-2 text-[12px] text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
