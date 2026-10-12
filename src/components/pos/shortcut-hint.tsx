"use client";

import { useHotkeysStore } from "@/store/hotkeys-store";
import { cn } from "@/lib/utils";

interface ShortcutHintProps {
  keyName: string;
  altKeyName?: string;
  className?: string;
  variant?: "badge" | "subtle";
}

export function ShortcutHint({
  keyName,
  altKeyName,
  className,
  variant = "badge",
}: ShortcutHintProps) {
  const showHints = useHotkeysStore((s) => s.showHints);
  const altHeld = useHotkeysStore((s) => s.altHeld);
  const hasKeyboard = useHotkeysStore((s) => s.hasKeyboard);

  // If user disabled hints or no keyboard has interacted yet, don't display
  if (!showHints || !hasKeyboard) return null;

  const display = altHeld && altKeyName ? altKeyName : keyName;

  return (
    <kbd
      aria-hidden="true"
      className={cn(
        "pointer-events-none inline-flex items-center justify-center font-mono font-medium select-none transition-all duration-150",
        variant === "badge" &&
          "h-4 min-w-4 px-1 rounded border border-border/80 bg-muted/80 text-[10px] text-muted-foreground shadow-xs",
        variant === "subtle" &&
          "px-1 py-0.5 rounded text-[10px] text-muted-foreground/70 bg-transparent border border-transparent",
        altHeld && "border-primary/60 bg-primary/15 text-primary font-bold ring-1 ring-primary/40 scale-105",
        className,
      )}
    >
      {display}
    </kbd>
  );
}
