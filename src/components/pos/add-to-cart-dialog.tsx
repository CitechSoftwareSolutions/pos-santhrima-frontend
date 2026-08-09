"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import {
  exactTierForQuantity,
  PRICE_KIND_LABELS,
  productBasePrice,
  resolveTieredPrice,
  tierPrice,
  type PriceKind,
} from "@/lib/price-tier-utils";
import { describePromotion, calculatePromotionDiscount } from "@/lib/promotion-utils";
import { cn } from "@/lib/utils";
import type { ProductDto } from "@/lib/types";

const PRICE_KINDS: PriceKind[] = ["retail", "wholesale", "special"];

export function AddToCartDialog({
  product,
  onOpenChange,
  onConfirm,
}: {
  product: ProductDto | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (quantity: number, unitPrice: number) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [priceKind, setPriceKind] = useState<PriceKind>("retail");

  const open = !!product;

  useEffect(() => {
    if (!product) return;
    setQuantity("1");
    setPriceTouched(false);
    setPriceKind("retail");
    setUnitPrice(String(resolveTieredPrice(product, 1, "retail")));
  }, [product]);

  useEffect(() => {
    if (!product || priceTouched) return;
    const qty = parseFloat(quantity) || 0;
    setUnitPrice(String(resolveTieredPrice(product, qty, priceKind)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, priceKind, product]);

  if (!product) return null;

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const promotionDiscount = product.activePromotion
    ? calculatePromotionDiscount(product.activePromotion, qty, price)
    : 0;
  const lineTotal = qty * price - promotionDiscount;
  const step = product.allowDecimalQuantity ? "0.01" : "1";
  const minQty = product.allowDecimalQuantity ? 0.01 : 1;
  const validQty = qty > 0 && qty <= product.stockQuantity;
  const validPrice = price >= 0;
  const tiers = [...product.priceTiers].sort((a, b) => a.quantity - b.quantity);
  const activeTier = exactTierForQuantity(product.priceTiers, qty);
  const hasTiers = tiers.length > 0;
  const hasAltBasePrices = product.wholesalePrice !== null || product.specialPrice !== null;
  const showPriceKindPicker = hasTiers || hasAltBasePrices;
  const tiersForKind = tiers.filter((t) => {
    if (priceKind === "wholesale") return t.wholesalePrice !== null;
    if (priceKind === "special") return t.specialPrice !== null;
    return true;
  });

  function selectPrice(kind: PriceKind, value: number) {
    setPriceKind(kind);
    setPriceTouched(true);
    setUnitPrice(String(value));
  }

  function handleConfirm() {
    if (!validQty || !validPrice) return;
    onConfirm(qty, price);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {product.sku} · {product.stockQuantity} {product.unit} in stock
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {product.activePromotion && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
              <Tag className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="font-medium">{describePromotion(product.activePromotion)}</p>
                {promotionDiscount > 0 && (
                  <p className="text-emerald-600/80 dark:text-emerald-400/80">
                    Saves {formatCurrency(promotionDiscount)} at this quantity
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quantity ({product.unit})</Label>
            <Input
              type="number"
              autoFocus
              min={minQty}
              step={step}
              max={product.stockQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {!validQty && (
              <p className="text-xs text-destructive">
                Enter a quantity between {minQty} and {product.stockQuantity}.
              </p>
            )}
          </div>

          {showPriceKindPicker && (
            <div className="space-y-2">
              <Label>Price Type</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRICE_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setPriceKind(kind);
                      setPriceTouched(false);
                    }}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                      priceKind === kind
                        ? "border-primary bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/50",
                    )}
                  >
                    {PRICE_KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
              {hasTiers &&
                (activeTier ? (
                  <p className="text-xs text-muted-foreground">
                    Matches the exact-quantity price for {activeTier.quantity} {product.unit}.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No tier set for exactly {qty || 0} {product.unit} - base price applies.
                  </p>
                ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Unit Price</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => {
                setPriceTouched(true);
                setUnitPrice(e.target.value);
              }}
            />
            {!validPrice && <p className="text-xs text-destructive">Unit price cannot be negative.</p>}
            {showPriceKindPicker && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => selectPrice(priceKind, productBasePrice(product, priceKind))}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    price === productBasePrice(product, priceKind)
                      ? "border-primary bg-accent font-medium"
                      : "hover:bg-accent/50",
                  )}
                >
                  Base {PRICE_KIND_LABELS[priceKind]} · {formatCurrency(productBasePrice(product, priceKind))}
                </button>
                {tiersForKind.map((tier) => {
                  const value = tierPrice(tier, priceKind);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => selectPrice(priceKind, value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        price === value ? "border-primary bg-accent font-medium" : "hover:bg-accent/50",
                      )}
                    >
                      Qty {tier.quantity} · {formatCurrency(value)}
                    </button>
                  );
                })}
              </div>
            )}
            {!priceTouched && showPriceKindPicker && (
              <p className="text-xs text-muted-foreground">
                Price auto-suggested from the exact-quantity tiers above. Edit freely for one-off discounts.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Line Total</span>
            <span className="text-base font-semibold">{formatCurrency(lineTotal)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!validQty || !validPrice}>
            Add to Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
