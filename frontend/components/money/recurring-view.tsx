"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import {
  formatMoney,
  RECURRING_FREQUENCY_LABELS,
  TRANSACTION_TYPE_BADGE,
  TRANSACTION_TYPE_ICON,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/money-meta";
import type {
  Account,
  Category,
  RecurringFrequency,
  RecurringTransaction,
  RecurringTransactionProperties,
  TransactionType,
} from "@/lib/types";
import { MoneyTabs } from "./money-tabs";

const TRANSACTION_TYPES = Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[];
const FREQUENCIES = Object.keys(RECURRING_FREQUENCY_LABELS) as RecurringFrequency[];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initialProperties(defaultAccountId: string): RecurringTransactionProperties {
  return {
    transactionType: "expense",
    amount: 1,
    currency: "USD",
    description: "",
    accountId: defaultAccountId,
    categoryId: undefined,
    frequency: "monthly",
    startDate: today(),
    nextRunDate: today(),
    active: true,
  };
}

function isValid(properties: RecurringTransactionProperties, title: string) {
  if (!title.trim() || !properties.accountId || !properties.currency.trim() || properties.amount <= 0) return false;
  if (properties.transactionType === "transfer") {
    return Boolean(properties.toAccountId) && properties.toAccountId !== properties.accountId;
  }
  return Boolean(properties.categoryId);
}

/** nextRunDate is server-managed (see recurring.service.ts) — never sent back on create/update. */
function omitNextRunDate(p: RecurringTransactionProperties): Omit<RecurringTransactionProperties, "nextRunDate"> {
  return {
    transactionType: p.transactionType,
    amount: p.amount,
    currency: p.currency,
    description: p.description,
    accountId: p.accountId,
    toAccountId: p.toAccountId,
    categoryId: p.categoryId,
    frequency: p.frequency,
    startDate: p.startDate,
    endDate: p.endDate,
    active: p.active,
  };
}

