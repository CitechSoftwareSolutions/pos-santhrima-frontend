"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { SupplierCombobox } from "@/components/shared/supplier-combobox";
import { ProductCombobox } from "@/components/shared/product-combobox";
import { useCreatePurchase } from "@/lib/hooks/use-purchases";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import type { ProductDto, SupplierDto } from "@/lib/types";

interface DraftLine {
  key: string;
  product: ProductDto | null;
  quantity: string;
  freeQuantity: string;
  unitCost: string;
}

function emptyLine(): DraftLine {
  return { key: crypto.randomUUID(), product: null, quantity: "1", freeQuantity: "", unitCost: "" };
}

function lineTotal(line: DraftLine): number {
  const qty = parseFloat(line.quantity) || 0;
  const cost = parseFloat(line.unitCost) || 0;
  return qty * cost;
}

export function CreatePurchaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createPurchase = useCreatePurchase();

  const [supplier, setSupplier] = useState<SupplierDto | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [notes, setNotes] = useState("");

  function reset() {
    setSupplier(null);
    setLines([emptyLine()]);
    setNotes("");
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supplier) {
      toast.error("Select a supplier.");
      return;
    }

    const validLines = lines.filter((l) => l.product && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) {
      toast.error("Add at least one product line.");
      return;
    }

    createPurchase.mutate(
      {
        supplierId: supplier.id,
        items: validLines.map((l) => ({
          productId: l.product!.id,
          quantityOrdered: parseFloat(l.quantity),
          freeQuantity: parseFloat(l.freeQuantity) || 0,
          unitCost: parseFloat(l.unitCost) || 0,
        })),
        expectedDeliveryDate: null,
        notes: notes || null,
      },
      {
        onSuccess: (po) => {
          toast.success(`Invoice ${po.purchaseNumber} created - pending approval`);
          onOpenChange(false);
          reset();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Invoice</DialogTitle>
          <DialogDescription>
            Record a supplier invoice. It starts as pending approval and won&apos;t affect stock until
            approved and added to stock.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <SupplierCombobox value={supplier} onSelect={setSupplier} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus className="size-3.5" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.key} className="space-y-2 rounded-lg border p-2.5">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Product</Label>
                      <ProductCombobox
                        value={line.product}
                        onSelect={(p) =>
                          updateLine(line.key, {
                            product: p,
                            unitCost: line.unitCost || String(p.costPrice),
                          })
                        }
                        excludeIds={lines
                          .filter((l) => l.key !== line.key && l.product)
                          .map((l) => l.product!.id)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        step={line.product?.allowDecimalQuantity ? "0.001" : "1"}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Free Qty</Label>
                      <Input
                        type="number"
                        min={0}
                        step={line.product?.allowDecimalQuantity ? "0.001" : "1"}
                        placeholder="Optional"
                        value={line.freeQuantity}
                        onChange={(e) => updateLine(line.key, { freeQuantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Unit Cost</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Line Total</Label>
                      <div className="flex h-8 items-center rounded-lg border bg-muted/50 px-2.5 text-sm font-medium">
                        {formatCurrency(lineTotal(line))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <Separator />
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Estimated Total</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPurchase.isPending}>
              {createPurchase.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
