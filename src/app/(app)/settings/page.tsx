"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Keyboard,
  KeyRound,
  AlertTriangle,
  RotateCcw,
  Zap,
  Sparkles,
  Command,
  Search,
  Check,
  X,
  Sliders,
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
import { useCategories } from "@/lib/hooks/use-categories";
import { useHotkeysStore } from "@/store/hotkeys-store";
import {
  CONFIGURABLE_ACTIONS,
  CONFIGURABLE_PRICE_TIERS,
  detectHotkeyConflicts,
  keyCodeToDisplay,
  assignCategoryKeys,
  type HotkeysPreferences,
} from "@/lib/hotkeys/config";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import { playScannerBeep, triggerTestPrint } from "@/lib/hardware-utils";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <RequireRole roles={[ROLES.Admin]}>
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading settings...</div>}>
        <SettingsContent />
      </Suspense>
    </RequireRole>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam === "shortcuts" ? "shortcuts" : "loyalty");

  useEffect(() => {
    if (tabParam === "shortcuts") {
      setActiveTab("shortcuts");
    }
  }, [tabParam]);

  const settingsQuery = useStoreSettings();
  const updateSettings = useUpdateStoreSettings();

  const terminalsQuery = useTerminals(true);
  const updateTerminal = useUpdateTerminal();
  const setTerminalCount = useSetTerminalCount();
  const createTerminal = useCreateTerminal();

  const categoriesQuery = useCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const hotkeysStore = useHotkeysStore();

  // Tab 1: Global Store & Loyalty Form State
  const [storeForm, setStoreForm] = useState<Partial<StoreSettingsDto>>({});
  const [calcPreviewAmount, setCalcPreviewAmount] = useState<string>("10000");

  // Tab 3: Hotkey Bindings Form State
  const [hotkeysForm, setHotkeysForm] = useState<HotkeysPreferences>({
    shortcutsEnabled: true,
    showHints: true,
    actionKeys: {},
    categoryKeys: {},
    priceTierKeys: {},
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setStoreForm(settingsQuery.data);

      if (settingsQuery.data.hotkeyBindingsJson) {
        try {
          const parsed = JSON.parse(settingsQuery.data.hotkeyBindingsJson);
          setHotkeysForm({
            shortcutsEnabled: parsed.shortcutsEnabled ?? true,
            showHints: parsed.showHints ?? true,
            actionKeys: parsed.actionKeys ?? {},
            categoryKeys: parsed.categoryKeys ?? {},
            priceTierKeys: parsed.priceTierKeys ?? {},
          });
          hotkeysStore.syncFromStoreSettings(settingsQuery.data.hotkeyBindingsJson);
        } catch {
          // ignore parsing error
        }
      } else {
        setHotkeysForm({
          shortcutsEnabled: hotkeysStore.shortcutsEnabled,
          showHints: hotkeysStore.showHints,
          actionKeys: hotkeysStore.actionKeys,
          categoryKeys: hotkeysStore.categoryKeys,
          priceTierKeys: hotkeysStore.priceTierKeys,
        });
      }
    }
  }, [settingsQuery.data]);

  // Tab 2: Terminal Hardware Form State
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>("");
  const [terminalForm, setTerminalForm] = useState<Partial<TerminalDto>>({});

  const terminals = useMemo(() => terminalsQuery.data ?? [], [terminalsQuery.data]);
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

  // Key recorder modal state
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [recordTarget, setRecordTarget] = useState<{
    type: "action" | "category" | "priceTier";
    id: string;
    label: string;
    currentCode: string;
    defaultCode: string;
  } | null>(null);
  const [capturedCode, setCapturedCode] = useState<string>("");

  useEffect(() => {
    if (!recorderOpen) return;

    function handleCapture(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
        return;
      }

      if (e.code === "F5" || e.code === "F12") {
        toast.warning("F5 and F12 are reserved by the browser.");
        return;
      }

      setCapturedCode(e.code);
    }

    window.addEventListener("keydown", handleCapture, true);
    return () => window.removeEventListener("keydown", handleCapture, true);
  }, [recorderOpen]);

  function handleOpenRecorder(target: {
    type: "action" | "category" | "priceTier";
    id: string;
    label: string;
    currentCode: string;
    defaultCode: string;
  }) {
    setRecordTarget(target);
    setCapturedCode(target.currentCode);
    setRecorderOpen(true);
  }

  function handleCommitRecording() {
    if (!recordTarget || !capturedCode) return;

    if (recordTarget.type === "action") {
      setHotkeysForm((prev) => ({
        ...prev,
        actionKeys: { ...prev.actionKeys, [recordTarget.id]: capturedCode },
      }));
    } else if (recordTarget.type === "category") {
      setHotkeysForm((prev) => ({
        ...prev,
        categoryKeys: { ...prev.categoryKeys, [recordTarget.id]: capturedCode },
      }));
    } else if (recordTarget.type === "priceTier") {
      setHotkeysForm((prev) => ({
        ...prev,
        priceTierKeys: { ...prev.priceTierKeys, [recordTarget.id]: capturedCode },
      }));
    }

    setRecorderOpen(false);
    toast.success(`Assigned ${keyCodeToDisplay(capturedCode)} to "${recordTarget.label}"`);
  }

  function handleClearKey() {
    if (!recordTarget) return;

    if (recordTarget.type === "action") {
      setHotkeysForm((prev) => {
        const next = { ...prev.actionKeys };
        delete next[recordTarget.id];
        return { ...prev, actionKeys: next };
      });
    } else if (recordTarget.type === "category") {
      setHotkeysForm((prev) => {
        const next = { ...prev.categoryKeys };
        delete next[recordTarget.id];
        return { ...prev, categoryKeys: next };
      });
    } else if (recordTarget.type === "priceTier") {
      setHotkeysForm((prev) => {
        const next = { ...prev.priceTierKeys };
        delete next[recordTarget.id];
        return { ...prev, priceTierKeys: next };
      });
    }

    setRecorderOpen(false);
    toast.info(`Reset "${recordTarget.label}" back to system default.`);
  }

  // Interactive Live Key Sandbox State
  const [sandboxEvent, setSandboxEvent] = useState<{
    code: string;
    display: string;
    actionLabel: string;
    timestamp: string;
  } | null>(null);

  const assignedCategoryBindings = useMemo(
    () => assignCategoryKeys(categories, hotkeysForm.categoryKeys),
    [categories, hotkeysForm.categoryKeys]
  );

  const conflicts = useMemo(
    () =>
      detectHotkeyConflicts({
        actionKeys: hotkeysForm.actionKeys,
        categoryKeys: hotkeysForm.categoryKeys,
        priceTierKeys: hotkeysForm.priceTierKeys,
      }),
    [hotkeysForm]
  );

  function handleSandboxKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault();
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;

    const code = e.code;
    let matchedLabel = "No action mapped to this key";

    for (const act of CONFIGURABLE_ACTIONS) {
      const activeCode = hotkeysForm.actionKeys?.[act.id] || act.defaultCode;
      if (activeCode === code) {
        matchedLabel = `POS Action: ${act.name}`;
        break;
      }
    }

    if (matchedLabel.startsWith("No action")) {
      for (const tier of CONFIGURABLE_PRICE_TIERS) {
        const activeCode = hotkeysForm.priceTierKeys?.[tier.id] || tier.defaultCode;
        if (activeCode === code) {
          matchedLabel = `Price Tier: ${tier.name}`;
          break;
        }
      }
    }

    if (matchedLabel.startsWith("No action")) {
      const foundCat = assignedCategoryBindings.find((b) => b.code === code);
      if (foundCat) {
        matchedLabel = `Category Filter: ${foundCat.name}`;
      }
    }

    setSandboxEvent({
      code,
      display: keyCodeToDisplay(code),
      actionLabel: matchedLabel,
      timestamp: new Date().toLocaleTimeString(),
    });
  }

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
        hotkeyBindingsJson: storeForm.hotkeyBindingsJson ?? (settingsQuery.data?.hotkeyBindingsJson || null),
      },
      {
        onSuccess: () => toast.success("Store and Loyalty settings saved successfully"),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  }

  function handleSaveHotkeySettings(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const json = JSON.stringify(hotkeysForm);
    hotkeysStore.setAllCustomizations(hotkeysForm);

    updateSettings.mutate(
      {
        loyaltyPointsEnabled: storeForm.loyaltyPointsEnabled ?? true,
        loyaltyEarningRate: Number(storeForm.loyaltyEarningRate) || 0.001,
        loyaltyMilestoneThreshold: Number(storeForm.loyaltyMilestoneThreshold) || 75000,
        loyaltyPointValue: Number(storeForm.loyaltyPointValue) || 1.0,
        loyaltyPointsExpiryMonths: Number(storeForm.loyaltyPointsExpiryMonths) || 12,
        loyaltyMilestoneGiftDescription: storeForm.loyaltyMilestoneGiftDescription || "Reward Voucher",
        storeName: storeForm.storeName || "Santhrima Store",
        storeAddress: storeForm.storeAddress ?? null,
        storePhone: storeForm.storePhone ?? null,
        receiptHeader: storeForm.receiptHeader ?? "",
        receiptFooter: storeForm.receiptFooter ?? "",
        defaultPaperWidth: storeForm.defaultPaperWidth ?? "80mm",
        hotkeyBindingsJson: json,
      },
      {
        onSuccess: () => {
          toast.success("POS keyboard shortcut key presses saved successfully across all terminals!");
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  }

  function handleResetAllHotkeys() {
    const defaults: HotkeysPreferences = {
      shortcutsEnabled: true,
      showHints: true,
      actionKeys: {},
      categoryKeys: {},
      priceTierKeys: {},
    };
    setHotkeysForm(defaults);
    hotkeysStore.resetPreferences();
    toast.info("Restored all hotkeys to system defaults. Click 'Save Key Presses' to commit to database.");
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-2xl h-auto p-1 gap-1">
          <TabsTrigger value="loyalty" className="gap-2 py-2">
            <Award className="size-4" />
            Loyalty & Store Policy
          </TabsTrigger>
          <TabsTrigger value="terminals" className="gap-2 py-2">
            <Monitor className="size-4" />
            Cashier Counters & Hardware
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-2 py-2">
            <Keyboard className="size-4" />
            POS Shortcuts & Key Presses
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

        {/* ============================================================== */}
        {/* TAB 3: KEYBOARD SHORTCUTS & KEY PRESSES CONFIGURATION         */}
        {/* ============================================================== */}
        <TabsContent value="shortcuts" className="space-y-6">
          {/* Header Summary & Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-base text-foreground flex items-center gap-2">
                  <Keyboard className="size-5 text-primary" />
                  Cashier Key Presses & POS Shortcuts
                </span>
                <Badge variant={hotkeysForm.shortcutsEnabled ? "default" : "secondary"}>
                  {hotkeysForm.shortcutsEnabled ? "Hotkeys Active" : "Disabled"}
                </Badge>
                {conflicts.length > 0 ? (
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <AlertTriangle className="size-3" />
                    {conflicts.length} Key Conflict{conflicts.length > 1 ? "s" : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    No Conflicts
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Super Admins can customize the physical key combinations for all checkout cashiers. Changes sync across all workstations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleResetAllHotkeys}
              >
                <RotateCcw className="size-3.5" />
                Reset Defaults
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs gap-1.5"
                disabled={updateSettings.isPending}
                onClick={() => handleSaveHotkeySettings()}
              >
                <Save className="size-3.5" />
                {updateSettings.isPending ? "Saving..." : "Save Key Presses"}
              </Button>
            </div>
          </div>

          {/* Conflict Alert Banner if any conflicts exist */}
          {conflicts.length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                Warning: Multiple actions share the same physical key!
              </div>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-5">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    Key <kbd className="font-mono font-bold text-foreground px-1 py-0.5 rounded border bg-background">{c.displayKey}</kbd> is used by:{" "}
                    <span className="font-medium text-foreground">{c.usages.join(" AND ")}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">
                Tip: Click &quot;Change Key&quot; on any item below to assign a unique letter (A-Z) or function key (F1-F12).
              </p>
            </div>
          )}

          {/* Settings Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column: System Options + Core Navigation Actions */}
            <div className="space-y-6">
              {/* Card 1: System Policies */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sliders className="size-4 text-primary" />
                    Global Shortcut Behaviors
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure whether keyboard navigation is enabled and if badge hints appear.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                    <div className="space-y-0.5">
                      <Label htmlFor="hk-enabled" className="text-sm font-medium cursor-pointer">
                        Enable POS Keyboard Shortcuts
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Allow cashiers to use keyboard keys to navigate categories, add items, and charge.
                      </p>
                    </div>
                    <Switch
                      id="hk-enabled"
                      checked={hotkeysForm.shortcutsEnabled}
                      onCheckedChange={(checked) =>
                        setHotkeysForm((prev) => ({ ...prev, shortcutsEnabled: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                    <div className="space-y-0.5">
                      <Label htmlFor="hk-hints" className="text-sm font-medium cursor-pointer">
                        Display Shortcut Badge Hints on Screen
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Shows compact key badges next to buttons (and highlights on holding <kbd className="text-[10px] font-mono px-1 rounded border bg-background">Alt</kbd>).
                      </p>
                    </div>
                    <Switch
                      id="hk-hints"
                      checked={hotkeysForm.showHints}
                      onCheckedChange={(checked) =>
                        setHotkeysForm((prev) => ({ ...prev, showHints: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Core POS Navigation & Action Keys */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Command className="size-4 text-primary" />
                    POS Action Key Presses
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click &quot;Change Key&quot; to press and record any physical key for each cashier action.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {CONFIGURABLE_ACTIONS.map((action) => {
                    const activeCode = hotkeysForm.actionKeys?.[action.id] || action.defaultCode;
                    const isCustom = Boolean(hotkeysForm.actionKeys?.[action.id]);
                    const display = keyCodeToDisplay(activeCode);

                    return (
                      <div
                        key={action.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          isCustom ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/30"
                        )}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{action.name}</span>
                            {isCustom && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-primary/40 text-primary">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                          <p className="text-[11px] text-muted-foreground/70">
                            Default: <kbd className="font-mono font-semibold">{action.defaultDisplay}</kbd>
                            {action.altDisplay ? ` · Also: ${action.altDisplay}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <kbd
                            className={cn(
                              "min-w-10 text-center font-mono text-xs font-bold px-2.5 py-1 rounded-md border shadow-2xs",
                              isCustom
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-foreground border-border"
                            )}
                          >
                            {display}
                          </kbd>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() =>
                              handleOpenRecorder({
                                type: "action",
                                id: action.id,
                                label: action.name,
                                currentCode: activeCode,
                                defaultCode: action.defaultCode,
                              })
                            }
                          >
                            <KeyRound className="size-3.5" />
                            Change Key
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Card 3: Price Tier Shortcuts */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-amber-500" />
                    Add-to-Cart Price Tier Keys
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Quickly switch between Retail, Wholesale, or Special pricing when the quantity popup is open.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {CONFIGURABLE_PRICE_TIERS.map((tier) => {
                    const activeCode = hotkeysForm.priceTierKeys?.[tier.id] || tier.defaultCode;
                    const isCustom = Boolean(hotkeysForm.priceTierKeys?.[tier.id]);
                    const display = keyCodeToDisplay(activeCode);

                    return (
                      <div
                        key={tier.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          isCustom ? "bg-amber-500/5 border-amber-500/30" : "bg-card hover:bg-muted/30"
                        )}
                      >
                        <div className="space-y-0.5">
                          <span className="font-medium text-sm text-foreground">{tier.name}</span>
                          <p className="text-xs text-muted-foreground">
                            Default: <kbd className="font-mono font-semibold">{tier.defaultDisplay}</kbd> (bare or Alt+{tier.defaultDisplay})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <kbd
                            className={cn(
                              "min-w-10 text-center font-mono text-xs font-bold px-2.5 py-1 rounded-md border shadow-2xs",
                              isCustom
                                ? "bg-amber-500 text-amber-950 border-amber-500"
                                : "bg-muted text-foreground border-border"
                            )}
                          >
                            {display}
                          </kbd>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() =>
                              handleOpenRecorder({
                                type: "priceTier",
                                id: tier.id,
                                label: tier.name,
                                currentCode: activeCode,
                                defaultCode: tier.defaultCode,
                              })
                            }
                          >
                            <KeyRound className="size-3.5" />
                            Change Key
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Category Keys + Interactive Key Sandbox */}
            <div className="space-y-6">
              {/* Card 4: Category Key Bindings */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="size-4 text-primary" />
                        Category Department Keys
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Single keystroke switches the product grid to this department.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {categories.length + 1} Departments
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {/* Fixed "All Categories" */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40 text-xs">
                    <div>
                      <span className="font-semibold text-foreground">All Categories</span>
                      <p className="text-[11px] text-muted-foreground">Resets department filter (System reserved)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="font-mono text-xs font-bold px-2.5 py-1 rounded-md border bg-background text-foreground shadow-2xs">
                        A
                      </kbd>
                      <Badge variant="secondary" className="text-[10px] h-6">Locked</Badge>
                    </div>
                  </div>

                  {/* Dynamic & Custom Categories */}
                  {categories.map((cat) => {
                    const customOverride = hotkeysForm.categoryKeys?.[cat.id] || hotkeysForm.categoryKeys?.[cat.name];
                    const binding = assignedCategoryBindings.find((b) => b.id === cat.id);
                    const activeCode = customOverride || binding?.code || "KeyA";
                    const isCustom = Boolean(customOverride);
                    const display = keyCodeToDisplay(activeCode);

                    return (
                      <div
                        key={cat.id}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                          isCustom ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/30"
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs text-foreground truncate">{cat.name}</span>
                            {isCustom ? (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5 border-primary/40 text-primary">
                                Admin Key
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] py-0 px-1 h-3.5 text-muted-foreground">
                                Auto
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {cat.productCount} products · Alt+{display}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <kbd
                            className={cn(
                              "min-w-8 text-center font-mono text-xs font-bold px-2 py-0.5 rounded border shadow-2xs",
                              isCustom
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-foreground border-border"
                            )}
                          >
                            {display}
                          </kbd>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 gap-1"
                            onClick={() =>
                              handleOpenRecorder({
                                type: "category",
                                id: cat.id,
                                label: `Category: ${cat.name}`,
                                currentCode: activeCode,
                                defaultCode: binding?.code || "KeyA",
                              })
                            }
                          >
                            <KeyRound className="size-3" />
                            Key
                          </Button>

                          {isCustom && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] px-1.5 text-muted-foreground hover:text-foreground"
                              title="Reset back to auto-assignment"
                              onClick={() => {
                                setHotkeysForm((prev) => {
                                  const next = { ...prev.categoryKeys };
                                  delete next[cat.id];
                                  delete next[cat.name];
                                  return { ...prev, categoryKeys: next };
                                });
                                toast.info(`Restored "${cat.name}" to auto key`);
                              }}
                            >
                              Auto
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Card 5: Interactive Live Test Sandbox */}
              <Card className="border-primary/20 bg-linear-to-b from-card to-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    Interactive Cashier Key Simulator
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click inside the box and press any key on your keyboard to test how cashiers will experience your configured key presses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Input
                      placeholder="Click here and press keys to test..."
                      onKeyDown={handleSandboxKeyDown}
                      className="font-mono text-center text-sm py-5 border-2 border-primary/30 focus-visible:ring-primary/40 bg-background/80"
                      readOnly
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded border bg-muted">
                      Press Any Key
                    </kbd>
                  </div>

                  {sandboxEvent ? (
                    <div className="rounded-lg border bg-background p-3.5 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <kbd className="font-mono text-lg font-bold px-3 py-1 rounded-md border bg-primary text-primary-foreground shadow-xs">
                            {sandboxEvent.display}
                          </kbd>
                          <span className="text-xs font-mono text-muted-foreground">({sandboxEvent.code})</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{sandboxEvent.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <Check className="size-3.5 text-emerald-500" />
                        <span className="text-foreground">{sandboxEvent.actionLabel}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Try pressing <kbd className="px-1 rounded border font-mono">F9</kbd>,{" "}
                      <kbd className="px-1 rounded border font-mono">C</kbd>,{" "}
                      <kbd className="px-1 rounded border font-mono">D</kbd>, or category letters.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-xs text-muted-foreground">
              Saved shortcuts deploy automatically to all counter workstations upon their next poll or refresh.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetAllHotkeys}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" />
                Reset Defaults
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={updateSettings.isPending}
                onClick={() => handleSaveHotkeySettings()}
                className="gap-1.5 text-xs font-medium"
              >
                <Save className="size-3.5" />
                {updateSettings.isPending ? "Saving Hotkeys..." : "Save All Key Presses"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================================================== */}
      {/* KEY RECORDER MODAL                                            */}
      {/* ============================================================== */}
      <Dialog open={recorderOpen} onOpenChange={setRecorderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="size-4" />
              </div>
              <div>
                <DialogTitle>Record Key Press</DialogTitle>
                <DialogDescription className="text-xs">
                  {recordTarget ? `Assign a shortcut key to: ${recordTarget.label}` : "Press any key on your keyboard"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/30 space-y-2">
              <kbd className="text-3xl font-mono font-bold px-6 py-3 rounded-xl border-2 border-primary bg-background text-primary shadow-sm min-w-24 text-center">
                {capturedCode ? keyCodeToDisplay(capturedCode) : "..."}
              </kbd>
              <span className="text-xs font-mono text-muted-foreground">
                {capturedCode ? `Physical code: ${capturedCode}` : "Press any key on your keyboard now"}
              </span>
            </div>

            {/* In-use conflict check */}
            {capturedCode && (() => {
              const conflictList = conflicts.filter((c) => c.code === capturedCode);
              if (conflictList.length > 0) {
                return (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                    <span>
                      Notice: Key <strong>{keyCodeToDisplay(capturedCode)}</strong> is currently assigned to{" "}
                      {conflictList[0].usages.join(", ")}.
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            <p className="text-[11px] text-muted-foreground text-center">
              Works across Sinhala, Tamil, and English keyboard layouts by mapping physical key positions (<code className="font-mono">event.code</code>).
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearKey}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Revert to Default ({recordTarget ? keyCodeToDisplay(recordTarget.defaultCode) : ""})
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRecorderOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!capturedCode}
                onClick={handleCommitRecording}
                className="text-xs gap-1.5"
              >
                <Check className="size-3.5" />
                Assign Key
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
