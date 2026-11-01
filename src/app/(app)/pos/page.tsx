"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Monitor, Lock, Unlock, Wrench, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { AddToCartDialog } from "@/components/pos/add-to-cart-dialog";
import { AssignCounterModal } from "@/components/pos/assign-counter-modal";
import { HardwareTestModal } from "@/components/pos/hardware-test-modal";
import { ShortcutsDialog } from "@/components/pos/shortcuts-dialog";
import { ShortcutHint } from "@/components/pos/shortcut-hint";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CounterSummaryDialog } from "@/components/pos/counter-summary-dialog";
import { useCartStore, useActiveBill } from "@/store/cart-store";
import { useHotkeysStore } from "@/store/hotkeys-store";
import { useActiveTerminal } from "@/lib/hooks/use-active-terminal";
import { useCategories } from "@/lib/hooks/use-categories";
import { usePosHotkeys } from "@/hooks/use-hotkeys";
import { assignCategoryKeys } from "@/lib/hotkeys/config";
import { useCurrentRegister, useOpenRegister, useCloseRegister } from "@/lib/hooks/use-register";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { ProductDto, CounterDailySummaryDto } from "@/lib/types";

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

  // Register Session Management
  const currentRegisterQuery = useCurrentRegister(activeTerminal?.id);
  const openRegisterMutation = useOpenRegister();
  const closeRegisterMutation = useCloseRegister();

  const isRegisterOpen = currentRegisterQuery.data?.status === "Open";

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<CounterDailySummaryDto | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

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

  const focusBarcodeSearch = useCallback(() => {
    const doFocus = () => {
      const el =
        searchInputRef.current ||
        (document.getElementById("pos-barcode-search-input") as HTMLInputElement | null);
      if (el) {
        el.focus();
        el.select();
      }
    };

    doFocus();
    requestAnimationFrame(doFocus);
    const t1 = setTimeout(doFocus, 50);
    const t2 = setTimeout(doFocus, 150);
    const t3 = setTimeout(doFocus, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // 1. Auto-select barcode field when first entering POS section
  useEffect(() => {
    if (!hasNoStoredTerminal && !switchCounterOpen && !hardwareTestOpen) {
      focusBarcodeSearch();
    }
  }, [hasNoStoredTerminal, switchCounterOpen, hardwareTestOpen, focusBarcodeSearch]);

  // 2. Auto-select barcode field when active bill changes or items are added to bill
  const prevLinesCountRef = useRef(activeBill.lines.length);
  const prevBillIdRef = useRef(activeBill.id);

  useEffect(() => {
    if (activeBill.id !== prevBillIdRef.current) {
      prevBillIdRef.current = activeBill.id;
      prevLinesCountRef.current = activeBill.lines.length;
      focusBarcodeSearch();
      return;
    }

    if (activeBill.lines.length > prevLinesCountRef.current) {
      focusBarcodeSearch();
    }
    prevLinesCountRef.current = activeBill.lines.length;
  }, [activeBill.id, activeBill.lines.length, focusBarcodeSearch]);

  // Connect POS keyboard shortcuts engine
  usePosHotkeys({
    categoryBindings,
    onSelectCategory: handleCategoryChange,
    onFocusSearch: focusBarcodeSearch,
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
    onNewBill: () => {
      if (!isRegisterOpen) {
        toast.error("Cash register is closed. Please click 'Open Register' to begin billing.");
        return;
      }
      addBill();
      focusBarcodeSearch();
    },
    onSwitchBillIndex: (index: number) => {
      if (bills[index]) {
        switchBill(bills[index].id);
        toast.info(`Switched to ${bills[index].label}`);
        focusBarcodeSearch();
      }
    },
    onCharge: () => {
      if (!isRegisterOpen) {
        toast.error("Cash register is closed. Please click 'Open Register' to begin billing.");
        return;
      }
      const chargeBtn = document.getElementById("pos-charge-button");
      chargeBtn?.click();
    },
    isCartEmpty: activeBill.lines.length === 0,
  });

  const handleOpenRegister = useCallback(() => {
    if (!activeTerminal?.id) {
      toast.error("Please assign a counter first.");
      return;
    }
    openRegisterMutation.mutate(
      { terminalId: activeTerminal.id },
      {
        onSuccess: () => {
          toast.success("Cash register opened! Billing operations are now active.");
          focusBarcodeSearch();
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err));
        },
      }
    );
  }, [activeTerminal?.id, openRegisterMutation, focusBarcodeSearch]);

  const handleCloseRegisterClick = useCallback(() => {
    setConfirmCloseOpen(true);
  }, []);

  const handleCloseRegisterConfirm = useCallback(() => {
    if (!activeTerminal?.id) return;
    closeRegisterMutation.mutate(
      { terminalId: activeTerminal.id },
      {
        onSuccess: (data) => {
          setConfirmCloseOpen(false);
          setSummaryData(data);
          setSummaryDialogOpen(true);
          toast.success("Register closed. Today's counter summary is ready.");
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err));
        },
      }
    );
  }, [activeTerminal?.id, closeRegisterMutation]);

  function handleSelect(product: ProductDto) {
    if (!isRegisterOpen) {
      toast.error("Cash register is closed. Please click 'Open Register' to begin billing.");
      return;
    }
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
    focusBarcodeSearch();
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

          {activeTerminal && (
            <span
              className={cn(
                "hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ml-1",
                isRegisterOpen
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-muted/60 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isRegisterOpen ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                )}
              />
              {isRegisterOpen ? "Register Open" : "Register Closed"}
            </span>
          )}
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

          {/* Open / Close Register Button (between Test Hardware and Switch) */}
          {isRegisterOpen ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-500/20 font-semibold"
              onClick={handleCloseRegisterClick}
              disabled={closeRegisterMutation.isPending}
              title="Close cashier register and view today's counter summary"
            >
              <Lock className="size-3 text-amber-600 dark:text-amber-400" />
              <span>{closeRegisterMutation.isPending ? "Closing..." : "Close Register"}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              onClick={handleOpenRegister}
              disabled={!activeTerminal || openRegisterMutation.isPending}
              title="Open register to enable billing and product additions"
            >
              <Unlock className="size-3" />
              <span>{openRegisterMutation.isPending ? "Opening..." : "Open Register"}</span>
            </Button>
          )}

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

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] min-w-0 max-w-full">
        <div className="min-w-0 max-w-full flex flex-col h-[calc(100vh-11.5rem)] min-h-[500px]">
          <ProductGrid
            onSelect={handleSelect}
            categoryId={categoryId}
            onCategoryChange={handleCategoryChange}
            categoryBindings={categoryBindings}
            searchInputRef={searchInputRef}
            isRegisterOpen={isRegisterOpen}
            onOpenRegister={handleOpenRegister}
          />
        </div>
        <div className="min-w-0 h-[calc(100vh-11.5rem)] min-h-[500px] overflow-hidden lg:sticky lg:top-0">
          <CartPanel isRegisterOpen={isRegisterOpen} />
        </div>

        <AddToCartDialog
          product={pendingProduct}
          onOpenChange={(o) => {
            if (!o) {
              setPendingProduct(null);
              focusBarcodeSearch();
            }
          }}
          onConfirm={handleConfirm}
        />
      </div>

      {/* Counter Selection on first launch or switch */}
      <AssignCounterModal
        open={hasNoStoredTerminal || switchCounterOpen}
        onOpenChange={(o) => {
          setSwitchCounterOpen(o);
          if (!o) focusBarcodeSearch();
        }}
        isSwitching={switchCounterOpen}
      />

      {/* POS Screen Hardware Diagnostics */}
      <HardwareTestModal
        open={hardwareTestOpen}
        onOpenChange={(o) => {
          setHardwareTestOpen(o);
          if (!o) focusBarcodeSearch();
        }}
      />

      {/* Keyboard Shortcuts Cheat-Sheet Modal */}
      <ShortcutsDialog categoryBindings={categoryBindings} />

      {/* Confirm Close Register Dialog */}
      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title={`Close Register - ${activeTerminal?.name || "Counter"}?`}
        description={
          activeBill.lines.length > 0
            ? "You currently have unbilled items in the cart. Closing the register will close today's session and display today's counter payment summary."
            : "Are you sure you want to close the register? Today's counter payment summary will be calculated and ready to print as a bill."
        }
        confirmLabel="Close Register"
        destructive={false}
        loading={closeRegisterMutation.isPending}
        onConfirm={handleCloseRegisterConfirm}
      />

      {/* Today's Counter Summary & Bill Print Dialog */}
      <CounterSummaryDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        summary={summaryData}
        terminal={activeTerminal}
      />
    </div>
  );
}
