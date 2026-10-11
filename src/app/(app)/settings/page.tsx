"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Settings,
  Award,
  Printer,
  ScanBarcode,
  Store,
  Monitor,
  Plus,
  Minus,
  CheckCircle2,
  Volume2,
  Wrench,
  HelpCircle,
  Save,
  RefreshCw,
} from "lucide-react";
import { RequireRole } from "@/components/shared/require-role";
import { ROLES, type StoreSettingsDto, type TerminalDto } from "@/lib/types";
import { useStoreSettings, useUpdateStoreSettings } from "@/lib/hooks/use-settings";
import {
  useTerminals,
  useUpdateTerminal,
  useSetTerminalCount,
  useCreateTerminal,
} from "@/lib/hooks/use-terminals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import { playScannerBeep, triggerTestPrint } from "@/lib/hardware-utils";

export default function SettingsPage() {
  return (
    <RequireRole roles={[ROLES.Admin]}>
      <SettingsContent />
    </RequireRole>
  );
}

function SettingsContent() {
  const settingsQuery = useStoreSettings();
  const updateSettings = useUpdateStoreSettings();

  const terminalsQuery = useTerminals(true);
  const updateTerminal = useUpdateTerminal();
  const setTerminalCount = useSetTerminalCount();
  const createTerminal = useCreateTerminal();

  // Tab 1: Global Store & Loyalty Form State
  const [storeForm, setStoreForm] = useState<Partial<StoreSettingsDto>>({});
  const [calcPreviewAmount, setCalcPreviewAmount] = useState<string>("10000");

  useEffect(() => {
    if (settingsQuery.data) {
      setStoreForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  // Tab 2: Terminal Hardware Form State
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>("");
  const [terminalForm, setTerminalForm] = useState<Partial<TerminalDto>>({});

  const terminals = terminalsQuery.data ?? [];
  const activeTerminalsCount = terminals.filter((t) => t.isActive).length;

  useEffect(() => {
    if (terminals.length > 0 && !selectedTerminalId) {
      setSelectedTerminalId(terminals[0].id);
    }
  }, [terminals, selectedTerminalId]);

  useEffect(() => {
    if (selectedTerminalId) {
      const found = terminals.find((t) => t.id === selectedTerminalId);
      if (found) {
        setTerminalForm(found);
      }
    }
  }, [selectedTerminalId, terminals]);

  // Scanner test sandbox state
  const [testBarcodeInput, setTestBarcodeInput] = useState("");
  const [lastTestedBarcode, setLastTestedBarcode] = useState<{
    code: string;
    delimiter: string;
    timestamp: string;
  } | null>(null);
  const barcodeTestInputRef = useRef<HTMLInputElement>(null);

  function handleSaveStoreSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!storeForm.storeName?.trim()) {
      toast.error("Store name is required.");
      return;
    }

    updateSettings.mutate(
      {
        loyaltyPointsEnabled: storeForm.loyaltyPointsEnabled ?? true,
        loyaltyEarningRate: Number(storeForm.loyaltyEarningRate) || 0.001,
        loyaltyMilestoneThreshold: Number(storeForm.loyaltyMilestoneThreshold) || 75000,
        loyaltyPointValue: Number(storeForm.loyaltyPointValue) || 1.0,
        loyaltyPointsExpiryMonths: Number(storeForm.loyaltyPointsExpiryMonths) || 12,
        loyaltyMilestoneGiftDescription: storeForm.loyaltyMilestoneGiftDescription || "Reward Voucher",
        storeName: storeForm.storeName,
        storeAddress: storeForm.storeAddress ?? null,
        storePhone: storeForm.storePhone ?? null,
        receiptHeader: storeForm.receiptHeader ?? "",
        receiptFooter: storeForm.receiptFooter ?? "",
        defaultPaperWidth: storeForm.defaultPaperWidth ?? "80mm",
      },
      {
        onSuccess: () => toast.success("Store and Loyalty settings saved successfully"),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  }

  function handleSaveTerminalSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTerminalId || !terminalForm.name?.trim()) {
      toast.error("Counter name is required.");
      return;
    }

    updateTerminal.mutate(
      {
        id: selectedTerminalId,
        data: {
          name: terminalForm.name,
          description: terminalForm.description ?? null,
          isActive: terminalForm.isActive ?? true,
          printerType: terminalForm.printerType ?? "BrowserDialog",
          printerAddress: terminalForm.printerAddress ?? null,
          paperWidth: terminalForm.paperWidth === "inherit" ? null : terminalForm.paperWidth ?? null,
          autoPrintReceipt: terminalForm.autoPrintReceipt ?? true,
          autoCutPaper: terminalForm.autoCutPaper ?? true,
          cashDrawerKick: terminalForm.cashDrawerKick ?? false,
          barcodeScannerType: terminalForm.barcodeScannerType ?? "KeyboardWedgeHid",
          barcodeDelimiter: terminalForm.barcodeDelimiter ?? "Enter",
          barcodeMinLength: Number(terminalForm.barcodeMinLength) || 3,
          barcodeBeepOnScan: terminalForm.barcodeBeepOnScan ?? true,
        },
      },
      {
        onSuccess: () => toast.success(`${terminalForm.name} hardware settings updated`),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  }

  function handleAdjustCounterCount(delta: number) {
    const currentActive = terminals.filter((t) => t.isActive).length;
    const target = currentActive + delta;
    if (target < 1) {
      toast.error("System requires at least 1 active cashier counter.");
      return;
    }
    if (target > 30) {
      toast.error("Maximum 30 cashier counters supported.");
      return;
    }

    setTerminalCount.mutate(
      { targetCount: target },
      {
        onSuccess: () => {
          toast.success(
            delta > 0
              ? `Added Counter ${target}. It is now ready for hardware setup.`
              : `Counter count set to ${target}. Extra counters have been deactivated safely.`
          );
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  }

  function handleTestPrintFromAdminDevice() {
    const selected = terminals.find((t) => t.id === selectedTerminalId);
    if (!selected) return;
    triggerTestPrint(selected, settingsQuery.data, "Admin Device Test");
  }

  function handleBarcodeTestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const code = testBarcodeInput.trim();
      if (code) {
        if (terminalForm.barcodeBeepOnScan) {
          playScannerBeep();
        }
        setLastTestedBarcode({
          code,
          delimiter: e.key === "Enter" ? "ENTER (CR/LF)" : "TAB",
          timestamp: new Date().toLocaleTimeString(),
        });
        setTestBarcodeInput("");
      }
    }
  }

  // Loyalty calculations preview
  const previewAmt = parseFloat(calcPreviewAmount) || 0;
  const currentRate = Number(storeForm.loyaltyEarningRate) || 0.001;
  const currentThreshold = Number(storeForm.loyaltyMilestoneThreshold) || 75000;
  const estimatedEarnedPoints = Math.round(previewAmt * currentRate * 100) / 100;
  const milestoneMultiplier = Math.floor(previewAmt / currentThreshold);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <Settings className="size-6 text-primary" />
            System & Hardware Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage store branding, loyalty point rewards, and per-counter peripheral devices.
          </p>
        </div>
      </div>

      <Tabs defaultValue="loyalty" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="loyalty" className="gap-2">
            <Award className="size-4" />
            Loyalty & Store Policy
          </TabsTrigger>
          <TabsTrigger value="terminals" className="gap-2">
            <Monitor className="size-4" />
            Cashier Counters & Hardware
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* TAB 1: LOYALTY & STORE BRANDING POLICY                        */}
        {/* ============================================================== */}
        <TabsContent value="loyalty" className="space-y-6">
          <form onSubmit={handleSaveStoreSettings} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Card 1: Loyalty Program Configurations */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="size-5 text-amber-500" />
                      Royalty & Loyalty Program
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="loyalty-switch" className="text-xs font-medium cursor-pointer">
                        {storeForm.loyaltyPointsEnabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id="loyalty-switch"
                        checked={storeForm.loyaltyPointsEnabled ?? true}
                        onCheckedChange={(checked) =>
                          setStoreForm({ ...storeForm, loyaltyPointsEnabled: checked })
                        }
                      />
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Configure customer earning rates, milestone gift thresholds, and point values.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="earning-rate" className="text-xs font-semibold">
                        Earning Rate Multiplier
                      </Label>
                      <Input
                        id="earning-rate"
                        type="number"
                        step="0.0001"
                        min="0"
                        max="1"
                        placeholder="0.001"
                        value={storeForm.loyaltyEarningRate ?? "0.001"}
                        onChange={(e) =>
                          setStoreForm({ ...storeForm, loyaltyEarningRate: parseFloat(e.target.value) })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        e.g., 0.001 = 0.1% | 0.01 = 1%
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="milestone-threshold" className="text-xs font-semibold">
                        Milestone Threshold (Rs.)
                      </Label>
                      <Input
                        id="milestone-threshold"
                        type="number"
                        step="1000"
                        min="1000"
                        placeholder="75000"
                        value={storeForm.loyaltyMilestoneThreshold ?? "75000"}
                        onChange={(e) =>
                          setStoreForm({
                            ...storeForm,
                            loyaltyMilestoneThreshold: parseFloat(e.target.value),
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Default: Rs. 75,000 milestones
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="point-value" className="text-xs font-semibold">
                        Point Redemption Value (Rs.)
                      </Label>
                      <Input
                        id="point-value"
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="1.00"
                        value={storeForm.loyaltyPointValue ?? "1.00"}
                        onChange={(e) =>
                          setStoreForm({ ...storeForm, loyaltyPointValue: parseFloat(e.target.value) })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">Rs. value per redeemed point</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="expiry-months" className="text-xs font-semibold">
                        Point Expiry Period
                      </Label>
                      <Select
                        value={String(storeForm.loyaltyPointsExpiryMonths ?? 12)}
                        onValueChange={(val) =>
                          setStoreForm({
                            ...storeForm,
                            loyaltyPointsExpiryMonths: val ? parseInt(val, 10) : 12,
                          })
                        }
                      >
                        <SelectTrigger id="expiry-months">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="12">12 Months (1 Year)</SelectItem>
                          <SelectItem value="24">24 Months (2 Years)</SelectItem>
                          <SelectItem value="0">Never Expires</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gift-desc" className="text-xs font-semibold">
                      Milestone Gift Description
                    </Label>
                    <Input
                      id="gift-desc"
                      placeholder="Special Loyalty Milestone Gift Voucher"
                      value={storeForm.loyaltyMilestoneGiftDescription ?? ""}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, loyaltyMilestoneGiftDescription: e.target.value })
                      }
                    />
                  </div>

                  {/* Real-time Rate Calculator Preview */}
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Live Rate Calculator Preview
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Test Bill: Rs.</span>
                        <Input
                          type="number"
                          className="h-6 w-24 text-xs font-mono"
                          value={calcPreviewAmount}
                          onChange={(e) => setCalcPreviewAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="rounded bg-background p-2 border">
                        <span className="text-[11px] text-muted-foreground">Points Earned:</span>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          +{estimatedEarnedPoints.toFixed(2)} pts
                        </div>
                      </div>
                      <div className="rounded bg-background p-2 border">
                        <span className="text-[11px] text-muted-foreground">Milestones Reached:</span>
                        <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                          {milestoneMultiplier} Claim(s)
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Store Branding & Receipt Header/Footer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Store className="size-5 text-primary" />
                    Store Branding & Bill Customization
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Global store contact information and header/footer printed on receipts.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="store-name" className="text-xs font-semibold">
                      Store Name
                    </Label>
                    <Input
                      id="store-name"
                      placeholder="Santhrima Store"
                      value={storeForm.storeName ?? ""}
                      onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="store-phone" className="text-xs font-semibold">
                        Contact Phone
                      </Label>
                      <Input
                        id="store-phone"
                        placeholder="+94 11 234 5678"
                        value={storeForm.storePhone ?? ""}
                        onChange={(e) => setStoreForm({ ...storeForm, storePhone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="default-paper" className="text-xs font-semibold">
                        Default Receipt Paper Width
                      </Label>
                      <Select
                        value={storeForm.defaultPaperWidth ?? "80mm"}
                        onValueChange={(val) =>
                          setStoreForm({ ...storeForm, defaultPaperWidth: val || "80mm" })
                        }
                      >
                        <SelectTrigger id="default-paper">
                          <SelectValue placeholder="Paper Width" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="80mm">80mm (Standard POS)</SelectItem>
                          <SelectItem value="58mm">58mm (Compact Mobile)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="store-address" className="text-xs font-semibold">
                      Store Address
                    </Label>
                    <Input
                      id="store-address"
                      placeholder="Main Street, Colombo, Sri Lanka"
                      value={storeForm.storeAddress ?? ""}
                      onChange={(e) => setStoreForm({ ...storeForm, storeAddress: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="receipt-header" className="text-xs font-semibold">
                      Receipt Header Message
                    </Label>
                    <Textarea
                      id="receipt-header"
                      rows={2}
                      placeholder="Welcome to Santhrima Store&#10;Your friendly grocery partner"
                      value={storeForm.receiptHeader ?? ""}
                      onChange={(e) => setStoreForm({ ...storeForm, receiptHeader: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="receipt-footer" className="text-xs font-semibold">
                      Receipt Footer Thank-You Note
                    </Label>
                    <Textarea
                      id="receipt-footer"
                      rows={2}
                      placeholder="Thank you for shopping with us!&#10;Goods once sold cannot be returned without bill."
                      value={storeForm.receiptFooter ?? ""}
                      onChange={(e) => setStoreForm({ ...storeForm, receiptFooter: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateSettings.isPending} className="gap-2">
                <Save className="size-4" />
                {updateSettings.isPending ? "Saving Settings..." : "Save Store & Loyalty Settings"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: CASHIER COUNTERS & PERIPHERAL HARDWARE                 */}
        {/* ============================================================== */}
        <TabsContent value="terminals" className="space-y-6">
          {/* Counter Stepper Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Cashier Counters Provisioning</h2>
                <Badge variant="secondary" className="font-mono">
                  {activeTerminalsCount} Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Set total cashier counters. Adding counters creates new terminals; decreasing deactivates extra counters safely.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Active Counters:</span>
              <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={activeTerminalsCount <= 1 || setTerminalCount.isPending}
                  onClick={() => handleAdjustCounterCount(-1)}
                  title="Deactivate highest counter"
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-8 text-center font-bold text-sm">{activeTerminalsCount}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={setTerminalCount.isPending}
                  onClick={() => handleAdjustCounterCount(1)}
                  title="Provision next counter"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Terminal Selection Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {terminals.map((terminal) => (
              <button
                key={terminal.id}
                type="button"
                onClick={() => setSelectedTerminalId(terminal.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  selectedTerminalId === terminal.id
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card hover:bg-muted/60 text-muted-foreground"
                } ${!terminal.isActive ? "opacity-50 line-through" : ""}`}
              >
                <Monitor className="size-3.5" />
                <span>{terminal.name}</span>
                <span className="font-mono text-[10px] opacity-70">({terminal.terminalCode})</span>
                {!terminal.isActive && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-destructive text-destructive">
                    Inactive
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {selectedTerminalId && (
            <form onSubmit={handleSaveTerminalSettings} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Printer Configuration Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Printer className="size-5 text-primary" />
                        Receipt Printer Setup
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">
                        {terminalForm.terminalCode}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Configure paper width, connection method, and automatic cut/kick actions.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="printer-type" className="text-xs font-semibold">
                        Printer Connection Type
                      </Label>
                      <Select
                        value={terminalForm.printerType ?? "BrowserDialog"}
                        onValueChange={(val) =>
                          setTerminalForm({ ...terminalForm, printerType: val || "BrowserDialog" })
                        }
                      >
                        <SelectTrigger id="printer-type">
                          <SelectValue placeholder="Select connection" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BrowserDialog">
                            Browser Print Dialog (Any Windows / System Driver)
                          </SelectItem>
                          <SelectItem value="NetworkEscPos">
                            Network ESC/POS (Direct Ethernet / Wi-Fi)
                          </SelectItem>
                          <SelectItem value="UsbSerial">USB / Serial COM Port</SelectItem>
                          <SelectItem value="Bluetooth">Bluetooth POS Printer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="printer-addr" className="text-xs font-semibold">
                        Printer IP Address / COM Port
                      </Label>
                      <Input
                        id="printer-addr"
                        placeholder={
                          terminalForm.printerType === "NetworkEscPos"
                            ? "192.168.1.150:9100"
                            : terminalForm.printerType === "UsbSerial"
                            ? "COM3"
                            : "Local System Printer"
                        }
                        value={terminalForm.printerAddress ?? ""}
                        onChange={(e) =>
                          setTerminalForm({ ...terminalForm, printerAddress: e.target.value })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {terminalForm.printerType === "NetworkEscPos"
                          ? "Enter IP:Port (e.g. 192.168.1.150:9100)"
                          : "Leave blank for default local workstation printer."}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="paper-width" className="text-xs font-semibold">
                        Receipt Paper Width
                      </Label>
                      <Select
                        value={terminalForm.paperWidth || "inherit"}
                        onValueChange={(val) =>
                          setTerminalForm({
                            ...terminalForm,
                            paperWidth: val === "inherit" ? null : val,
                          })
                        }
                      >
                        <SelectTrigger id="paper-width">
                          <SelectValue placeholder="Inherit global default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inherit">
                            Inherit Global Default ({storeForm.defaultPaperWidth || "80mm"})
                          </SelectItem>
                          <SelectItem value="80mm">80mm (Standard POS)</SelectItem>
                          <SelectItem value="58mm">58mm (Compact Mobile)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="auto-print" className="text-xs font-medium cursor-pointer">
                            Auto-Print Receipt on Sale Completion
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Automatically triggers bill printing when payment is submitted.
                          </p>
                        </div>
                        <Switch
                          id="auto-print"
                          checked={terminalForm.autoPrintReceipt ?? true}
                          onCheckedChange={(c) =>
                            setTerminalForm({ ...terminalForm, autoPrintReceipt: c })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="auto-cut" className="text-xs font-medium cursor-pointer">
                            Auto Paper Cut
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Sends partial cut pulse command after printing receipt.
                          </p>
                        </div>
                        <Switch
                          id="auto-cut"
                          checked={terminalForm.autoCutPaper ?? true}
                          onCheckedChange={(c) =>
                            setTerminalForm({ ...terminalForm, autoCutPaper: c })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="drawer-kick" className="text-xs font-medium cursor-pointer">
                            Cash Drawer Kick Signal
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Sends pulse to open the cash drawer when completing a cash transaction.
                          </p>
                        </div>
                        <Switch
                          id="drawer-kick"
                          checked={terminalForm.cashDrawerKick ?? false}
                          onCheckedChange={(c) =>
                            setTerminalForm({ ...terminalForm, cashDrawerKick: c })
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold">Test Receipt Slip</p>
                          <p className="text-[11px] text-muted-foreground">
                            Prints a test slip with counter details from this browser.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleTestPrintFromAdminDevice}
                          className="gap-1.5 text-xs"
                        >
                          <Printer className="size-3.5" />
                          Test from this device
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        * Note: To test the physical printer on-site, cashiers can use &quot;Test Hardware&quot; directly on their counter terminal.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Barcode Scanner Configuration Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ScanBarcode className="size-5 text-primary" />
                      Barcode Reader / Scanner Setup
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Set up barcode reader input method, delimiter key, and audio beep confirmation.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="scanner-type" className="text-xs font-semibold">
                        Scanner Input Mode
                      </Label>
                      <Select
                        value={terminalForm.barcodeScannerType ?? "KeyboardWedgeHid"}
                        onValueChange={(val) =>
                          setTerminalForm({ ...terminalForm, barcodeScannerType: val || "KeyboardWedgeHid" })
                        }
                      >
                        <SelectTrigger id="scanner-type">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KeyboardWedgeHid">
                            Keyboard Wedge / HID (USB or Bluetooth Scanner)
                          </SelectItem>
                          <SelectItem value="DirectSerial">Direct Serial / Virtual COM</SelectItem>
                          <SelectItem value="CameraWebcam">Webcam / Camera Scanner</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Standard handheld POS barcode scanners use Keyboard Wedge mode.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="scanner-delimiter" className="text-xs font-semibold">
                          Barcode Delimiter (Suffix)
                        </Label>
                        <Select
                          value={terminalForm.barcodeDelimiter ?? "Enter"}
                          onValueChange={(val) =>
                            setTerminalForm({ ...terminalForm, barcodeDelimiter: val || "Enter" })
                          }
                        >
                          <SelectTrigger id="scanner-delimiter">
                            <SelectValue placeholder="Delimiter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Enter">Enter Key (CR / LF)</SelectItem>
                            <SelectItem value="Tab">Tab Key</SelectItem>
                            <SelectItem value="None">None (Fixed timer)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="scanner-min-len" className="text-xs font-semibold">
                          Min Barcode Length
                        </Label>
                        <Input
                          id="scanner-min-len"
                          type="number"
                          min="1"
                          max="20"
                          value={terminalForm.barcodeMinLength ?? 3}
                          onChange={(e) =>
                            setTerminalForm({
                              ...terminalForm,
                              barcodeMinLength: parseInt(e.target.value, 10) || 3,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <Label htmlFor="scan-beep" className="text-xs font-medium cursor-pointer">
                          Audio Beep on Successful Scan
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Emits sound feedback when a barcode is scanned into the POS cart.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => playScannerBeep()}
                        >
                          <Volume2 className="size-3.5 mr-1" /> Test Beep
                        </Button>
                        <Switch
                          id="scan-beep"
                          checked={terminalForm.barcodeBeepOnScan ?? true}
                          onCheckedChange={(c) =>
                            setTerminalForm({ ...terminalForm, barcodeBeepOnScan: c })
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Interactive Scanner Sandbox on Admin Device */}
                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">
                          Scanner Live Sandbox (Test from this device)
                        </Label>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Delimiter: {terminalForm.barcodeDelimiter}
                        </span>
                      </div>
                      <Input
                        ref={barcodeTestInputRef}
                        placeholder="Scan or type barcode here and press Enter..."
                        value={testBarcodeInput}
                        onChange={(e) => setTestBarcodeInput(e.target.value)}
                        onKeyDown={handleBarcodeTestKeyDown}
                        className="font-mono text-xs"
                      />

                      {lastTestedBarcode && (
                        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                            {lastTestedBarcode.code}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {lastTestedBarcode.delimiter} · {lastTestedBarcode.timestamp}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Counter Details */}
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="counter-name" className="text-xs font-semibold">
                          Counter Display Name
                        </Label>
                        <Input
                          id="counter-name"
                          value={terminalForm.name ?? ""}
                          onChange={(e) => setTerminalForm({ ...terminalForm, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="counter-desc" className="text-xs font-semibold">
                          Counter Notes / Description
                        </Label>
                        <Input
                          id="counter-desc"
                          placeholder="e.g. Main checkout lane near entrance"
                          value={terminalForm.description ?? ""}
                          onChange={(e) =>
                            setTerminalForm({ ...terminalForm, description: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="submit" disabled={updateTerminal.isPending} className="gap-2">
                  <Save className="size-4" />
                  {updateTerminal.isPending
                    ? "Updating Counter..."
                    : `Save ${terminalForm.name || "Counter"} Hardware Settings`}
                </Button>
              </div>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
