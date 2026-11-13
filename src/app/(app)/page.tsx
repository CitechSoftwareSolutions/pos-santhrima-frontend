"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Receipt,
  PackageX,
  TrendingUp,
  ArrowRight,
  ShoppingCart,
  Users,
  UserCheck,
  Monitor,
  Moon,
  Sun,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { ROLES } from "@/lib/types";
import { useSalesSummary, useTopProducts, useCashierSales, useCounterSales } from "@/lib/hooks/use-reports";
import { useLowStockProducts } from "@/lib/hooks/use-products";
import { formatCurrency, formatDate, getDateFilterRange, type DateFilterPreset } from "@/lib/format";
import { cn } from "@/lib/utils";

const DASHBOARD_DATE_FILTERS: { value: DateFilterPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "all", label: "All" },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperSuperAdmin = !!user && user.roles.includes(ROLES.SuperSuperAdmin);
  const canViewReports = !!user && (user.roles.includes(ROLES.Admin) || user.roles.includes(ROLES.Manager) || isSuperSuperAdmin);

  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("today");
  const [salesViewMode, setSalesViewMode] = useState<"cashier" | "counter">("cashier");

  const range = useMemo(() => getDateFilterRange(dateFilter), [dateFilter]);

  const summary = useSalesSummary(range);
  const topProducts = useTopProducts(range, 5);
  const lowStock = useLowStockProducts();
  const cashierSales = useCashierSales(range);
  const counterSales = useCounterSales(range);

  const totalCashierRevenue = cashierSales.data?.reduce((sum, c) => sum + c.totalRevenue, 0) ?? 0;
  const totalCashierTransactions = cashierSales.data?.reduce((sum, c) => sum + c.totalSales, 0) ?? 0;
  const totalCounterRevenue = counterSales.data?.reduce((sum, c) => sum + c.totalRevenue, 0) ?? 0;

  const periodLabel =
    dateFilter === "today"
      ? "Today's"
      : dateFilter === "yesterday"
      ? "Yesterday's"
      : dateFilter === "this_week"
      ? "This Week's"
      : "All-Time";

  const periodSuffix =
    dateFilter === "today"
      ? "Today"
      : dateFilter === "yesterday"
      ? "Yesterday"
      : dateFilter === "this_week"
      ? "This Week"
      : "All-Time";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.fullName?.split(" ")[0] ?? ""}`}
        description={`Here's what's happening in your store ${dateFilter === "all" ? "across all time" : periodSuffix.toLowerCase()}.`}
        actions={
          !isSuperSuperAdmin ? (
            <Button render={<Link href="/pos" />} nativeButton={false}>
              <ShoppingCart className="size-4" />
              New Sale
            </Button>
          ) : undefined
        }
      />

      {canViewReports ? (
        <>
          {/* Dashboard Date Filter & Super Super Admin Dual DB Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-1 rounded-xl border bg-muted/60 p-1 shadow-2xs w-fit">
              {DASHBOARD_DATE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setDateFilter(f.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    dateFilter === f.value
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Super Super Admin Only: Dual DB breakdown pill */}
            {isSuperSuperAdmin && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 font-medium text-purple-600 dark:text-purple-400">
                  <Moon className="size-3.5" />
                  Dark DB: {summary.data?.darkSalesCount ?? 0} ({formatCurrency(summary.data?.darkRevenue ?? 0)})
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-medium text-sky-600 dark:text-sky-400">
                  <Sun className="size-3.5" />
                  Light DB: {summary.data?.lightSalesCount ?? 0} ({formatCurrency(summary.data?.lightRevenue ?? 0)})
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border bg-muted/70 px-2.5 py-1 font-semibold text-foreground">
                  <Layers className="size-3.5 text-primary" />
                  Combined: {summary.data?.totalSales ?? 0}
                </span>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summary.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : (
              <>
                <StatCard
                  label={`${periodLabel} Revenue`}
                  value={formatCurrency(summary.data?.netRevenue ?? 0)}
                  icon={DollarSign}
                  tone="success"
                />
                <StatCard
                  label={`Sales ${periodSuffix}`}
                  value={String(summary.data?.totalSales ?? 0)}
                  icon={Receipt}
                />
                <StatCard
                  label="Avg. Sale Value"
                  value={formatCurrency(summary.data?.averageSaleValue ?? 0)}
                  icon={TrendingUp}
                />
                <StatCard
                  label="Low Stock Items"
                  value={String(lowStock.data?.length ?? 0)}
                  icon={PackageX}
                  tone={lowStock.data && lowStock.data.length > 0 ? "warning" : "default"}
                />
              </>
            )}
          </div>

          {/* ============================================================== */}
          {/* CASHIER & COUNTER SALES PERFORMANCE (TODAY)                    */}
          {/* ============================================================== */}
          <Card className="mt-6 border-border/70 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {salesViewMode === "cashier" ? <Users className="size-5" /> : <Monitor className="size-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      {salesViewMode === "cashier"
                        ? `${periodLabel} Cashier-Wise Sales`
                        : `${periodLabel} Counter-Wise Sales`}
                    </CardTitle>
                    {isSuperSuperAdmin && (
                      <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                        Dark + Light DB
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Live
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    {salesViewMode === "cashier"
                      ? "Real-time transaction volume, counters, gross revenue, and contribution share per cashier."
                      : "Live terminal activity, revenue volume, average tickets, and assigned cashiers per counter."}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* View switcher tabs */}
                <div className="flex items-center gap-1 rounded-lg border bg-muted/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSalesViewMode("cashier")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      salesViewMode === "cashier"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="size-3.5" />
                    By Cashier ({cashierSales.data?.length ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesViewMode("counter")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      salesViewMode === "counter"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Monitor className="size-3.5" />
                    By Counter ({counterSales.data?.length ?? 0})
                  </button>
                </div>

                <Link
                  href="/reports"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1 ml-1"
                >
                  All Reports <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {cashierSales.isLoading || counterSales.isLoading ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* KPI Mini Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border bg-muted/40 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground font-medium">Active Cashiers</span>
                      <p className="text-base font-bold text-foreground mt-0.5">{cashierSales.data?.length ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Active Counters</span>
                      <p className="text-base font-bold text-foreground mt-0.5">{counterSales.data?.length ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Total Receipts</span>
                      <p className="text-base font-bold text-foreground mt-0.5">{totalCashierTransactions}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Total Processed</span>
                      <p className="text-base font-bold text-primary mt-0.5">{formatCurrency(totalCashierRevenue)}</p>
                    </div>
                  </div>

                  {/* CASHIER VIEW */}
                  {salesViewMode === "cashier" && (
                    <>
                      {cashierSales.data && cashierSales.data.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-border/60">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-xs text-muted-foreground font-medium border-b border-border/60">
                              <tr>
                                <th className="py-2.5 px-3.5">Cashier</th>
                                <th className="py-2.5 px-3">Counter</th>
                                <th className="py-2.5 px-3 text-center">Receipts</th>
                                <th className="py-2.5 px-3.5 text-right">Total Revenue</th>
                                <th className="py-2.5 px-3 text-right">Avg. Ticket</th>
                                <th className="py-2.5 px-3 text-right">Discounts</th>
                                <th className="py-2.5 px-3 min-w-[120px]">Revenue Share</th>
                                <th className="py-2.5 px-3.5 text-right">Last Sale</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {cashierSales.data.map((c) => {
                                const sharePercent =
                                  totalCashierRevenue > 0
                                    ? Math.round((c.totalRevenue / totalCashierRevenue) * 100)
                                    : 0;
                                const initials =
                                  c.cashierName
                                    .split(" ")
                                    .map((w) => w[0])
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase() || "C";

                                return (
                                  <tr key={c.cashierId} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-3 px-3.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                          {initials}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-medium text-foreground truncate">{c.cashierName}</p>
                                          <p className="text-[11px] text-muted-foreground truncate">
                                            {c.cashierEmail || "Counter Staff"}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/80 border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                                        <Monitor className="size-3 text-primary" />
                                        {c.counterName || (c.counterNumber ? `Counter ${c.counterNumber}` : "Main Counter")}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-medium">
                                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                                        <Receipt className="size-3 text-muted-foreground" />
                                        {c.totalSales}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3.5 text-right font-bold text-foreground">
                                      {formatCurrency(c.totalRevenue)}
                                    </td>
                                    <td className="py-3 px-3 text-right text-muted-foreground font-medium">
                                      {formatCurrency(c.averageSaleValue)}
                                    </td>
                                    <td className="py-3 px-3 text-right text-muted-foreground">
                                      {formatCurrency(c.totalDiscount)}
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="font-semibold text-foreground">{sharePercent}%</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-primary transition-all duration-300"
                                            style={{ width: `${Math.min(100, Math.max(3, sharePercent))}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                                      {c.lastSaleTime ? formatDate(c.lastSaleTime) : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                          <div className="flex size-11 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                            <UserCheck className="size-5" />
                          </div>
                          <p className="text-sm font-medium text-foreground">No Cashier Sales For This Period</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            Cashiers who complete sales at any counter terminal will appear here automatically in real time.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* COUNTER VIEW */}
                  {salesViewMode === "counter" && (
                    <>
                      {counterSales.data && counterSales.data.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-border/60">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-xs text-muted-foreground font-medium border-b border-border/60">
                              <tr>
                                <th className="py-2.5 px-3.5">Counter Terminal</th>
                                <th className="py-2.5 px-3">Active Cashiers</th>
                                <th className="py-2.5 px-3 text-center">Receipts</th>
                                <th className="py-2.5 px-3.5 text-right">Total Revenue</th>
                                <th className="py-2.5 px-3 text-right">Avg. Ticket</th>
                                <th className="py-2.5 px-3 min-w-[120px]">Revenue Share</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {counterSales.data.map((ct) => {
                                const sharePercent =
                                  totalCounterRevenue > 0
                                    ? Math.round((ct.totalRevenue / totalCounterRevenue) * 100)
                                    : 0;

                                return (
                                  <tr key={ct.terminalId ?? "default"} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-3 px-3.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                          <Monitor className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <p className="font-semibold text-foreground truncate">{ct.counterName}</p>
                                            {ct.counterNumber && (
                                              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                                                #{ct.counterNumber}
                                              </span>
                                            )}
                                          </div>
                                          {ct.terminalCode && (
                                            <p className="text-[11px] font-mono text-muted-foreground truncate">
                                              {ct.terminalCode}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="flex flex-wrap gap-1">
                                        {ct.activeCashiers.length > 0 ? (
                                          ct.activeCashiers.map((name) => (
                                            <span
                                              key={name}
                                              className="inline-flex items-center gap-1 rounded bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-foreground"
                                            >
                                              <Users className="size-2.5 text-muted-foreground" />
                                              {name}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-xs text-muted-foreground">Unassigned</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-center font-medium">
                                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                                        <Receipt className="size-3 text-muted-foreground" />
                                        {ct.totalSales}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3.5 text-right font-bold text-foreground">
                                      {formatCurrency(ct.totalRevenue)}
                                    </td>
                                    <td className="py-3 px-3 text-right text-muted-foreground font-medium">
                                      {formatCurrency(ct.averageSaleValue)}
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="font-semibold text-foreground">{sharePercent}%</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-primary transition-all duration-300"
                                            style={{ width: `${Math.min(100, Math.max(3, sharePercent))}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                          <div className="flex size-11 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                            <Monitor className="size-5" />
                          </div>
                          <p className="text-sm font-medium text-foreground">No Counter Sales For This Period</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            Checkout transactions performed at cash registers will be grouped and displayed here by counter.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Top Products ({periodSuffix})</CardTitle>
                <Link href="/reports" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View reports <ArrowRight className="size-3.5" />
                </Link>
              </CardHeader>
              <CardContent>
                {topProducts.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : topProducts.data && topProducts.data.length > 0 ? (
                  <ul className="divide-y">
                    {topProducts.data.map((p) => (
                      <li key={p.productId} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="font-medium">{p.productName}</span>
                        <span className="text-muted-foreground">
                          {p.quantitySold} sold · {formatCurrency(p.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No sales yet for this period.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Low Stock Alerts</CardTitle>
                <Link href="/products" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Manage products <ArrowRight className="size-3.5" />
                </Link>
              </CardHeader>
              <CardContent>
                {lowStock.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : lowStock.data && lowStock.data.length > 0 ? (
                  <ul className="divide-y">
                    {lowStock.data.slice(0, 6).map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-amber-600 dark:text-amber-400">
                          {p.stockQuantity} left (reorder at {p.reorderLevel})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    All products are well stocked.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingCart className="size-6" />
            </div>
            <div>
              <p className="font-medium">Ready to start selling</p>
              <p className="text-sm text-muted-foreground">
                Head to the Point of Sale screen to ring up a new transaction.
              </p>
            </div>
            <Button render={<Link href="/pos" />} nativeButton={false}>
              Open Point of Sale
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
