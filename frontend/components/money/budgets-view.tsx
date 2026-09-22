"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
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
import { api, ApiError } from "@/lib/api-client";
import { BUDGET_PERIOD_LABELS, formatMoney } from "@/lib/money-meta";
import { cn } from "@/lib/utils";
import type { Budget, BudgetPeriod, BudgetProperties, Category } from "@/lib/types";
import { MoneyTabs } from "./money-tabs";

const BUDGET_PERIODS = Object.keys(BUDGET_PERIOD_LABELS) as BudgetPeriod[];
const ALL_PERIODS = "all";
const PERIOD_FILTERS: (BudgetPeriod | typeof ALL_PERIODS)[] = [ALL_PERIODS, "weekly", "monthly"];
const PERIOD_FILTER_LABELS: Record<BudgetPeriod | typeof ALL_PERIODS, string> = {
  all: "All",
  ...BUDGET_PERIOD_LABELS,
};

function initialProperties(defaultCategoryId: string): BudgetProperties {
  return { categoryId: defaultCategoryId, amount: 100, currency: "USD", period: "monthly" };
}

function meterColor(spent: number, amount: number) {
  const ratio = amount > 0 ? spent / amount : 0;
  if (ratio >= 1) return "bg-destructive";
  if (ratio >= 0.8) return "bg-amber-500";
  return "bg-emerald-500";
}

