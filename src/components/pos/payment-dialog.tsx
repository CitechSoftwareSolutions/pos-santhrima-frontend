"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveBill, useCartStore } from "@/store/cart-store";
import { useCreateSale } from "@/lib/hooks/use-sales";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import { PaymentMethod, PaymentMethodLabels, type SaleDto } from "@/lib/types";
import { ReceiptDialog } from "./receipt-dialog";

const METHOD_OPTIONS = [
  PaymentMethod.Cash,
  PaymentMethod.Card,
  PaymentMethod.MobilePayment,
  PaymentMethod.BankTransfer,
  PaymentMethod.StoreCredit,
  PaymentMethod.Other,
];

export function PaymentDialog({
  open,
  onOpenChange,
  totalAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
}) {
  const activeBill = useActiveBill();
  const { lines, customerId, discountAmount, notes } = activeBill;
  const closeBill = useCartStore((s) => s.closeBill);
  const createSale = useCreateSale();

  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [amount, setAmount] = useState("");
  const [completedSale, setCompletedSale] = useState<SaleDto | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMethod(PaymentMethod.Cash);
      setAmount(totalAmount > 0 ? totalAmount.toFixed(2) : "");
    }
  }

  const amountPaid = parseFloat(amount) || 0;
  const changeDue = Math.max(0, amountPaid - totalAmount);

  function handleConfirm() {
    if (amountPaid <= 0) {
      toast.error("Enter a payment amount.");
      return;
    }

    const billId = activeBill.id;

    createSale.mutate(
      {
        customerId,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          discountAmount: l.discountAmount,
          unitPrice: l.unitPrice,
        })),
        payments: [{ method, amount: amountPaid, referenceNumber: null }],
        discountAmount,
        notes: notes || null,
      },
      {
        onSuccess: (sale) => {
          toast.success(`Sale ${sale.saleNumber} completed`);
          setCompletedSale(sale);
          closeBill(billId);
          onOpenChange(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Payment</DialogTitle>
            <DialogDescription>Total due: {formatCurrency(totalAmount)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={String(method)}
                onValueChange={(v) => {
                  if (v) setMethod(Number(v) as PaymentMethod);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {PaymentMethodLabels[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount Received</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex gap-2">
                {[totalAmount, Math.ceil(totalAmount / 10) * 10, Math.ceil(totalAmount / 50) * 50].map(
                  (v, i) =>
                    v > 0 && (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(v.toFixed(2))}
                      >
                        {formatCurrency(v)}
                      </Button>
                    ),
                )}
              </div>
            </div>

            {method === PaymentMethod.Cash && (
              <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Change due</span>
                <span className="text-base font-semibold">{formatCurrency(changeDue)}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={createSale.isPending}>
              {createSale.isPending ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptDialog
        sale={completedSale}
        open={!!completedSale}
        onOpenChange={(o) => {
          if (!o) {
            setCompletedSale(null);
          }
        }}
      />
    </>
  );
}
