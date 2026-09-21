"use client";

import { useState } from "react";
import { formatMoney, CHART_EXPENSE_COLOR, CHART_INCOME_COLOR, CHART_NET_WORTH_COLOR } from "@/lib/money-meta";
import type { MoneySummaryPeriod } from "@/lib/types";

const CHART_HEIGHT = 180;
const BAR_GAP = 6;

interface TooltipState {
  xPct: number;
  yPct: number;
  lines: { label: string; value: string; color?: string }[];
}

/** Positioned as a percentage of its nearest `relative` ancestor — pass a wrapper that tightly contains only the chart's plot area. */
function Tooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2.5 py-1.5 text-[12px] whitespace-nowrap shadow-md"
      style={{ left: `${tooltip.xPct}%`, top: `${tooltip.yPct}%`, marginTop: -8 }}
    >
      {tooltip.lines.map((line) => (
        <div key={line.label} className="flex items-center gap-1.5">
          {line.color ? <span className="inline-block size-2 rounded-full" style={{ backgroundColor: line.color }} /> : null}
          <span className="text-muted-foreground">{line.label}</span>
          <span className="font-medium text-popover-foreground">{line.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Income (up) vs expense (down) diverging bars around a zero baseline — the validated diverging blue/red pair. */
export function IncomeExpenseChart({ data, currency }: { data: MoneySummaryPeriod[]; currency: string }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const maxMagnitude = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const halfHeight = CHART_HEIGHT / 2;
  const barWidth = data.length > 0 ? 100 / data.length : 100;

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-[12px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: CHART_INCOME_COLOR }} />
          <span className="text-muted-foreground">Income</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: CHART_EXPENSE_COLOR }} />
          <span className="text-muted-foreground">Expense</span>
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-44 w-full overflow-visible"
          onMouseLeave={() => setTooltip(null)}
        >
          <line x1={0} y1={halfHeight} x2={100} y2={halfHeight} className="stroke-border" strokeWidth={1} />
          {data.map((period, index) => {
            const x = index * barWidth;
            const incomeHeight = (period.income / maxMagnitude) * (halfHeight - 8);
            const expenseHeight = (period.expense / maxMagnitude) * (halfHeight - 8);
            const w = Math.max(barWidth - BAR_GAP, 2);
            const cx = x + barWidth / 2;

            return (
              <g key={period.periodStart}>
                {period.income > 0 ? (
                  <rect
                    x={cx - w / 2}
                    y={halfHeight - incomeHeight}
                    width={w}
                    height={incomeHeight}
                    rx={2}
                    fill={CHART_INCOME_COLOR}
                    onMouseEnter={() =>
                      setTooltip({
                        xPct: cx,
                        yPct: ((halfHeight - incomeHeight) / CHART_HEIGHT) * 100,
                        lines: [{ label: period.periodLabel, value: formatMoney(period.income, currency), color: CHART_INCOME_COLOR }],
                      })
                    }
                  />
                ) : null}
                {period.expense > 0 ? (
                  <rect
                    x={cx - w / 2}
                    y={halfHeight}
                    width={w}
                    height={expenseHeight}
                    rx={2}
                    fill={CHART_EXPENSE_COLOR}
                    onMouseEnter={() =>
                      setTooltip({
                        xPct: cx,
                        yPct: (halfHeight / CHART_HEIGHT) * 100,
                        lines: [{ label: period.periodLabel, value: formatMoney(period.expense, currency), color: CHART_EXPENSE_COLOR }],
                      })
                    }
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
        <Tooltip tooltip={tooltip} />
      </div>
      <div className="mt-1 flex text-[11px] text-muted-foreground">
        {data.map((period) => (
          <span key={period.periodStart} className="flex-1 truncate text-center">
            {period.periodLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Net worth over time — a single series needs no legend; one accent hue. */
export function NetWorthChart({ data, currency }: { data: MoneySummaryPeriod[]; currency: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const values = data.map((d) => d.netWorth);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  const width = 100;
  const height = 100;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
    const y = height - ((d.netWorth - min) / range) * (height - 10) - 5;
    return { x, y, d };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = points.length > 0 ? `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z` : "";
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-32 w-full overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <path d={areaPath} fill={CHART_NET_WORTH_COLOR} opacity={0.1} stroke="none" />
          <path d={path} fill="none" stroke={CHART_NET_WORTH_COLOR} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <rect
              key={data[i].periodStart}
              x={p.x - width / data.length / 2}
              y={0}
              width={width / data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
          {hovered ? <circle cx={hovered.x} cy={hovered.y} r={2} fill={CHART_NET_WORTH_COLOR} /> : null}
        </svg>
        {hovered ? (
          <Tooltip
            tooltip={{
              xPct: hovered.x,
              yPct: hovered.y,
              lines: [{ label: hovered.d.periodLabel, value: formatMoney(hovered.d.netWorth, currency), color: CHART_NET_WORTH_COLOR }],
            }}
          />
        ) : null}
      </div>
      <div className="mt-1 flex text-[11px] text-muted-foreground">
        {data.map((period) => (
          <span key={period.periodStart} className="flex-1 truncate text-center">
            {period.periodLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
