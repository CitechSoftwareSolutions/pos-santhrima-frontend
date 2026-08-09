import { PromotionType, type PromotionSummaryDto } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export function describePromotion(p: PromotionSummaryDto): string {
  switch (p.type) {
    case PromotionType.BuyXGetYFree:
      return `Buy ${p.buyQuantity} Get ${p.freeQuantity} Free`;
    case PromotionType.BulkPercentOff:
      return `${p.discountPercent}% off at ${p.minQuantity}+ units`;
    case PromotionType.FixedPriceBundle:
      return `${p.bundleQuantity} for ${formatCurrency(p.bundlePrice ?? 0)}`;
    default:
      return p.name;
  }
}

/**
 * Mirrors the backend's PromotionCalculator so the cart can preview the
 * automatic discount before the sale is submitted for authoritative pricing.
 */
export function calculatePromotionDiscount(
  promotion: PromotionSummaryDto,
  quantity: number,
  unitPrice: number,
): number {
  switch (promotion.type) {
    case PromotionType.BuyXGetYFree: {
      const buyQty = promotion.buyQuantity ?? 0;
      const freeQty = promotion.freeQuantity ?? 0;
      if (buyQty <= 0 || freeQty <= 0) return 0;
      const groupSize = buyQty + freeQty;
      const numGroups = Math.floor(quantity / groupSize);
      return numGroups * freeQty * unitPrice;
    }
    case PromotionType.BulkPercentOff: {
      const minQty = promotion.minQuantity ?? 0;
      const percent = promotion.discountPercent ?? 0;
      if (minQty <= 0 || percent <= 0 || quantity < minQty) return 0;
      return quantity * unitPrice * (percent / 100);
    }
    case PromotionType.FixedPriceBundle: {
      const bundleQty = promotion.bundleQuantity ?? 0;
      const bundlePrice = promotion.bundlePrice ?? 0;
      if (bundleQty <= 0) return 0;
      const numBundles = Math.floor(quantity / bundleQty);
      if (numBundles <= 0) return 0;
      const normalPrice = numBundles * bundleQty * unitPrice;
      return Math.max(0, normalPrice - numBundles * bundlePrice);
    }
    default:
      return 0;
  }
}
