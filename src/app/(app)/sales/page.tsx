"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Receipt,
  Search,
  X,
  Users,
  Monitor,
  RotateCcw,
  Trash2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { SaleStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSales, useSale, useDeleteSale } from "@/lib/hooks/use-sales";
import { useUsers } from "@/lib/hooks/use-auth";
import { useActiveTerminal } from "@/lib/hooks/use-active-terminal";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useAuthStore } from "@/store/auth-store";
import { SaleDetailDialog } from "@/components/sales/sale-detail-dialog";
import { ReturnDialog } from "@/components/sales/return-dialog";
import {
  formatCurrency,
  formatDate,
  DATE_FILTER_OPTIONS,
  type DateFilterPreset,
  getDateFilterRange,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { ROLES, SaleStatus, type SaleListItemDto } from "@/lib/types";

export default function SalesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canManage = useAuthStore((s) => s.hasRole(ROLES.Admin, ROLES.Manager));
  const canReturn = useAuthStore((s) => s.hasRole(ROLES.Admin, ROLES.Manager, ROLES.Cashier));
  const { activeTerminal, terminals, assignedId } = useActiveTerminal();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("today");
  const [cashierId, setCashierId] = useState<string>(() => currentUser?.id ?? "all");
  const [initializedDefaultUser, setInitializedDefaultUser] = useState<boolean>(() => Boolean(currentUser?.id));

  const [terminalId, setTerminalId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("pos_assigned_terminal_id") || "all";
      } catch {}
    }
    return "all";
  });
  const [initializedDefaultTerminal, setInitializedDefaultTerminal] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return Boolean(localStorage.getItem("pos_assigned_terminal_id"));
      } catch {}
    }
    return false;
  });

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [saleIdToReturn, setSaleIdToReturn] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<SaleListItemDto | null>(null);

  const saleToReturnQuery = useSale(saleIdToReturn ?? undefined);
  const deleteSaleMutation = useDeleteSale();

  const debouncedSearch = useDebouncedValue(search, 300);

  // If currentUser was not available initially (e.g. hydration delay), initialize once
  useEffect(() => {
    if (!initializedDefaultUser && currentUser?.id) {
      setCashierId(currentUser.id);
      setInitializedDefaultUser(true);
    }
  }, [currentUser?.id, initializedDefaultUser]);

  // If assigned counter ID was not yet loaded into state, initialize once it's available
  useEffect(() => {
    if (!initializedDefaultTerminal && (activeTerminal?.id || assignedId)) {
      setTerminalId(activeTerminal?.id || assignedId || "all");
      setInitializedDefaultTerminal(true);
    }
  }, [activeTerminal?.id, assignedId, initializedDefaultTerminal]);

  const users = useUsers();
  const currentCounterId = activeTerminal?.id || assignedId;

  const cashierOptions = useMemo(() => {
    const baseUsers = users.data ?? [];
    const list = [
      { value: "all", label: "All Cashiers" },
      ...baseUsers.map((u) => ({
        value: u.id,
        label: u.id === currentUser?.id ? `${u.fullName} (You)` : u.fullName,
      })),
    ];
    if (currentUser && !list.some((c) => c.value === currentUser.id)) {
      list.push({ value: currentUser.id, label: `${currentUser.fullName} (You)` });
    }
    return list;
  }, [users.data, currentUser]);

  const counterOptions = useMemo(() => {
    const list = [
      { value: "all", label: "All Counters" },
      ...terminals.map((t) => ({
        value: t.id,
        label:
          t.id === currentCounterId
            ? `${t.name || `Counter ${t.counterNumber}`} (Current Counter)`
            : (t.name || `Counter ${t.counterNumber}`),
      })),
    ];
    if (activeTerminal && !list.some((ct) => ct.value === activeTerminal.id)) {
      list.push({
        value: activeTerminal.id,
        label: `${activeTerminal.name || `Counter ${activeTerminal.counterNumber}`} (Current Counter)`,
      });
    }
    return list;
  }, [terminals, activeTerminal, currentCounterId]);

  const dateRange = useMemo(() => getDateFilterRange(dateFilter), [dateFilter]);

  const sales = useSales({
    page,
    pageSize: 15,
    search: debouncedSearch || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    cashierId: cashierId !== "all" ? cashierId : undefined,
    terminalId: terminalId !== "all" ? terminalId : undefined,
  });

  const handleFilterChange = (filter: DateFilterPreset) => {
    setDateFilter(filter);
    setPage(1);
  };

  const defaultTerminalId = currentCounterId ?? "all";
  const defaultCashierId = currentUser?.id ?? "all";

  const hasActiveFilters =
    search !== "" ||
    cashierId !== defaultCashierId ||
    terminalId !== defaultTerminalId ||
    dateFilter !== "today";

  const clearAllFilters = () => {
    setSearch("");
    setDateFilter("today");
    setCashierId(defaultCashierId);
    setTerminalId(defaultTerminalId);
    setPage(1);
  };

  const getEmptyStateDetails = () => {
    if (debouncedSearch) {
      return {
        title: "No sales found",
        description: `No sales matching "${debouncedSearch}" were found for this period.`,
      };
    }
    if (cashierId !== "all" || terminalId !== "all") {
      const selectedCashier = cashierOptions.find((c) => c.value === cashierId)?.label;
      const selectedCounter = counterOptions.find((ct) => ct.value === terminalId)?.label;
      const filterLabels = [
        cashierId !== "all" ? `cashier "${selectedCashier}"` : null,
        terminalId !== "all" ? `counter "${selectedCounter}"` : null,
      ].filter(Boolean).join(" and ");

      return {
        title: "No matching sales",
        description: `No sales recorded for ${filterLabels} in this period.`,
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

      {/* FILTER CONTROLS BAR */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by receipt #..."
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

          {/* Date Presets */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">
            <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
              <Calendar className="size-3.5" />
              <span className="hidden sm:inline">Period:</span>
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

        {/* Cashier & Counter Select Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
          {/* Cashier Filter */}
          <div className="w-full sm:w-56">
            <Select
              items={cashierOptions}
              value={cashierId}
              onValueChange={(v) => {
                setCashierId(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-1.5 truncate">
                  <Users className="size-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Cashiers">
                    {(val: string | null) =>
                      val === "all" || !val
                        ? "All Cashiers"
                        : (cashierOptions.find((c) => c.value === val)?.label ?? val)
                    }
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cashiers</SelectItem>
                {cashierOptions
                  .filter((c) => c.value !== "all")
                  .map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Counter Filter */}
          <div className="w-full sm:w-56">
            <Select
              items={counterOptions}
              value={terminalId}
              onValueChange={(v) => {
                setTerminalId(v ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-1.5 truncate">
                  <Monitor className="size-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Counters">
                    {(val: string | null) =>
                      val === "all" || !val
                        ? "All Counters"
                        : (counterOptions.find((c) => c.value === val)?.label ?? val)
                    }
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counters</SelectItem>
                {counterOptions
                  .filter((c) => c.value !== "all")
                  .map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters button if any active */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1.5"
            >
              <RotateCcw className="size-3" />
              Reset filters
            </Button>
          )}
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
                  <TableHead>Counter</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/80 border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                        <Monitor className="size-3 text-primary" />
                        {sale.terminalName || "Counter 1"}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(sale.totalAmount)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={sale.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <SaleStatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedSaleId(sale.id)}
                          title="View Details / Receipt"
                        >
                          <Eye className="size-3.5" />
                        </Button>

                        {canReturn && ![SaleStatus.Cancelled, SaleStatus.Refunded].includes(sale.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                            onClick={() => setSaleIdToReturn(sale.id)}
                            title="Process Return / Refund"
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        )}

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:bg-destructive/10"
                            onClick={() => setSaleToDelete(sale)}
                            title="Delete sales record"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
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
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      <SaleDetailDialog saleId={selectedSaleId} onOpenChange={(o) => !o && setSelectedSaleId(null)} />

      {/* DIRECT RETURN / REFUND DIALOG FROM TABLE ROW */}
      {saleToReturnQuery.data && (
        <ReturnDialog
          sale={saleToReturnQuery.data}
          open={Boolean(saleIdToReturn)}
          onOpenChange={(open) => !open && setSaleIdToReturn(null)}
          onSuccess={() => {
            sales.refetch();
          }}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(saleToDelete)} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <DialogTitle>Delete Sales Record</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Are you sure you want to delete receipt{" "}
              <span className="font-bold text-foreground">{saleToDelete?.saleNumber}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
            <p className="font-semibold">Important:</p>
            <p>• Unreturned product stocks will be restored to inventory.</p>
            <p>• Associated customer purchases and loyalty points will be reversed.</p>
            <p>• This sale record will be removed from Sales History.</p>
          </div>

          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={deleteSaleMutation.isPending}
              onClick={() => setSaleToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteSaleMutation.isPending}
              onClick={() => {
                if (!saleToDelete) return;
                deleteSaleMutation.mutate(saleToDelete.id, {
                  onSuccess: () => {
                    toast.success(`Sale ${saleToDelete.saleNumber} deleted successfully`);
                    setSaleToDelete(null);
                  },
                  onError: (err) => {
                    toast.error(err instanceof Error ? err.message : "Failed to delete sale");
                  },
                });
              }}
            >
              {deleteSaleMutation.isPending ? "Deleting..." : "Delete Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

