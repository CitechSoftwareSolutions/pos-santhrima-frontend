"use client";

import { useState } from "react";
import { DollarSign, Receipt, TrendingUp, Percent, Boxes, PackageX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { RequireRole } from "@/components/shared/require-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DailySalesChart } from "@/components/reports/daily-sales-chart";
import {
  useDailySales,
  useInventoryValuation,
  useLowStockReport,
  usePaymentMethodBreakdown,
  useSalesSummary,
  useTopProducts,
} from "@/lib/hooks/use-reports";
import { formatCurrency, toDateInputValue, toUtcRangeIso } from "@/lib/format";
import { ROLES } from "@/lib/types";

function defaultRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  return { dateFrom: toDateInputValue(from), dateTo: toDateInputValue(now) };
}

export default function ReportsPage() {
  return (
    <RequireRole roles={[ROLES.Admin, ROLES.Manager]}>
      <ReportsPageContent />
    </RequireRole>
  );
}

function ReportsPageContent() {
  const [range, setRange] = useState(defaultRange());
  const utcRange = toUtcRangeIso(range.dateFrom, range.dateTo);

  const summary = useSalesSummary(utcRange);
  const dailySales = useDailySales(utcRange);
  const topProducts = useTopProducts(utcRange, 8);
  const paymentBreakdown = usePaymentMethodBreakdown(utcRange);
  const lowStock = useLowStockReport();
  const inventoryValuation = useInventoryValuation();

  return (
    <div>
      <PageHeader title="Reports" description="Sales performance and inventory insights." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={range.dateFrom}
            onChange={(e) => setRange((r) => ({ ...r, dateFrom: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={range.dateTo}
            onChange={(e) => setRange((r) => ({ ...r, dateTo: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Net Revenue"
              value={formatCurrency(summary.data?.netRevenue ?? 0)}
              icon={DollarSign}
              tone="success"
            />
            <StatCard label="Total Sales" value={String(summary.data?.totalSales ?? 0)} icon={Receipt} />
            <StatCard
              label="Avg. Sale Value"
              value={formatCurrency(summary.data?.averageSaleValue ?? 0)}
              icon={TrendingUp}
            />
            <StatCard
              label="Total Discounts"
              value={formatCurrency(summary.data?.totalDiscount ?? 0)}
              icon={Percent}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Daily Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {dailySales.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <DailySalesChart data={dailySales.data ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentBreakdown.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : paymentBreakdown.data && paymentBreakdown.data.length > 0 ? (
              <ul className="space-y-3">
                {paymentBreakdown.data.map((p) => (
                  <li key={p.method} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {p.method} <span className="text-xs">({p.count})</span>
                    </span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No payments in this period.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProducts.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : topProducts.data && topProducts.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.data.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell>{p.quantitySold}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales in this period.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Units"
                value={String(inventoryValuation.data?.totalUnits ?? 0)}
                icon={Boxes}
              />
              <StatCard
                label="Retail Value"
                value={formatCurrency(inventoryValuation.data?.totalRetailValue ?? 0)}
                icon={DollarSign}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Low Stock ({lowStock.data?.length ?? 0})</p>
              {lowStock.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : lowStock.data && lowStock.data.length > 0 ? (
                <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
                  {lowStock.data.map((p) => (
                    <li key={p.productId} className="flex items-center justify-between gap-2">
                      <span className="truncate">{p.productName}</span>
                      <span className="shrink-0 text-amber-600 dark:text-amber-400">
                        {p.stockQuantity}/{p.reorderLevel}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PackageX className="size-4" /> All products well stocked.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
