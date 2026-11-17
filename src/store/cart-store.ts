import { create } from "zustand";
import type { ProductDto } from "@/lib/types";

export type BillDiscountType = "fixed" | "percentage";

export interface CartLine {
  id: string;
  product: ProductDto;
  quantity: number;
  unitPrice: number; // Unit selling price = MRP (or retailPrice if MRP is not set)
  effectivePrice?: number; // Price after tier (Retail/Wholesale/Special) or manual price edit
  discountAmount: number; // Line discount = (unitPrice - effectivePrice) * quantity + any manual line discount
}

export interface Bill {
  id: string;
  label: string;
  lines: CartLine[];
  customerId: string | null;
  discountType: BillDiscountType; // "fixed" | "percentage"
  discountValue: number; // raw input value (e.g. 50 for Rs.50, or 10 for 10%)
  discountAmount: number; // computed monetary discount in Rs.
  loyaltyPointsToRedeem: number;
  notes: string;
}

interface CartState {
  bills: Bill[];
  activeBillId: string;
  addBill: () => void;
  switchBill: (billId: string) => void;
  closeBill: (billId: string) => void;
  addLine: (product: ProductDto, quantity: number, unitPrice: number) => void;
  removeLine: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  setUnitPrice: (lineId: string, unitPrice: number) => void;
  setLineDiscount: (lineId: string, discount: number) => void;
  setCustomerId: (customerId: string | null) => void;
  setDiscountType: (type: BillDiscountType) => void;
  setDiscountValue: (value: number) => void;
  setDiscountAmount: (amount: number) => void;
  setLoyaltyPointsToRedeem: (points: number) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
}

function newId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let billCounter = 1;

function newBill(): Bill {
  return {
    id: newId("bill"),
    label: `Bill ${billCounter++}`,
    lines: [],
    customerId: null,
    discountType: "fixed",
    discountValue: 0,
    discountAmount: 0,
    loyaltyPointsToRedeem: 0,
    notes: "",
  };
}

