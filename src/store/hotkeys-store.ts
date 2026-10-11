import { create } from "zustand";
import { getHotkeysPreferences, setHotkeysPreferences, type HotkeysPreferences } from "@/lib/hotkeys/config";

interface HotkeysState {
  altHeld: boolean;
  hasKeyboard: boolean;
  shortcutsEnabled: boolean;
  showHints: boolean;
  cheatSheetOpen: boolean;
  setAltHeld: (val: boolean) => void;
  setHasKeyboard: (val: boolean) => void;
  setShortcutsEnabled: (val: boolean) => void;
  setShowHints: (val: boolean) => void;
  setCheatSheetOpen: (val: boolean) => void;
  resetPreferences: () => void;
}

const initialPrefs: HotkeysPreferences = getHotkeysPreferences();

export const useHotkeysStore = create<HotkeysState>((set, get) => ({
  altHeld: false,
  hasKeyboard: false,
  shortcutsEnabled: initialPrefs.shortcutsEnabled,
  showHints: initialPrefs.showHints,
  cheatSheetOpen: false,

  setAltHeld: (altHeld) => set({ altHeld }),
  setHasKeyboard: (hasKeyboard) => set({ hasKeyboard }),

  setShortcutsEnabled: (shortcutsEnabled) => {
    set({ shortcutsEnabled });
    setHotkeysPreferences({
      shortcutsEnabled,
      showHints: get().showHints,
    });
  },

  setShowHints: (showHints) => {
    set({ showHints });
    setHotkeysPreferences({
      shortcutsEnabled: get().shortcutsEnabled,
      showHints,
    });
  },

  setCheatSheetOpen: (cheatSheetOpen) => set({ cheatSheetOpen }),

  resetPreferences: () => {
    const defaults = { shortcutsEnabled: true, showHints: true };
    set({ ...defaults });
    setHotkeysPreferences(defaults);
  },
}));
