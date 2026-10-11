"use client";

import { useState, useRef, useEffect } from "react";
import { Printer, ScanBarcode, Volume2, CheckCircle2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveTerminal } from "@/lib/hooks/use-active-terminal";
import { playScannerBeep, triggerTestPrint } from "@/lib/hardware-utils";

export function HardwareTestModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { activeTerminal, storeSettings, effectivePaperWidth } = useActiveTerminal();

  // Barcode test state
  const [testInput, setTestInput] = useState("");
  const [lastScanned, setLastScanned] = useState<{
    barcode: string;
    length: number;
    timestamp: string;
    delimiter: string;
  } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  }, [open]);

  if (!activeTerminal) return null;

  function handleTestPrint() {
    if (!activeTerminal) return;
    triggerTestPrint(activeTerminal, storeSettings, `Station: ${activeTerminal.name}`);
  }

  function handlePlayBeep() {
    playScannerBeep();
  }

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const code = testInput.trim();
      if (code) {
        if (activeTerminal?.barcodeBeepOnScan) {
          playScannerBeep();
        }
        setLastScanned({
          barcode: code,
          length: code.length,
          timestamp: new Date().toLocaleTimeString(),
          delimiter: e.key === "Enter" ? "ENTER (CR/LF)" : "TAB",
        });
        setTestInput("");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Hardware Diagnostics: {activeTerminal.name}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono">
              {activeTerminal.terminalCode}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Test and verify printer connection and barcode scanner responsiveness on this physical cashier counter.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="printer" className="space-y-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="printer" className="gap-2">
              <Printer className="size-4" />
              Receipt Printer
            </TabsTrigger>
            <TabsTrigger value="scanner" className="gap-2">
              <ScanBarcode className="size-4" />
              Barcode Scanner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="printer" className="space-y-4">
            <div className="rounded-lg border p-3.5 space-y-2 text-xs bg-muted/20">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Printer Type:</span>
                <span className="font-semibold">{activeTerminal.printerType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Printer Address / Port:</span>
                <span className="font-mono">{activeTerminal.printerAddress || "Local / Browser Default"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paper Width:</span>
                <span className="font-semibold">{effectivePaperWidth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auto-Cut Paper:</span>
                <span>{activeTerminal.autoCutPaper ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Drawer Pulse:</span>
                <span>{activeTerminal.cashDrawerKick ? "Yes" : "No"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div>
                <p className="text-xs font-semibold">Test Receipt Slip</p>
                <p className="text-[11px] text-muted-foreground">
                  Send a sample formatted test slip with counter details & alignment check.
                </p>
              </div>
              <Button size="sm" onClick={handleTestPrint} className="gap-1.5">
                <Printer className="size-3.5" />
                Print Test Slip
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="scanner" className="space-y-4">
            <div className="rounded-lg border p-3.5 space-y-2 text-xs bg-muted/20">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scanner Mode:</span>
                <span className="font-semibold">{activeTerminal.barcodeScannerType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Delimiter:</span>
                <span className="font-mono">{activeTerminal.barcodeDelimiter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audio Beep on Scan:</span>
                <span className="flex items-center gap-1.5 font-medium">
                  {activeTerminal.barcodeBeepOnScan ? "Enabled" : "Disabled"}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={handlePlayBeep}
                  >
                    <Volume2 className="size-3 mr-0.5" /> Test Sound
                  </Button>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Scan Test Sandbox</Label>
              <Input
                ref={barcodeInputRef}
                placeholder="Point barcode scanner here and scan..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Trigger your physical handheld scanner into the box above. It should automatically detect the delimiter ({activeTerminal.barcodeDelimiter}) and beep.
              </p>
            </div>

            {lastScanned && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1 text-xs">
                <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Scan Captured Successfully
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {lastScanned.timestamp}
                  </span>
                </div>
                <div className="font-mono text-base font-bold tracking-wider text-emerald-950 dark:text-emerald-100">
                  {lastScanned.barcode}
                </div>
                <div className="flex gap-4 text-[11px] text-emerald-700/80 dark:text-emerald-400">
                  <span>Length: {lastScanned.length} chars</span>
                  <span>Delimiter: {lastScanned.delimiter}</span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
