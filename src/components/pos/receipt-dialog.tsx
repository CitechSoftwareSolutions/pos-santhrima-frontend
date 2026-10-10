"use client";

import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReceiptView } from "./receipt-view";
import type { SaleDto } from "@/lib/types";

export function ReceiptDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: SaleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col p-4 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="sr-only">Receipt</DialogTitle>
        </DialogHeader>
        {sale && (
          <div
            id="receipt-print-area"
            className="overflow-y-auto flex-1 max-h-[calc(88vh-5rem)] pr-1 print:max-h-none print:overflow-visible"
          >
            <ReceiptView sale={sale} />
          </div>
        )}
        <DialogFooter className="shrink-0 pt-2 border-t print:hidden flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
