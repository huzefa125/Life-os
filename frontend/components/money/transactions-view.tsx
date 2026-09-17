"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, List, Plus, Search, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney, formatMoneyDate, TRANSACTION_TYPE_COLORS, TRANSACTION_TYPE_LABELS } from "@/lib/money-meta";
import type { Account, Category, Transaction, TransactionProperties, TransactionType } from "@/lib/types";
import { MoneyTabs } from "./money-tabs";

const TRANSACTION_TYPES = Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[];
const ALL_FILTER = "all";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initialProperties(defaultAccountId: string): TransactionProperties {
  return {
    transactionType: "expense",
    amount: 1,
    currency: "USD",
    date: today(),
    description: "",
    accountId: defaultAccountId,
    categoryId: undefined,
  };
}

export function TransactionsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);
  const [typeFilter, setTypeFilter] = useState<TransactionType | typeof ALL_FILTER>(ALL_FILTER);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.transactions.list(), api.accounts.list(), api.categories.list()])
      .then(([transactionData, accountData, categoryData]) => {
        if (cancelled) return;
        setTransactions(transactionData);
        setAccounts(accountData);
        setCategories(categoryData);
        const focusId = searchParams.get("focus");
        const match = focusId ? transactionData.find((t) => t.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/money/transactions");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load transactions"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const props = transaction.properties;
      if (!props) return false;
      if (accountFilter !== ALL_FILTER && props.accountId !== accountFilter && props.toAccountId !== accountFilter) {
        return false;
      }
      if (categoryFilter !== ALL_FILTER && props.categoryId !== categoryFilter) return false;
      if (typeFilter !== ALL_FILTER && props.transactionType !== typeFilter) return false;
      if (dateFrom && props.date < dateFrom) return false;
      if (dateTo && props.date > dateTo) return false;
      if (q) {
        const haystack = `${transaction.title} ${props.description ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, query, accountFilter, categoryFilter, typeFilter, dateFrom, dateTo]);

  function accountLabel(id?: string) {
    if (!id) return "-";
    return accountById.get(id)?.title ?? "-";
  }

  function categoryLabel(id?: string) {
    if (!id) return "-";
    return categoryById.get(id)?.title ?? "-";
  }

  function signedAmount(transaction: Transaction) {
    const props = transaction.properties;
    if (!props) return null;
    const sign = props.transactionType === "expense" ? "-" : props.transactionType === "income" ? "+" : "";
    return `${sign}${formatMoney(props.amount, props.currency)}`;
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-lime-100 text-lime-700">
          <ArrowRightLeft className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Money</h1>
        {!loading ? <span className="text-[13px] text-muted-foreground">{filtered.length}</span> : null}
        <Button
          size="sm"
          className="ml-auto"
          disabled={accounts.length === 0}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-3.5" />
          New transaction
        </Button>
      </div>

      <MoneyTabs />

      <div className="flex flex-wrap items-center gap-2 border-b bg-canvas px-6 py-2">
        <List className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground/80">All Transactions</span>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | typeof ALL_FILTER)}>
          <SelectTrigger size="sm">
            <SelectValue>{(v: string) => (v === ALL_FILTER ? "All types" : TRANSACTION_TYPE_LABELS[v as TransactionType])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All types</SelectItem>
            {TRANSACTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {TRANSACTION_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v ?? ALL_FILTER)}>
          <SelectTrigger size="sm">
            <SelectValue>{(v: string) => (v === ALL_FILTER ? "All accounts" : accountLabel(v))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All accounts</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? ALL_FILTER)}>
          <SelectTrigger size="sm">
            <SelectValue>{(v: string) => (v === ALL_FILTER ? "All categories" : categoryLabel(v))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="h-7 w-36 text-[13px]"
        />
        <span className="text-[12px] text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="h-7 w-36 text-[13px]"
        />

        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-sm font-medium">Add an account first</p>
            <p className="text-sm text-muted-foreground">Transactions need an account to belong to.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime-100">
              <ArrowRightLeft className="size-5 text-lime-700" />
            </div>
            {transactions.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No transactions yet</p>
                  <p className="text-sm text-muted-foreground">Log income, expenses, and transfers here.</p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New transaction
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No transactions match your filters.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px]">Date</TableHead>
                <TableHead className="text-[13px]">Description</TableHead>
                <TableHead className="text-[13px]">Category</TableHead>
                <TableHead className="text-[13px]">Account</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((transaction) => {
                const props = transaction.properties;
                return (
                  <TableRow
                    key={transaction.id}
                    className="cursor-pointer border-border/70"
                    onClick={() => {
                      setSelected(transaction);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell className="py-2 pl-0 text-[13px] text-muted-foreground">{formatMoneyDate(props?.date)}</TableCell>
                    <TableCell className="text-[13px] font-medium">{transaction.title}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {props?.transactionType === "transfer"
                        ? `${accountLabel(props.accountId)} → ${accountLabel(props.toAccountId)}`
                        : categoryLabel(props?.categoryId)}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {props?.transactionType === "transfer" ? "-" : accountLabel(props?.accountId)}
                    </TableCell>
                    <TableCell
                      className={`pr-0 text-right text-[13px] font-medium ${props ? TRANSACTION_TYPE_COLORS[props.transactionType] : ""}`}
                    >
                      {signedAmount(transaction)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateTransactionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        accounts={accounts}
        categories={categories}
        onCreated={(transaction) => setTransactions((prev) => [transaction, ...prev])}
      />
      <TransactionDetailSheet
        transaction={selected}
        accounts={accounts}
        categories={categories}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(transaction) => {
          setTransactions((prev) => prev.map((item) => (item.id === transaction.id ? transaction : item)));
          setSelected(transaction);
        }}
        onDeleted={(id) => setTransactions((prev) => prev.filter((transaction) => transaction.id !== id))}
      />
    </div>
  );
}

function TransactionFields({
  title,
  setTitle,
  properties,
  setProperties,
  accounts,
  categories,
}: {
  title: string;
  setTitle: (value: string) => void;
  properties: TransactionProperties;
  setProperties: (value: TransactionProperties) => void;
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
        <Label htmlFor="transaction-title">Title</Label>
        <Input id="transaction-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-amount">Amount</Label>
          <Input
            id="transaction-amount"
            type="number"
            min={0.01}
            step={0.01}
            value={properties.amount}
            onChange={(event) => setProperties({ ...properties, amount: Number(event.target.value) })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-currency">Currency</Label>
          <Input
            id="transaction-currency"
            value={properties.currency}
            onChange={(event) => setProperties({ ...properties, currency: event.target.value.toUpperCase() })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-date">Date</Label>
          <Input
            id="transaction-date"
            type="date"
            value={properties.date}
            onChange={(event) => setProperties({ ...properties, date: event.target.value })}
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transaction-description">Description</Label>
        <Textarea
          id="transaction-description"
          rows={3}
          value={properties.description ?? ""}
          onChange={(event) => setProperties({ ...properties, description: event.target.value })}
        />
      </div>
    </>
  );
}

function isValid(properties: TransactionProperties, title: string) {
  if (!title.trim() || !properties.accountId || !properties.currency.trim() || properties.amount <= 0) return false;
  if (properties.transactionType === "transfer") {
    return Boolean(properties.toAccountId) && properties.toAccountId !== properties.accountId;
  }
  return Boolean(properties.categoryId);
}

function CreateTransactionDialog({
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
  onCreated: (transaction: Transaction) => void;
}) {
  const [title, setTitle] = useState("");
  const [properties, setProperties] = useState<TransactionProperties>(() => initialProperties(accounts[0]?.id ?? ""));
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setProperties(initialProperties(accounts[0]?.id ?? ""));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const transaction = await api.transactions.create({
        title: title.trim(),
        properties: {
          ...properties,
          currency: properties.currency.trim().toUpperCase(),
          description: properties.description?.trim() || undefined,
        },
      });
      onCreated(transaction);
      toast.success(`${transaction.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create transaction");
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
            <DialogTitle>New transaction</DialogTitle>
            <DialogDescription>Log income, an expense, or a transfer between accounts.</DialogDescription>
          </DialogHeader>
          <TransactionFields
            title={title}
            setTitle={setTitle}
            properties={properties}
            setProperties={setProperties}
            accounts={accounts}
            categories={categories}
          />
          <DialogFooter>
            <Button type="submit" disabled={submitting || !isValid(properties, title)}>
              {submitting ? "Adding..." : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransactionDetailSheet({
  transaction,
  accounts,
  categories,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (transaction: Transaction) => void;
  onDeleted: (id: string) => void;
}) {
  if (!transaction) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <TransactionDetailForm
          key={transaction.id}
          transaction={transaction}
          accounts={accounts}
          categories={categories}
          onOpenChange={onOpenChange}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      </SheetContent>
    </Sheet>
  );
}

function TransactionDetailForm({
  transaction,
  accounts,
  categories,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onOpenChange: (open: boolean) => void;
  onUpdated: (transaction: Transaction) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(transaction.title);
  const [properties, setProperties] = useState<TransactionProperties>(
    transaction.properties ?? initialProperties(accounts[0]?.id ?? "")
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await api.transactions.update(transaction.id, {
        title: title.trim(),
        properties: {
          ...properties,
          currency: properties.currency.trim().toUpperCase(),
          description: properties.description?.trim() || undefined,
        },
      });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save transaction");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.transactions.remove(transaction.id);
      onDeleted(transaction.id);
      onOpenChange(false);
      toast.success(`${transaction.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete transaction");
    } finally {
      setDeleting(false);
    }
  }

  const dirty =
    title.trim() !== transaction.title || JSON.stringify(properties) !== JSON.stringify(transaction.properties ?? {});

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{transaction.title}</SheetTitle>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0"
        />
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <TransactionFields
            title={title}
            setTitle={setTitle}
            properties={properties}
            setProperties={setProperties}
            accounts={accounts}
            categories={categories}
          />
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
