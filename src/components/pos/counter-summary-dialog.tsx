"use client";

import { Printer, CheckCircle, Calendar, Receipt, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { printRegisterSummaryReport } from "@/lib/receipt-printer";
import { useStoreSettings } from "@/lib/hooks/use-settings";
import type { CounterDailySummaryDto, TerminalDto } from "@/lib/types";

interface CounterSummaryDialogProps {
  summary: CounterDailySummaryDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminal?: TerminalDto | null;
}

export function CounterSummaryDialog({
  summary,
  open,
  onOpenChange,
  terminal,
}: CounterSummaryDialogProps) {
  const settingsQuery = useStoreSettings();

  if (!summary) return null;

  function handlePrint() {
    if (!summary) return;
    printRegisterSummaryReport(summary, {
      settings: settingsQuery.data,
      terminal,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                Daily Counter Summary
              </DialogTitle>
              <DialogDescription className="text-xs">
                Register closed successfully. Here is today&apos;s counter performance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Counter & Session Details */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Counter:</span>
            <span className="font-semibold text-foreground">
              {summary.counterName}{" "}
              {summary.terminalCode && (
                <span className="font-mono text-muted-foreground font-normal">
                  ({summary.terminalCode})
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cashier:</span>
            <span className="font-medium text-foreground">{summary.cashierName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" /> Duration:
            </span>
            <span className="text-foreground font-mono">
              {formatDate(summary.openedAt)} — {formatDate(summary.closedAt)}
            </span>
          </div>
        </div>

        {/* Sales Overview */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border bg-card p-2.5">
            <p className="text-[11px] text-muted-foreground">Total Invoices</p>
            <p className="text-lg font-bold text-foreground mt-0.5 flex items-center justify-center gap-1">
              <Receipt className="size-4 text-primary" />
              {summary.totalSalesCount}
            </p>
          </div>
          <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/20 p-2.5">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Net Sales Revenue
            </p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(summary.totalRevenue)}
            </p>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="space-y-1.5 text-xs border rounded-lg p-3 bg-card">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gross Sales:</span>
            <span>{formatCurrency(summary.subTotal)}</span>
          </div>
          {summary.totalDiscount > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>Total Discounts:</span>
              <span>-{formatCurrency(summary.totalDiscount)}</span>
            </div>
          )}
          {summary.totalTax > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Tax:</span>
              <span>{formatCurrency(summary.totalTax)}</span>
            </div>
          )}
          <Separator className="my-1.5" />
          <div className="flex justify-between font-semibold text-sm">
            <span>Net Revenue:</span>
            <span className="text-primary">{formatCurrency(summary.totalRevenue)}</span>
          </div>
        </div>

        {/* Payments by Method */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <CreditCard className="size-3.5 text-muted-foreground" />
            <span>Payments in All Payment Methods</span>
          </div>
          <div className="rounded-lg border divide-y bg-card text-xs">
            {summary.paymentMethods.map((pm) => (
              <div
                key={pm.methodValue}
                className="flex items-center justify-between p-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{pm.methodName}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                    {pm.transactionCount} {pm.transactionCount === 1 ? "bill" : "bills"}
                  </span>
                </div>
                <span
                  className={
                    pm.totalAmount > 0
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {formatCurrency(pm.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto text-xs"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto gap-1.5 text-xs bg-primary hover:bg-primary/90"
            onClick={handlePrint}
          >
            <Printer className="size-3.5" />
            Print Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
