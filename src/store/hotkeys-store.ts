import { create } from "zustand";
import {
  getHotkeysPreferences,
  setHotkeysPreferences,
  keyCodeToDisplay,
  type HotkeysPreferences,
} from "@/lib/hotkeys/config";

interface HotkeysState {
  altHeld: boolean;
  hasKeyboard: boolean;
  shortcutsEnabled: boolean;
  showHints: boolean;
  cheatSheetOpen: boolean;
  actionKeys: Record<string, string>;
  categoryKeys: Record<string, string>;
  priceTierKeys: Record<string, string>;

  setAltHeld: (val: boolean) => void;
  setHasKeyboard: (val: boolean) => void;
  setShortcutsEnabled: (val: boolean) => void;
  setShowHints: (val: boolean) => void;
  setCheatSheetOpen: (val: boolean) => void;

  setActionKey: (actionId: string, keyCode: string | null) => void;
  setCategoryKey: (categoryIdOrName: string, keyCode: string | null) => void;
  setPriceTierKey: (tierId: string, keyCode: string | null) => void;
  setAllCustomizations: (custom: Partial<HotkeysPreferences>) => void;
  syncFromStoreSettings: (jsonStr?: string | null) => void;
  resetPreferences: () => void;

  getActionKey: (actionId: string, fallbackCode: string) => string;
  getActionDisplay: (actionId: string, fallbackDisplay: string) => string;
}

const initialPrefs: HotkeysPreferences = getHotkeysPreferences();

export const useHotkeysStore = create<HotkeysState>((set, get) => ({
  altHeld: false,
  hasKeyboard: false,
  shortcutsEnabled: initialPrefs.shortcutsEnabled,
  showHints: initialPrefs.showHints,
  cheatSheetOpen: false,
  actionKeys: initialPrefs.actionKeys ?? {},
  categoryKeys: initialPrefs.categoryKeys ?? {},
  priceTierKeys: initialPrefs.priceTierKeys ?? {},

  setAltHeld: (altHeld) => set({ altHeld }),
  setHasKeyboard: (hasKeyboard) => set({ hasKeyboard }),

  setShortcutsEnabled: (shortcutsEnabled) => {
    set({ shortcutsEnabled });
    setHotkeysPreferences({
      shortcutsEnabled,
      showHints: get().showHints,
      actionKeys: get().actionKeys,
      categoryKeys: get().categoryKeys,
      priceTierKeys: get().priceTierKeys,
    });
  },

  setShowHints: (showHints) => {
    set({ showHints });
    setHotkeysPreferences({
      shortcutsEnabled: get().shortcutsEnabled,
      showHints,
      actionKeys: get().actionKeys,
      categoryKeys: get().categoryKeys,
      priceTierKeys: get().priceTierKeys,
    });
  },

  setCheatSheetOpen: (cheatSheetOpen) => set({ cheatSheetOpen }),

  setActionKey: (actionId, keyCode) => {
    const current = { ...get().actionKeys };
    if (!keyCode) {
      delete current[actionId];
    } else {
      current[actionId] = keyCode;
    }
    set({ actionKeys: current });
    setHotkeysPreferences({
      shortcutsEnabled: get().shortcutsEnabled,
      showHints: get().showHints,
      actionKeys: current,
      categoryKeys: get().categoryKeys,
      priceTierKeys: get().priceTierKeys,
    });
  },

  setCategoryKey: (categoryIdOrName, keyCode) => {
    const current = { ...get().categoryKeys };
    if (!keyCode) {
      delete current[categoryIdOrName];
    } else {
      current[categoryIdOrName] = keyCode;
    }
    set({ categoryKeys: current });
    setHotkeysPreferences({
      shortcutsEnabled: get().shortcutsEnabled,
      showHints: get().showHints,
      actionKeys: get().actionKeys,
      categoryKeys: current,
      priceTierKeys: get().priceTierKeys,
    });
  },

  setPriceTierKey: (tierId, keyCode) => {
    const current = { ...get().priceTierKeys };
    if (!keyCode) {
      delete current[tierId];
    } else {
      current[tierId] = keyCode;
    }
    set({ priceTierKeys: current });
    setHotkeysPreferences({
      shortcutsEnabled: get().shortcutsEnabled,
      showHints: get().showHints,
      actionKeys: get().actionKeys,
      categoryKeys: get().categoryKeys,
      priceTierKeys: current,
    });
  },

  setAllCustomizations: (custom) => {
    const next: HotkeysPreferences = {
      shortcutsEnabled: custom.shortcutsEnabled ?? get().shortcutsEnabled,
      showHints: custom.showHints ?? get().showHints,
      actionKeys: custom.actionKeys ?? get().actionKeys,
      categoryKeys: custom.categoryKeys ?? get().categoryKeys,
      priceTierKeys: custom.priceTierKeys ?? get().priceTierKeys,
    };
    set({ ...next });
    setHotkeysPreferences(next);
  },

  syncFromStoreSettings: (jsonStr) => {
    if (!jsonStr) return;
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed === "object" && parsed !== null) {
        const next: HotkeysPreferences = {
          shortcutsEnabled: parsed.shortcutsEnabled ?? get().shortcutsEnabled,
          showHints: parsed.showHints ?? get().showHints,
          actionKeys: parsed.actionKeys ?? get().actionKeys,
          categoryKeys: parsed.categoryKeys ?? get().categoryKeys,
          priceTierKeys: parsed.priceTierKeys ?? get().priceTierKeys,
        };
        set({ ...next });
        setHotkeysPreferences(next);
      }
    } catch {
      // Ignore invalid JSON
    }
  },

  resetPreferences: () => {
    const defaults: HotkeysPreferences = {
      shortcutsEnabled: true,
      showHints: true,
      actionKeys: {},
      categoryKeys: {},
      priceTierKeys: {},
    };
    set({ ...defaults });
    setHotkeysPreferences(defaults);
  },

  getActionKey: (actionId, fallbackCode) => {
    return get().actionKeys[actionId] || fallbackCode;
  },

  getActionDisplay: (actionId, fallbackDisplay) => {
    const customCode = get().actionKeys[actionId];
    if (customCode) {
      return keyCodeToDisplay(customCode);
    }
    return fallbackDisplay;
  },
}));
