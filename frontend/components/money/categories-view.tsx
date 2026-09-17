"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api-client";
import { CATEGORY_KIND_LABELS } from "@/lib/money-meta";
import type { Category, CategoryKind, CategoryProperties } from "@/lib/types";
import { MoneyTabs } from "./money-tabs";

const CATEGORY_KINDS = Object.keys(CATEGORY_KIND_LABELS) as CategoryKind[];

function initialProperties(): CategoryProperties {
  return { kind: "expense", color: "#6366f1", icon: "" };
}

export function CategoriesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.categories
      .list()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        const focusId = searchParams.get("focus");
        const match = focusId ? data.find((category) => category.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/money/categories");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load categories"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-lime-100 text-lime-700">
          <Tag className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Money</h1>
        {!loading ? <span className="text-[13px] text-muted-foreground">{categories.length} categories</span> : null}
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New category
        </Button>
      </div>

      <MoneyTabs />

      <div className="px-6">
        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime-100">
              <Tag className="size-5 text-lime-700" />
            </div>
            <div>
              <p className="text-sm font-medium">No categories yet</p>
              <p className="text-sm text-muted-foreground">Group your income and expenses.</p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New category
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px]">Name</TableHead>
                <TableHead className="text-[13px]">Kind</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Color</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow
                  key={category.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => {
                    setSelected(category);
                    setDetailOpen(true);
                  }}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">{category.title}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {category.properties ? CATEGORY_KIND_LABELS[category.properties.kind] : "-"}
                  </TableCell>
                  <TableCell className="pr-0 text-right text-[13px]">
                    {category.properties?.color ? (
                      <span
                        className="ml-auto inline-block size-3 rounded-full"
                        style={{ backgroundColor: category.properties.color }}
                      />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateCategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(category) => setCategories((prev) => [category, ...prev])}
      />
      <CategoryDetailSheet
        category={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(category) => {
          setCategories((prev) => prev.map((item) => (item.id === category.id ? category : item)));
          setSelected(category);
        }}
        onDeleted={(id) => setCategories((prev) => prev.filter((category) => category.id !== id))}
      />
    </div>
  );
}

function CategoryFields({
  title,
  setTitle,
  properties,
  setProperties,
}: {
  title: string;
  setTitle: (value: string) => void;
  properties: CategoryProperties;
  setProperties: (value: CategoryProperties) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-title">Name</Label>
        <Input id="category-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Kind</Label>
          <Select
            value={properties.kind}
            onValueChange={(value) => setProperties({ ...properties, kind: value as CategoryKind })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{(v: CategoryKind) => CATEGORY_KIND_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {CATEGORY_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-color">Color</Label>
          <Input
            id="category-color"
            type="color"
            value={properties.color ?? "#6366f1"}
            onChange={(event) => setProperties({ ...properties, color: event.target.value })}
          />
        </div>
      </div>
    </>
  );
}

function CreateCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (category: Category) => void;
}) {
  const [title, setTitle] = useState("");
  const [properties, setProperties] = useState<CategoryProperties>(initialProperties);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setProperties(initialProperties());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const category = await api.categories.create({ title: title.trim(), properties });
      onCreated(category);
      toast.success(`${category.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create category");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>Group transactions for budgets and reports.</DialogDescription>
          </DialogHeader>
          <CategoryFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} />
          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Adding..." : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDetailSheet({
  category,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (category: Category) => void;
  onDeleted: (id: string) => void;
}) {
  if (!category) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <CategoryDetailForm key={category.id} category={category} onOpenChange={onOpenChange} onUpdated={onUpdated} onDeleted={onDeleted} />
      </SheetContent>
    </Sheet>
  );
}

function CategoryDetailForm({
  category,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  category: Category;
  onOpenChange: (open: boolean) => void;
  onUpdated: (category: Category) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(category.title);
  const [properties, setProperties] = useState<CategoryProperties>(category.properties ?? initialProperties());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await api.categories.update(category.id, { title: title.trim(), properties });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save category");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.categories.remove(category.id);
      onDeleted(category.id);
      onOpenChange(false);
      toast.success(`${category.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete category");
    } finally {
      setDeleting(false);
    }
  }

  const dirty = title.trim() !== category.title || JSON.stringify(properties) !== JSON.stringify(category.properties ?? {});

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{category.title}</SheetTitle>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0" />
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <CategoryFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} />
        </div>
      </div>
      <SheetFooter className="flex-row items-center justify-between">
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={onDelete}>
          <Trash2 className="size-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
        <Button size="sm" disabled={!dirty || saving || !title.trim()} onClick={onSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
