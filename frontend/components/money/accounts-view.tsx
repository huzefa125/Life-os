"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, Plus, Trash2, Wallet } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { ACCOUNT_TYPE_LABELS, COMMON_CURRENCIES, formatMoney } from "@/lib/money-meta";
import type { Account, AccountProperties, AccountType } from "@/lib/types";
import { MoneyTabs } from "./money-tabs";

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

function initialProperties(): AccountProperties {
  return { accountType: "checking", currency: "USD", startingBalance: 0, institution: "", notes: "" };
}

export function AccountsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Account | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.accounts
      .list()
      .then((data) => {
        if (cancelled) return;
        setAccounts(data);
        const focusId = searchParams.get("focus");
        const match = focusId ? data.find((account) => account.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/money");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load accounts"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const account of accounts) {
      const currency = account.properties?.currency ?? "USD";
      totals.set(currency, (totals.get(currency) ?? 0) + account.balance);
    }
    return Array.from(totals.entries());
  }, [accounts]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-lime-100 text-lime-700">
          <Wallet className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Money</h1>
        {!loading ? <span className="text-[13px] text-muted-foreground">{accounts.length} accounts</span> : null}
        {!loading && totalsByCurrency.length > 0 ? (
          <span className="text-[13px] text-muted-foreground">
            {totalsByCurrency.map(([currency, total]) => formatMoney(total, currency)).join(" · ")}
          </span>
        ) : null}
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New account
        </Button>
      </div>

      <MoneyTabs />

      <div className="px-6 py-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime-100">
              <Landmark className="size-5 text-lime-700" />
            </div>
            <div>
              <p className="text-sm font-medium">No accounts yet</p>
              <p className="text-sm text-muted-foreground">Add a bank, cash, or card account to start tracking.</p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New account
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  setSelected(account);
                  setDetailOpen(true);
                }}
                className="flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium">{account.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {account.properties ? ACCOUNT_TYPE_LABELS[account.properties.accountType] : "-"}
                  </span>
                </div>
                <span className="text-lg font-semibold">
                  {formatMoney(account.balance, account.properties?.currency ?? "USD")}
                </span>
                {account.properties?.institution ? (
                  <span className="text-[12px] text-muted-foreground">{account.properties.institution}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(account) => setAccounts((prev) => [account, ...prev])}
      />
      <AccountDetailSheet
        account={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(account) => {
          setAccounts((prev) => prev.map((item) => (item.id === account.id ? account : item)));
          setSelected(account);
        }}
        onDeleted={(id) => setAccounts((prev) => prev.filter((account) => account.id !== id))}
      />
    </div>
  );
}

function AccountFields({
  title,
  setTitle,
  properties,
  setProperties,
}: {
  title: string;
  setTitle: (value: string) => void;
  properties: AccountProperties;
  setProperties: (value: AccountProperties) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-title">Name</Label>
        <Input id="account-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select
            value={properties.accountType}
            onValueChange={(value) => setProperties({ ...properties, accountType: value as AccountType })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{(v: AccountType) => ACCOUNT_TYPE_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-currency">Currency</Label>
          <Input
            id="account-currency"
            list="common-currencies"
            value={properties.currency}
            onChange={(event) => setProperties({ ...properties, currency: event.target.value.toUpperCase() })}
            required
          />
          <datalist id="common-currencies">
            {COMMON_CURRENCIES.map((currency) => (
              <option key={currency} value={currency} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-starting-balance">Starting balance</Label>
        <Input
          id="account-starting-balance"
          type="number"
          step={0.01}
          value={properties.startingBalance}
          onChange={(event) => setProperties({ ...properties, startingBalance: Number(event.target.value) })}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-institution">Institution</Label>
        <Input
          id="account-institution"
          value={properties.institution ?? ""}
          onChange={(event) => setProperties({ ...properties, institution: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="account-notes">Notes</Label>
        <Textarea
          id="account-notes"
          rows={3}
          value={properties.notes ?? ""}
          onChange={(event) => setProperties({ ...properties, notes: event.target.value })}
        />
      </div>
    </>
  );
}

function CreateAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (account: Account) => void;
}) {
  const [title, setTitle] = useState("");
  const [properties, setProperties] = useState<AccountProperties>(initialProperties);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setProperties(initialProperties());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const account = await api.accounts.create({
        title: title.trim(),
        properties: {
          ...properties,
          currency: properties.currency.trim().toUpperCase(),
          institution: properties.institution?.trim() || undefined,
          notes: properties.notes?.trim() || undefined,
        },
      });
      onCreated(account);
      toast.success(`${account.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New account</DialogTitle>
            <DialogDescription>Track a bank, cash, or card balance.</DialogDescription>
          </DialogHeader>
          <AccountFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} />
          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim() || !properties.currency.trim()}>
              {submitting ? "Adding..." : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountDetailSheet({
  account,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (account: Account) => void;
  onDeleted: (id: string) => void;
}) {
  if (!account) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <AccountDetailForm key={account.id} account={account} onOpenChange={onOpenChange} onUpdated={onUpdated} onDeleted={onDeleted} />
      </SheetContent>
    </Sheet>
  );
}

function AccountDetailForm({
  account,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  account: Account;
  onOpenChange: (open: boolean) => void;
  onUpdated: (account: Account) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(account.title);
  const [properties, setProperties] = useState<AccountProperties>(account.properties ?? initialProperties());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await api.accounts.update(account.id, {
        title: title.trim(),
        properties: {
          ...properties,
          currency: properties.currency.trim().toUpperCase(),
          institution: properties.institution?.trim() || undefined,
          notes: properties.notes?.trim() || undefined,
        },
      });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save account");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.accounts.remove(account.id);
      onDeleted(account.id);
      onOpenChange(false);
      toast.success(`${account.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete account");
    } finally {
      setDeleting(false);
    }
  }

  const dirty = title.trim() !== account.title || JSON.stringify(properties) !== JSON.stringify(account.properties ?? {});

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{account.title}</SheetTitle>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0" />
        <p className="text-sm text-muted-foreground">
          Balance: {formatMoney(account.balance, account.properties?.currency ?? "USD")}
        </p>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <AccountFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} />
        </div>
      </div>
      <SheetFooter className="flex-row items-center justify-between">
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={onDelete}>
          <Trash2 className="size-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
        <Button size="sm" disabled={!dirty || saving || !title.trim() || !properties.currency.trim()} onClick={onSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </SheetFooter>
    </>
  );
}
