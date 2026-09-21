import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  HandCoins,
  Landmark,
  type LucideIcon,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { AccountType, BudgetPeriod, CategoryKind, MoneyGranularity, RecurringFrequency, TransactionType } from "@/lib/types";

export const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"] as const;

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatMoneyDate(date?: string): string {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export type TransactionGroupBy = "none" | "day" | "week" | "month";

/** The start (YYYY-MM-DD) of the day/week (Monday)/month containing `date` — client-side grouping for the transaction list. */
export function getGroupPeriodStart(date: string, groupBy: Exclude<TransactionGroupBy, "none">): string {
  const d = new Date(`${date}T00:00:00`);
  if (groupBy === "week") {
    const daysSinceMonday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - daysSinceMonday);
  } else if (groupBy === "month") {
    d.setDate(1);
  }
  return d.toLocaleDateString("sv-SE");
}

export function getGroupPeriodLabel(start: string, groupBy: Exclude<TransactionGroupBy, "none">): string {
  const d = new Date(`${start}T00:00:00`);
  if (groupBy === "day") return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  if (groupBy === "week") return `Week of ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit card",
  cash: "Cash",
  investment: "Investment",
  loan: "Loan",
  other: "Other",
};

/** Badge pill colors, same `bg-X-100 text-X-700` pattern as task status/priority badges. */
export const ACCOUNT_TYPE_BADGE: Record<AccountType, string> = {
  checking: "bg-blue-100 text-blue-700",
  savings: "bg-emerald-100 text-emerald-700",
  credit_card: "bg-rose-100 text-rose-700",
  cash: "bg-lime-100 text-lime-700",
  investment: "bg-violet-100 text-violet-700",
  loan: "bg-amber-100 text-amber-700",
  other: "bg-muted text-muted-foreground",
};

export const ACCOUNT_TYPE_ICON: Record<AccountType, LucideIcon> = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Wallet,
  investment: TrendingUp,
  loan: HandCoins,
  other: Wallet,
};

export const TRANSACTION_TYPE_ICON: Record<TransactionType, LucideIcon> = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  income: "text-emerald-600",
  expense: "text-rose-600",
  transfer: "text-blue-600",
};

export const TRANSACTION_TYPE_BADGE: Record<TransactionType, string> = {
  income: "bg-emerald-100 text-emerald-700",
  expense: "bg-rose-100 text-rose-700",
  transfer: "bg-blue-100 text-blue-700",
};

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  income: "Income",
  expense: "Expense",
};

export const CATEGORY_KIND_BADGE: Record<CategoryKind, string> = {
  income: "bg-emerald-100 text-emerald-700",
  expense: "bg-rose-100 text-rose-700",
};

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

export const RECURRING_FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export const MONEY_GRANULARITY_LABELS: Record<MoneyGranularity, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

/** The bare period noun ("day", "week", …), e.g. for "vs last {unit}" copy. */
export const MONEY_GRANULARITY_UNIT_LABEL: Record<MoneyGranularity, string> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

/**
 * The 8-slot categorical chart palette from the dataviz skill's validated
 * default (references/palette.md) — CSS variables defined in globals.css
 * under :root/.dark, referenced here by name so chart components don't hold
 * raw hex. Categories fold into "Other" past this length (see money.service.ts).
 */
export const CHART_CATEGORICAL_COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
  "var(--chart-series-6)",
  "var(--chart-series-7)",
  "var(--chart-muted)",
] as const;

export const CHART_INCOME_COLOR = "var(--chart-income)";
export const CHART_EXPENSE_COLOR = "var(--chart-expense)";
export const CHART_NET_WORTH_COLOR = "var(--chart-series-1)";
