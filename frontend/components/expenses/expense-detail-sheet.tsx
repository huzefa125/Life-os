"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { COMMON_CURRENCIES } from "@/lib/expense-meta";
import type { Expense } from "@/lib/types";

export function ExpenseDetailSheet({
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {expense ? (
          <ExpenseDetailForm
            key={expense.id}
            expense={expense}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        ) : null}
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
  const [amount, setAmount] = useState(String(expense.properties?.amount ?? ""));
  const [currency, setCurrency] = useState(expense.properties?.currency ?? "USD");
  const [category, setCategory] = useState(expense.properties?.category ?? "");
  const [date, setDate] = useState(expense.properties?.date ?? "");
  const [description, setDescription] = useState(expense.properties?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dirty =
    title.trim() !== expense.title ||
    amount !== String(expense.properties?.amount ?? "") ||
    currency !== (expense.properties?.currency ?? "USD") ||
    category.trim() !== (expense.properties?.category ?? "") ||
    date !== (expense.properties?.date ?? "") ||
    description.trim() !== (expense.properties?.description ?? "");

  async function onSave() {
    const amountNumber = parseFloat(amount);
    if (!title.trim() || !amountNumber || amountNumber <= 0 || !category.trim() || !date) return;
    setSaving(true);
    try {
      const updated = await api.expenses.update(expense.id, {
        title: title.trim(),
        properties: {
          amount: amountNumber,
          currency,
          category: category.trim(),
          date,
          ...(description.trim() ? { description: description.trim() } : {}),
        },
      });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.expenses.remove(expense.id);
      toast.success(`${expense.title} deleted`);
      onDeleted(expense.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete expense");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{expense.title}</SheetTitle>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </SheetHeader>

      <Separator />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-amount">Amount</Label>
            <div className="flex gap-1.5">
              <Input
                id="detail-amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="min-w-0 flex-1"
              />
              <Select value={currency} onValueChange={(v) => setCurrency(v ?? "USD")}>
                <SelectTrigger className="w-20 shrink-0">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-date">Date</Label>
            <Input
              id="detail-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="detail-category">Category</Label>
          <Input
            id="detail-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="detail-description">Description</Label>
          <Textarea
            id="detail-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <Separator />

      <SheetFooter className="flex-row items-center justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete {expense.title}?</span>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
              {deleting ? "Deleting…" : "Confirm"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}

        <Button
          size="sm"
          disabled={!dirty || saving || !title.trim() || !amount || !category.trim() || !date}
          onClick={onSave}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
