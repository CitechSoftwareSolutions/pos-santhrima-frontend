import type { PriceTierDto, ProductDto } from "@/lib/types";

export type PriceKind = "mrp" | "retail" | "wholesale" | "special";

export const PRICE_KIND_LABELS: Record<PriceKind, string> = {
  mrp: "MRP",
  retail: "Retail",
  wholesale: "Wholesale",
  special: "Special",
};

const QUANTITY_EPSILON = 1e-9;

/**
 * Returns the effective selling price (MRP) for a product.
 */
export function getProductSellingPrice(product: ProductDto): number {
  return product.mrp ?? product.retailPrice;
}

/**
 * The product's base price for a given kind, used when no exact-quantity tier
 * matches. MRP is the default selling price.
 */
export function productBasePrice(product: ProductDto, kind: PriceKind = "mrp"): number {
  if (kind === "mrp") return product.mrp ?? product.retailPrice;
  if (kind === "retail") return product.retailPrice;
  if (kind === "wholesale") return product.wholesalePrice ?? product.retailPrice;
  if (kind === "special") return product.specialPrice ?? product.retailPrice;
  return product.mrp ?? product.retailPrice;
}

/**
 * Mirrors the backend's PriceTierResolver: a tier only applies when the
 * quantity exactly equals its Quantity (not a threshold); otherwise the
 * product's base price for the given kind applies.
 */
export function resolveTieredPrice(
  product: ProductDto,
  quantity: number,
  kind: PriceKind = "mrp",
): number {
  return resolveTieredPriceFromTiers(productBasePrice(product, kind), product.priceTiers, quantity, kind);
}

export function resolveTieredPriceFromTiers(
  basePrice: number,
  tiers: PriceTierDto[],
  quantity: number,
  kind: PriceKind = "mrp",
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