export function BudgetsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<BudgetPeriod | typeof ALL_PERIODS>(ALL_PERIODS);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.budgets.list(), api.categories.list()])
      .then(([budgetData, categoryData]) => {
        if (cancelled) return;
        setBudgets(budgetData);
        setCategories(categoryData);
        const focusId = searchParams.get("focus");
        const match = focusId ? budgetData.find((b) => b.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/money/budgets");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load budgets"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function categoryTitle(id: string) {
    return categories.find((c) => c.id === id)?.title ?? "-";
  }

  function categoryColor(id: string) {
    return categories.find((c) => c.id === id)?.properties?.color;
  }

  const filteredBudgets = useMemo(
    () => (periodFilter === ALL_PERIODS ? budgets : budgets.filter((b) => b.properties?.period === periodFilter)),
    [budgets, periodFilter]
  );

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-lime-100 text-lime-700">
          <PiggyBank className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Money</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <AnimatedNumber value={filteredBudgets.length} />
            budgets
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <div className="flex gap-1">
            {PERIOD_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriodFilter(option)}
                className={cn(
                  "rounded-md px-2 py-1 text-[12px] font-medium transition-colors",
                  periodFilter === option ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent/50"
                )}
              >
                {PERIOD_FILTER_LABELS[option]}
              </button>
            ))}
          </div>
          <Button size="sm" disabled={categories.length === 0} onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            New budget
          </Button>
        </div>
      </div>

      <MoneyTabs />

      <div className="px-6 py-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime-100">
              <PiggyBank className="size-5 text-lime-700" />
            </div>
            <div>
              <p className="text-sm font-medium">No budgets yet</p>
              <p className="text-sm text-muted-foreground">Set a spending limit per category.</p>
            </div>
            <Button size="sm" disabled={categories.length === 0} onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New budget
            </Button>
          </div>
        ) : filteredBudgets.length === 0 ? (
          <p className="px-1 py-16 text-center text-sm text-muted-foreground">
            No {PERIOD_FILTER_LABELS[periodFilter].toLowerCase()} budgets.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBudgets.map((budget) => {
              const properties = budget.properties;
              if (!properties) return null;
              const ratio = properties.amount > 0 ? Math.min(budget.spent / properties.amount, 1) : 0;
              const overBudget = budget.spent > properties.amount;
              const color = categoryColor(properties.categoryId);
              return (
                <button
                  key={budget.id}
                  type="button"
                  onClick={() => {
                    setSelected(budget);
                    setDetailOpen(true);
                  }}
                  className="flex flex-col gap-2.5 rounded-lg border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium">{budget.title}</span>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {color ? <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
                      {categoryTitle(properties.categoryId)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${meterColor(budget.spent, properties.amount)}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                    <span className={overBudget ? "font-medium text-destructive" : ""}>
                      {formatMoney(budget.spent, properties.currency)} spent{overBudget ? " · over" : ""}
                    </span>
                    <span>{formatMoney(properties.amount, properties.currency)} {BUDGET_PERIOD_LABELS[properties.period].toLowerCase()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreateBudgetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        onCreated={(budget) => setBudgets((prev) => [budget, ...prev])}
      />
      <BudgetDetailSheet
        budget={selected}
        categories={categories}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(budget) => {
          setBudgets((prev) => prev.map((item) => (item.id === budget.id ? budget : item)));
          setSelected(budget);
        }}
        onDeleted={(id) => setBudgets((prev) => prev.filter((budget) => budget.id !== id))}
      />
    </div>
  );
}

function BudgetFields({
  title,
  setTitle,
  properties,
  setProperties,
  categories,
}: {
  title: string;
  setTitle: (value: string) => void;
  properties: BudgetProperties;
  setProperties: (value: BudgetProperties) => void;
  categories: Category[];
}) {
  const expenseCategories = categories.filter((c) => c.properties?.kind === "expense");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="budget-title">Name</Label>
        <Input id="budget-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        <Select value={properties.categoryId} onValueChange={(value) => setProperties({ ...properties, categoryId: value ?? "" })}>
          <SelectTrigger className="w-full">
            <SelectValue>{() => expenseCategories.find((c) => c.id === properties.categoryId)?.title ?? categories.find((c) => c.id === properties.categoryId)?.title ?? "Select category"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {expenseCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-amount">Limit</Label>
          <Input
            id="budget-amount"
            type="number"
            min={0.01}
            step={0.01}
            value={properties.amount}
            onChange={(event) => setProperties({ ...properties, amount: Number(event.target.value) })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-currency">Currency</Label>
          <Input
            id="budget-currency"
            value={properties.currency}
            onChange={(event) => setProperties({ ...properties, currency: event.target.value.toUpperCase() })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Period</Label>
          <Select value={properties.period} onValueChange={(value) => setProperties({ ...properties, period: value as BudgetPeriod })}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: BudgetPeriod) => BUDGET_PERIOD_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BUDGET_PERIODS.map((period) => (
                <SelectItem key={period} value={period}>
                  {BUDGET_PERIOD_LABELS[period]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

function CreateBudgetDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onCreated: (budget: Budget) => void;
}) {
  const expenseCategories = categories.filter((c) => c.properties?.kind === "expense");
  const [title, setTitle] = useState("");
  const [properties, setProperties] = useState<BudgetProperties>(() => initialProperties(expenseCategories[0]?.id ?? ""));
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setProperties(initialProperties(expenseCategories[0]?.id ?? ""));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const budget = await api.budgets.create({
        title: title.trim(),
        properties: { ...properties, currency: properties.currency.trim().toUpperCase() },
      });
      onCreated(budget);
      toast.success(`${budget.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create budget");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setProperties(initialProperties(expenseCategories[0]?.id ?? ""));
        else reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New budget</DialogTitle>
            <DialogDescription>Set a spending limit for a category.</DialogDescription>
          </DialogHeader>
          <BudgetFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} categories={categories} />
          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim() || !properties.categoryId || !properties.currency.trim()}>
              {submitting ? "Adding..." : "Add budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BudgetDetailSheet({
  budget,
  categories,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  budget: Budget | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (budget: Budget) => void;
  onDeleted: (id: string) => void;
}) {
  if (!budget) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <BudgetDetailForm key={budget.id} budget={budget} categories={categories} onOpenChange={onOpenChange} onUpdated={onUpdated} onDeleted={onDeleted} />
      </SheetContent>
    </Sheet>
  );
}

function BudgetDetailForm({
  budget,
  categories,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  budget: Budget;
  categories: Category[];
  onOpenChange: (open: boolean) => void;
  onUpdated: (budget: Budget) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(budget.title);
  const [properties, setProperties] = useState<BudgetProperties>(budget.properties ?? initialProperties(""));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await api.budgets.update(budget.id, {
        title: title.trim(),
        properties: { ...properties, currency: properties.currency.trim().toUpperCase() },
      });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save budget");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.budgets.remove(budget.id);
      onDeleted(budget.id);
      onOpenChange(false);
      toast.success(`${budget.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete budget");
    } finally {
      setDeleting(false);
    }
  }

  const dirty = title.trim() !== budget.title || JSON.stringify(properties) !== JSON.stringify(budget.properties ?? {});

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{budget.title}</SheetTitle>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0" />
        <p className="text-sm text-muted-foreground">
          {formatMoney(budget.spent, properties.currency)} spent of {formatMoney(properties.amount, properties.currency)}
        </p>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <BudgetFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} categories={categories} />
        </div>
      </div>
      <SheetFooter className="flex-row items-center justify-between">
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={onDelete}>
          <Trash2 className="size-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
        <Button size="sm" disabled={!dirty || saving || !title.trim() || !properties.categoryId} onClick={onSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
