"use client";

import { useState } from "react";
import type { FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { COMMON_CURRENCIES } from "@/lib/expense-meta";
import type { Expense } from "@/lib/types";

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CreateExpenseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (expense: Expense) => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setAmount("");
    setCurrency("USD");
    setCategory("");
    setDate(today());
    setDescription("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const amountNumber = parseFloat(amount);
    if (!title.trim() || !amountNumber || amountNumber <= 0 || !category.trim() || !date) return;
    setSubmitting(true);
    try {
      const expense = await api.expenses.create({
        title: title.trim(),
        properties: {
          amount: amountNumber,
          currency,
          category: category.trim(),
          date,
          ...(description.trim() ? { description: description.trim() } : {}),
        },
      });
      onCreated(expense);
      toast.success(`${expense.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't add expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New expense</DialogTitle>
            <DialogDescription>Log a purchase or cost.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-title">Title</Label>
            <Input
              id="expense-title"
              autoFocus
              placeholder="Team lunch"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expense-amount">Amount</Label>
              <div className="flex gap-1.5">
                <Input
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="42.50"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
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
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-category">Category</Label>
            <Input
              id="expense-category"
              placeholder="food, travel, software…"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-description">Description</Label>
            <Textarea
              id="expense-description"
              placeholder="Any extra detail…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || !amount || !category.trim() || !date}
            >
              {submitting ? "Adding…" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
