"use client";

import { CHART_CATEGORICAL_COLORS, formatMoney } from "@/lib/money-meta";
import type { MoneySummaryCategory } from "@/lib/types";

/** Part-to-whole by category — horizontal bars, direct-labeled (relief rule: some slots sit below 3:1 contrast on light). */
export function CategoryBreakdownChart({ data, currency }: { data: MoneySummaryCategory[]; currency: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No expenses in this period yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((category, index) => {
        const color = CHART_CATEGORICAL_COLORS[index] ?? CHART_CATEGORICAL_COLORS[CHART_CATEGORICAL_COLORS.length - 1];
        const widthPct = (category.total / max) * 100;
        return (
          <div key={category.categoryId} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-[12px] text-muted-foreground">{category.title}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full rounded"
                style={{ width: `${Math.max(widthPct, 2)}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-[12px] font-medium">{formatMoney(category.total, currency)}</span>
          </div>
        );
      })}
    </div>
  );
}
