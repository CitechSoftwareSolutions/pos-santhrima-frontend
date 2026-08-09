"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { DailySalesDto } from "@/lib/types";

export function DailySalesChart({ data }: { data: DailySalesDto[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No sales data for this period.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.totalAmount), 1);

  return (
    <div className="flex h-48 items-end gap-0.5">
      {data.map((day) => {
        const heightPct = Math.max((day.totalAmount / max) * 100, 2);
        return (
          <Tooltip key={day.date}>
            <TooltipTrigger
              render={
                <div className="flex h-full flex-1 flex-col items-center justify-end" />
              }
            >
              <div
                className="w-full rounded-t-[4px] bg-primary transition-opacity hover:opacity-80"
                style={{ height: `${heightPct}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-medium">{formatDateOnly(day.date)}</span>
              <span className="text-background/70">
                {" "}
                · {formatCurrency(day.totalAmount)} ({day.salesCount} sales)
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
