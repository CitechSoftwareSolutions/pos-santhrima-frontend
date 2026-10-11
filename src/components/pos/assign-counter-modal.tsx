"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Monitor, CheckCircle2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useActiveTerminal } from "@/lib/hooks/use-active-terminal";
import { useAuthorizeSwitchTerminal } from "@/lib/hooks/use-terminals";
import { getApiErrorMessage } from "@/lib/api/client";

export function AssignCounterModal({
  open,
  onOpenChange,
  isSwitching = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSwitching?: boolean;
}) {
  const { terminals, activeTerminal, assignTerminal } = useActiveTerminal();
  const authorizeSwitch = useAuthorizeSwitchTerminal();

  // If switching an already-assigned counter, admin auth is required
  const [authStep, setAuthStep] = useState(isSwitching);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedTerminalId, setSelectedTerminalId] = useState(activeTerminal?.id || "");

  const activeTerminals = terminals.filter((t) => t.isActive);

  function handleVerifyAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) {
      toast.error("Please enter admin username/email and password.");
      return;
    }

    authorizeSwitch.mutate(
      { usernameOrEmail: adminUsername.trim(), password: adminPassword.trim() },
      {
        onSuccess: () => {
          toast.success("Administrator authorized. You may now reassign this counter.");
          setAuthStep(false);
          setAdminPassword("");
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err));
        },
      }
    );
  }

  function handleConfirmAssignment() {
    if (!selectedTerminalId) {
      toast.error("Please select a cashier counter.");
      return;
    }
    assignTerminal(selectedTerminalId);
    const chosen = terminals.find((t) => t.id === selectedTerminalId);
    toast.success(`This workstation is now assigned to ${chosen?.name || "Counter"}.`);
    onOpenChange(false);
    setAuthStep(isSwitching);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {authStep ? (
          <form onSubmit={handleVerifyAdmin} className="space-y-4">
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Lock className="size-6" />
              </div>
              <DialogTitle className="text-center text-lg">Admin Authorization Required</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Reassigning this physical cashier workstation requires Super Admin credentials to prevent unauthorized counter switching.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Admin Username or Email</Label>
                <Input
                  autoFocus
                  placeholder="admin@santhrima.com"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Admin Password</Label>
                <PasswordInput
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={authorizeSwitch.isPending}>
                {authorizeSwitch.isPending ? "Verifying..." : "Authorize"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Monitor className="size-6" />
              </div>
              <DialogTitle className="text-center text-lg">Select This Cashier Counter</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Select which physical checkout counter this computer / tablet represents. Hardware settings (printer & scanner) will sync automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {activeTerminals.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No active counters found. Contact Administrator to configure counters.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTerminals.map((terminal) => {
                    const isSelected = selectedTerminalId === terminal.id;
                    return (
                      <button
                        key={terminal.id}
                        type="button"
                        onClick={() => setSelectedTerminalId(terminal.id)}
                        className={`w-full text-left flex items-center justify-between rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && <div className="size-1.5 rounded-full bg-primary-foreground" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{terminal.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {terminal.terminalCode} · Printer: {terminal.printerType}
                            </p>
                          </div>
                        </div>
                        {terminal.id === activeTerminal?.id && (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Current
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {isSwitching && (
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={!selectedTerminalId || activeTerminals.length === 0}
              >
                Confirm Assignment
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
