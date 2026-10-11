"use client";

import { Keyboard, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useHotkeysStore } from "@/store/hotkeys-store";
import { GLOBAL_SHORTCUTS, type CategoryKeyBinding } from "@/lib/hotkeys/config";

interface ShortcutsDialogProps {
  categoryBindings?: CategoryKeyBinding[];
}

export function ShortcutsDialog({ categoryBindings = [] }: ShortcutsDialogProps) {
  const open = useHotkeysStore((s) => s.cheatSheetOpen);
  const setOpen = useHotkeysStore((s) => s.setCheatSheetOpen);
  const shortcutsEnabled = useHotkeysStore((s) => s.shortcutsEnabled);
  const setShortcutsEnabled = useHotkeysStore((s) => s.setShortcutsEnabled);
  const showHints = useHotkeysStore((s) => s.showHints);
  const setShowHints = useHotkeysStore((s) => s.setShowHints);
  const resetPreferences = useHotkeysStore((s) => s.resetPreferences);

  const searchAndNav = GLOBAL_SHORTCUTS.filter((s) => s.group === "navigation");
  const billsAndCheckout = GLOBAL_SHORTCUTS.filter((s) => s.group === "bills");
  const dialogShortcuts = GLOBAL_SHORTCUTS.filter((s) => s.group === "dialogs");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Keyboard className="size-4" />
            </div>
            <div>
              <DialogTitle>POS Keyboard Shortcuts</DialogTitle>
              <DialogDescription>
                Fast, cashier-friendly shortcuts designed to speed up checkout.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Preferences bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="enable-shortcuts"
                size="sm"
                checked={shortcutsEnabled}
                onCheckedChange={setShortcutsEnabled}
              />
              <Label htmlFor="enable-shortcuts" className="cursor-pointer text-xs font-normal">
                Enable shortcuts
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="show-hints"
                size="sm"
                checked={showHints}
                onCheckedChange={setShowHints}
              />
              <Label htmlFor="show-hints" className="cursor-pointer text-xs font-normal flex items-center gap-1.5 whitespace-nowrap">
                <span>Show badge hints</span>
                <kbd className="font-mono text-[10px] px-1 py-0.2 rounded border bg-background font-semibold">kbd</kbd>
              </Label>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={resetPreferences}
          >
            <RotateCcw className="size-3" />
            Reset to defaults
          </Button>
        </div>

        {/* Tip banner */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
          <strong className="text-foreground">Two Layers UX:</strong> Bare keys (e.g.{" "}
          <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">W</kbd>
          ) work when outside text fields. Holding{" "}
          <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">Alt</kbd>{" "}
          (e.g.{" "}
          <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">Alt+W</kbd>
          ) highlights all shortcuts and works even while typing in search.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Categories */}
          <div className="space-y-2 rounded-lg border p-3 bg-card/60">
            <h3 className="font-semibold text-foreground flex items-center justify-between border-b pb-1">
              <span>Categories</span>
              <span className="text-[10px] font-normal text-muted-foreground">Bare / Alt+key</span>
            </h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">All Categories</span>
                <div className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">A</kbd>
                  <kbd className="rounded border bg-muted/50 px-1 py-0.5 font-mono text-[10px] text-muted-foreground">Alt+A</kbd>
                </div>
              </div>
              {categoryBindings.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-0.5">
                  <span className="truncate pr-2 text-muted-foreground">{cat.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                      {cat.displayKey}
                    </kbd>
                    <kbd className="rounded border bg-muted/50 px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                      Alt+{cat.displayKey}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search & Navigation */}
          <div className="space-y-2 rounded-lg border p-3 bg-card/60">
            <h3 className="font-semibold text-foreground border-b pb-1">Search & Grid Navigation</h3>
            <div className="space-y-1.5">
              {searchAndNav.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-0.5">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-[10px] text-muted-foreground">{s.description}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                      {s.keyDisplay}
                    </kbd>
                    {s.altDisplay && (
                      <kbd className="rounded border bg-muted/50 px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {s.altDisplay}
                      </kbd>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bills & Checkout */}
          <div className="space-y-2 rounded-lg border p-3 bg-card/60">
            <h3 className="font-semibold text-foreground border-b pb-1">Bills & Checkout</h3>
            <div className="space-y-1.5">
              {billsAndCheckout.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-0.5">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-[10px] text-muted-foreground">{s.description}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                      {s.keyDisplay}
                    </kbd>
                    {s.altDisplay && s.altDisplay !== s.keyDisplay && (
                      <kbd className="rounded border bg-muted/50 px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {s.altDisplay}
                      </kbd>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dialogs & Cart Actions */}
          <div className="space-y-2 rounded-lg border p-3 bg-card/60">
            <h3 className="font-semibold text-foreground border-b pb-1">Dialogs & Cart Line Actions</h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">Add to Cart: Auto-focus Qty</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">Auto</kbd>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">Price Tier (Retail / Wholesale / Special)</span>
                <div className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">R</kbd>
                  <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">W</kbd>
                  <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">S</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">Adjust Quantity</span>
                <div className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">+</kbd>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">-</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-muted-foreground">Delete Cart Line</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">Delete</kbd>
              </div>
              {dialogShortcuts.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">{s.label}</span>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                    {s.keyDisplay}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
