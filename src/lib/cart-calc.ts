import type { CartLine } from "@/store/cart-store";
import { calculatePromotionDiscount } from "@/lib/promotion-utils";

export interface CartTotals {
  subTotal: number;
  itemTax: number;
  itemDiscount: number;
  totalDiscount: number;
  totalAmount: number;
}

export function calculateLinePromotionDiscount(line: CartLine): number {
  if (!line.product.activePromotion) return 0;
  return calculatePromotionDiscount(line.product.activePromotion, line.quantity, line.unitPrice);
}

export function calculateCartTotals(lines: CartLine[], overallDiscount: number): CartTotals {
  let subTotal = 0;
  let itemTax = 0;
  let itemDiscount = 0;

  for (const line of lines) {
    const baseAmount = line.unitPrice * line.quantity;
    const promotionDiscount = calculateLinePromotionDiscount(line);
    const combinedDiscount = line.discountAmount + promotionDiscount;
    const taxableAmount = baseAmount - combinedDiscount;
    const taxAmount = Math.round(taxableAmount * (line.product.taxRate / 100) * 100) / 100;

    subTotal += baseAmount;
    itemTax += taxAmount;
    itemDiscount += combinedDiscount;
  }

  const totalDiscount = itemDiscount + overallDiscount;
  const totalAmount = Math.max(0, subTotal - totalDiscount + itemTax);

  return { subTotal, itemTax, itemDiscount, totalDiscount, totalAmount };
}
