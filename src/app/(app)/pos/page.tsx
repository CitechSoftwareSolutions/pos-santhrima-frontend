"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { AddToCartDialog } from "@/components/pos/add-to-cart-dialog";
import { AssignCounterModal } from "@/components/pos/assign-counter-modal";
import { HardwareTestModal } from "@/components/pos/hardware-test-modal";
import { ShortcutsDialog } from "@/components/pos/shortcuts-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CounterSummaryDialog } from "@/components/pos/counter-summary-dialog";
import { useCartStore, useActiveBill } from "@/store/cart-store";
import { useHotkeysStore } from "@/store/hotkeys-store";
import { useActiveTerminal } from "@/lib/hooks/use-active-terminal";
import { useCategories } from "@/lib/hooks/use-categories";
import { usePosHotkeys } from "@/hooks/use-hotkeys";
import { assignCategoryKeys } from "@/lib/hotkeys/config";
import { useCurrentRegister, useOpenRegister, useCloseRegister } from "@/lib/hooks/use-register";
import { usePosHeaderStore } from "@/store/pos-header-store";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ProductDto, CounterDailySummaryDto } from "@/lib/types";

export default function PosPage() {
  const addLine = useCartStore((s) => s.addLine);
  const bills = useCartStore((s) => s.bills);
  const addBill = useCartStore((s) => s.addBill);
  const switchBill = useCartStore((s) => s.switchBill);
  const activeBill = useActiveBill();

  const [pendingProduct, setPendingProduct] = useState<ProductDto | null>(null);
  const [categoryId, setCategoryId] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { activeTerminal, storeSettings, hasNoStoredTerminal } = useActiveTerminal();
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

  // Sync state and handlers to Topbar
  const updatePosStatus = usePosHeaderStore((s) => s.updatePosStatus);
  const clearPosStatus = usePosHeaderStore((s) => s.clearPosStatus);

  useEffect(() => {
    updatePosStatus({
      terminalName: activeTerminal?.name ?? null,
      isRegisterOpen,
      isProcessing: openRegisterMutation.isPending || closeRegisterMutation.isPending,
      onOpenRegister: handleOpenRegister,
      onCloseRegister: handleCloseRegisterClick,
      onSwitchCounter: () => setSwitchCounterOpen(true),
    });
  }, [
    activeTerminal?.name,
    isRegisterOpen,
    openRegisterMutation.isPending,
    closeRegisterMutation.isPending,
    handleOpenRegister,
    handleCloseRegisterClick,
    updatePosStatus,
  ]);

  useEffect(() => {
    return () => {
      clearPosStatus();
    };
  }, [clearPosStatus]);

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
    <div className="flex flex-col h-full min-h-0">
      {/* Main Billing Grid: trimmed product area with wider bill section */}
      <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_580px] xl:grid-cols-[minmax(0,1fr)_620px] 2xl:grid-cols-[minmax(0,1fr)_660px] min-w-0 max-w-full h-full min-h-0">
        <div className="min-w-0 max-w-full flex flex-col h-full min-h-0">
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
        <div className="min-w-0 h-full min-h-0 overflow-hidden">
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