export const useCartStore = create<CartState>((set, get) => {
  const initialBill = newBill();

  function updateActiveBill(updater: (bill: Bill) => Bill) {
    const { bills, activeBillId } = get();
    set({ bills: bills.map((b) => (b.id === activeBillId ? updater(b) : b)) });
  }

  return {
    bills: [initialBill],
    activeBillId: initialBill.id,

    addBill: () => {
      const bill = newBill();
      set({ bills: [...get().bills, bill], activeBillId: bill.id });
    },

    switchBill: (billId) => {
      if (get().bills.some((b) => b.id === billId)) {
        set({ activeBillId: billId });
      }
    },

    closeBill: (billId) => {
      const { bills, activeBillId } = get();
      const remaining = bills.filter((b) => b.id !== billId);

      if (remaining.length === 0) {
        const bill = newBill();
        set({ bills: [bill], activeBillId: bill.id });
        return;
      }

      set({
        bills: remaining,
        activeBillId: activeBillId === billId ? remaining[0].id : activeBillId,
      });
    },

    addLine: (product, quantity, chosenPrice) => {
      if (product.stockQuantity <= 0 || quantity <= 0) return;

      // Unit selling price = MRP (falls back to retailPrice if MRP is not specified)
      const baseMrp = Math.max(product.mrp ?? product.retailPrice, chosenPrice);
      const effectivePrice = chosenPrice;
      const unitDiscount = Math.max(0, baseMrp - effectivePrice);

      updateActiveBill((bill) => {
        const existing = bill.lines.find(
          (l) => l.product.id === product.id && (l.effectivePrice ?? l.unitPrice) === effectivePrice,
        );

        if (existing) {
          const maxQty = Math.min(existing.quantity + quantity, product.stockQuantity);
          return {
            ...bill,
            lines: bill.lines.map((l) =>
              l.id === existing.id
                ? {
                    ...l,
                    quantity: maxQty,
                    unitPrice: baseMrp,
                    effectivePrice,
                    discountAmount: unitDiscount * maxQty,
                  }
                : l,
            ),
          };
        }

        const clampedQty = Math.min(quantity, product.stockQuantity);
        return {
          ...bill,
          lines: [
            ...bill.lines,
            {
              id: newId("line"),
              product,
              quantity: clampedQty,
              unitPrice: baseMrp,
              effectivePrice,
              discountAmount: unitDiscount * clampedQty,
            },
          ],
        };
      });
    },

    removeLine: (lineId) =>
      updateActiveBill((bill) => ({ ...bill, lines: bill.lines.filter((l) => l.id !== lineId) })),

    setQuantity: (lineId, quantity) =>
      updateActiveBill((bill) => ({
        ...bill,
        lines: bill.lines.map((l) => {
          if (l.id !== lineId) return l;
          const minQty = l.product.allowDecimalQuantity ? 0.01 : 1;
          const maxQty = l.product.stockQuantity;
          const clamped = Math.min(Math.max(minQty, quantity), maxQty);

          const effPrice = l.effectivePrice ?? (l.unitPrice - l.discountAmount / (l.quantity || 1));
          const unitDiscount = Math.max(0, l.unitPrice - effPrice);

          return {
            ...l,
            quantity: clamped,
            effectivePrice: effPrice,
            discountAmount: unitDiscount * clamped,
          };
        }),
      })),

    // Edit price: preserves Unit Selling Price = MRP, and recalculates discount = (MRP - newPrice) * qty
    setUnitPrice: (lineId, newSellingPrice) =>
      updateActiveBill((bill) => ({
        ...bill,
        lines: bill.lines.map((l) => {
          if (l.id !== lineId) return l;
          const targetPrice = Math.max(0, newSellingPrice);
          const baseMrp = Math.max(l.product.mrp ?? l.product.retailPrice, targetPrice);
          const unitDiscount = Math.max(0, baseMrp - targetPrice);

          return {
            ...l,
            unitPrice: baseMrp,
            effectivePrice: targetPrice,
            discountAmount: unitDiscount * l.quantity,
          };
        }),
      })),

    setLineDiscount: (lineId, discount) =>
      updateActiveBill((bill) => ({
        ...bill,
        lines: bill.lines.map((l) => (l.id === lineId ? { ...l, discountAmount: Math.max(0, discount) } : l)),
      })),

    setCustomerId: (customerId) =>
      updateActiveBill((bill) => ({ ...bill, customerId, loyaltyPointsToRedeem: 0 })),

    setDiscountType: (type) =>
      updateActiveBill((bill) => ({
        ...bill,
        discountType: type,
        discountValue: 0,
        discountAmount: 0,
      })),

    setDiscountValue: (value) =>
      updateActiveBill((bill) => {
        const cleanVal = Math.max(0, value);
        return {
          ...bill,
          discountValue: cleanVal,
          discountAmount: bill.discountType === "fixed" ? cleanVal : bill.discountAmount,
        };
      }),

    setDiscountAmount: (amount) =>
      updateActiveBill((bill) => {
        const cleanAmount = Math.max(0, amount);
        return {
          ...bill,
          discountType: "fixed",
          discountValue: cleanAmount,
          discountAmount: cleanAmount,
        };
      }),

    setLoyaltyPointsToRedeem: (points) =>
      updateActiveBill((bill) => ({ ...bill, loyaltyPointsToRedeem: Math.max(0, points) })),
    setNotes: (notes) => updateActiveBill((bill) => ({ ...bill, notes })),
    clear: () =>
      updateActiveBill((bill) => ({
        ...bill,
        lines: [],
        customerId: null,
        discountType: "fixed",
        discountValue: 0,
        discountAmount: 0,
        loyaltyPointsToRedeem: 0,
        notes: "",
      })),
  };
});

export function useActiveBill(): Bill {
  return useCartStore((s) => s.bills.find((b) => b.id === s.activeBillId) ?? s.bills[0]);
}
