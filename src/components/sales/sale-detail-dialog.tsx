"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Printer, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptView } from "@/components/pos/receipt-view";
import { ReturnDialog } from "@/components/sales/return-dialog";
import { useSale, useDeleteSale } from "@/lib/hooks/use-sales";
import { useStoreSettings } from "@/lib/hooks/use-settings";
import { printReceipt } from "@/lib/receipt-printer";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { ROLES, SaleStatus } from "@/lib/types";

export function SaleDetailDialog({
  saleId,
  onOpenChange,
}: {
  saleId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const sale = useSale(saleId ?? undefined);
  const settingsQuery = useStoreSettings();
  const deleteSale = useDeleteSale();
  const canManage = useAuthStore((s) => s.hasRole(ROLES.Admin, ROLES.Manager));
  const canReturn = useAuthStore((s) => s.hasRole(ROLES.Admin, ROLES.Manager, ROLES.Cashier));

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  const open = !!saleId;

  function handleClose(o: boolean) {
    if (!o) setConfirmDelete(false);
    onOpenChange(o);
  }

  function submitDelete() {
    if (!saleId) return;

    deleteSale.mutate(saleId, {
      onSuccess: () => {
        toast.success("Sale record deleted successfully");
        setConfirmDelete(false);
        onOpenChange(false);
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  const isCancelledOrRefunded =
    sale.data && [SaleStatus.Cancelled, SaleStatus.Refunded].includes(sale.data.status);

  const canProcessReturn =
    canReturn &&
    sale.data &&
    !isCancelledOrRefunded &&
    sale.data.items.some((i) => (i.quantity - (i.returnedQuantity ?? 0)) > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm max-h-[90vh] flex flex-col p-4 overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="sr-only">Sale details</DialogTitle>
          </DialogHeader>

          {sale.isLoading || !sale.data ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : confirmDelete ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5 shrink-0" />
                <h3 className="font-semibold text-base">Delete Sale Record</h3>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to permanently delete receipt{" "}
                  <span className="font-bold text-foreground">{sale.data.saleNumber}</span>?
                </p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive space-y-1">
                  <p className="font-semibold">Important:</p>
                  <p className="opacity-90">
                    • Unreturned inventory stocks will be restored to product stock.
                  </p>
                  <p className="opacity-90">
                    • Associated customer purchases and loyalty points will be reversed.
                  </p>
                  <p className="opacity-90">
                    • This record will be removed from Sales History.
                  </p>
                </div>
              </div>

              <DialogFooter className="shrink-0 flex-row justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={submitDelete}
                  disabled={deleteSale.isPending}
                >
                  {deleteSale.isPending ? "Deleting..." : "Confirm Delete"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div
                id="receipt-print-area"
                className="overflow-y-auto flex-1 max-h-[calc(88vh-6.5rem)] pr-1 print:max-h-none print:overflow-visible"
              >
                <ReceiptView sale={sale.data} settings={settingsQuery.data} />
              </div>

              <DialogFooter className="shrink-0 pt-2 border-t flex-wrap gap-1.5 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => {
                    if (sale.data) {
                      printReceipt(sale.data, { settings: settingsQuery.data });
                    }
                  }}
                >
                  <Printer className="size-3.5" /> Print
                </Button>

                {canProcessReturn && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-xs h-8 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 font-medium"
                    onClick={() => setReturnDialogOpen(true)}
                  >
                    <RotateCcw className="size-3.5" /> Return / Refund
                  </Button>
                )}

                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    title="Delete sales record"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DEDICATED RETURN / REFUND DIALOG */}
      {sale.data && (
        <ReturnDialog
          sale={sale.data}
          open={returnDialogOpen}
          onOpenChange={setReturnDialogOpen}
          onSuccess={() => {
            sale.refetch();
          }}
        />
      )}
    </>
  );
}
