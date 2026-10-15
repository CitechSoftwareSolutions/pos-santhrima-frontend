"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Monitor, Lock, Wrench, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { AddToCartDialog } from "@/components/pos/add-to-cart-dialog";
import { AssignCounterModal } from "@/components/pos/assign-counter-modal";
import { HardwareTestModal } from "@/components/pos/hardware-test-modal";
import { ShortcutsDialog } from "@/components/pos/shortcuts-dialog";
import { ShortcutHint } from "@/components/pos/shortcut-hint";
import { useCartStore, useActiveBill } from "@/store/cart-store";
import { useHotkeysStore } from "@/store/hotkeys-store";
import { useActiveTerminal } from "@/lib/hooks/use-active-terminal";
import { useCategories } from "@/lib/hooks/use-categories";
import { usePosHotkeys } from "@/hooks/use-hotkeys";
import { assignCategoryKeys } from "@/lib/hotkeys/config";
import type { ProductDto } from "@/lib/types";

export default function PosPage() {
  const addLine = useCartStore((s) => s.addLine);
  const bills = useCartStore((s) => s.bills);
  const addBill = useCartStore((s) => s.addBill);
  const switchBill = useCartStore((s) => s.switchBill);
  const activeBill = useActiveBill();

  const setCheatSheetOpen = useHotkeysStore((s) => s.setCheatSheetOpen);

  const [pendingProduct, setPendingProduct] = useState<ProductDto | null>(null);
  const [categoryId, setCategoryId] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { activeTerminal, storeSettings, hasNoStoredTerminal, effectivePaperWidth } = useActiveTerminal();
  const [switchCounterOpen, setSwitchCounterOpen] = useState(false);
  const [hardwareTestOpen, setHardwareTestOpen] = useState(false);

  const categoryKeys = useHotkeysStore((s) => s.categoryKeys);
  const syncFromStoreSettings = useHotkeysStore((s) => s.syncFromStoreSettings);

  useEffect(() => {
    if (storeSettings?.hotkeyBindingsJson) {
      syncFromStoreSettings(storeSettings.hotkeyBindingsJson);
    }
  }, [storeSettings?.hotkeyBindingsJson, syncFromStoreSettings]);

  // Fetch categories & calculate dynamic key bindings with configured admin overrides
  const categoriesQuery = useCategories();
  const categoryBindings = useMemo(
    () => assignCategoryKeys(categoriesQuery.data ?? [], categoryKeys),
    [categoriesQuery.data, categoryKeys],
  );

  const handleCategoryChange = useCallback((id: string) => {
    setCategoryId(id);
  }, []);

  // Connect POS keyboard shortcuts engine
  usePosHotkeys({
    categoryBindings,
    onSelectCategory: handleCategoryChange,
    onFocusSearch: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    },
    onClearSearch: () => {
      if (searchInputRef.current && searchInputRef.current.value.length > 0) {
        searchInputRef.current.value = "";
        searchInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      return false;
    },
    onBlurSearch: () => {
      searchInputRef.current?.blur();
    },
    onFocusCustomer: () => {
      const popoverInput = document.querySelector<HTMLInputElement>(
        '[data-slot="popover-content"] input, [data-slot="popover-content"] [cmdk-input]',
      );
      if (popoverInput) {
        popoverInput.focus();
        popoverInput.select();
      } else {
        const btn = document.getElementById("pos-customer-picker-trigger");
        btn?.click();
      }
    },
    onFocusDiscount: () => {
      const input = document.getElementById("pos-discount-input") as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    },
    onNewBill: addBill,
    onSwitchBillIndex: (index: number) => {
      if (bills[index]) {
        switchBill(bills[index].id);
        toast.info(`Switched to ${bills[index].label}`);
      }
    },
    onCharge: () => {
      const chargeBtn = document.getElementById("pos-charge-button");
      chargeBtn?.click();
    },
    isCartEmpty: activeBill.lines.length === 0,
  });

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
          {/* Shortcuts cheat-sheet button */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setCheatSheetOpen(true)}
            title="Keyboard Shortcuts Cheat-Sheet (? or Alt+H)"
            aria-keyshortcuts="? Alt+h"
          >
            <Keyboard className="size-3" />
            <span className="hidden sm:inline">Shortcuts</span>
            <ShortcutHint keyName="?" altKeyName="Alt+H" />
          </Button>

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
        <ProductGrid
          onSelect={handleSelect}
          categoryId={categoryId}
          onCategoryChange={handleCategoryChange}
          categoryBindings={categoryBindings}
          searchInputRef={searchInputRef}
        />
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

      {/* Keyboard Shortcuts Cheat-Sheet Modal */}
      <ShortcutsDialog categoryBindings={categoryBindings} />
    </div>
  );
}
