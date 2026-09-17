export const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"] as const;

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatExpenseDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Sums amounts grouped by currency, since mixed-currency totals can't be added directly. */
export function sumByCurrency(
  expenses: { properties: { amount: number; currency: string } | null }[]
): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.properties) continue;
    const { amount, currency } = expense.properties;
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }
  return Array.from(totals.entries()).map(([currency, total]) => ({ currency, total }));
}
