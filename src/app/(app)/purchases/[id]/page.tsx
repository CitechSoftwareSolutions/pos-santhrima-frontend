"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, PackageCheck, CircleDollarSign, Ban } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RequireRole } from "@/components/shared/require-role";
import { PurchaseApprovalStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useApprovePurchase,
  useAddPurchaseToStock,
  useCancelPurchase,
  useMarkPurchaseAsPaid,
  usePurchase,
} from "@/lib/hooks/use-purchases";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PurchaseApprovalStatus, ROLES } from "@/lib/types";

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole roles={[ROLES.Admin, ROLES.Manager, ROLES.Cashier]}>
      <PurchaseDetailContent id={id} />
    </RequireRole>
  );
}

function PurchaseDetailContent({ id }: { id: string }) {
  const purchase = usePurchase(id);
  const hasRole = useAuthStore((s) => s.hasRole);
  const canApprove = hasRole(ROLES.Admin, ROLES.Manager);

  const approvePurchase = useApprovePurchase();
  const addToStock = useAddPurchaseToStock();
  const markAsPaid = useMarkPurchaseAsPaid();
  const cancelPurchase = useCancelPurchase();

  const [approveOpen, setApproveOpen] = useState(false);
  const [addToStockOpen, setAddToStockOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (purchase.isLoading || !purchase.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const po = purchase.data;
  const showApprove = canApprove && !po.isCancelled && po.approvalStatus === PurchaseApprovalStatus.PendingApproval;
  const showAddToStock = !po.isCancelled && po.approvalStatus === PurchaseApprovalStatus.Approved && !po.isAddedToStock;
  const showMarkPaid = canApprove && !po.isCancelled && !po.isPaid;
  const showCancel = canApprove && !po.isCancelled && !po.isAddedToStock;

  function handleApprove() {
    approvePurchase.mutate(po.id, {
      onSuccess: () => {
        toast.success("Invoice approved");
        setApproveOpen(false);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err));
        setApproveOpen(false);
      },
    });
  }

  function handleAddToStock() {
    addToStock.mutate(po.id, {
      onSuccess: () => {
        toast.success("Items added to stock");
        setAddToStockOpen(false);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err));
        setAddToStockOpen(false);
      },
    });
  }

  function handleMarkPaid() {
    markAsPaid.mutate(po.id, {
      onSuccess: () => {
        toast.success("Invoice marked as paid");
        setMarkPaidOpen(false);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err));
        setMarkPaidOpen(false);
      },
    });
  }

  function handleCancel() {
    cancelPurchase.mutate(po.id, {
      onSuccess: () => {
        toast.success("Invoice cancelled");
        setCancelOpen(false);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err));
        setCancelOpen(false);
      },
    });
  }

  return (
    <div>
      <Link href="/purchases" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to invoices
      </Link>

      <PageHeader
        title={po.purchaseNumber}
        description={`From ${po.supplierName} on ${formatDate(po.purchaseDate)} · entered by ${po.createdByName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {showCancel && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <Ban className="size-4" /> Cancel
              </Button>
            )}
            {showMarkPaid && (
              <Button variant="outline" onClick={() => setMarkPaidOpen(true)}>
                <CircleDollarSign className="size-4" /> Mark as Paid
              </Button>
            )}
            {showApprove && (
              <Button onClick={() => setApproveOpen(true)}>
                <CheckCircle2 className="size-4" /> Approve
              </Button>
            )}
            {showAddToStock && (
              <Button onClick={() => setAddToStockOpen(true)}>
                <PackageCheck className="size-4" /> Add to Stock
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Free Qty</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.quantityOrdered}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.freeQuantity > 0 ? item.freeQuantity : "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-muted-foreground">Status</span>
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
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(po.subTotal)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(po.totalAmount)}</span>
            </div>

            <div className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Created by</span>
                <span>{po.createdByName}</span>
              </div>
              {po.approvedByName && po.approvedAt && (
                <div className="flex justify-between">
                  <span>Approved by</span>
                  <span>
                    {po.approvedByName} · {formatDate(po.approvedAt)}
                  </span>
                </div>
              )}
              {po.stockAddedByName && po.stockAddedAt && (
                <div className="flex justify-between">
                  <span>Added to stock by</span>
                  <span>
                    {po.stockAddedByName} · {formatDate(po.stockAddedAt)}
                  </span>
                </div>
              )}
              {po.paidByName && po.paidAt && (
                <div className="flex justify-between">
                  <span>Paid by</span>
                  <span>
                    {po.paidByName} · {formatDate(po.paidAt)}
                  </span>
                </div>
              )}
            </div>

            {po.notes && (
              <div className="border-t pt-3">
                <p className="text-muted-foreground">Notes</p>
                <p>{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve this invoice?"
        description="Once approved, it can be added to stock."
        confirmLabel="Approve"
        destructive={false}
        onConfirm={handleApprove}
        loading={approvePurchase.isPending}
      />

      <ConfirmDialog
        open={addToStockOpen}
        onOpenChange={setAddToStockOpen}
        title="Add items to stock?"
        description="This increases stock quantity for every item on this invoice (including free quantities) and updates their cost price. This can only be done once."
        confirmLabel="Add to Stock"
        destructive={false}
        onConfirm={handleAddToStock}
        loading={addToStock.isPending}
      />

      <ConfirmDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        title="Mark this invoice as paid?"
        confirmLabel="Mark as Paid"
        destructive={false}
        onConfirm={handleMarkPaid}
        loading={markAsPaid.isPending}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this invoice?"
        description="This invoice has not been added to stock and will be marked as cancelled."
        confirmLabel="Cancel Invoice"
        onConfirm={handleCancel}
        loading={cancelPurchase.isPending}
      />
    </div>
  );
}
