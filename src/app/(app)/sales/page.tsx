"use client";

import { useMemo, useState } from "react";
import { Calendar, Receipt, Search, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { SaleStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSales } from "@/lib/hooks/use-sales";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { SaleDetailDialog } from "@/components/sales/sale-detail-dialog";
import {
  formatCurrency,
  formatDate,
  DATE_FILTER_OPTIONS,
  type DateFilterPreset,
  getDateFilterRange,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("today");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const dateRange = useMemo(() => getDateFilterRange(dateFilter), [dateFilter]);

  const sales = useSales({
    page,
    pageSize: 15,
    search: debouncedSearch || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  const handleFilterChange = (filter: DateFilterPreset) => {
    setDateFilter(filter);
    setPage(1);
  };

  const getEmptyStateDetails = () => {
    if (debouncedSearch) {
      return {
        title: "No sales found",
        description: `No sales matching "${debouncedSearch}" were found for this period.`,
      };
    }
    switch (dateFilter) {
      case "today":
        return {
          title: "No sales today",
          description: "No sales have been recorded yet today.",
        };
      case "yesterday":
        return {
          title: "No sales yesterday",
          description: "No sales were recorded yesterday.",
        };
      case "this_week":
        return {
          title: "No sales this week",
          description: "No sales have been recorded for this week.",
        };
      case "this_month":
        return {
          title: "No sales this month",
          description: "No sales have been recorded for this month.",
        };
      default:
        return {
          title: "No sales yet",
          description: "Completed sales will show up here.",
        };
    }
  };

  const emptyState = getEmptyStateDetails();

  return (
    <div>
      <PageHeader title="Sales History" description="Browse and manage past transactions." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by receipt number..."
            className="pl-9 pr-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">
          <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
            <Calendar className="size-3.5" />
            <span className="hidden sm:inline">Filter:</span>
          </div>
          {DATE_FILTER_OPTIONS.map((filter) => {
            const isActive = dateFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleFilterChange(filter.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all sm:text-sm",
                  isActive
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-background">
        {sales.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : sales.data && sales.data.items.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.data.items.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedSaleId(sale.id)}
                  >
                    <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(sale.saleDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{sale.customerName || "Walk-in"}</TableCell>
                    <TableCell className="text-muted-foreground">{sale.cashierName}</TableCell>
                    <TableCell>{formatCurrency(sale.totalAmount)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={sale.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <SaleStatusBadge status={sale.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              page={sales.data.page}
              totalPages={sales.data.totalPages}
              totalCount={sales.data.totalCount}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={Receipt}
            title={emptyState.title}
            description={emptyState.description}
            action={
              debouncedSearch ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  Clear search
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      <SaleDetailDialog saleId={selectedSaleId} onOpenChange={(o) => !o && setSelectedSaleId(null)} />
    </div>
  );
}

