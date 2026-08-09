"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { RequireRole } from "@/components/shared/require-role";
import { PurchaseApprovalStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePurchases } from "@/lib/hooks/use-purchases";
import { CreatePurchaseDialog } from "@/components/purchases/create-purchase-dialog";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/types";

export default function PurchasesPage() {
  return (
    <RequireRole roles={[ROLES.Admin, ROLES.Manager, ROLES.Cashier]}>
      <PurchasesPageContent />
    </RequireRole>
  );
}

function PurchasesPageContent() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const purchases = usePurchases({ page, pageSize: 12 });

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Enter supplier invoices, get them approved, and add them to stock."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> New Invoice
          </Button>
        }
      />

      <div className="rounded-xl border bg-background">
        {purchases.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : purchases.data && purchases.data.items.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.data.items.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/purchases/${po.id}`} className="hover:underline">
                        {po.purchaseNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{po.supplierName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateOnly(po.purchaseDate)}
                    </TableCell>
                    <TableCell>{formatCurrency(po.totalAmount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {po.isCancelled ? (
                          <Badge className="border-transparent bg-red-500/10 text-red-600 dark:text-red-400">
                            Cancelled
                          </Badge>
                        ) : (
                          <PurchaseApprovalStatusBadge status={po.approvalStatus} />
                        )}
                        {po.isAddedToStock && (
                          <Badge className="border-transparent bg-primary/10 text-primary">In Stock</Badge>
                        )}
                        <Badge
                          className={cn(
                            "border-transparent",
                            po.isPaid
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {po.isPaid ? "Paid" : "Unpaid"}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              page={purchases.data.page}
              totalPages={purchases.data.totalPages}
              totalCount={purchases.data.totalCount}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No invoices yet"
            description="Create an invoice to record stock coming in from a supplier."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" /> New Invoice
              </Button>
            }
          />
        )}
      </div>

      <CreatePurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
