"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, Printer, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptView } from "@/components/pos/receipt-view";
import { ReturnDialog } from "@/components/sales/return-dialog";
import { useSale, useVoidSale, useDeleteSale } from "@/lib/hooks/use-sales";
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
  const voidSale = useVoidSale();
  const deleteSale = useDeleteSale();
  const canManage = useAuthStore((s) => s.hasRole(ROLES.Admin, ROLES.Manager));
  const canReturn = useAuthStore((s) => s.hasRole(ROLES.Admin, ROLES.Manager, ROLES.Cashier));

  const [action, setAction] = useState<"void" | "delete" | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reason, setReason] = useState("");

  const open = !!saleId;

  function reset() {
    setAction(null);
    setReason("");
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function submitAction() {
    if (!saleId) return;

    if (action === "void") {
      if (!reason.trim()) {
        toast.error("Please provide a reason to void this sale.");
        return;
      }
      voidSale.mutate(
        { id: saleId, reason },
        {
          onSuccess: () => {
            toast.success("Sale voided successfully");
            reset();
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    } else if (action === "delete") {
      deleteSale.mutate(saleId, {
        onSuccess: () => {
          toast.success("Sale record deleted successfully");
          reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      });
    }
  }

  const isCancelledOrRefunded =
    sale.data && [SaleStatus.Cancelled, SaleStatus.Refunded].includes(sale.data.status);

  const canProcessReturn =
    canReturn &&
    sale.data &&
    !isCancelledOrRefunded &&
    sale.data.items.some((i) => (i.quantity - (i.returnedQuantity ?? 0)) > 0);

  const canVoid = canManage && sale.data && !isCancelledOrRefunded;

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
          ) : action ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5 shrink-0" />
                <h3 className="font-semibold text-base">
                  {action === "void" ? "Void Sale Transaction" : "Delete Sale Record"}
                </h3>
              </div>

              {action === "void" ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Voiding will restore all items to stock and reverse customer loyalty points. This action cannot be undone.
                  </p>
                  <Textarea
                    placeholder="Reason for voiding (required)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    autoFocus
                    className="text-xs"
                  />
                </>
              ) : (
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
              )}

              <DialogFooter className="shrink-0 flex-row justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setAction(null)}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={submitAction}
                  disabled={voidSale.isPending || deleteSale.isPending}
                >
                  {voidSale.isPending || deleteSale.isPending
                    ? "Processing..."
                    : action === "void"
                    ? "Confirm Void"
                    : "Confirm Delete"}
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
                    className="gap-1.5 text-xs h-8 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                    onClick={() => setReturnDialogOpen(true)}
                  >
                    <RotateCcw className="size-3.5" /> Return / Refund
                  </Button>
                )}

                {canVoid && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setAction("void")}
                  >
                    <Ban className="size-3.5" /> Void
                  </Button>
                )}

                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setAction("delete")}
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
