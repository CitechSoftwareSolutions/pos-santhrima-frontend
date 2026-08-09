import type { PriceTierDto, ProductDto } from "@/lib/types";

export type PriceKind = "retail" | "wholesale" | "special";

export const PRICE_KIND_LABELS: Record<PriceKind, string> = {
  retail: "Retail",
  wholesale: "Wholesale",
  special: "Special",
};

const QUANTITY_EPSILON = 1e-9;

/**
 * The product's base price for a given kind, used when no exact-quantity tier
 * matches. Wholesale/Special fall back to Retail when the product doesn't set
 * one.
 */
export function productBasePrice(product: ProductDto, kind: PriceKind): number {
  if (kind === "wholesale") return product.wholesalePrice ?? product.retailPrice;
  if (kind === "special") return product.specialPrice ?? product.retailPrice;
  return product.retailPrice;
}

/**
 * Mirrors the backend's PriceTierResolver: a tier only applies when the
 * quantity exactly equals its Quantity (not a threshold); otherwise the
 * product's base price for the given kind applies. Wholesale/Special fall
 * back to the tier's (or product's) Retail price when not set.
 */
export function resolveTieredPrice(
  product: ProductDto,
  quantity: number,
  kind: PriceKind = "retail",
): number {
  return resolveTieredPriceFromTiers(productBasePrice(product, kind), product.priceTiers, quantity, kind);
}

export function resolveTieredPriceFromTiers(
  basePrice: number,
  tiers: PriceTierDto[],
  quantity: number,
  kind: PriceKind = "retail",
): number {
  const tier = exactTierForQuantity(tiers, quantity);
  if (!tier) return basePrice;
  return tierPrice(tier, kind);
}

export function exactTierForQuantity(tiers: PriceTierDto[], quantity: number): PriceTierDto | null {
  return tiers.find((t) => Math.abs(t.quantity - quantity) < QUANTITY_EPSILON) ?? null;
}

export function tierPrice(tier: PriceTierDto, kind: PriceKind): number {
  if (kind === "wholesale") return tier.wholesalePrice ?? tier.retailPrice;
  if (kind === "special") return tier.specialPrice ?? tier.retailPrice;
  return tier.retailPrice;
}
