"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { formatMoney } from "@/lib/money-meta";
import type { Account, Goal, GoalProperties } from "@/lib/types";
import { MoneyTabs } from "./money-tabs";

const NO_ACCOUNT = "none";

function initialProperties(): GoalProperties {
  return { targetAmount: 1000, currency: "USD", currentAmount: 0 };
}

export function GoalsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Goal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.goals.list(), api.accounts.list()])
      .then(([goalData, accountData]) => {
        if (cancelled) return;
        setGoals(goalData);
        setAccounts(accountData);
        const focusId = searchParams.get("focus");
        const match = focusId ? goalData.find((g) => g.id === focusId) : null;
        if (match) {
          setSelected(match);
          setDetailOpen(true);
          router.replace("/money/goals");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load goals"))
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
          <Target className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Money</h1>
        {!loading ? (
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <AnimatedNumber value={goals.length} />
            goals
          </span>
        ) : null}
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New goal
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
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-lime-100">
              <Target className="size-5 text-lime-700" />
            </div>
            <div>
              <p className="text-sm font-medium">No goals yet</p>
              <p className="text-sm text-muted-foreground">Set a savings target and track progress.</p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New goal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const properties = goal.properties;
              if (!properties) return null;
              const ratio = Math.min(goal.progress, 1);
              const achieved = ratio >= 1;
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => {
                    setSelected(goal);
                    setDetailOpen(true);
                  }}
                  className="flex flex-col gap-2.5 rounded-lg border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 truncate text-[13px] font-medium">
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${achieved ? "bg-emerald-100 text-emerald-700" : "bg-lime-100 text-lime-700"}`}>
                        {achieved ? <CheckCircle2 className="size-3.5" /> : <Target className="size-3.5" />}
                      </span>
                      <span className="truncate">{goal.title}</span>
                    </span>
                    <span className="shrink-0 text-[12px] font-medium tabular-nums text-muted-foreground">{Math.round(ratio * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${achieved ? "bg-emerald-500" : "bg-lime-500"}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                    <span className="tabular-nums">{formatMoney(goal.currentValue, properties.currency)}</span>
                    <span className="tabular-nums">of {formatMoney(properties.targetAmount, properties.currency)}</span>
                  </div>
                  {properties.targetDate ? (
                    <span className="text-[11px] text-muted-foreground">By {properties.targetDate}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreateGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        accounts={accounts}
        onCreated={(goal) => setGoals((prev) => [goal, ...prev])}
      />
      <GoalDetailSheet
        goal={selected}
        accounts={accounts}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(goal) => {
          setGoals((prev) => prev.map((item) => (item.id === goal.id ? goal : item)));
          setSelected(goal);
        }}
        onDeleted={(id) => setGoals((prev) => prev.filter((goal) => goal.id !== id))}
      />
    </div>
  );
}

function GoalFields({
  title,
  setTitle,
  properties,
  setProperties,
  accounts,
}: {
  title: string;
  setTitle: (value: string) => void;
  properties: GoalProperties;
  setProperties: (value: GoalProperties) => void;
  accounts: Account[];
}) {
  const linked = properties.linkedAccountId ?? NO_ACCOUNT;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal-title">Name</Label>
        <Input id="goal-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-target">Target amount</Label>
          <Input
            id="goal-target"
            type="number"
            min={0.01}
            step={0.01}
            value={properties.targetAmount}
            onChange={(event) => setProperties({ ...properties, targetAmount: Number(event.target.value) })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-currency">Currency</Label>
          <Input
            id="goal-currency"
            value={properties.currency}
            onChange={(event) => setProperties({ ...properties, currency: event.target.value.toUpperCase() })}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Target date</Label>
        <DatePicker value={properties.targetDate} onChange={(v) => setProperties({ ...properties, targetDate: v })} placeholder="No target date" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Funded from account</Label>
        <Select
          value={linked}
          onValueChange={(value) =>
            setProperties({
              ...properties,
              linkedAccountId: value === NO_ACCOUNT ? undefined : (value ?? undefined),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {() => (linked === NO_ACCOUNT ? "Track manually" : accounts.find((a) => a.id === linked)?.title ?? "Select account")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_ACCOUNT}>Track manually</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {linked === NO_ACCOUNT ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-current">Current amount</Label>
          <Input
            id="goal-current"
            type="number"
            min={0}
            step={0.01}
            value={properties.currentAmount ?? 0}
            onChange={(event) => setProperties({ ...properties, currentAmount: Number(event.target.value) })}
          />
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">Progress will track that account&apos;s balance automatically.</p>
      )}
    </>
  );
}

function CreateGoalDialog({
  open,
  onOpenChange,
  accounts,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onCreated: (goal: Goal) => void;
}) {
  const [title, setTitle] = useState("");
  const [properties, setProperties] = useState<GoalProperties>(initialProperties);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setProperties(initialProperties());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const goal = await api.goals.create({
        title: title.trim(),
        properties: { ...properties, currency: properties.currency.trim().toUpperCase() },
      });
      onCreated(goal);
      toast.success(`${goal.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create goal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New goal</DialogTitle>
            <DialogDescription>Set a savings target.</DialogDescription>
          </DialogHeader>
          <GoalFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} accounts={accounts} />
          <DialogFooter>
            <Button type="submit" disabled={submitting || !title.trim() || !properties.currency.trim()}>
              {submitting ? "Adding..." : "Add goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalDetailSheet({
  goal,
  accounts,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  goal: Goal | null;
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (goal: Goal) => void;
  onDeleted: (id: string) => void;
}) {
  if (!goal) return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent /></Sheet>;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <GoalDetailForm key={goal.id} goal={goal} accounts={accounts} onOpenChange={onOpenChange} onUpdated={onUpdated} onDeleted={onDeleted} />
      </SheetContent>
    </Sheet>
  );
}

function GoalDetailForm({
  goal,
  accounts,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  goal: Goal;
  accounts: Account[];
  onOpenChange: (open: boolean) => void;
  onUpdated: (goal: Goal) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [properties, setProperties] = useState<GoalProperties>(goal.properties ?? initialProperties());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await api.goals.update(goal.id, {
        title: title.trim(),
        properties: { ...properties, currency: properties.currency.trim().toUpperCase() },
      });
      onUpdated(updated);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save goal");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await api.goals.remove(goal.id);
      onDeleted(goal.id);
      onOpenChange(false);
      toast.success(`${goal.title} deleted`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete goal");
    } finally {
      setDeleting(false);
    }
  }

  const dirty = title.trim() !== goal.title || JSON.stringify(properties) !== JSON.stringify(goal.properties ?? {});

  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{goal.title}</SheetTitle>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="border-none px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0" />
        <p className="text-sm text-muted-foreground">
          {formatMoney(goal.currentValue, properties.currency)} of {formatMoney(properties.targetAmount, properties.currency)} ({Math.round(goal.progress * 100)}%)
        </p>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <GoalFields title={title} setTitle={setTitle} properties={properties} setProperties={setProperties} accounts={accounts} />
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
