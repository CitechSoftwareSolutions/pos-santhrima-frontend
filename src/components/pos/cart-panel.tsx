"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart, Tag, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useActiveBill, useCartStore } from "@/store/cart-store";
import { CustomerPicker } from "./customer-picker";
import { PaymentDialog } from "./payment-dialog";
import { calculateCartTotals, calculateLinePromotionDiscount } from "@/lib/cart-calc";
import { describePromotion } from "@/lib/promotion-utils";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const { lines, customerId, discountAmount } = activeBill;
  const removeLine = useCartStore((s) => s.removeLine);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const setUnitPrice = useCartStore((s) => s.setUnitPrice);
  const setCustomerId = useCartStore((s) => s.setCustomerId);
  const setDiscountAmount = useCartStore((s) => s.setDiscountAmount);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [quantityDraft, setQuantityDraft] = useState<{ id: string; value: string } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  function commitPrice(lineId: string) {
    const n = parseFloat(editingPriceValue);
    if (!Number.isNaN(n) && n >= 0) setUnitPrice(lineId, n);
    setEditingPriceId(null);
  }

  const totals = calculateCartTotals(lines, discountAmount);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-background">
      <div className="flex items-center justify-between p-3 pb-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="size-4" /> {activeBill.label}
        </h2>
        <span className="text-xs text-muted-foreground">{lines.length} item(s)</span>
      </div>

      <BillTabs />

      <div className="border-b p-3">
        <CustomerPicker customerId={customerId} onChange={(c) => setCustomerId(c?.id ?? null)} />
      </div>

      <ScrollArea className="flex-1">
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
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <Tag className="size-3" />
                        <span>
                          {describePromotion(line.product.activePromotion)} · -
                          {formatCurrency(promotionDiscount)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
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

      <div className="space-y-2 border-t p-3">
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

      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} totalAmount={totals.totalAmount} />
    </div>
  );
}
