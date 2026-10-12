export type ShortcutGroup = "categories" | "navigation" | "bills" | "dialogs";

export interface ShortcutDefinition {
  id: string;
  label: string;
  group: ShortcutGroup;
  codes: string[];
  keyDisplay: string;
  altDisplay?: string;
  allowInInput?: boolean;
  requiresAlt?: boolean;
  requiresCtrl?: boolean;
  description?: string;
}

export interface HotkeysPreferences {
  shortcutsEnabled: boolean;
  showHints: boolean;
  actionKeys?: Record<string, string>;
  categoryKeys?: Record<string, string>;
  priceTierKeys?: Record<string, string>;
}

export const RESERVED_CATEGORY_LETTERS = new Set(["A", "C", "D", "N", "S"]);

export interface CategoryLike {
  id: string;
  name: string;
  hotKey?: string | null;
}

export interface CategoryKeyBinding {
  id: string;
  name: string;
  code: string;
  displayKey: string;
}

export interface ConfigurableAction {
  id: string;
  name: string;
  group: ShortcutGroup;
  description: string;
  defaultCode: string;
  defaultDisplay: string;
  altDisplay?: string;
  allowInInput: boolean;
}

export const CONFIGURABLE_ACTIONS: readonly ConfigurableAction[] = [
  {
    id: "search",
    name: "Focus Product Search",
    group: "navigation",
    description: "Jump straight into product search bar and select text",
    defaultCode: "Slash",
    defaultDisplay: "/",
    altDisplay: "Alt+S",
    allowInInput: true,
  },
  {
    id: "customer",
    name: "Customer Selector",
    group: "bills",
    description: "Open customer picker and assign to active sale",
    defaultCode: "KeyC",
    defaultDisplay: "C",
    altDisplay: "Alt+C",
    allowInInput: false,
  },
  {
    id: "discount",
    name: "Bill Discount Input",
    group: "bills",
    description: "Focus bill discount amount input field",
    defaultCode: "KeyD",
    defaultDisplay: "D",
    altDisplay: "Alt+D",
    allowInInput: false,
  },
  {
    id: "new-bill",
    name: "New Bill Tab",
    group: "bills",
    description: "Create a new concurrent customer bill tab",
    defaultCode: "KeyN",
    defaultDisplay: "N",
    altDisplay: "Alt+N",
    allowInInput: true,
  },
  {
    id: "charge",
    name: "Charge / Checkout",
    group: "bills",
    description: "Open payment modal to complete checkout",
    defaultCode: "F9",
    defaultDisplay: "F9",
    altDisplay: "Ctrl+Enter",
    allowInInput: true,
  },
  {
    id: "help",
    name: "Cheat-Sheet Help",
    group: "dialogs",
    description: "Open keyboard shortcuts cheat-sheet dialog",
    defaultCode: "Slash",
    defaultDisplay: "?",
    altDisplay: "Alt+H",
    allowInInput: false,
  },
] as const;

export const CONFIGURABLE_PRICE_TIERS = [
  { id: "retail", name: "Retail Price Tier", defaultCode: "KeyR", defaultDisplay: "R" },
  { id: "wholesale", name: "Wholesale Price Tier", defaultCode: "KeyW", defaultDisplay: "W" },
  { id: "special", name: "Special Price Tier", defaultCode: "KeyS", defaultDisplay: "S" },
] as const;

/**
 * Assigns unique keyboard shortcuts to categories.
 * 1. Checks explicit admin override map (by category name or ID).
 * 2. Checks category.hotKey (backend / manual extension point).
 * 3. Uses first available non-reserved letter from category name.
 * 4. Falls back to available digits 1-9.
 */
