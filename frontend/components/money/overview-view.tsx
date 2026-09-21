"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  LayoutDashboard,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney, MONEY_GRANULARITY_LABELS, MONEY_GRANULARITY_UNIT_LABEL } from "@/lib/money-meta";
import type { MoneyGranularity, MoneySummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryBreakdownChart } from "./charts/category-breakdown-chart";
import { IncomeExpenseChart, NetWorthChart } from "./charts/trend-chart";
import { MoneyTabs } from "./money-tabs";

const GRANULARITIES: MoneyGranularity[] = ["day", "week", "month", "year"];

export function OverviewView() {
  const [granularity, setGranularity] = useState<MoneyGranularity>("month");
  const [summary, setSummary] = useState<MoneySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.money
      .summary(granularity)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load money summary"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [granularity]);

  function selectGranularity(next: MoneyGranularity) {
    if (next === granularity) return;
    setLoading(true);
    setGranularity(next);
  }

  const latest = summary?.series[summary.series.length - 1];
  const previous = summary && summary.series.length > 1 ? summary.series[summary.series.length - 2] : null;
  const netWorthDelta = latest && previous ? latest.netWorth - previous.netWorth : null;

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-lime-100 text-lime-700">
          <LayoutDashboard className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Money</h1>
        <div className="ml-auto flex gap-1.5">
          {GRANULARITIES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => selectGranularity(g)}
              className={`rounded-md border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                granularity === g
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {MONEY_GRANULARITY_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <MoneyTabs />

      <div className="flex flex-col gap-6 px-6 py-4">
        {loading || !summary ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {latest ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5 rounded-lg border p-3">
                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <ArrowDownLeft className="size-3.5 text-[color:var(--chart-income)]" />
                    Income · {latest.periodLabel}
                  </span>
                  <p className="text-lg font-semibold tabular-nums text-[color:var(--chart-income)]">{formatMoney(latest.income, summary.currency)}</p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-lg border p-3">
                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <ArrowUpRight className="size-3.5 text-[color:var(--chart-expense)]" />
                    Expense · {latest.periodLabel}
                  </span>
                  <p className="text-lg font-semibold tabular-nums text-[color:var(--chart-expense)]">{formatMoney(latest.expense, summary.currency)}</p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-lg border p-3">
                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Scale className="size-3.5" />
                    Net
                  </span>
                  <p className={cn("text-lg font-semibold tabular-nums", latest.net < 0 && "text-destructive")}>
                    {formatMoney(latest.net, summary.currency)}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-lg border border-lime-200 bg-lime-50/40 p-3 dark:bg-lime-950/10">
                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Wallet className="size-3.5 text-lime-600" />
                    Net worth
                  </span>
                  <p className="text-lg font-semibold tabular-nums">{formatMoney(latest.netWorth, summary.currency)}</p>
                  {netWorthDelta !== null ? (
                    <span className={cn("flex items-center gap-1 text-[11px]", netWorthDelta >= 0 ? "text-emerald-600" : "text-destructive")}>
                      {netWorthDelta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {formatMoney(Math.abs(netWorthDelta), summary.currency)} vs last {MONEY_GRANULARITY_UNIT_LABEL[granularity]}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-medium">
                <ArrowDownLeft className="size-3.5 text-muted-foreground" />
                Income vs expense
              </h2>
              <IncomeExpenseChart data={summary.series} currency={summary.currency} />
            </div>

            <div className="rounded-lg border p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-medium">
                <Wallet className="size-3.5 text-muted-foreground" />
                Net worth
              </h2>
              <NetWorthChart data={summary.series} currency={summary.currency} />
            </div>

            <div className="rounded-lg border p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-medium">
                <Scale className="size-3.5 text-muted-foreground" />
                Spending by category {latest ? `(${latest.periodLabel})` : ""}
              </h2>
              <CategoryBreakdownChart data={summary.categoryBreakdown} currency={summary.currency} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
