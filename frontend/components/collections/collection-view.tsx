"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { format, startOfMonth } from "date-fns";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { api, ApiError } from "@/lib/api-client";
import { COLLECTION_COLORS, collectionColor, newId } from "@/lib/collection-meta";
import type {
  Collection,
  CollectionFilter,
  CollectionRecord,
  CollectionRecordPage,
  CollectionRecordValues,
  CollectionView as CollectionViewConfig,
  CollectionViewType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { AutomationsSheet } from "./automations-sheet";
import { OptionSelect } from "./field-value";
import { FieldsSheet } from "./fields-sheet";
import { RecordSheet } from "./record-sheet";
import { RecordsBoard, RecordsCalendar, RecordsGallery, RecordsTable, calendarRange } from "./record-views";
import { FieldsPopover, FilterPopover, SortPopover, visibleFields } from "./view-toolbar";
import { ViewIcon } from "./view-icon";

const BOARD_PAGE_SIZE = 500;
const PAGE_SIZES = [25, 50, 100];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

type SheetState = { open: boolean; recordId: string | null; initialValues?: CollectionRecordValues };

export function CollectionView() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [result, setResult] = useState<{ id: string; collection: Collection | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.collections
      .get(id)
      .then((collection) => {
        if (!cancelled) setResult({ id, collection });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(errorMessage(error, "Collection not found"));
        setResult({ id, collection: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!result || result.id !== id) return <PageLoader label="Opening collection" />;
  if (!result.collection) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <p className="text-sm font-medium">This collection doesn&apos;t exist or was deleted.</p>
        <Link href="/collections" className="text-sm text-teal-600 hover:underline">
          Back to Collections
        </Link>
      </div>
    );
  }
  return <CollectionWorkspace key={id} initial={result.collection} />;
}

function CollectionWorkspace({ initial }: { initial: Collection }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collection, setCollection] = useState(initial);
  const { fields, views } = collection.properties;

  const [activeViewId, setActiveViewId] = useState(views[0]?.id ?? "");
  const view: CollectionViewConfig = views.find((v) => v.id === activeViewId) ?? views[0];

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [data, setData] = useState<{ key: string; page: CollectionRecordPage } | null>(null);
  const [sheet, setSheet] = useState<SheetState>(() => {
    const recordId = searchParams.get("record");
    return recordId ? { open: true, recordId } : { open: false, recordId: null };
  });
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const groupField = view.type === "board" ? fields.find((f) => f.id === view.groupByFieldId && f.type === "select") : undefined;
  const dateField = view.type === "calendar" ? fields.find((f) => f.id === view.dateFieldId && (f.type === "date" || f.type === "datetime")) : undefined;
  const shownFields = visibleFields(fields, view);

  // Everything that determines which records are shown. The view's saved filters/sorts are merged server-side.
  const extraFilters: CollectionFilter[] = [];
  if (view.type === "calendar" && dateField) {
    const { start, end } = calendarRange(month);
    extraFilters.push(
      { fieldId: dateField.id, operator: "after", value: format(start.getTime() - 86_400_000, "yyyy-MM-dd") },
      { fieldId: dateField.id, operator: "before", value: format(end.getTime() + 86_400_000, "yyyy-MM-dd") }
    );
  }
  const fetchAll = view.type === "board" || view.type === "calendar";
  const query = {
    viewId: view.id,
    search: search || undefined,
    page: fetchAll ? 1 : page,
    pageSize: fetchAll ? BOARD_PAGE_SIZE : pageSize,
    filters: extraFilters,
  };
  const queryKey = JSON.stringify({ query, filters: view.filters, sorts: view.sorts, reloadKey, fields: fields.length });
  const loading = data?.key !== queryKey;

  useEffect(() => {
    let cancelled = false;
    const key = queryKey;
    api.collections.records
      .list(collection.id, JSON.parse(key).query)
      .then((page) => {
        if (!cancelled) setData({ key, page });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(errorMessage(error, "Couldn't load records"));
        setData({ key, page: { records: [], total: 0, page: 1, pageSize: 50, related: {} } });
      });
    return () => {
      cancelled = true;
    };
  }, [collection.id, queryKey]);

  // Debounce typing into the search box.
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
      setSelected(new Set());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, search]);

  const records = data?.page.records ?? [];
  const related = data?.page.related ?? {};
  const total = data?.page.total ?? 0;
  const reload = () => setReloadKey((k) => k + 1);

  function switchView(viewId: string) {
    setActiveViewId(viewId);
    setPage(1);
    setSelected(new Set());
  }

  async function updateView(patch: Parameters<typeof api.collections.views.update>[2]) {
    try {
      const updated = await api.collections.views.update(collection.id, view.id, patch);
      setCollection(updated);
      setPage(1);
      setSelected(new Set());
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update the view"));
    }
  }

  async function addView(type: CollectionViewType) {
    const selectField = fields.find((f) => f.type === "select");
    const date = fields.find((f) => f.type === "date" || f.type === "datetime");
    if (type === "board" && !selectField) return toast.error("Add a Select field first — boards group records by it.");
    if (type === "calendar" && !date) return toast.error("Add a Date field first — calendars place records by it.");
    const names: Record<CollectionViewType, string> = { table: "Table", board: "Board", gallery: "Gallery", calendar: "Calendar" };
    const newView: CollectionViewConfig = {
      id: newId("v"),
      name: names[type],
      type,
      filters: [],
      sorts: [],
      ...(type === "board" ? { groupByFieldId: selectField!.id } : {}),
      ...(type === "calendar" ? { dateFieldId: date!.id } : {}),
    };
    try {
      const updated = await api.collections.views.add(collection.id, newView);
      setCollection(updated);
      switchView(newView.id);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't add the view"));
    }
  }

  async function renameView() {
    const name = window.prompt("Rename view", view.name)?.trim();
    if (!name || name === view.name) return;
    await updateView({ name });
  }

  async function deleteView() {
    if (views.length <= 1) return toast.error("A collection needs at least one view");
    if (!window.confirm(`Delete the "${view.name}" view? Records aren't affected.`)) return;
    try {
      const updated = await api.collections.views.remove(collection.id, view.id);
      setCollection(updated);
      switchView(updated.properties.views[0]?.id ?? "");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete the view"));
    }
  }

  async function bulk(action: "trash" | "archive") {
    const ids = [...selected];
    if (action === "trash" && !window.confirm(`Move ${ids.length} record${ids.length === 1 ? "" : "s"} to Trash?`)) return;
    try {
      const { count } = await api.collections.records.bulk(collection.id, action, ids);
      toast.success(`${action === "trash" ? "Moved to Trash" : "Archived"}: ${count} record${count === 1 ? "" : "s"}`);
      setSelected(new Set());
      reload();
    } catch (error) {
      toast.error(errorMessage(error, "Bulk action failed"));
    }
  }

  async function moveCard(recordId: string, value: string | null) {
    if (!groupField) return;
    // Optimistic: move the card now, roll back if the server rejects it.
    const previous = data;
    setData((prev) =>
      prev
        ? {
            ...prev,
            page: {
              ...prev.page,
              records: prev.page.records.map((r) => (r.id === recordId ? { ...r, values: { ...r.values, [groupField.id]: value } } : r)),
            },
          }
        : prev
    );
    try {
      await api.collections.records.update(collection.id, recordId, { [groupField.id]: value });
    } catch (error) {
      setData(previous);
      toast.error(errorMessage(error, "Couldn't move the card"));
    }
  }

  async function exportCsv() {
    try {
      const blob = await api.collections.records.exportCsv(collection.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collection.properties.slug || "collection"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(errorMessage(error, "Export failed"));
    }
  }

  async function archiveCollection() {
    try {
      await api.archive.archive(collection.id);
      toast.success("Collection archived");
      router.push("/collections?tab=archived");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't archive"));
    }
  }

  async function trashCollection() {
    if (!window.confirm(`Move "${collection.title}" and all its records to Trash?`)) return;
    try {
      await api.collections.remove(collection.id);
      toast.success("Moved to Trash");
      router.push("/collections");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete"));
    }
  }

  function openRecord(record: CollectionRecord) {
    setSheet({ open: true, recordId: record.id });
  }

  function createRecord(initialValues?: CollectionRecordValues) {
    setSheet({ open: true, recordId: null, initialValues });
  }

  function closeSheet(open: boolean) {
    if (open) return;
    setSheet((s) => ({ ...s, open: false }));
    if (searchParams.get("record")) router.replace(`/collections/${collection.id}`);
  }

  const color = collectionColor(collection.properties.color);
  const isArchived = collection.status === "archived";
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-6 pt-3 pb-2">
        <Link href="/collections" className="text-[13px] text-muted-foreground hover:text-foreground">
          Collections
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <div className={cn("flex size-6 items-center justify-center rounded-md", color.chip)}>
          <Layers className={cn("size-3.5", color.text)} />
        </div>
        <h1 className="truncate text-[15px] font-semibold">{collection.title}</h1>
        <FavoriteButton objectId={collection.id} initialFavorite={collection.isFavorite} />
        {isArchived ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Archived</span> : null}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setAutomationsOpen(true)}>
            <Zap className="size-3.5 text-amber-500" />
            Automations
            {collection.properties.automations.length ? (
              <span className="text-muted-foreground">{collection.properties.automations.filter((a) => a.enabled).length}</span>
            ) : null}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFieldsOpen(true)}>
            <Settings2 className="size-3.5" />
            Fields
          </Button>
          <Button variant="ghost" size="sm" onClick={exportCsv}>
            <Download className="size-3.5" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="More">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                <Pencil />
                Edit details
              </DropdownMenuItem>
              {!isArchived ? (
                <DropdownMenuItem onClick={archiveCollection}>
                  <Archive />
                  Archive collection
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={trashCollection}>
                <Trash2 />
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => createRecord()} disabled={isArchived || fields.length === 0}>
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
      </div>
      {collection.properties.description ? <p className="px-6 pb-2 text-[13px] text-muted-foreground">{collection.properties.description}</p> : null}

      {/* View tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border/70 px-6">
        {views.map((v) => {
          const active = v.id === view.id;
          return (
            <div key={v.id} className="relative flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => switchView(v.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 text-[13px] transition-colors",
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ViewIcon type={v.type} className={active ? "text-foreground" : undefined} />
                {v.name}
              </button>
              {active ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="-ml-1.5 mr-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="View options">
                    <MoreHorizontal className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem onClick={renameView}>
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={deleteView} disabled={views.length <= 1}>
                      <Trash2 />
                      Delete view
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {active ? <motion.span layoutId="collection-view-underline" className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-foreground" /> : null}
            </div>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground">
            <Plus className="size-3.5" />
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel>Add a view</DropdownMenuLabel>
            {(["table", "board", "gallery", "calendar"] as const).map((type) => (
              <DropdownMenuItem key={type} onClick={() => addView(type)}>
                <ViewIcon type={type} />
                <span className="capitalize">{type}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-6 py-2">
        <div className="relative mr-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search records…"
            className="h-7 w-52 pl-7 text-[13px]"
            maxLength={200}
          />
          {searchInput ? (
            <button type="button" onClick={() => setSearchInput("")} className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground" aria-label="Clear search">
              <X className="size-3" />
            </button>
          ) : null}
        </div>
        <FilterPopover key={`f-${view.id}`} fields={fields} filters={view.filters} onApply={(filters) => updateView({ filters })} />
        {view.type !== "calendar" ? (
          <SortPopover key={`s-${view.id}`} fields={fields} sorts={view.sorts} onApply={(sorts) => updateView({ sorts })} />
        ) : null}
        {view.type === "table" || view.type === "gallery" || view.type === "board" ? (
          <FieldsPopover fields={fields} view={view} onApply={(patch) => updateView(patch)} />
        ) : null}
        {view.type === "board" ? (
          <span className="ml-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            Group by
            <OptionSelect
              value={view.groupByFieldId ?? ""}
              onChange={(groupByFieldId) => updateView({ groupByFieldId })}
              options={fields.filter((f) => f.type === "select").map((f) => ({ value: f.id, label: f.name }))}
              className="h-7 w-36"
            />
          </span>
        ) : null}
        {view.type === "calendar" ? (
          <span className="ml-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            Date field
            <OptionSelect
              value={view.dateFieldId ?? ""}
              onChange={(dateFieldId) => updateView({ dateFieldId })}
              options={fields.filter((f) => f.type === "date" || f.type === "datetime").map((f) => ({ value: f.id, label: f.name }))}
              className="h-7 w-36"
            />
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground">
          {loading ? <Spinner size={14} /> : null}
          {total} record{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[13px] dark:border-teal-500/30 dark:bg-teal-500/10"
          >
            <span className="font-medium">{selected.size} selected</span>
            <Button variant="ghost" size="sm" onClick={() => bulk("archive")}>
              <Archive className="size-3.5" />
              Archive
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => bulk("trash")}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Records */}
      <div className="flex-1 px-6 pb-8">
        {fields.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-medium">No fields yet</p>
            <p className="text-sm text-muted-foreground">Add fields to start adding records.</p>
            <Button size="sm" onClick={() => setFieldsOpen(true)}>
              <Plus className="size-3.5" />
              Add a field
            </Button>
          </div>
        ) : !data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : view.type === "board" ? (
          groupField ? (
            <RecordsBoard
              groupField={groupField}
              fields={shownFields}
              records={records}
              related={related}
              total={total}
              onOpen={openRecord}
              onMove={moveCard}
              onCreate={(value) => createRecord(value ? { [groupField.id]: value } : undefined)}
            />
          ) : (
            <p className="py-10 text-center text-[13px] text-muted-foreground">Pick a Select field to group this board by.</p>
          )
        ) : view.type === "calendar" ? (
          dateField ? (
            <RecordsCalendar
              month={month}
              onMonthChange={setMonth}
              dateField={dateField}
              records={records}
              total={total}
              onOpen={openRecord}
              onCreate={(day) =>
                createRecord({ [dateField.id]: dateField.type === "date" ? format(day, "yyyy-MM-dd") : new Date(day.setHours(9, 0, 0, 0)).toISOString() })
              }
            />
          ) : (
            <p className="py-10 text-center text-[13px] text-muted-foreground">Pick a Date field for this calendar.</p>
          )
        ) : records.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-medium">{search || view.filters.length ? "No matching records" : "No records yet"}</p>
            <p className="text-sm text-muted-foreground">
              {search || view.filters.length ? "Try a different search or adjust this view's filters." : "Create the first record in this collection."}
            </p>
            {!search && !view.filters.length && !isArchived ? (
              <Button size="sm" onClick={() => createRecord()}>
                <Plus className="size-3.5" />
                New record
              </Button>
            ) : null}
          </div>
        ) : (
          <div className={cn("flex flex-col gap-3 transition-opacity", loading && "opacity-60")}>
            {view.type === "gallery" ? (
              <RecordsGallery fields={shownFields} records={records} related={related} onOpen={openRecord} />
            ) : (
              <RecordsTable
                fields={shownFields}
                records={records}
                related={related}
                selected={selected}
                onSelectedChange={setSelected}
                onOpen={openRecord}
                sorts={view.sorts}
                onSort={(sorts) => updateView({ sorts })}
              />
            )}
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span>
                {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                Rows
                <OptionSelect
                  value={String(pageSize)}
                  onChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                    setSelected(new Set());
                  }}
                  options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                  className="h-7 w-16"
                />
              </span>
              <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="tabular-nums">
                {page} / {pageCount}
              </span>
              <Button variant="ghost" size="icon-sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <RecordSheet
        collection={collection}
        recordId={sheet.recordId}
        initialValues={sheet.initialValues}
        open={sheet.open}
        onOpenChange={closeSheet}
        onSaved={() => reload()}
        onRemoved={() => reload()}
      />
      <FieldsSheet
        collection={collection}
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
        onChange={(updated) => {
          setCollection(updated);
          reload();
        }}
      />
      <AutomationsSheet collection={collection} open={automationsOpen} onOpenChange={setAutomationsOpen} onChange={setCollection} />
      <CollectionDetailsDialog collection={collection} open={detailsOpen} onOpenChange={setDetailsOpen} onChange={setCollection} />
    </div>
  );
}

function CollectionDetailsDialog({
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? <DetailsForm collection={collection} onDone={() => onOpenChange(false)} onChange={onChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailsForm({ collection, onDone, onChange }: { collection: Collection; onDone: () => void; onChange: (c: Collection) => void }) {
  const [name, setName] = useState(collection.title);
  const [description, setDescription] = useState(collection.properties.description ?? "");
  const [color, setColor] = useState(collection.properties.color ?? "teal");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const updated = await api.collections.update(collection.id, { name: name.trim(), description: description.trim(), color });
      onChange(updated);
      toast.success("Saved");
      onDone();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Collection details</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={100} />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} maxLength={1000} />
        <div className="flex items-center gap-1.5">
          {Object.entries(COLLECTION_COLORS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              onClick={() => setColor(key)}
              className={cn("flex size-6 items-center justify-center rounded-md", c.chip, color === key && "ring-2 ring-foreground/40")}
            >
              <Layers className={cn("size-3", c.text)} />
            </button>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
