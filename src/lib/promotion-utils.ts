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

export interface PromotionEvaluation {
  isMet: boolean;
  freeQuantity: number;
  discountAmount: number;
  message: string;
  promotionName: string;
  promotionDescription: string | null;
  productName: string;
  type: PromotionType;
}

/**
 * Evaluates whether an active promotion criteria is met for a given line item.
 * Strictly plain text messages (no emojis).
 */
export function evaluatePromotion(
  promotion: PromotionSummaryDto | null | undefined,
  productName: string,
  quantity: number,
  unitPrice: number,
): PromotionEvaluation {
  if (!promotion || quantity <= 0) {
    return {
      isMet: false,
      freeQuantity: 0,
      discountAmount: 0,
      message: "",
      promotionName: "",
      promotionDescription: null,
      productName,
      type: promotion?.type ?? PromotionType.BuyXGetYFree,
    };
  }

  const promoLabel = promotion.description
    ? `${promotion.name} - ${promotion.description}`
    : promotion.name;

  switch (promotion.type) {
    case PromotionType.BuyXGetYFree: {
      const buyQty = promotion.buyQuantity ?? 0;
      const freeQty = promotion.freeQuantity ?? 0;
      if (buyQty <= 0 || freeQty <= 0 || quantity < buyQty) {
        return {
          isMet: false,
          freeQuantity: 0,
          discountAmount: 0,
          message: "",
          promotionName: promotion.name,
          promotionDescription: promotion.description ?? null,
          productName,
          type: promotion.type,
        };
      }

      const sets = Math.floor(quantity / buyQty);
      const totalFree = sets * freeQty;
      const discount = totalFree * unitPrice;
      const msg = `Give ${totalFree} free ${productName} under the ${promoLabel}`;

      return {
        isMet: true,
        freeQuantity: totalFree,
        discountAmount: discount,
        message: msg,
        promotionName: promotion.name,
        promotionDescription: promotion.description ?? null,
        productName,
        type: promotion.type,
      };
    }

    case PromotionType.BulkPercentOff: {
      const minQty = promotion.minQuantity ?? 0;
      const percent = promotion.discountPercent ?? 0;
      if (minQty <= 0 || percent <= 0 || quantity < minQty) {
        return {
          isMet: false,
          freeQuantity: 0,
          discountAmount: 0,
          message: "",
          promotionName: promotion.name,
          promotionDescription: promotion.description ?? null,
          productName,
          type: promotion.type,
        };
      }

      const discount = Math.round(quantity * unitPrice * (percent / 100) * 100) / 100;
      const msg = `${promoLabel}: ${percent}% bulk discount applied`;

      return {
        isMet: true,
        freeQuantity: 0,
        discountAmount: discount,
        message: msg,
        promotionName: promotion.name,
        promotionDescription: promotion.description ?? null,
        productName,
        type: promotion.type,
      };
    }

    case PromotionType.FixedPriceBundle: {
      const bundleQty = promotion.bundleQuantity ?? 0;
      const bundlePrice = promotion.bundlePrice ?? 0;
      if (bundleQty <= 0 || quantity < bundleQty) {
        return {
          isMet: false,
          freeQuantity: 0,
          discountAmount: 0,
          message: "",
          promotionName: promotion.name,
          promotionDescription: promotion.description ?? null,
          productName,
          type: promotion.type,
        };
      }

      const numBundles = Math.floor(quantity / bundleQty);
      if (numBundles <= 0) {
        return {
          isMet: false,
          freeQuantity: 0,
          discountAmount: 0,
          message: "",
          promotionName: promotion.name,
          promotionDescription: promotion.description ?? null,
          productName,
          type: promotion.type,
        };
      }

      const normalPrice = numBundles * bundleQty * unitPrice;
      const discount = Math.max(0, normalPrice - numBundles * bundlePrice);
      const msg = `${promoLabel}: Bundle price applied`;

      return {
        isMet: true,
        freeQuantity: 0,
        discountAmount: discount,
        message: msg,
        promotionName: promotion.name,
        promotionDescription: promotion.description ?? null,
        productName,
        type: promotion.type,
      };
    }

    default:
      return {
        isMet: false,
        freeQuantity: 0,
        discountAmount: 0,
        message: "",
        promotionName: promotion.name,
        promotionDescription: promotion.description ?? null,
        productName,
        type: promotion.type,
      };
  }
}

/**
 * Computes the line price discount (for bulk percent and bundles).
 * BuyXGetYFree gives free items rather than cash discounts on purchased items.
 */
export function calculatePromotionDiscount(
  promotion: PromotionSummaryDto,
  quantity: number,
  unitPrice: number,
): number {
  switch (promotion.type) {
    case PromotionType.BuyXGetYFree: {
      return 0;
    }
    case PromotionType.BulkPercentOff: {
      const minQty = promotion.minQuantity ?? 0;
      const percent = promotion.discountPercent ?? 0;
      if (minQty <= 0 || percent <= 0 || quantity < minQty) return 0;
      return Math.round(quantity * unitPrice * (percent / 100) * 100) / 100;
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