export function RecurringView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<RecurringTransaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.recurringTransactions.list(), api.accounts.list(), api.categories.list()])
      .then(([recurringData, accountData, categoryData]) => {
        if (cancelled) return;
        setRecurring(recurringData);
        setAccounts(accountData);
        setCategories(categoryData);
        const focusId = searchParams.get("focus");
        const match = focusId ? recurringData.find((r) => r.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/money/recurring");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load recurring transactions"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function accountLabel(id?: string) {
    if (!id) return "-";
    return accountById.get(id)?.title ?? "-";
  }

  function categoryLabel(id?: string) {
    if (!id) return "-";
    return categoryById.get(id)?.title ?? "-";
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-lime-100 text-lime-700">
          <Repeat className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Money</h1>
        {!loading ? <AnimatedNumber value={recurring.length} className="text-[13px] text-muted-foreground" /> : null}
        <Button size="sm" className="ml-auto" disabled={accounts.length === 0} onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New recurring
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
        ) : recurring.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime-100">
              <Repeat className="size-5 text-lime-700" />
            </div>
            <div>
              <p className="text-sm font-medium">No recurring transactions yet</p>
              <p className="text-sm text-muted-foreground">Rent, salary, subscriptions — set it up once.</p>
            </div>
            <Button size="sm" disabled={accounts.length === 0} onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New recurring
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 pl-0" />
                <TableHead className="text-[13px]">Title</TableHead>
                <TableHead className="text-[13px]">Category / Account</TableHead>
                <TableHead className="text-[13px]">Frequency</TableHead>
                <TableHead className="text-[13px]">Next run</TableHead>
                <TableHead className="text-[13px]">Status</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recurring.map((item) => {
                const props = item.properties;
                const Icon = props ? TRANSACTION_TYPE_ICON[props.transactionType] : Repeat;
                const paused = props?.active === false;
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer border-border/70"
                    onClick={() => {
                      setSelected(item);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell className="w-8 py-2 pl-0">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full ${props ? TRANSACTION_TYPE_BADGE[props.transactionType] : "bg-muted text-muted-foreground"}`}
                      >
                        <Icon className="size-3" />
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-[13px] font-medium">{item.title}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {props?.transactionType === "transfer"
                        ? `${accountLabel(props.accountId)} → ${accountLabel(props.toAccountId)}`
                        : categoryLabel(props?.categoryId)}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {props ? RECURRING_FREQUENCY_LABELS[props.frequency] : "-"}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{props?.nextRunDate ?? "-"}</TableCell>
                    <TableCell className="text-[13px]">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${paused ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-700"}`}>
                        {paused ? "Paused" : "Active"}
                      </span>
                    </TableCell>
                    <TableCell className="pr-0 text-right text-[13px] font-medium tabular-nums">
                      {props ? formatMoney(props.amount, props.currency) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateRecurringDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        accounts={accounts}
        categories={categories}
        onCreated={(item) => setRecurring((prev) => [item, ...prev])}
      />
      <RecurringDetailSheet
        recurring={selected}
        accounts={accounts}
        categories={categories}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(item) => {
          setRecurring((prev) => prev.map((r) => (r.id === item.id ? item : r)));
          setSelected(item);
        }}
        onDeleted={(id) => setRecurring((prev) => prev.filter((item) => item.id !== id))}
      />
    </div>
  );
}

function RecurringFields({
  title,
  setTitle,
  properties,
  setProperties,
  accounts,
  categories,
}: {
  title: string;
  setTitle: (value: string) => void;
  properties: RecurringTransactionProperties;
  setProperties: (value: RecurringTransactionProperties) => void;
  accounts: Account[];
  categories: Category[];
}) {
  const isTransfer = properties.transactionType === "transfer";
  const relevantCategories = categories.filter((c) => c.properties?.kind === properties.transactionType);

  function setType(type: TransactionType) {
    setProperties({
      ...properties,
      transactionType: type,
      categoryId: type === "transfer" ? undefined : properties.categoryId,
      toAccountId: type === "transfer" ? properties.toAccountId : undefined,
    });
  }

  return (
    <>
      <div className="flex gap-1.5">
        {TRANSACTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setType(type)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-[13px] font-medium transition-colors ${
              properties.transactionType === type
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            {TRANSACTION_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recurring-title">Title</Label>
        <Input id="recurring-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recurring-amount">Amount</Label>
          <Input
            id="recurring-amount"
            type="number"
            min={0.01}
            step={0.01}
            value={properties.amount}
            onChange={(event) => setProperties({ ...properties, amount: Number(event.target.value) })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recurring-currency">Currency</Label>
          <Input
            id="recurring-currency"
            value={properties.currency}
            onChange={(event) => setProperties({ ...properties, currency: event.target.value.toUpperCase() })}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{isTransfer ? "From account" : "Account"}</Label>
          <Select value={properties.accountId} onValueChange={(value) => setProperties({ ...properties, accountId: value ?? "" })}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => accounts.find((a) => a.id === properties.accountId)?.title ?? "Select account"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isTransfer ? (
          <div className="flex flex-col gap-1.5">
            <Label>To account</Label>
            <Select
              value={properties.toAccountId ?? ""}
              onValueChange={(value) => setProperties({ ...properties, toAccountId: value ?? undefined })}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => accounts.find((a) => a.id === properties.toAccountId)?.title ?? "Select account"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.id !== properties.accountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={properties.categoryId ?? ""}
              onValueChange={(value) => setProperties({ ...properties, categoryId: value ?? undefined })}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => relevantCategories.find((c) => c.id === properties.categoryId)?.title ?? "Select category"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {relevantCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Frequency</Label>
          <Select value={properties.frequency} onValueChange={(value) => setProperties({ ...properties, frequency: value as RecurringFrequency })}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: RecurringFrequency) => RECURRING_FREQUENCY_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((frequency) => (
                <SelectItem key={frequency} value={frequency}>
                  {RECURRING_FREQUENCY_LABELS[frequency]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recurring-start">Start date</Label>
          <Input
            id="recurring-start"
            type="date"
            value={properties.startDate}
            onChange={(event) => setProperties({ ...properties, startDate: event.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recurring-end">End date (optional)</Label>
        <Input
          id="recurring-end"
          type="date"
          value={properties.endDate ?? ""}
          onChange={(event) => setProperties({ ...properties, endDate: event.target.value || undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recurring-description">Description</Label>
        <Textarea
          id="recurring-description"
          rows={2}
          value={properties.description ?? ""}
          onChange={(event) => setProperties({ ...properties, description: event.target.value })}
        />
      </div>

      <label className="flex items-center gap-2 text-[13px]">
        <Checkbox
          checked={properties.active ?? true}
          onCheckedChange={(checked) => setProperties({ ...properties, active: checked === true })}
        />
        Active
      </label>
    </>
  );
}

function CreateRecurringDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  categories: Category[];
  onCreated: (item: RecurringTransaction) => void;
}) {
  const [title, setTitle] = useState("");
  const [properties, setProperties] = useState<RecurringTransactionProperties>(() => initialProperties(accounts[0]?.id ?? ""));
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setProperties(initialProperties(accounts[0]?.id ?? ""));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const item = await api.recurringTransactions.create({
        title: title.trim(),
        properties: {
          ...omitNextRunDate(properties),
          currency: properties.currency.trim().toUpperCase(),
          description: properties.description?.trim() || undefined,
        },
      });
      onCreated(item);
      toast.success(`${item.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create recurring transaction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setProperties(initialProperties(accounts[0]?.id ?? ""));
        else reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New recurring transaction</DialogTitle>
            <DialogDescription>Rent, salary, subscriptions — generated automatically when due.</DialogDescription>
          </DialogHeader>
          <RecurringFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} accounts={accounts} categories={categories} />
          <DialogFooter>
            <Button type="submit" disabled={submitting || !isValid(properties, title)}>
              {submitting ? "Adding..." : "Add recurring transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecurringDetailSheet({
  recurring,
  accounts,
  categories,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  recurring: RecurringTransaction | null;
  accounts: Account[];
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (item: RecurringTransaction) => void;
  onDeleted: (id: string) => void;
}) {
  if (!recurring) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <RecurringDetailForm key={recurring.id} recurring={recurring} accounts={accounts} categories={categories} onOpenChange={onOpenChange} onUpdated={onUpdated} onDeleted={onDeleted} />
      </SheetContent>
    </Sheet>
  );
}

function RecurringDetailForm({
  recurring,
  accounts,
  categories,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  recurring: RecurringTransaction;
  accounts: Account[];
  categories: Category[];
  onOpenChange: (open: boolean) => void;
  onUpdated: (item: RecurringTransaction) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(recurring.title);
  const [properties, setProperties] = useState<RecurringTransactionProperties>(
    recurring.properties ?? initialProperties(accounts[0]?.id ?? "")
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await api.recurringTransactions.update(recurring.id, {
        title: title.trim(),
        properties: {
          ...omitNextRunDate(properties),
          currency: properties.currency.trim().toUpperCase(),
          description: properties.description?.trim() || undefined,
        },
      });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save recurring transaction");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.recurringTransactions.remove(recurring.id);
      onDeleted(recurring.id);
      onOpenChange(false);
      toast.success(`${recurring.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete recurring transaction");
    } finally {
      setDeleting(false);
    }
  }

  const dirty =
    title.trim() !== recurring.title || JSON.stringify(properties) !== JSON.stringify(recurring.properties ?? {});

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{recurring.title}</SheetTitle>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0"
        />
        <p className="text-sm text-muted-foreground">Next run: {properties.nextRunDate}</p>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <RecurringFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} accounts={accounts} categories={categories} />
        </div>
      </div>
      <SheetFooter className="flex-row items-center justify-between">
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={onDelete}>
          <Trash2 className="size-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
        <Button size="sm" disabled={!dirty || saving || !isValid(properties, title)} onClick={onSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
