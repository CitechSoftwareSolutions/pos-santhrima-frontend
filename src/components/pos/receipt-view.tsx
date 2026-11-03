"use client";

import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { PaymentMethodLabels, type SaleDto, type StoreSettingsDto } from "@/lib/types";
import { useStoreSettings } from "@/lib/hooks/use-settings";

export function ReceiptView({
  sale,
  settings: propSettings,
}: {
  sale: SaleDto;
  settings?: StoreSettingsDto | null;
}) {
  const settingsQuery = useStoreSettings();
  const settings = propSettings || settingsQuery.data;

  const storeName = settings?.storeName || "සන්ත්‍රිමා ස්ටෝර්ස්";
  const storeAddress = settings?.storeAddress;
  const storePhone = settings?.storePhone;
  const receiptHeader = settings?.receiptHeader;
  const receiptFooter = settings?.receiptFooter || "Thank you for shopping with us! Please come again.";

  return (
    <div className="space-y-3 font-mono text-xs sm:text-sm w-full max-w-full overflow-hidden p-2 bg-white text-black dark:bg-zinc-950 dark:text-zinc-100 rounded border border-border/50">
      {/* Header / Store Branding */}
      <div className="text-center space-y-0.5">
        <p className="text-base font-bold tracking-tight text-inherit">{storeName}</p>
        {storeAddress && <p className="text-[11px] opacity-75">{storeAddress}</p>}
        {storePhone && <p className="text-[11px] opacity-75">Tel: {storePhone}</p>}
        {receiptHeader && <p className="text-[11px] italic opacity-85 mt-1">{receiptHeader}</p>}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
          Sales Receipt
        </p>
      </div>

      {/* Sale Info */}
      <div className="space-y-1 text-xs border-y border-dashed border-current/30 py-2">
        <div className="flex justify-between gap-2">
          <span className="opacity-75 shrink-0">Receipt #:</span>
          <span className="font-bold text-inherit truncate">{sale.saleNumber}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="opacity-75 shrink-0">Date:</span>
          <span className="truncate">{formatDate(sale.saleDate)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="opacity-75 shrink-0">Cashier:</span>
          <span className="truncate">{sale.cashierName}</span>
        </div>
        {sale.terminalName && (
          <div className="flex justify-between gap-2">
            <span className="opacity-75 shrink-0">Counter:</span>
            <span className="truncate">{sale.terminalName}</span>
          </div>
        )}
        {sale.customerName && (
          <div className="flex justify-between gap-2">
            <span className="opacity-75 shrink-0">Customer:</span>
            <span className="font-semibold text-inherit truncate">{sale.customerName}</span>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider border-b border-current/20 pb-1">
          <span>Item</span>
          <span>Total</span>
        </div>
        {sale.items.map((item) => (
          <div key={item.id} className="flex justify-between items-start gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words leading-tight">{item.productName}</p>
              <p className="text-[11px] opacity-75 mt-0.5">
                {item.quantity} x {formatCurrency(item.unitPrice)}
                {item.discountAmount > 0 && ` (-${formatCurrency(item.discountAmount)})`}
                {Boolean(item.returnedQuantity && item.returnedQuantity > 0) && (
                  <span className="font-semibold text-amber-600 dark:text-amber-400 ml-1.5">
                    ({item.returnedQuantity} returned)
                  </span>
                )}
              </p>
            </div>
            <span className="shrink-0 font-semibold text-right">{formatCurrency(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <Separator className="border-dashed border-current/30" />

      {/* Totals */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <span className="opacity-75">Subtotal</span>
          <span className="shrink-0 font-medium">{formatCurrency(sale.subTotal)}</span>
        </div>
        {sale.loyaltyPointsRedeemed > 0 && (
          <div className="flex justify-between gap-2 font-medium text-amber-600 dark:text-amber-400">
            <span className="truncate">Points Redeemed ({sale.loyaltyPointsRedeemed.toFixed(2)} pts)</span>
            <span className="shrink-0">-{formatCurrency(sale.loyaltyPointsRedeemed)}</span>
          </div>
        )}
        {sale.discountAmount > 0 && (
          <div className="flex justify-between gap-2">
            <span className="opacity-75">Discount</span>
            <span className="shrink-0 text-emerald-600 font-medium">-{formatCurrency(sale.discountAmount)}</span>
          </div>
        )}
        {sale.taxAmount > 0 && (
          <div className="flex justify-between gap-2">
            <span className="opacity-75">Tax</span>
            <span className="shrink-0 font-medium">{formatCurrency(sale.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center gap-2 text-sm font-bold pt-1 border-t border-double border-current/40">
          <span>TOTAL</span>
          <span className="text-base shrink-0">{formatCurrency(sale.totalAmount)}</span>
        </div>
      </div>

      <Separator className="border-dashed border-current/30" />

      {/* Payments */}
      <div className="space-y-1 text-xs">
        {sale.payments.map((p) => (
          <div key={p.id} className="flex justify-between gap-2">
            <span className="opacity-75">{PaymentMethodLabels[p.method] || "Payment"}</span>
            <span className="shrink-0 font-medium">{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {sale.changeDue > 0 && (
          <div className="flex justify-between gap-2 font-bold pt-0.5">
            <span>Change</span>
            <span className="shrink-0">{formatCurrency(sale.changeDue)}</span>
          </div>
        )}
        {sale.loyaltyPointsEarned > 0 && (
          <div className="flex justify-between gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-dotted border-current/20">
            <span>Royalty Points Earned (0.001 rate)</span>
            <span className="shrink-0">+{sale.loyaltyPointsEarned.toFixed(2)} pts</span>
          </div>
        )}
      </div>

      {/* Footer & Barcode */}
      <div className="pt-2 text-center border-t border-dashed border-current/30 space-y-1">
        <p className="text-[11px] opacity-85">{receiptFooter}</p>
        <div className="text-base font-bold tracking-[0.2em] select-none opacity-85">
          |||| | ||||| || |||| ||| |||
        </div>
        <p className="text-[10px] tracking-wider opacity-75 font-mono">*{sale.saleNumber}*</p>
      </div>
    </div>
  );
}
