"use client";

import Link from "next/link";
import { DollarSign, Receipt, PackageX, TrendingUp, ArrowRight, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { ROLES } from "@/lib/types";
import { useSalesSummary, useTopProducts } from "@/lib/hooks/use-reports";
import { useLowStockProducts } from "@/lib/hooks/use-products";
import { formatCurrency, toDateInputValue, toUtcRangeIso } from "@/lib/format";

function todayRange() {
  const today = toDateInputValue(new Date());
  return toUtcRangeIso(today, today);
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canViewReports = !!user && (user.roles.includes(ROLES.Admin) || user.roles.includes(ROLES.Manager));
  const range = todayRange();

  const summary = useSalesSummary(range);
  const topProducts = useTopProducts(range, 5);
  const lowStock = useLowStockProducts();

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.fullName?.split(" ")[0] ?? ""}`}
        description="Here's what's happening in your store today."
        actions={
          <Button render={<Link href="/pos" />} nativeButton={false}>
            <ShoppingCart className="size-4" />
            New Sale
          </Button>
        }
      />

      {canViewReports ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summary.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : (
              <>
                <StatCard
                  label="Today's Revenue"
                  value={formatCurrency(summary.data?.netRevenue ?? 0)}
                  icon={DollarSign}
                  tone="success"
                />
                <StatCard
                  label="Sales Today"
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

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Top Products Today</CardTitle>
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
                  <p className="py-8 text-center text-sm text-muted-foreground">No sales yet today.</p>
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
