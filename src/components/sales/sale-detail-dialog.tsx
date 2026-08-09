"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, Printer, RotateCcw } from "lucide-react";
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
import { useSale, useVoidSale, useRefundSale } from "@/lib/hooks/use-sales";
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
  const voidSale = useVoidSale();
  const refundSale = useRefundSale();
  const canManage = useAuthStore((s) => s.hasRole(ROLES.Admin, ROLES.Manager));

  const [action, setAction] = useState<"void" | "refund" | null>(null);
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
    if (!saleId || !reason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }

    if (action === "void") {
      voidSale.mutate(
        { id: saleId, reason },
        {
          onSuccess: () => {
            toast.success("Sale voided");
            reset();
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    } else if (action === "refund") {
      refundSale.mutate(
        { id: saleId, saleItemIds: null, reason },
        {
          onSuccess: () => {
            toast.success("Sale refunded");
            reset();
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    }
  }

  const canVoidOrRefund =
    canManage && sale.data && ![SaleStatus.Cancelled, SaleStatus.Refunded].includes(sale.data.status);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">Sale details</DialogTitle>
        </DialogHeader>

        {sale.isLoading || !sale.data ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : action ? (
          <div className="space-y-4">
            <p className="text-sm">
              {action === "void" ? "Void this sale?" : "Refund this sale?"} This action cannot be undone.
            </p>
            <Textarea
              placeholder="Reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAction(null)}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={submitAction}
                disabled={voidSale.isPending || refundSale.isPending}
              >
                {voidSale.isPending || refundSale.isPending ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div id="receipt-print-area">
              <ReceiptView sale={sale.data} />
            </div>
            <DialogFooter className="flex-wrap gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" /> Print
              </Button>
              {canVoidOrRefund && (
                <>
                  <Button variant="outline" onClick={() => setAction("refund")}>
                    <RotateCcw className="size-4" /> Refund
                  </Button>
                  <Button variant="destructive" onClick={() => setAction("void")}>
                    <Ban className="size-4" /> Void
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
