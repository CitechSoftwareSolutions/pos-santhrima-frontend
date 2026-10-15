"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useHotkeysStore } from "@/store/hotkeys-store";
import {
  isAnyDialogOpen,
  isTypingTarget,
  type CategoryKeyBinding,
} from "@/lib/hotkeys/config";
import { matchesCategoryKey } from "@/lib/hotkeys/matcher";

export interface UseHotkeysOptions {
  categoryBindings?: CategoryKeyBinding[];
  onSelectCategory?: (id: string, name: string) => void;
  onFocusSearch?: () => void;
  onClearSearch?: () => boolean; // returns true if text was cleared
  onBlurSearch?: () => void;
  onFocusCustomer?: () => void;
  onFocusDiscount?: () => void;
  onNewBill?: () => void;
  onSwitchBillIndex?: (index: number) => void;
  onCharge?: () => void;
  isCartEmpty?: boolean;
}

export function usePosHotkeys({
  categoryBindings = [],
  onSelectCategory,
  onFocusSearch,
  onClearSearch,
  onBlurSearch,
  onFocusCustomer,
  onFocusDiscount,
  onNewBill,
  onSwitchBillIndex,
  onCharge,
  isCartEmpty = true,
}: UseHotkeysOptions) {
  const shortcutsEnabled = useHotkeysStore((s) => s.shortcutsEnabled);
  const setAltHeld = useHotkeysStore((s) => s.setAltHeld);
  const setHasKeyboard = useHotkeysStore((s) => s.setHasKeyboard);
  const setCheatSheetOpen = useHotkeysStore((s) => s.setCheatSheetOpen);

  // Keep latest callbacks in refs to avoid re-attaching listeners
  const optionsRef = useRef({
    categoryBindings,
    onSelectCategory,
    onFocusSearch,
    onClearSearch,
    onBlurSearch,
    onFocusCustomer,
    onFocusDiscount,
    onNewBill,
    onSwitchBillIndex,
    onCharge,
    isCartEmpty,
    shortcutsEnabled,
  });

  useEffect(() => {
    optionsRef.current = {
      categoryBindings,
      onSelectCategory,
      onFocusSearch,
      onClearSearch,
      onBlurSearch,
      onFocusCustomer,
      onFocusDiscount,
      onNewBill,
      onSwitchBillIndex,
      onCharge,
      isCartEmpty,
      shortcutsEnabled,
    };
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // First keydown detects presence of a physical keyboard (hides badges on touch-only)
      setHasKeyboard(true);

      // Track Alt press
      if (e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") {
        setAltHeld(true);
      }

      const opts = optionsRef.current;
      const dialogOpen = isAnyDialogOpen();
      const inInput = isTypingTarget(e.target);
      const actionKeys = useHotkeysStore.getState().actionKeys;
      const customHelp = actionKeys["help"];
      const customSearch = actionKeys["search"];
      const customCustomer = actionKeys["customer"] || "KeyC";
      const customDiscount = actionKeys["discount"] || "KeyD";
      const customNewBill = actionKeys["new-bill"] || "KeyN";
      const customCharge = actionKeys["charge"] || "F9";

      // Cheat-sheet shortcut: '?' (Shift + Slash), 'Alt+H', or configured help key
      if (
        (e.code === "Slash" && e.shiftKey && !e.ctrlKey && !e.metaKey && !inInput && !dialogOpen) ||
        (e.code === "KeyH" && e.altKey && !e.ctrlKey && !e.metaKey) ||
        (customHelp && (e.code === customHelp && (e.altKey || (!inInput && !dialogOpen && !e.ctrlKey && !e.metaKey))))
      ) {
        e.preventDefault();
        setCheatSheetOpen(true);
        return;
      }

      // If shortcuts disabled, do not process any others
      if (!opts.shortcutsEnabled) return;

      // Rule 4: Escape handling
      if (e.code === "Escape") {
        // If a modal or popover is open, let native / Radix dialog handle it
        if (dialogOpen) return;

        if (inInput) {
          // 1st press: Clear search text if non-empty
          const cleared = opts.onClearSearch?.() ?? false;
          if (cleared) {
            e.preventDefault();
            return;
          }
          // 2nd press: Blur the text field and return to hotkey navigation
          e.preventDefault();
          opts.onBlurSearch?.();
          return;
        }
      }

      // Universal Product Search Focus: '/' or 'F2' or 'Alt+S' or custom search key
      if (
        (e.code === "Slash" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !inInput && !dialogOpen) ||
        (e.code === "F2" && !e.ctrlKey && !e.metaKey) ||
        (e.code === "KeyS" && e.altKey && !e.ctrlKey && !e.metaKey) ||
        (customSearch && (
          (e.code === customSearch && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !inInput && !dialogOpen) ||
          (e.code === customSearch && e.altKey && !e.ctrlKey && !e.metaKey)
        ))
      ) {
        e.preventDefault();
        opts.onFocusSearch?.();
        return;
      }

      // Customer Selector: 'KeyC' (bare or Alt+C) or custom key
      if (
        (e.code === customCustomer && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !inInput && !dialogOpen) ||
        (e.code === customCustomer && e.altKey && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        opts.onFocusCustomer?.();
        return;
      }

      // Discount Field: 'KeyD' (bare or Alt+D) or custom key
      if (
        (e.code === customDiscount && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !inInput && !dialogOpen) ||
        (e.code === customDiscount && e.altKey && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        opts.onFocusDiscount?.();
        return;
      }

      // New Bill Tab: 'Alt+N' or custom key (with Alt or bare)
      if (
        (e.code === customNewBill && e.altKey && !e.ctrlKey && !e.metaKey) ||
        (customNewBill !== "KeyN" && e.code === customNewBill && !inInput && !dialogOpen && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        opts.onNewBill?.();
        toast.info("Created new bill tab");
        return;
      }

      // Switch Bill Tab: 'Alt+1' through 'Alt+9'
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const tabNumber = parseInt(e.code.replace("Digit", ""), 10);
        opts.onSwitchBillIndex?.(tabNumber - 1);
        return;
      }

      // Charge / Checkout: 'F9', 'Ctrl+Enter', or custom charge key
      if (
        (e.code === customCharge && !e.ctrlKey && !e.metaKey) ||
        (e.code === "Enter" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        if (opts.isCartEmpty) {
          toast.warning("Cart is empty. Add products to charge.");
        } else {
          opts.onCharge?.();
        }
        return;
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") {
        setAltHeld(false);
      }
    }

    function handleWindowBlur() {
      setAltHeld(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [setAltHeld, setHasKeyboard, setCheatSheetOpen]);
}
