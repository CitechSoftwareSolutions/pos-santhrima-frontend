"use client";

import { useEffect, useRef, useState } from "react";
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
import { ShortcutHint } from "@/components/pos/shortcut-hint";
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
import { useHotkeysStore } from "@/store/hotkeys-store";
import { keyCodeToDisplay } from "@/lib/hotkeys/config";

const PRICE_KINDS: PriceKind[] = ["retail", "wholesale", "special"];

const KIND_SHORTCUTS: Record<PriceKind, { code: string; display: string }> = {
  retail: { code: "KeyR", display: "R" },
  wholesale: { code: "KeyW", display: "W" },
  special: { code: "KeyS", display: "S" },
};

function AddToCartForm({
  product,
  onCancel,
  onConfirm,
}: {
  product: ProductDto;
  onCancel: () => void;
  onConfirm: (quantity: number, unitPrice: number) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [priceKind, setPriceKind] = useState<PriceKind>("retail");
  const [priceTouched, setPriceTouched] = useState(false);
  const [unitPrice, setUnitPrice] = useState(() =>
    String(resolveTieredPrice(product, 1, "retail")),
  );

  const quantityInputRef = useRef<HTMLInputElement>(null);

  const stepVal = product.allowDecimalQuantity ? 0.1 : 1;
  const step = product.allowDecimalQuantity ? "0.1" : "1";
  const minQty = product.allowDecimalQuantity ? 0.01 : 1;

  const priceTierKeys = useHotkeysStore((s) => s.priceTierKeys);
  const retailCode = priceTierKeys["retail"] || "KeyR";
  const wholesaleCode = priceTierKeys["wholesale"] || "KeyW";
  const specialCode = priceTierKeys["special"] || "KeyS";

  const dynamicShortcuts: Record<PriceKind, { code: string; display: string }> = {
    retail: { code: retailCode, display: keyCodeToDisplay(retailCode) },
    wholesale: { code: wholesaleCode, display: keyCodeToDisplay(wholesaleCode) },
    special: { code: specialCode, display: keyCodeToDisplay(specialCode) },
  };

  // Auto-focus and select contents on mount
  useEffect(() => {
    const el = quantityInputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  // Update unitPrice when quantity or priceKind changes unless touched
  const handleQuantityChange = (newQtyStr: string) => {
    setQuantity(newQtyStr);
    if (!priceTouched) {
      const q = parseFloat(newQtyStr) || 0;
      setUnitPrice(String(resolveTieredPrice(product, q, priceKind)));
    }
  };

  const handlePriceKindChange = (kind: PriceKind) => {
    setPriceKind(kind);
    setPriceTouched(false);
    const q = parseFloat(quantity) || 0;
    setUnitPrice(String(resolveTieredPrice(product, q, kind)));
  };

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const promotionDiscount = product.activePromotion
    ? calculatePromotionDiscount(product.activePromotion, qty, price)
    : 0;
  const lineTotal = qty * price - promotionDiscount;

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

  function handleFormConfirm() {
    if (!validQty || !validPrice) return;
    onConfirm(qty, price);
  }

  // Keyboard navigation inside dialog
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Escape handled by dialog/Radix, but can call onCancel if needed
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }

    // Enter confirms
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFormConfirm();
      return;
    }

    // Price kind switching: R, W, S (bare or Alt+letter) or custom configured keys
    if (showPriceKindPicker) {
      for (const kind of PRICE_KINDS) {
        const item = dynamicShortcuts[kind];
        if (
          (e.code === item.code && (e.altKey || (!e.ctrlKey && !e.metaKey && document.activeElement !== quantityInputRef.current)))
        ) {
          e.preventDefault();
          handlePriceKindChange(kind);
          return;
        }
      }
    }

    // Quantity +/- adjustment via hotkeys
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      const next = Math.min(product.stockQuantity, Math.round((qty + stepVal) * 100) / 100);
      handleQuantityChange(String(next));
      return;
    }
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      const next = Math.max(minQty, Math.round((qty - stepVal) * 100) / 100);
      handleQuantityChange(String(next));
      return;
    }
  }

  return (
    <div onKeyDown={handleKeyDown} className="space-y-4 outline-none">
      <DialogHeader>
        <DialogTitle>{product.name}</DialogTitle>
        <DialogDescription>
          {product.sku} · {product.stockQuantity} {product.unit} in stock
        </DialogDescription>
      </DialogHeader>

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

      {/* Quantity Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="qty-input">Quantity ({product.unit})</Label>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            Adjust: <ShortcutHint keyName="+" /> <ShortcutHint keyName="-" />
          </span>
        </div>
        <Input
          id="qty-input"
          ref={quantityInputRef}
          type="number"
          min={minQty}
          step={step}
          max={product.stockQuantity}
          value={quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        {!validQty && (
          <p className="text-xs text-destructive">
            Enter a quantity between {minQty} and {product.stockQuantity}.
          </p>
        )}
      </div>

      {/* Price Kind Picker */}
      {showPriceKindPicker && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Price Type</Label>
            <span className="text-[10px] text-muted-foreground">Alt+R / Alt+W / Alt+S</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PRICE_KINDS.map((kind) => {
              const sc = dynamicShortcuts[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handlePriceKindChange(kind)}
                  aria-keyshortcuts={`${sc.display.toLowerCase()} Alt+${sc.display.toLowerCase()}`}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    priceKind === kind
                      ? "border-primary bg-accent text-foreground ring-1 ring-primary/40 font-semibold"
                      : "text-muted-foreground hover:bg-accent/50",
                  )}
                >
                  <span>{PRICE_KIND_LABELS[kind]}</span>
                  <ShortcutHint keyName={sc.display} altKeyName={`Alt+${sc.display}`} />
                </button>
              );
            })}
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

      {/* Unit Price Input */}
      <div className="space-y-2">
        <Label htmlFor="unit-price-input">Unit Price</Label>
        <Input
          id="unit-price-input"
          type="number"
          min={0}
          step="0.01"
          value={unitPrice}
          onChange={(e) => {
            setPriceTouched(true);
            setUnitPrice(e.target.value);
          }}
          onFocus={(e) => e.target.select()}
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
                  ? "border-primary bg-accent font-medium ring-1 ring-primary/30"
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
                    price === value
                      ? "border-primary bg-accent font-medium ring-1 ring-primary/30"
                      : "hover:bg-accent/50",
                  )}
                >
                  Qty {tier.quantity} · {formatCurrency(value)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Line Total */}
      <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
        <span className="text-muted-foreground">Line Total</span>
        <span className="text-base font-semibold">{formatCurrency(lineTotal)}</span>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onCancel} className="gap-1.5">
          <span>Cancel</span>
          <ShortcutHint keyName="Esc" />
        </Button>
        <Button onClick={handleFormConfirm} disabled={!validQty || !validPrice} className="gap-1.5">
          <span>Add to Bill</span>
          <ShortcutHint keyName="Enter" />
        </Button>
      </DialogFooter>
    </div>
  );
}

export function AddToCartDialog({
  product,
  onOpenChange,
  onConfirm,
}: {
  product: ProductDto | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (quantity: number, unitPrice: number) => void;
}) {
  const open = Boolean(product);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {product && (
          <AddToCartForm
            key={product.id}
            product={product}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
