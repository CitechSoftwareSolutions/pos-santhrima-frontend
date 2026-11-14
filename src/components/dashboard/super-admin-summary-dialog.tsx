"use client";

import {
  Printer,
  Receipt,
  CreditCard,
  Users,
  Moon,
  Sun,
  Layers,
  Sparkles,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import {
  useSalesSummary,
  usePaymentMethodBreakdown,
  useCashierSales,
  useCounterSales,
} from "@/lib/hooks/use-reports";
import { useStoreSettings } from "@/lib/hooks/use-settings";
import { printSalesSummaryReport } from "@/lib/receipt-printer";

interface SuperAdminSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: { dateFrom?: string; dateTo?: string };
  periodLabel: string;
  dateRangeText?: string;
}

export function SuperAdminSummaryDialog({
  open,
  onOpenChange,
  range,
  periodLabel,
  dateRangeText,
}: SuperAdminSummaryDialogProps) {
  const settingsQuery = useStoreSettings();

  const summary = useSalesSummary(range);
  const paymentBreakdown = usePaymentMethodBreakdown(range);
  const cashierSales = useCashierSales(range);
  const counterSales = useCounterSales(range);

  function handlePrint() {
    if (!summary.data) return;

    printSalesSummaryReport(
      {
        reportTitle: "Sales Summary Report",
        periodLabel,
        dateRangeText,
        totalSales: summary.data.totalSales ?? 0,
        grossRevenue: summary.data.grossRevenue ?? 0,
        totalDiscount: summary.data.totalDiscount ?? 0,
        totalTax: summary.data.totalTax ?? 0,
        netRevenue: summary.data.netRevenue ?? 0,
        averageSaleValue: summary.data.averageSaleValue ?? 0,
        darkSalesCount: summary.data.darkSalesCount,
        darkRevenue: summary.data.darkRevenue,
        lightSalesCount: summary.data.lightSalesCount,
        lightRevenue: summary.data.lightRevenue,
        paymentMethods: paymentBreakdown.data?.map((pm) => ({
          method: pm.method,
          amount: pm.amount,
          count: pm.count,
        })),
        cashierSales: cashierSales.data?.map((c) => ({
          cashierName: c.cashierName,
          totalSales: c.totalSales,
          totalRevenue: c.totalRevenue,
        })),
        counterSales: counterSales.data?.map((c) => ({
          counterName: c.counterName || "Counter",
          totalSales: c.totalSales,
          totalRevenue: c.totalRevenue,
        })),
      },
      {
        settings: settingsQuery.data,
      }
    );
  }

  const s = summary.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Printer className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Take Sales Summary</DialogTitle>
              <DialogDescription className="text-xs">
                Review filtered dashboard totals and print a consolidated thermal receipt bill.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {summary.isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* Dual Database Breakdown Pill */}
            {(s?.darkSalesCount != null || s?.lightSalesCount != null) && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/30 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Dual Database Split:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-medium text-purple-600 dark:text-purple-400">
                    <Moon className="size-3" />
                    Admin DB: {s?.darkSalesCount ?? 0} ({formatCurrency(s?.darkRevenue ?? 0)})
                  </span>
                  <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-medium text-sky-600 dark:text-sky-400">
                    <Sun className="size-3" />
                    Normal DB: {s?.lightSalesCount ?? 0} ({formatCurrency(s?.lightRevenue ?? 0)})
                  </span>
                  <span className="inline-flex items-center gap-1 rounded border bg-muted/70 px-2 py-0.5 font-semibold text-foreground">
                    <Layers className="size-3 text-primary" />
                    combined sales records: {s?.totalSales ?? 0}
                  </span>
                </div>
              </div>
            )}

            {/* Top Overview Cards */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[11px] text-muted-foreground">Total Invoices / Bills</p>
                <p className="text-xl font-bold text-foreground mt-0.5 flex items-center justify-center gap-1.5">
                  <Receipt className="size-4 text-primary" />
                  {s?.totalSales ?? 0}
                </p>
              </div>
              <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/20 p-3">
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Net Sales Revenue
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(s?.netRevenue ?? 0)}
                </p>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-1.5 text-xs border rounded-lg p-3 bg-card">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Sales:</span>
                <span>{formatCurrency(s?.grossRevenue ?? 0)}</span>
              </div>
              {(s?.totalDiscount ?? 0) > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Total Discounts:</span>
                  <span>-{formatCurrency(s?.totalDiscount ?? 0)}</span>
                </div>
              )}
              {(s?.totalTax ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tax:</span>
                  <span>{formatCurrency(s?.totalTax ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Sale Value:</span>
                <span>{formatCurrency(s?.averageSaleValue ?? 0)}</span>
              </div>
              <Separator className="my-1.5" />
              <div className="flex justify-between font-semibold text-sm">
                <span>Total Net Revenue:</span>
                <span className="text-primary">{formatCurrency(s?.netRevenue ?? 0)}</span>
              </div>
            </div>

            {/* Payments by Method */}
            {paymentBreakdown.data && paymentBreakdown.data.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <CreditCard className="size-3.5 text-muted-foreground" />
                  <span>Payments by Method</span>
                </div>
                <div className="rounded-lg border divide-y bg-card text-xs">
                  {paymentBreakdown.data.map((pm) => (
                    <div key={pm.method} className="flex justify-between p-2">
                      <span className="text-muted-foreground">
                        {pm.method}{" "}
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({pm.count} bills)
                        </span>
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(pm.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cashier Breakdown */}
            {cashierSales.data && cashierSales.data.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Users className="size-3.5 text-muted-foreground" />
                  <span>Cashier Sales Breakdown</span>
                </div>
                <div className="rounded-lg border divide-y bg-card text-xs max-h-36 overflow-y-auto">
                  {cashierSales.data.map((c) => (
                    <div key={c.cashierId} className="flex justify-between p-2">
                      <span className="text-muted-foreground">
                        {c.cashierName}{" "}
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({c.totalSales} bills)
                        </span>
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(c.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handlePrint}
            disabled={summary.isLoading || !summary.data}
            className="gap-2"
          >
            <Printer className="size-4" />
            Print Summary (Bill)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
