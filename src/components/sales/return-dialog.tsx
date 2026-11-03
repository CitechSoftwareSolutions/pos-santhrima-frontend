"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  RotateCcw,
  Minus,
  Plus,
  AlertCircle,
  PackageCheck,
  CreditCard,
  Banknote,
  Building2,
  HelpCircle,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProcessReturn } from "@/lib/hooks/use-sales";
import { useStoreSettings } from "@/lib/hooks/use-settings";
import { printReturnSlip, type ReturnSlipItem } from "@/lib/receipt-printer";
import { formatCurrency, formatDate } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import { PaymentMethod, type SaleDto } from "@/lib/types";

interface ReturnDialogProps {
  sale: SaleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ItemReturnState {
  selected: boolean;
  quantity: number;
}

const RETURN_REASONS = [
  "Customer Changed Mind",
  "Wrong Item Purchased",
  "Damaged / Defective Product",
  "Expired / Quality Issue",
  "Incorrect Price / Promotion",
  "Other",
];

const REFUND_METHODS = [
  { value: PaymentMethod.Cash.toString(), label: "Cash", icon: Banknote, color: "text-emerald-600" },
  { value: PaymentMethod.Card.toString(), label: "Card", icon: CreditCard, color: "text-blue-600" },
  { value: PaymentMethod.StoreCredit.toString(), label: "Store Credit", icon: PackageCheck, color: "text-amber-600" },
  { value: PaymentMethod.BankTransfer.toString(), label: "Bank Transfer", icon: Building2, color: "text-purple-600" },
  { value: PaymentMethod.Other.toString(), label: "Other", icon: HelpCircle, color: "text-muted-foreground" },
];

const REASON_OPTIONS = RETURN_REASONS.map((r) => ({ value: r, label: r }));

export function ReturnDialog({
  sale,
  open,
  onOpenChange,
  onSuccess,
}: ReturnDialogProps) {
  const processReturn = useProcessReturn();
  const settingsQuery = useStoreSettings();

  const [itemStates, setItemStates] = useState<Record<string, ItemReturnState>>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [reasonCategory, setReasonCategory] = useState<string>("Customer Changed Mind");
  const [reasonNotes, setReasonNotes] = useState<string>("");

  // Initialize return state whenever sale changes or dialog opens
  useMemo(() => {
    if (!sale) return;
    const initial: Record<string, ItemReturnState> = {};
    const returnableItemsList = sale.items.filter(
      (i) => (i.quantity - (i.returnedQuantity ?? 0)) > 0
    );
    // If only 1 returnable item exists on this sale, pre-select it with its available quantity!
    const autoSelectSingle = returnableItemsList.length === 1;

    for (const item of sale.items) {
      const returnable = Math.max(0, item.quantity - (item.returnedQuantity ?? 0));
      const isSelected = autoSelectSingle && returnable > 0;
      initial[item.id] = {
        selected: isSelected,
        quantity: returnable > 0 ? (isSelected ? returnable : 1) : 0,
      };
    }
    setItemStates(initial);
    setReasonCategory("Customer Changed Mind");
    setReasonNotes("");
    setRefundMethod(PaymentMethod.Cash);
  }, [sale, open]);

  if (!sale) return null;

  // Calculate returnable info
  const returnableItems = sale.items.map((item) => {
    const soldQty = item.quantity;
    const returnedQty = item.returnedQuantity ?? 0;
    const availableQty = Math.max(0, soldQty - returnedQty);
    const effectiveUnitRate = soldQty > 0 ? item.lineTotal / soldQty : item.unitPrice;
    const state = itemStates[item.id] || { selected: false, quantity: 0 };
    const currentReturnQty = state.selected ? state.quantity : 0;

    let lineRefund = 0;
    if (state.selected && currentReturnQty > 0) {
      if (returnedQty === 0 && currentReturnQty === soldQty) {
        lineRefund = item.lineTotal;
      } else if (returnedQty + currentReturnQty === soldQty) {
        const previousRefunds = Math.round(effectiveUnitRate * returnedQty * 100) / 100;
        lineRefund = Math.max(0, item.lineTotal - previousRefunds);
      } else {
        lineRefund = Math.round(effectiveUnitRate * currentReturnQty * 100) / 100;
      }
    }

    return {
      ...item,
      soldQty,
      returnedQty,
      availableQty,
      effectiveUnitRate,
      isSelected: state.selected,
      returnQty: state.quantity,
      lineRefund,
    };
  });

  const selectedCount = returnableItems.filter((i) => i.isSelected && i.returnQty > 0).length;
  const totalRefundAmount = returnableItems.reduce((acc, i) => acc + i.lineRefund, 0);
  const allFullyReturned = returnableItems.every((i) => i.availableQty <= 0);

  function handleSelectAll() {
    const next: Record<string, ItemReturnState> = {};
    for (const item of returnableItems) {
      if (item.availableQty > 0) {
        next[item.id] = {
          selected: true,
          quantity: item.availableQty,
        };
      } else {
        next[item.id] = { selected: false, quantity: 0 };
      }
    }
    setItemStates(next);
  }

  function handleClearAll() {
    const next: Record<string, ItemReturnState> = {};
    for (const item of returnableItems) {
      next[item.id] = {
        selected: false,
        quantity: item.availableQty > 0 ? 1 : 0,
      };
    }
    setItemStates(next);
  }

  function toggleItem(id: string, checked: boolean) {
    const item = returnableItems.find((i) => i.id === id);
    if (!item || item.availableQty <= 0) return;

    setItemStates((prev) => ({
      ...prev,
      [id]: {
        selected: checked,
        quantity: checked
          ? (prev[id]?.quantity > 0 ? prev[id].quantity : item.availableQty)
          : 0,
      },
    }));
  }

  function setItemQty(id: string, qty: number) {
    const item = returnableItems.find((i) => i.id === id);
    if (!item) return;

    if (qty <= 0) {
      setItemStates((prev) => ({
        ...prev,
        [id]: { selected: false, quantity: 0 },
      }));
      return;
    }

    const clamped = Math.min(qty, item.availableQty);
    setItemStates((prev) => ({
      ...prev,
      [id]: {
        selected: true,
        quantity: clamped,
      },
    }));
  }

  function handleClose(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  async function submitReturn() {
    const itemsToReturn = returnableItems.filter((i) => i.isSelected && i.returnQty > 0);
    if (itemsToReturn.length === 0) {
      toast.error("Please select at least one item to return.");
      return;
    }

    const fullReason = reasonNotes.trim()
      ? `${reasonCategory}: ${reasonNotes.trim()}`
      : reasonCategory;

    const requestPayload = {
      items: itemsToReturn.map((i) => ({
        saleItemId: i.id,
        quantity: i.returnQty,
        reason: fullReason,
      })),
      refundPaymentMethod: refundMethod,
      reason: fullReason,
    };

    const slipItems: ReturnSlipItem[] = itemsToReturn.map((i) => ({
      productName: i.productName,
      quantity: i.returnQty,
      unitPrice: i.unitPrice,
      refundAmount: i.lineRefund,
    }));

    processReturn.mutate(
      { id: sale!.id, data: requestPayload },
      {
        onSuccess: () => {
          const methodLabel =
            REFUND_METHODS.find((m) => m.value === refundMethod.toString())?.label || "Cash";
          toast.success(
            `Return processed. Refund of ${formatCurrency(totalRefundAmount)} issued via ${methodLabel}. Printing return slip...`
          );
          // Print return slip directly without showing it on screen
          printReturnSlip(
            sale!,
            slipItems,
            totalRefundAmount,
            refundMethod,
            fullReason,
            { settings: settingsQuery.data }
          );
          onSuccess?.();
          handleClose(false);
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err));
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <RotateCcw className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Process Return / Refund</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Receipt #{sale.saleNumber} • {formatDate(sale.saleDate)} • {sale.customerName || "Walk-in Customer"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* RETURN SELECTION FORM */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {allFullyReturned ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm space-y-2">
                <AlertCircle className="size-6 text-amber-500 mx-auto" />
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  All items on this receipt have already been fully returned.
                </p>
                <p className="text-xs text-muted-foreground">
                  No further returns or refunds can be issued for this transaction.
                </p>
              </div>
            ) : (
              <>
                {/* ITEMS TABLE HEADER WITH QUICK SELECTION */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <PackageCheck className="size-4 text-primary" />
                    Select Items to Return
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={handleSelectAll}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 text-muted-foreground"
                      onClick={handleClearAll}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* ITEMS LIST */}
                <div className="space-y-2.5">
                  {returnableItems.map((item) => {
                    const isAvailable = item.availableQty > 0;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3.5 transition-colors ${
                          item.isSelected
                            ? "border-primary/50 bg-primary/5 shadow-xs"
                            : isAvailable
                            ? "bg-card hover:bg-muted/30"
                            : "opacity-60 bg-muted/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`item-${item.id}`}
                            checked={item.isSelected}
                            disabled={!isAvailable}
                            onCheckedChange={(checked) => toggleItem(item.id, Boolean(checked))}
                            className="mt-1"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <label
                                htmlFor={`item-${item.id}`}
                                className="font-semibold text-sm cursor-pointer hover:underline truncate"
                              >
                                {item.productName}
                              </label>
                              <div className="text-right text-xs">
                                <span className="font-semibold">
                                  {formatCurrency(item.unitPrice)}
                                </span>{" "}
                                <span className="text-muted-foreground">each</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
                              <span>Bought: {item.soldQty}</span>
                              {item.returnedQty > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  Already Returned: {item.returnedQty}
                                </span>
                              )}
                              <span className="font-medium">
                                Available to Return: {item.availableQty}
                              </span>
                            </div>

                            {/* QUANTITY STEPPER & REFUND SUB-TOTAL */}
                            {isAvailable && (
                              <div className="flex flex-wrap items-center justify-between gap-3 mt-2.5 pt-2 border-t border-border/50">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Return Qty:
                                  </span>
                                  <div className="flex items-center border rounded-md bg-background">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 rounded-none rounded-l-md"
                                      disabled={!item.isSelected || item.returnQty <= 0}
                                      onClick={() => setItemQty(item.id, item.returnQty - 1)}
                                    >
                                      <Minus className="size-3.5" />
                                    </Button>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={item.availableQty}
                                      value={item.isSelected ? item.returnQty : 0}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val)) setItemQty(item.id, val);
                                      }}
                                      className="w-14 h-7 text-center rounded-none border-x border-y-0 text-xs font-semibold focus-visible:ring-0"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 rounded-none rounded-r-md"
                                      disabled={item.returnQty >= item.availableQty}
                                      onClick={() =>
                                        setItemQty(item.id, (item.isSelected ? item.returnQty : 0) + 1)
                                      }
                                    >
                                      <Plus className="size-3.5" />
                                    </Button>
                                  </div>

                                  {item.availableQty > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="text-[11px] h-7 px-2"
                                      disabled={item.isSelected && item.returnQty === item.availableQty}
                                      onClick={() => setItemQty(item.id, item.availableQty)}
                                    >
                                      Max ({item.availableQty})
                                    </Button>
                                  )}
                                </div>

                                <div className="text-right">
                                  <span className="text-xs text-muted-foreground">Line Refund: </span>
                                  <span
                                    className={`text-sm font-bold ${
                                      item.isSelected
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {formatCurrency(item.lineRefund)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* RETURN OPTIONS: REFUND METHOD & REASON */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Banknote className="size-3.5 text-primary" />
                      Refund Method
                    </label>
                    <Select
                      items={REFUND_METHODS}
                      value={refundMethod.toString()}
                      onValueChange={(val) => {
                        if (val) setRefundMethod(parseInt(val, 10) as PaymentMethod);
                      }}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Select refund method">
                          {(val: string | null) => {
                            const match = REFUND_METHODS.find((m) => m.value === val);
                            if (!match) return "Cash";
                            const Icon = match.icon;
                            return (
                              <span className="flex items-center gap-2 truncate">
                                <Icon className={`size-4 ${match.color} shrink-0`} />
                                <span className="truncate">{match.label}</span>
                              </span>
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="min-w-44" align="start">
                        {REFUND_METHODS.map((m) => {
                          const Icon = m.icon;
                          return (
                            <SelectItem key={m.value} value={m.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`size-4 ${m.color} shrink-0`} />
                                <span>{m.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <HelpCircle className="size-3.5 text-primary" />
                      Return Reason
                    </label>
                    <Select
                      items={REASON_OPTIONS}
                      value={reasonCategory}
                      onValueChange={(val) => {
                        if (val) setReasonCategory(val);
                      }}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Select reason">
                          {(val: string | null) => (
                            <span className="truncate">{val || "Customer Changed Mind"}</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="min-w-64 max-w-sm" align="start">
                        {REASON_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="whitespace-normal py-1.5">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Additional notes / customer remarks (optional)
                  </label>
                  <Textarea
                    placeholder="Enter any specific details regarding this return..."
                    value={reasonNotes}
                    onChange={(e) => setReasonNotes(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                {/* SUMMARY CARD */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Selected items to return:</span>
                    <span className="font-semibold">{selectedCount} item(s)</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/50 pt-2 text-sm font-bold">
                    <span>TOTAL REFUND AMOUNT:</span>
                    <span className="text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">
                      {formatCurrency(totalRefundAmount)}
                    </span>
                  </div>
                </div>
              </>
            )}
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t flex-row items-center justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            className="gap-2 font-semibold"
            disabled={selectedCount === 0 || totalRefundAmount <= 0 || processReturn.isPending}
            onClick={submitReturn}
          >
            <RotateCcw className="size-4" />
            {processReturn.isPending
              ? "Processing..."
              : `Process Return (${formatCurrency(totalRefundAmount)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

