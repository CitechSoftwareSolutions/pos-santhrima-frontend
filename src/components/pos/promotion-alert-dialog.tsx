"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PromotionType } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import type { PromotionEvaluation } from "@/lib/promotion-utils";
import { Gift, Tag, ArrowRight } from "lucide-react";

interface PromotionAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluations: PromotionEvaluation[];
  onProceed: () => void;
}

export function PromotionAlertDialog({
  open,
  onOpenChange,
  evaluations,
  onProceed,
}: PromotionAlertDialogProps) {
  const freeItemPromos = evaluations.filter((e) => e.freeQuantity > 0);
  const discountPromos = evaluations.filter((e) => e.freeQuantity === 0 && e.discountAmount > 0);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        onOpenChange(false);
        onProceed();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, onProceed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Tag className="size-4 text-emerald-600" />
            <span>Active Promotion Notice</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            The items in this cart meet the criteria for active promotions. Please review before taking payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          {freeItemPromos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Free Items to Hand Over
              </span>
              {freeItemPromos.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-start gap-2">
                    <Gift className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                        Give {item.freeQuantity} free {item.productName}
                      </p>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                        Under {item.promotionName}
                        {item.promotionDescription ? ` - ${item.promotionDescription}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {discountPromos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Promotional Discounts Applied
              </span>
              {discountPromos.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 p-3 text-xs space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-blue-900 dark:text-blue-200">
                        {item.promotionName}
                        {item.promotionDescription ? ` - ${item.promotionDescription}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Product: {item.productName}
                      </p>
                    </div>
                    <span className="font-bold text-blue-700 dark:text-blue-300 shrink-0">
                      -{formatCurrency(item.discountAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Back to Cart [Esc]
          </Button>
          <Button
            size="sm"
            autoFocus
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            onClick={() => {
              onOpenChange(false);
              onProceed();
            }}
          >
            <span>Proceed to Checkout [Enter]</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
