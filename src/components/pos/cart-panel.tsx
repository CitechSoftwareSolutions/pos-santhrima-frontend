"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Tag,
  Pencil,
  X,
  Award,
  Gift,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustomerLoyaltyHistoryDialog } from "@/components/customers/loyalty-history-dialog";
import { useActiveBill, useCartStore } from "@/store/cart-store";
import { useClaimMilestoneGift, useCustomer } from "@/lib/hooks/use-customers";
import { CustomerPicker } from "./customer-picker";
import { PaymentDialog } from "./payment-dialog";
import { calculateCartTotals, calculateLinePromotionDiscount } from "@/lib/cart-calc";
import { describePromotion } from "@/lib/promotion-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/client";

function BillTabs() {
  const bills = useCartStore((s) => s.bills);
  const activeBillId = useCartStore((s) => s.activeBillId);
  const addBill = useCartStore((s) => s.addBill);
  const switchBill = useCartStore((s) => s.switchBill);
  const closeBill = useCartStore((s) => s.closeBill);
  const [closeTarget, setCloseTarget] = useState<string | null>(null);

  const targetBill = bills.find((b) => b.id === closeTarget) ?? null;

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto border-b bg-muted/30 p-2">
        {bills.map((bill) => (
          <button
            key={bill.id}
            type="button"
            onClick={() => switchBill(bill.id)}
            className={cn(
              "group flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
              bill.id === activeBillId
                ? "border-primary bg-background text-foreground"
                : "border-transparent text-muted-foreground hover:bg-background/60",
            )}
          >
            {bill.label}
            {bill.lines.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                {bill.lines.length}
              </span>
            )}
            {bills.length > 1 && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  if (bill.lines.length > 0) {
                    setCloseTarget(bill.id);
                  } else {
                    closeBill(bill.id);
                  }
                }}
                className="rounded-sm opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <X className="size-3" />
              </span>
            )}
          </button>
        ))}
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={addBill} title="New bill">
          <Plus className="size-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={!!closeTarget}
        onOpenChange={(o) => !o && setCloseTarget(null)}
        title={`Close ${targetBill?.label ?? "bill"}?`}
        description="This bill has items in it. Closing it will discard them permanently."
        confirmLabel="Close bill"
        onConfirm={() => {
          if (closeTarget) closeBill(closeTarget);
          setCloseTarget(null);
        }}
      />
    </>
  );
}