export function assignCategoryKeys(
  categories: CategoryLike[],
  overrides?: Record<string, string>,
): CategoryKeyBinding[] {
  const usedCodes = new Set<string>(["KeyA"]); // 'KeyA' is reserved for 'All categories'
  const result: CategoryKeyBinding[] = [];

  for (const cat of categories) {
    let assignedCode: string | null = null;

    // 1. Config override map (by id or name)
    if (overrides) {
      const override = overrides[cat.id] || overrides[cat.name];
      if (override) {
        const code = normalizeToKeyCode(override);
        if (code && !usedCodes.has(code)) {
          assignedCode = code;
        }
      }
    }

    // 2. Backend / manual hotKey (extension point)
    if (!assignedCode && cat.hotKey) {
      const code = normalizeToKeyCode(cat.hotKey);
      if (code && !usedCodes.has(code)) {
        assignedCode = code;
      }
    }

    // 3. Scan letters of the name for an available non-reserved letter
    if (!assignedCode) {
      const cleaned = cat.name.toUpperCase().replace(/[^A-Z]/g, "");
      for (const char of cleaned) {
        if (RESERVED_CATEGORY_LETTERS.has(char)) continue;
        const code = `Key${char}`;
        if (!usedCodes.has(code)) {
          assignedCode = code;
          break;
        }
      }
    }

    // 4. Scan digits 1-9 if all letters were taken or reserved
    if (!assignedCode) {
      for (let d = 1; d <= 9; d++) {
        const code = `Digit${d}`;
        if (!usedCodes.has(code)) {
          assignedCode = code;
          break;
        }
      }
    }

    if (assignedCode) {
      usedCodes.add(assignedCode);
      result.push({
        id: cat.id,
        name: cat.name,
        code: assignedCode,
        displayKey: keyCodeToDisplay(assignedCode),
      });
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Hotkeys] Could not assign unique key to category: "${cat.name}"`);
      }
    }
  }

  return result;
}

export function normalizeToKeyCode(keyOrCode: string): string | null {
  const trimmed = keyOrCode.trim();
  if (trimmed.startsWith("Key") || trimmed.startsWith("Digit")) return trimmed;
  if (/^F[1-9]|F1[0-2]$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^[a-zA-Z]$/.test(trimmed)) return `Key${trimmed.toUpperCase()}`;
  if (/^[0-9]$/.test(trimmed)) return `Digit${trimmed}`;
  if (trimmed === "/" || trimmed === "?") return "Slash";
  if (trimmed === "-" || trimmed === "_") return "Minus";
  if (trimmed === "=" || trimmed === "+") return "Equal";
  if (trimmed === "[" || trimmed === "{") return "BracketLeft";
  if (trimmed === "]" || trimmed === "}") return "BracketRight";
  if (trimmed === ";" || trimmed === ":") return "Semicolon";
  if (trimmed === "'" || trimmed === '"') return "Quote";
  if (trimmed === "," || trimmed === "<") return "Comma";
  if (trimmed === "." || trimmed === ">") return "Period";
  if (trimmed === "`" || trimmed === "~") return "Backquote";
  if (trimmed.toLowerCase() === "enter") return "Enter";
  if (trimmed.toLowerCase() === "escape" || trimmed.toLowerCase() === "esc") return "Escape";
  if (trimmed.toLowerCase() === "space") return "Space";
  if (trimmed.toLowerCase() === "tab") return "Tab";
  return null;
}

export function keyCodeToDisplay(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (/^F[1-9]|F1[0-2]$/.test(code)) return code;
  if (code === "Slash") return "/";
  if (code === "Escape") return "Esc";
  if (code === "Enter") return "Enter";
  if (code === "Space") return "Space";
  if (code === "Tab") return "Tab";
  if (code === "Minus") return "-";
  if (code === "Equal") return "=";
  if (code === "BracketLeft") return "[";
  if (code === "BracketRight") return "]";
  if (code === "Semicolon") return ";";
  if (code === "Quote") return "'";
  if (code === "Comma") return ",";
  if (code === "Period") return ".";
  if (code === "Backquote") return "`";
  return code;
}

export interface HotkeyConflict {
  code: string;
  displayKey: string;
  usages: string[];
}

export function detectHotkeyConflicts({
  actionKeys = {},
  categoryKeys = {},
  priceTierKeys = {},
}: {
  actionKeys?: Record<string, string>;
  categoryKeys?: Record<string, string>;
  priceTierKeys?: Record<string, string>;
}): HotkeyConflict[] {
  const codeToUsages: Record<string, string[]> = {};

  const register = (code: string | undefined, label: string) => {
    if (!code) return;
    if (!codeToUsages[code]) codeToUsages[code] = [];
    codeToUsages[code].push(label);
  };

  // Actions on the main POS screen
  for (const act of CONFIGURABLE_ACTIONS) {
    const code = actionKeys[act.id] || act.defaultCode;
    // 'help' default is '?' (Shift+Slash), which does not conflict with bare '/'
    if (act.id === "help" && code === "Slash") {
      continue;
    }
    register(code, `Action: ${act.name}`);
  }

  // Categories on the main POS screen
  for (const [catNameOrId, code] of Object.entries(categoryKeys)) {
    if (code) {
      register(code, `Category: ${catNameOrId}`);
    }
  }

  // Price Tiers inside the Add-to-Cart dialog
  const priceTierUsages: Record<string, string[]> = {};
  for (const tier of CONFIGURABLE_PRICE_TIERS) {
    const code = priceTierKeys[tier.id] || tier.defaultCode;
    if (!priceTierUsages[code]) priceTierUsages[code] = [];
    priceTierUsages[code].push(`Price Tier: ${tier.name}`);
  }

  const conflicts: HotkeyConflict[] = [];

  for (const [code, usages] of Object.entries(codeToUsages)) {
    if (usages.length > 1) {
      conflicts.push({
        code,
        displayKey: keyCodeToDisplay(code),
        usages,
      });
    }
  }

  for (const [code, usages] of Object.entries(priceTierUsages)) {
    if (usages.length > 1) {
      conflicts.push({
        code,
        displayKey: keyCodeToDisplay(code),
        usages,
      });
    }
  }

  return conflicts;
}

export const GLOBAL_SHORTCUTS: ShortcutDefinition[] = [
  // Search & Navigation
  {
    id: "search",
    label: "Focus Search",
    group: "navigation",
    codes: ["Slash", "F2", "KeyS"],
    keyDisplay: "/ or F2",
    altDisplay: "Alt+S",
    allowInInput: true,
    description: "Focus product search box and select text",
  },
  {
    id: "grid-nav",
    label: "Navigate Products",
    group: "navigation",
    codes: ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"],
    keyDisplay: "Arrow keys",
    allowInInput: false,
    description: "Move focus between product cards",
  },
  {
    id: "grid-select",
    label: "Select Product",
    group: "navigation",
    codes: ["Enter", "Space"],
    keyDisplay: "Enter",
    allowInInput: false,
    description: "Open add-to-cart for focused product",
  },
  {
    id: "escape",
    label: "Clear / Back",
    group: "navigation",
    codes: ["Escape"],
    keyDisplay: "Esc",
    allowInInput: true,
    description: "1st press clears search; 2nd press blurs; closes modals",
  },

  // Bills & Checkout
  {
    id: "customer",
    label: "Customer Selector",
    group: "bills",
    codes: ["KeyC"],
    keyDisplay: "C",
    altDisplay: "Alt+C",
    allowInInput: false,
    description: "Open and focus customer search dropdown",
  },
  {
    id: "discount",
    label: "Discount Field",
    group: "bills",
    codes: ["KeyD"],
    keyDisplay: "D",
    altDisplay: "Alt+D",
    allowInInput: false,
    description: "Focus bill discount amount input",
  },
  {
    id: "new-bill",
    label: "New Bill Tab",
    group: "bills",
    codes: ["KeyN"],
    keyDisplay: "Alt+N",
    altDisplay: "Alt+N",
    requiresAlt: true,
    allowInInput: true,
    description: "Open a new bill tab",
  },
  {
    id: "switch-bill",
    label: "Switch Bill Tab",
    group: "bills",
    codes: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9"],
    keyDisplay: "Alt+1..9",
    altDisplay: "Alt+1..9",
    requiresAlt: true,
    allowInInput: true,
    description: "Switch to bill tab number 1 through 9",
  },
  {
    id: "charge",
    label: "Charge / Checkout",
    group: "bills",
    codes: ["F9", "Enter"],
    keyDisplay: "F9",
    altDisplay: "Ctrl+Enter",
    allowInInput: true,
    description: "Proceed to payment when cart has items",
  },

  // Dialogs & Help
  {
    id: "help",
    label: "Shortcuts Cheat-Sheet",
    group: "dialogs",
    codes: ["Slash", "KeyH"],
    keyDisplay: "?",
    altDisplay: "Alt+H",
    allowInInput: false,
    description: "Show list of keyboard shortcuts",
  },
  {
    id: "dialog-confirm",
    label: "Confirm Dialog",
    group: "dialogs",
    codes: ["Enter"],
    keyDisplay: "Enter",
    allowInInput: true,
    description: "Confirm active dialog or add product to bill",
  },
  {
    id: "dialog-cancel",
    label: "Close Dialog",
    group: "dialogs",
    codes: ["Escape"],
    keyDisplay: "Esc",
    allowInInput: true,
    description: "Cancel and close active dialog",
  },
];

const PREFS_STORAGE_KEY = "pos_hotkeys_preferences_v1";

export function getHotkeysPreferences(): HotkeysPreferences {
  if (typeof window === "undefined") {
    return {
      shortcutsEnabled: true,
      showHints: true,
      actionKeys: {},
      categoryKeys: {},
      priceTierKeys: {},
    };
  }
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      return {
        shortcutsEnabled: true,
        showHints: true,
        actionKeys: {},
        categoryKeys: {},
        priceTierKeys: {},
      };
    }
    const parsed = JSON.parse(raw);
    return {
      shortcutsEnabled: parsed.shortcutsEnabled ?? true,
      showHints: parsed.showHints ?? true,
      actionKeys: parsed.actionKeys ?? {},
      categoryKeys: parsed.categoryKeys ?? {},
      priceTierKeys: parsed.priceTierKeys ?? {},
    };
  } catch {
    return {
      shortcutsEnabled: true,
      showHints: true,
      actionKeys: {},
      categoryKeys: {},
      priceTierKeys: {},
    };
  }
}

export function setHotkeysPreferences(prefs: HotkeysPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Checks whether the event target is an active editable/typing element.
 */
export function isTypingTarget(target?: EventTarget | null): boolean {
  if (!target) return false;

  const el = target as {
    tagName?: string;
    type?: string;
    isContentEditable?: boolean;
    getAttribute?: (attr: string) => string | null;
  };

  const tag = (el.tagName || "").toLowerCase();
  if (tag === "textarea" || tag === "select") return true;

  if (tag === "input") {
    const inputType = (el.type || "").toLowerCase();
    // Non-text inputs (buttons, checkboxes, radios) are not typing targets
    if (["button", "checkbox", "radio", "submit", "reset", "file", "image"].includes(inputType)) {
      return false;
    }
    return true;
  }

  if (el.isContentEditable) return true;

  const role = typeof el.getAttribute === "function" ? el.getAttribute("role") : null;
  if (role === "textbox" || role === "combobox" || role === "searchbox") return true;

  return false;
}

/**
 * Checks if any modal dialog or popover is currently open.
 */
export function isAnyDialogOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], dialog[open], [data-slot="popover-content"], [data-slot="dialog-content"]',
    ),
  );
}
