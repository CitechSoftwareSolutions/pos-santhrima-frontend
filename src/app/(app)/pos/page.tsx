"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Monitor, Lock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { AddToCartDialog } from "@/components/pos/add-to-cart-dialog";
import { AssignCounterModal } from "@/components/pos/assign-counter-modal";
import { HardwareTestModal } from "@/components/pos/hardware-test-modal";
import { useCartStore } from "@/store/cart-store";
import { useActiveTerminal } from "@/lib/hooks/use-active-terminal";
import type { ProductDto } from "@/lib/types";

export default function PosPage() {
  const addLine = useCartStore((s) => s.addLine);
  const [pendingProduct, setPendingProduct] = useState<ProductDto | null>(null);

  const { activeTerminal, hasNoStoredTerminal, effectivePaperWidth } = useActiveTerminal();
  const [switchCounterOpen, setSwitchCounterOpen] = useState(false);
  const [hardwareTestOpen, setHardwareTestOpen] = useState(false);

  function handleSelect(product: ProductDto) {
    if (product.stockQuantity <= 0) {
      toast.error(`${product.name} is out of stock.`);
      return;
    }
    setPendingProduct(product);
  }

  function handleConfirm(quantity: number, unitPrice: number) {
    if (!pendingProduct) return;
    addLine(pendingProduct, quantity, unitPrice);
    setPendingProduct(null);
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Cashier Terminal Station Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card/60 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Monitor className="size-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <span>{activeTerminal?.name || "Unassigned Cashier Counter"}</span>
              {activeTerminal && (
                <span className="font-mono text-[11px] font-normal text-muted-foreground">
                  ({activeTerminal.terminalCode})
                </span>
              )}
            </div>
          </div>
          <span className="hidden sm:inline text-muted-foreground/60">|</span>
          <p className="hidden sm:inline text-[11px] text-muted-foreground">
            Printer: {activeTerminal?.printerType || "None"} ({effectivePaperWidth})
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setHardwareTestOpen(true)}
            disabled={!activeTerminal}
          >
            <Wrench className="size-3" />
            Test Hardware
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setSwitchCounterOpen(true)}
            title="Admin authorization required to switch counter"
          >
            <Lock className="size-3" />
            Switch
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <ProductGrid onSelect={handleSelect} />
        <div className="h-[calc(100vh-11.5rem)] min-h-[500px] overflow-hidden lg:sticky lg:top-0">
          <CartPanel />
        </div>

        <AddToCartDialog
          product={pendingProduct}
          onOpenChange={(o) => !o && setPendingProduct(null)}
          onConfirm={handleConfirm}
        />
      </div>

      {/* Counter Selection on first launch or switch */}
      <AssignCounterModal
        open={hasNoStoredTerminal || switchCounterOpen}
        onOpenChange={(o) => setSwitchCounterOpen(o)}
        isSwitching={switchCounterOpen}
      />

      {/* POS Screen Hardware Diagnostics */}
      <HardwareTestModal
        open={hardwareTestOpen}
        onOpenChange={setHardwareTestOpen}
      />
    </div>
  );
}
