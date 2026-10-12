import { isTypingTarget, type ShortcutDefinition } from "./config";

export interface KeyEventLike {
  code: string;
  key?: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  target?: EventTarget | null;
}

export interface MatchOptions {
  allowInInput?: boolean;
  requiresAlt?: boolean;
  requiresCtrl?: boolean;
  requiresShift?: boolean;
}

/**
 * Checks if a key event matches a given shortcut code and modifier specification.
 */
export function matchesKeyEvent(
  e: KeyEventLike,
  targetCode: string,
  options: MatchOptions = {},
): boolean {
  if (e.isComposing) return false;

  // Key code match check
  if (e.code !== targetCode) return false;

  const inInput = isTypingTarget(e.target);

  // If in input and shortcut is not allowed in input, ignore
  if (inInput && !options.allowInInput) return false;

  // Modifier checks
  if (options.requiresAlt) {
    if (!e.altKey) return false;
  }
  if (options.requiresCtrl) {
    if (!e.ctrlKey && !e.metaKey) return false;
  } else if (!options.requiresAlt && !options.requiresCtrl) {
    // For standard shortcuts, don't trigger if Ctrl or Meta is pressed (protect Ctrl+C, Ctrl+V, etc.)
    if (e.ctrlKey || e.metaKey) return false;
  }

  if (options.requiresShift !== undefined) {
    if (e.shiftKey !== options.requiresShift) return false;
  }

  return true;
}

/**
 * Checks if a key event matches a category switch key (either bare key or Alt+key).
 */
export function matchesCategoryKey(
  e: KeyEventLike,
  code: string,
  dialogOpen = false,
): { matches: boolean; isAlt: boolean } {
  if (e.isComposing) return { matches: false, isAlt: false };
  if (e.ctrlKey || e.metaKey) return { matches: false, isAlt: false };
  if (e.code !== code) return { matches: false, isAlt: false };

  const inInput = isTypingTarget(e.target);

  // Alt + key works everywhere, even inside input or search
  if (e.altKey) {
    return { matches: true, isAlt: true };
  }

  // Bare key only works if NOT in input and NO dialog is open
  if (!inInput && !dialogOpen && !e.shiftKey) {
    return { matches: true, isAlt: false };
  }

  return { matches: false, isAlt: false };
}

/**
 * Determines whether a general shortcut matches.
 */
export function matchesShortcut(
  e: KeyEventLike,
  shortcut: ShortcutDefinition,
  dialogOpen = false,
): boolean {
  if (e.isComposing) return false;
  if (!shortcut.codes.includes(e.code)) return false;

  const inInput = isTypingTarget(e.target);

  // Esc and special F-keys/Ctrl combos can be allowed in inputs
  if (inInput && !shortcut.allowInInput && !e.altKey) {
    return false;
  }

  // Bare key blocked if dialog open (unless it's a dialog shortcut)
  if (dialogOpen && shortcut.group !== "dialogs" && !e.altKey) {
    return false;
  }

  if (shortcut.requiresAlt && !e.altKey) {
    return false;
  }

  if (shortcut.requiresCtrl && !(e.ctrlKey || e.metaKey)) {
    return false;
  }

  // Protect standard Ctrl/Meta combinations unless specifically requested
  if (!shortcut.requiresCtrl && (e.ctrlKey || e.metaKey)) {
    return false;
  }

  return true;
}
