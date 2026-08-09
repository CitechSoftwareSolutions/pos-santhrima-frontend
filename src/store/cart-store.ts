import { create } from "zustand";
import type { ProductDto } from "@/lib/types";

export interface CartLine {
  id: string;
  product: ProductDto;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

export interface Bill {
  id: string;
  label: string;
  lines: CartLine[];
  customerId: string | null;
  discountAmount: number;
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
  setDiscountAmount: (amount: number) => void;
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
    discountAmount: 0,
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

    addLine: (product, quantity, unitPrice) => {
      if (product.stockQuantity <= 0 || quantity <= 0) return;
      updateActiveBill((bill) => {
        const existing = bill.lines.find(
          (l) => l.product.id === product.id && l.unitPrice === unitPrice,
        );

        if (existing) {
          const maxQty = Math.min(existing.quantity + quantity, product.stockQuantity);
          return {
            ...bill,
            lines: bill.lines.map((l) => (l.id === existing.id ? { ...l, quantity: maxQty } : l)),
          };
        }

        return {
          ...bill,
          lines: [
            ...bill.lines,
            {
              id: newId("line"),
              product,
              quantity: Math.min(quantity, product.stockQuantity),
              unitPrice,
              discountAmount: 0,
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
          return { ...l, quantity: Math.max(minQty, Math.min(quantity, l.product.stockQuantity)) };
        }),
      })),

    setUnitPrice: (lineId, unitPrice) =>
      updateActiveBill((bill) => ({
        ...bill,
        lines: bill.lines.map((l) => (l.id === lineId ? { ...l, unitPrice: Math.max(0, unitPrice) } : l)),
      })),

    setLineDiscount: (lineId, discount) =>
      updateActiveBill((bill) => ({
        ...bill,
        lines: bill.lines.map((l) => (l.id === lineId ? { ...l, discountAmount: Math.max(0, discount) } : l)),
      })),

    setCustomerId: (customerId) => updateActiveBill((bill) => ({ ...bill, customerId })),
    setDiscountAmount: (amount) =>
      updateActiveBill((bill) => ({ ...bill, discountAmount: Math.max(0, amount) })),
    setNotes: (notes) => updateActiveBill((bill) => ({ ...bill, notes })),
    clear: () =>
      updateActiveBill((bill) => ({ ...bill, lines: [], customerId: null, discountAmount: 0, notes: "" })),
  };
});

export function useActiveBill(): Bill {
  return useCartStore((s) => s.bills.find((b) => b.id === s.activeBillId) ?? s.bills[0]);
}
