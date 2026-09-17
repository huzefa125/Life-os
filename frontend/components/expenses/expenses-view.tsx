"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Plus, Receipt, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { avatarColor } from "@/lib/avatar-color";
import { formatExpenseDate, formatMoney, sumByCurrency } from "@/lib/expense-meta";
import type { Expense } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateExpenseDialog } from "./create-expense-dialog";
import { ExpenseDetailSheet } from "./expense-detail-sheet";

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
        if (focusId) {
          const match = data.find((e) => e.id === focusId);
          if (match) {
            setSelected(match);
            setDetailOpen(true);
          }
          router.replace("/expenses");
        }
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't load expenses");
      })
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
    const list = !q
      ? expenses
      : expenses.filter(
          (expense) =>
            expense.title.toLowerCase().includes(q) ||
            (expense.properties?.category ?? "").toLowerCase().includes(q)
        );
    return [...list].sort((a, b) => {
      const aDate = a.properties?.date ?? "";
      const bDate = b.properties?.date ?? "";
      return bDate.localeCompare(aDate);
    });
  }, [filter, expenses]);

  const totals = useMemo(() => sumByCurrency(filtered), [filtered]);

  function openExpense(expense: Expense) {
    setSelected(expense);
    setDetailOpen(true);
  }

  function handleCreated(expense: Expense) {
    setExpenses((prev) => [expense, ...prev]);
  }

  function handleUpdated(expense: Expense) {
    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)));
    setSelected(expense);
  }

  function handleDeleted(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-lime-100 text-lime-600">
          <Receipt className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Expenses</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {expenses.length}
          </span>
        ) : null}

        {totals.length > 0 ? (
          <span className="ml-3 flex items-center gap-2 text-[13px] font-medium text-foreground/80">
            {totals.map((t) => (
              <span key={t.currency}>{formatMoney(t.total, t.currency)}</span>
            ))}
          </span>
        ) : null}

        <div className="ml-auto">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
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
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime-100">
              <Receipt className="size-5 text-lime-600" />
            </div>
            {expenses.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No expenses yet</p>
                  <p className="text-sm text-muted-foreground">Log a purchase or cost.</p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New expense
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No expenses match &quot;{filter}&quot;.
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px] font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">
                  Category
                </TableHead>
                <TableHead className="text-[13px] font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="pr-0 text-right text-[13px] font-medium text-muted-foreground">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((expense) => (
                <TableRow
                  key={expense.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => openExpense(expense)}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">{expense.title}</TableCell>
                  <TableCell className="text-[13px]">
                    {expense.properties?.category ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          avatarColor(expense.properties.category)
                        )}
                      >
                        {expense.properties.category}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {expense.properties?.date ? formatExpenseDate(expense.properties.date) : "—"}
                  </TableCell>
                  <TableCell className="pr-0 text-right text-[13px] font-medium">
                    {expense.properties
                      ? formatMoney(expense.properties.amount, expense.properties.currency)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateExpenseDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <ExpenseDetailSheet
        expense={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
