"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Gift } from "lucide-react";
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
import { useActiveTerminal } from "@/lib/hooks/use-active-terminal";
import { useStoreSettings } from "@/lib/hooks/use-settings";
import { printReceipt } from "@/lib/receipt-printer";
import { evaluatePromotion } from "@/lib/promotion-utils";

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
  const { lines, customerId, discountAmount, loyaltyPointsToRedeem, notes } = activeBill;
  const closeBill = useCartStore((s) => s.closeBill);
  const createSale = useCreateSale();
  const { activeTerminal } = useActiveTerminal();
  const settingsQuery = useStoreSettings();

  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [amount, setAmount] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMethod(PaymentMethod.Cash);
      setAmount(totalAmount >= 0 ? totalAmount.toFixed(2) : "0.00");
    }
  }

  const amountPaid = parseFloat(amount) || 0;
  const changeDue = Math.max(0, amountPaid - totalAmount);

  const activePromotions = useMemo(() => {
    return lines
      .filter((l) => l.product.activePromotion)
      .map((l) =>
        evaluatePromotion(
          l.product.activePromotion,
          l.product.name,
          l.quantity,
          l.unitPrice,
        ),
      )
      .filter((e) => e.isMet);
  }, [lines]);

  function handleConfirm() {
    if (totalAmount > 0 && amountPaid <= 0) {
      toast.error("Enter a payment amount.");
      return;
    }

    const billId = activeBill.id;

    const rawSubTotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
    const safePoints = Math.min(loyaltyPointsToRedeem || 0, Math.max(0, rawSubTotal - discountAmount));

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
        loyaltyPointsRedeemed: safePoints,
        notes: notes || null,
        terminalId: activeTerminal?.id ?? null,
      },
      {
        onSuccess: (sale) => {
          toast.success(`Sale ${sale.saleNumber} completed`);
          closeBill(billId);
          onOpenChange(false);
          const shouldPrint = activeTerminal?.autoPrintReceipt ?? true;
          if (shouldPrint) {
            printReceipt(sale, { settings: settingsQuery.data, terminal: activeTerminal });
          }
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  const earnedPointsEstimate = customerId ? Math.round(totalAmount * 0.001 * 100) / 100 : 0;

  const handleConfirmRef = useRef(handleConfirm);
  handleConfirmRef.current = handleConfirm;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirmRef.current();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Payment</DialogTitle>
            <DialogDescription>Total due: {formatCurrency(totalAmount)}</DialogDescription>
          </DialogHeader>

          {activePromotions.some((p) => p.freeQuantity > 0) && (
            <div className="space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <div className="font-semibold flex items-center gap-1.5">
                <Gift className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Active Promotion Reminder:</span>
              </div>
              {activePromotions
                .filter((p) => p.freeQuantity > 0)
                .map((p, idx) => (
                  <div key={idx} className="pl-5 text-[11px] leading-tight">
                    • Give {p.freeQuantity} free {p.productName} under {p.promotionName}
                    {p.promotionDescription ? ` - ${p.promotionDescription}` : ""}
                  </div>
                ))}
            </div>
          )}

          {loyaltyPointsToRedeem > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
              <span>Royalty Points Discount:</span>
              <span className="font-bold">
                -{formatCurrency(loyaltyPointsToRedeem)} ({loyaltyPointsToRedeem.toFixed(2)} pts)
              </span>
            </div>
          )}

          {customerId && earnedPointsEstimate > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Points to be earned (0.001 rate):</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{earnedPointsEstimate.toFixed(2)} pts
              </span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                items={METHOD_OPTIONS.map((m) => ({
                  value: String(m),
                  label: PaymentMethodLabels[m],
                }))}
                value={String(method)}
                onValueChange={(v) => {
                  if (v) setMethod(Number(v) as PaymentMethod);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(val: string | null) =>
                      val != null && Number(val) in PaymentMethodLabels
                        ? PaymentMethodLabels[Number(val) as PaymentMethod]
                        : val
                    }
                  </SelectValue>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel [Esc]
            </Button>
            <Button onClick={handleConfirm} disabled={createSale.isPending}>
              {createSale.isPending ? "Processing..." : "Complete Sale [Enter]"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
