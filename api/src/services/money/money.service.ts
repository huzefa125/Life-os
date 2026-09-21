import { prisma } from "../../db";

const TRANSACTION_TYPE = "transaction";
const ACCOUNT_TYPE = "account";
const CATEGORY_TYPE = "category";

interface TransactionProperties {
  transactionType: "income" | "expense" | "transfer";
  amount: number;
  accountId: string;
  toAccountId?: string;
}

interface SummaryTransactionProperties extends TransactionProperties {
  currency: string;
  date: string;
  categoryId?: string;
}

export type Granularity = "day" | "week" | "month" | "year";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/** The start (YYYY-MM-DD) of the day/week (Monday)/month/year containing `date`. */
export function getPeriodStart(date: string, granularity: Granularity): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (granularity === "week") {
    const daysSinceMonday = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  } else if (granularity === "month") {
    d.setUTCDate(1);
  } else if (granularity === "year") {
    d.setUTCMonth(0, 1);
  }
  return d.toISOString().slice(0, 10);
}

function getPeriodLabel(start: string, granularity: Granularity): string {
  const d = new Date(`${start}T00:00:00Z`);
  if (granularity === "day") return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (granularity === "week") return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (granularity === "year") return d.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function shiftPeriod(start: string, granularity: Granularity, steps: number): string {
  const d = new Date(`${start}T00:00:00Z`);
  if (granularity === "day") d.setUTCDate(d.getUTCDate() + steps);
  else if (granularity === "week") d.setUTCDate(d.getUTCDate() + 7 * steps);
  else if (granularity === "month") d.setUTCMonth(d.getUTCMonth() + steps);
  else d.setUTCFullYear(d.getUTCFullYear() + steps);
  return d.toISOString().slice(0, 10);
}

/** Last day covered by the period starting at `start`, capped at `today` for the current, still-open period. */
function getPeriodEnd(start: string, granularity: Granularity, today: string): string {
  const nextStart = new Date(`${shiftPeriod(start, granularity, 1)}T00:00:00Z`);
  nextStart.setUTCDate(nextStart.getUTCDate() - 1);
  const end = nextStart.toISOString().slice(0, 10);
  return end < today ? end : today;
}

/**
 * Balances aren't stored — they're derived from starting balance + every
 * transaction that touches the account, computed fresh on each read.
 */
export async function computeAccountBalances(
  userId: string,
  startingBalances: Map<string, number>
): Promise<Map<string, number>> {
  const transactions = await prisma.object.findMany({
    where: { userId, type: TRANSACTION_TYPE, status: "active" },
    select: { properties: true },
  });

  const balances = new Map(startingBalances);

  for (const { properties } of transactions) {
    const props = properties as unknown as TransactionProperties | null;
    if (!props) continue;
    const { transactionType, amount, accountId, toAccountId } = props;

    if (transactionType === "income") {
      balances.set(accountId, (balances.get(accountId) ?? 0) + amount);
    } else if (transactionType === "expense") {
      balances.set(accountId, (balances.get(accountId) ?? 0) - amount);
    } else if (transactionType === "transfer") {
      balances.set(accountId, (balances.get(accountId) ?? 0) - amount);
      if (toAccountId) {
        balances.set(toAccountId, (balances.get(toAccountId) ?? 0) + amount);
      }
    }
  }

  return balances;
}

/** Sum of active expense transactions in `categoryId` with `date` inside [periodStart, today]. */
export async function computeCategorySpent(userId: string, categoryId: string, periodStart: string): Promise<number> {
  const today = todayDateString();
  const transactions = await prisma.object.findMany({
    where: { userId, type: TRANSACTION_TYPE, status: "active" },
    select: { properties: true },
  });

  let spent = 0;
  for (const { properties } of transactions) {
    const props = properties as unknown as SummaryTransactionProperties | null;
    if (!props || props.transactionType !== "expense" || props.categoryId !== categoryId) continue;
    if (props.date < periodStart || props.date > today) continue;
    spent += props.amount;
  }
  return spent;
}

export interface MoneySummaryPeriod {
  periodStart: string;
  periodLabel: string;
  income: number;
  expense: number;
  net: number;
  netWorth: number;
}

export interface MoneySummaryCategory {
  categoryId: string;
  title: string;
  total: number;
}

export interface MoneySummary {
  granularity: Granularity;
  currency: string;
  series: MoneySummaryPeriod[];
  categoryBreakdown: MoneySummaryCategory[];
}

const PERIOD_COUNT: Record<Granularity, number> = { day: 14, week: 8, month: 6, year: 5 };
const CATEGORY_BREAKDOWN_LIMIT = 7;

/**
 * Charts show one currency at a time — whichever currency the user's accounts
 * mostly use. Transactions in other currencies are excluded (documented
 * simplification; this app doesn't do cross-currency conversion).
 */
export async function computeMoneySummary(userId: string, granularity: Granularity): Promise<MoneySummary> {
  const [accounts, categories, transactionRows] = await Promise.all([
    prisma.object.findMany({ where: { userId, type: ACCOUNT_TYPE, status: "active" } }),
    prisma.object.findMany({ where: { userId, type: CATEGORY_TYPE, status: "active" } }),
    prisma.object.findMany({ where: { userId, type: TRANSACTION_TYPE, status: "active" } }),
  ]);

  const currencyCounts = new Map<string, number>();
  for (const account of accounts) {
    const currency = (account.properties as { currency?: string } | null)?.currency ?? "USD";
    currencyCounts.set(currency, (currencyCounts.get(currency) ?? 0) + 1);
  }
  let currency = "USD";
  let bestCount = 0;
  for (const [candidate, count] of currencyCounts) {
    if (count > bestCount) {
      bestCount = count;
      currency = candidate;
    }
  }

  const primaryAccountIds = new Set(
    accounts
      .filter((a) => ((a.properties as { currency?: string } | null)?.currency ?? "USD") === currency)
      .map((a) => a.id)
  );
  const startingBalanceByAccount = new Map(
    accounts
      .filter((a) => primaryAccountIds.has(a.id))
      .map((a) => [a.id, (a.properties as { startingBalance?: number } | null)?.startingBalance ?? 0])
  );

  const transactions = transactionRows
    .map((t) => ({ id: t.id, properties: t.properties as unknown as SummaryTransactionProperties | null }))
    .filter((t) => t.properties && t.properties.currency === currency) as {
    id: string;
    properties: SummaryTransactionProperties;
  }[];

  const today = todayDateString();
  const periodCount = PERIOD_COUNT[granularity];
  let cursor = getPeriodStart(today, granularity);
  const starts = [cursor];
  for (let i = 1; i < periodCount; i++) {
    cursor = shiftPeriod(cursor, granularity, -1);
    starts.unshift(cursor);
  }

  const series: MoneySummaryPeriod[] = starts.map((start) => {
    const end = getPeriodEnd(start, granularity, today);
    let income = 0;
    let expense = 0;
    for (const { properties: p } of transactions) {
      if (p.date < start || p.date > end) continue;
      if (p.transactionType === "income") income += p.amount;
      else if (p.transactionType === "expense") expense += p.amount;
    }

    const balances = new Map(startingBalanceByAccount);
    for (const { properties: p } of transactions) {
      if (p.date > end) continue;
      if (p.transactionType === "income" && primaryAccountIds.has(p.accountId)) {
        balances.set(p.accountId, (balances.get(p.accountId) ?? 0) + p.amount);
      } else if (p.transactionType === "expense" && primaryAccountIds.has(p.accountId)) {
        balances.set(p.accountId, (balances.get(p.accountId) ?? 0) - p.amount);
      } else if (p.transactionType === "transfer") {
        if (primaryAccountIds.has(p.accountId)) balances.set(p.accountId, (balances.get(p.accountId) ?? 0) - p.amount);
        if (p.toAccountId && primaryAccountIds.has(p.toAccountId)) {
          balances.set(p.toAccountId, (balances.get(p.toAccountId) ?? 0) + p.amount);
        }
      }
    }
    const netWorth = Array.from(balances.values()).reduce((sum, v) => sum + v, 0);

    return { periodStart: start, periodLabel: getPeriodLabel(start, granularity), income, expense, net: income - expense, netWorth };
  });

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const lastStart = starts[starts.length - 1];
  const lastEnd = getPeriodEnd(lastStart, granularity, today);
  const totals = new Map<string, number>();
  for (const { properties: p } of transactions) {
    if (p.transactionType !== "expense" || !p.categoryId) continue;
    if (p.date < lastStart || p.date > lastEnd) continue;
    totals.set(p.categoryId, (totals.get(p.categoryId) ?? 0) + p.amount);
  }

  let categoryBreakdown: MoneySummaryCategory[] = Array.from(totals.entries())
    .map(([categoryId, total]) => ({ categoryId, title: categoryById.get(categoryId)?.title ?? "Unknown", total }))
    .sort((a, b) => b.total - a.total);

  if (categoryBreakdown.length > CATEGORY_BREAKDOWN_LIMIT) {
    const top = categoryBreakdown.slice(0, CATEGORY_BREAKDOWN_LIMIT);
    const otherTotal = categoryBreakdown.slice(CATEGORY_BREAKDOWN_LIMIT).reduce((sum, c) => sum + c.total, 0);
    categoryBreakdown = [...top, { categoryId: "other", title: "Other", total: otherTotal }];
  }

  return { granularity, currency, series, categoryBreakdown };
}
