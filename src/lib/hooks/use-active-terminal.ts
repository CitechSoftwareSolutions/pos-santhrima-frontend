"use client";

import { useState, useEffect } from "react";
import { useTerminals } from "./use-terminals";
import { useStoreSettings } from "./use-settings";
import type { TerminalDto } from "@/lib/types";

const TERMINAL_STORAGE_KEY = "pos_assigned_terminal_id";

export function useActiveTerminal() {
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const terminalsQuery = useTerminals(true);
  const settingsQuery = useStoreSettings();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TERMINAL_STORAGE_KEY);
      setAssignedId(stored);
    } catch {
      // localStorage may fail in restricted contexts
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const activeTerminal: TerminalDto | null =
    terminalsQuery.data?.find((t) => t.id === assignedId && t.isActive) ?? null;

  // Determine effective paper width (inherits from store settings if terminal width is null)
  const effectivePaperWidth =
    activeTerminal?.paperWidth || settingsQuery.data?.defaultPaperWidth || "80mm";

  function assignTerminal(id: string) {
    try {
      localStorage.setItem(TERMINAL_STORAGE_KEY, id);
      setAssignedId(id);
    } catch {
      // ignore
    }
  }

  function clearAssignedTerminal() {
    try {
      localStorage.removeItem(TERMINAL_STORAGE_KEY);
      setAssignedId(null);
    } catch {
      // ignore
    }
  }

  return {
    assignedId,
    activeTerminal,
    terminals: terminalsQuery.data ?? [],
    storeSettings: settingsQuery.data ?? null,
    effectivePaperWidth,
    isLoading: !isLoaded || terminalsQuery.isLoading,
    isAssigned: !!activeTerminal,
    hasNoStoredTerminal: isLoaded && !assignedId,
    assignTerminal,
    clearAssignedTerminal,
  };
}
