"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Plus, Receipt, Search, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import type { Expense, ExpenseProperties } from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(properties: ExpenseProperties | null) {
  if (!properties) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: properties.currency || "USD",
  }).format(properties.amount);
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function initialProperties(): ExpenseProperties {
  return { amount: 1, currency: "USD", category: "", date: today(), description: "" };
}

export function ExpensesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.expenses
      .list()
      .then((data) => {
        if (cancelled) return;
        setExpenses(data);
        const focusId = searchParams.get("focus");
        const match = focusId ? data.find((expense) => expense.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/expenses");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load expenses"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((expense) => {
      const properties = expense.properties;
      return (
        expense.title.toLowerCase().includes(q) ||
        (properties?.category ?? "").toLowerCase().includes(q) ||
        (properties?.description ?? "").toLowerCase().includes(q) ||
        (properties?.currency ?? "").toLowerCase().includes(q)
      );
    });
  }, [expenses, filter]);

  const total = expenses.reduce((sum, expense) => sum + (expense.properties?.amount ?? 0), 0);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-lime-100 text-lime-700">
          <Receipt className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Expenses</h1>
        {!loading ? <span className="text-[13px] text-muted-foreground">{expenses.length}</span> : null}
        {!loading && expenses.length > 0 ? <span className="text-[13px] text-muted-foreground">Total {total.toFixed(2)}</span> : null}
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New
        </Button>
      </div>

      <div className="flex items-center gap-1.5 border-y bg-canvas px-6 py-1.5">
        <List className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground/80">All Expenses</span>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-7 w-44 border-none bg-transparent pl-7 text-[13px] shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="px-6">
        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime-100">
              <Receipt className="size-5 text-lime-700" />
            </div>
            {expenses.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No expenses yet</p>
                  <p className="text-sm text-muted-foreground">Track spending as it happens.</p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New expense
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No expenses match &quot;{filter}&quot;.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px]">Title</TableHead>
                <TableHead className="text-[13px]">Category</TableHead>
                <TableHead className="text-[13px]">Date</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((expense) => (
                <TableRow
                  key={expense.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => {
                    setSelected(expense);
                    setDetailOpen(true);
                  }}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">{expense.title}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{expense.properties?.category ?? "-"}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{formatDate(expense.properties?.date)}</TableCell>
                  <TableCell className="pr-0 text-right text-[13px] font-medium">{formatMoney(expense.properties)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateExpenseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(expense) => setExpenses((prev) => [expense, ...prev])}
      />
      <ExpenseDetailSheet
        expense={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(expense) => {
          setExpenses((prev) => prev.map((item) => (item.id === expense.id ? expense : item)));
          setSelected(expense);
        }}
        onDeleted={(id) => setExpenses((prev) => prev.filter((expense) => expense.id !== id))}
      />
    </div>
  );
}

function ExpenseFields({
  title,
  setTitle,
  properties,
  setProperties,
}: {
  title: string;
  setTitle: (value: string) => void;
  properties: ExpenseProperties;
  setProperties: (value: ExpenseProperties) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-title">Title</Label>
        <Input id="expense-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input id="expense-amount" type="number" min={0.01} step={0.01} value={properties.amount} onChange={(event) => setProperties({ ...properties, amount: Number(event.target.value) })} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-currency">Currency</Label>
          <Input id="expense-currency" value={properties.currency} onChange={(event) => setProperties({ ...properties, currency: event.target.value.toUpperCase() })} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-date">Date</Label>
          <Input id="expense-date" type="date" value={properties.date} onChange={(event) => setProperties({ ...properties, date: event.target.value })} required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-category">Category</Label>
        <Input id="expense-category" value={properties.category} onChange={(event) => setProperties({ ...properties, category: event.target.value })} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense-description">Description</Label>
        <Textarea id="expense-description" rows={4} value={properties.description ?? ""} onChange={(event) => setProperties({ ...properties, description: event.target.value })} />
      </div>
    </>
  );
}

function CreateExpenseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (expense: Expense) => void;
}) {
  const [title, setTitle] = useState("");
  const [properties, setProperties] = useState<ExpenseProperties>(initialProperties);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setProperties(initialProperties());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const expense = await api.expenses.create({
        title: title.trim(),
        properties: {
          ...properties,
          category: properties.category.trim(),
          currency: properties.currency.trim().toUpperCase(),
          description: properties.description?.trim(),
        },
      });
      onCreated(expense);
      toast.success(`${expense.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New expense</DialogTitle>
            <DialogDescription>Add a purchase or bill.</DialogDescription>
          </DialogHeader>
          <ExpenseFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} />
          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim() || !properties.category.trim() || !properties.currency.trim()}>
              {submitting ? "Adding..." : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDetailSheet({
  expense,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (expense: Expense) => void;
  onDeleted: (id: string) => void;
}) {
  if (!expense) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <ExpenseDetailForm key={expense.id} expense={expense} onOpenChange={onOpenChange} onUpdated={onUpdated} onDeleted={onDeleted} />
      </SheetContent>
    </Sheet>
  );
}

function ExpenseDetailForm({
  expense,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  expense: Expense;
  onOpenChange: (open: boolean) => void;
  onUpdated: (expense: Expense) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(expense.title);
  const [properties, setProperties] = useState<ExpenseProperties>(expense.properties ?? initialProperties());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await api.expenses.update(expense.id, {
        title: title.trim(),
        properties: {
          ...properties,
          category: properties.category.trim(),
          currency: properties.currency.trim().toUpperCase(),
          description: properties.description?.trim(),
        },
      });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save expense");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.expenses.remove(expense.id);
      onDeleted(expense.id);
      onOpenChange(false);
      toast.success(`${expense.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete expense");
    } finally {
      setDeleting(false);
    }
  }

  const dirty = title.trim() !== expense.title || JSON.stringify(properties) !== JSON.stringify(expense.properties ?? {});

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{expense.title}</SheetTitle>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0" />
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <ExpenseFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} />
        </div>
      </div>
      <SheetFooter className="flex-row items-center justify-between">
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={onDelete}>
          <Trash2 className="size-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
        <Button size="sm" disabled={!dirty || saving || !title.trim() || !properties.category.trim() || !properties.currency.trim()} onClick={onSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