export function CartPanel() {
  const activeBill = useActiveBill();
  const { lines, customerId, discountAmount, loyaltyPointsToRedeem } = activeBill;
  const removeLine = useCartStore((s) => s.removeLine);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const setUnitPrice = useCartStore((s) => s.setUnitPrice);
  const setCustomerId = useCartStore((s) => s.setCustomerId);
  const setDiscountAmount = useCartStore((s) => s.setDiscountAmount);
  const setLoyaltyPointsToRedeem = useCartStore((s) => s.setLoyaltyPointsToRedeem);

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [quantityDraft, setQuantityDraft] = useState<{ id: string; value: string } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const customerQuery = useCustomer(customerId);
  const customer = customerQuery.data;
  const claimGift = useClaimMilestoneGift();

  function commitPrice(lineId: string) {
    const n = parseFloat(editingPriceValue);
    if (!Number.isNaN(n) && n >= 0) setUnitPrice(lineId, n);
    setEditingPriceId(null);
  }

  function handleClaimGift() {
    if (!customer) return;
    claimGift.mutate(customer.id, {
      onSuccess: () => {
        setLoyaltyPointsToRedeem(0);
        toast.success("Milestone gift claimed! Royalty points reset to zero.");
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  const rawSubTotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  const maxRedeemablePoints = customer?.canRedeemPoints
    ? Math.min(customer.loyaltyPoints, Math.max(0, rawSubTotal - discountAmount))
    : 0;
  const effectivePointsDiscount = Math.min(loyaltyPointsToRedeem || 0, maxRedeemablePoints);
  const totals = calculateCartTotals(lines, discountAmount + effectivePointsDiscount);

  return (
    <div className="flex h-full max-h-full flex-col rounded-xl border bg-background overflow-hidden shadow-sm">
      <div className="shrink-0 flex items-center justify-between p-3 pb-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="size-4" /> {activeBill.label}
        </h2>
        <span className="text-xs text-muted-foreground">{lines.length} item(s)</span>
      </div>

      <div className="shrink-0">
        <BillTabs />
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
        <div className="border-b p-3 space-y-2">
          <CustomerPicker customerId={customerId} onChange={(c) => setCustomerId(c?.id ?? null)} />

          {customer && (
            <div className="rounded-lg border bg-amber-500/5 border-amber-500/20 p-2.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Award className="size-3.5 text-amber-600 dark:text-amber-400" /> Royalty Points
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
                  title="View points ledger"
                >
                  ★ {customer.loyaltyPoints.toFixed(2)} pts ({formatCurrency(customer.loyaltyPoints)})
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Purchases: <strong className="text-foreground">{formatCurrency(customer.totalPurchases)}</strong>
                </span>
                <span>
                  {customer.milestoneTier > 0 ? (
                    <span className="font-medium text-primary">
                      Tier {customer.milestoneTier} ({customer.milestoneTier * 75}k)
                    </span>
                  ) : (
                    "Below 75k"
                  )}
                </span>
              </div>

              {customer.canRedeemPoints && customer.loyaltyPoints > 0 ? (
                <div className="flex items-center justify-between gap-2 rounded bg-amber-500/15 p-2 text-[11px] text-amber-900 dark:text-amber-200">
                  <div className="min-w-0">
                    <span className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                      <Gift className="size-3.5 text-amber-600 shrink-0" /> Milestone Reward Available!
                    </span>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                      {customer.loyaltyPoints.toFixed(2)} pts available (Rs. {customer.loyaltyPoints.toFixed(2)})
                    </p>
                  </div>
                  {lines.length > 0 ? (
                    <Button
                      size="sm"
                      type="button"
                      className={cn(
                        "h-6 px-2 text-[10px] shrink-0 font-medium",
                        effectivePointsDiscount > 0
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          : "bg-amber-600 hover:bg-amber-700 text-white"
                      )}
                      onClick={() => {
                        if (effectivePointsDiscount > 0) {
                          setLoyaltyPointsToRedeem(0);
                        } else {
                          setLoyaltyPointsToRedeem(maxRedeemablePoints);
                        }
                      }}
                    >
                      {effectivePointsDiscount > 0 ? "Remove" : "Apply to Bill"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      type="button"
                      className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white shrink-0 font-medium"
                      disabled={claimGift.isPending}
                      onClick={handleClaimGift}
                    >
                      {claimGift.isPending ? "Claiming..." : "Claim Gift"}
                    </Button>
                  )}
                </div>
              ) : !customer.canRedeemPoints ? (
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Lock className="size-3 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    Points unlock at Rs. {customer.nextMilestoneAmount.toLocaleString()} purchases (
                    {formatCurrency(customer.amountToNextMilestone)} needed)
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                  <span>Next milestone unlock at Rs. {customer.nextMilestoneAmount.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <ShoppingCart className="size-8" />
            <p className="text-sm">Cart is empty. Select products to begin.</p>
          </div>
        ) : (
          <div className="divide-y">
            {lines.map((line) => {
              const step = line.product.allowDecimalQuantity ? 0.1 : 1;
              const promotionDiscount = calculateLinePromotionDiscount(line);
              const lineTotal = line.unitPrice * line.quantity - line.discountAmount - promotionDiscount;
              const isEditingPrice = editingPriceId === line.id;

              return (
                <div key={line.id} className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.product.name}</p>
                    {isEditingPrice ? (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        autoFocus
                        className="mt-0.5 h-6 w-24 text-xs"
                        value={editingPriceValue}
                        onChange={(e) => setEditingPriceValue(e.target.value)}
                        onBlur={() => commitPrice(line.id)}
                        onKeyDown={(e) => e.key === "Enter" && commitPrice(line.id)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPriceValue(String(line.unitPrice));
                          setEditingPriceId(line.id);
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {formatCurrency(line.unitPrice)} / {line.product.unit}
                        <Pencil className="size-2.5" />
                      </button>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6"
                        onClick={() => setQuantity(line.id, line.quantity - step)}
                        disabled={line.quantity <= step}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <Input
                        type="number"
                        step={step}
                        className="h-6 w-16 text-center px-1 text-xs"
                        value={quantityDraft?.id === line.id ? quantityDraft.value : line.quantity}
                        onFocus={() => setQuantityDraft({ id: line.id, value: String(line.quantity) })}
                        onChange={(e) => {
                          setQuantityDraft({ id: line.id, value: e.target.value });
                          const n = parseFloat(e.target.value);
                          if (!Number.isNaN(n) && n > 0) setQuantity(line.id, n);
                        }}
                        onBlur={() => setQuantityDraft(null)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6"
                        onClick={() => setQuantity(line.id, line.quantity + step)}
                        disabled={line.quantity >= line.product.stockQuantity}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    {promotionDiscount > 0 && line.product.activePromotion && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 min-w-0">
                        <Tag className="size-3 shrink-0" />
                        <span className="truncate">
                          {describePromotion(line.product.activePromotion)} · -
                          {formatCurrency(promotionDiscount)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-semibold">{formatCurrency(lineTotal)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(line.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="shrink-0 space-y-2 border-t p-3 bg-card shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(totals.subTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Discount</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              className="h-7 w-24 text-right text-xs"
              value={discountAmount || ""}
              placeholder="0.00"
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {customer && customer.canRedeemPoints && customer.loyaltyPoints > 0 && lines.length > 0 && (
          <div className="flex items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-400">
            <span className="flex items-center gap-1 font-medium truncate">
              <Award className="size-3.5 text-amber-600 shrink-0" />
              Redeem Points ({customer.loyaltyPoints.toFixed(2)} available)
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                min={0}
                max={maxRedeemablePoints}
                step="0.01"
                className="h-7 w-20 text-right text-xs"
                value={effectivePointsDiscount || ""}
                placeholder="0.00"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLoyaltyPointsToRedeem(Math.min(maxRedeemablePoints, Math.max(0, val)));
                }}
              />
              <Button
                type="button"
                variant={effectivePointsDiscount > 0 ? "secondary" : "outline"}
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => {
                  if (effectivePointsDiscount > 0) {
                    setLoyaltyPointsToRedeem(0);
                  } else {
                    setLoyaltyPointsToRedeem(maxRedeemablePoints);
                  }
                }}
              >
                {effectivePointsDiscount > 0 ? "Clear" : "Max"}
              </Button>
            </div>
          </div>
        )}

        {effectivePointsDiscount > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-medium">
            <span>Points Discount (1 pt = Rs. 1)</span>
            <span>-{formatCurrency(effectivePointsDiscount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(totals.itemTax)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(totals.totalAmount)}</span>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={lines.length === 0}
          onClick={() => setPaymentOpen(true)}
        >
          Charge {formatCurrency(totals.totalAmount)}
        </Button>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        totalAmount={totals.totalAmount}
      />

      <CustomerLoyaltyHistoryDialog
        customer={customer ?? null}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}

