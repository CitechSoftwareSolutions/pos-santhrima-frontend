import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { PaymentMethodLabels, type SaleDto } from "@/lib/types";

export function ReceiptView({ sale }: { sale: SaleDto }) {
  return (
    <div className="space-y-4 font-mono text-xs sm:text-sm w-full max-w-full overflow-hidden p-1">
      <div className="text-center space-y-0.5">
        <p className="text-base font-bold tracking-tight">සන්ත්‍රිමා ස්ටෝර්ස්</p>
        <p className="text-xs text-muted-foreground">Sales Receipt</p>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground border-y border-dashed py-2">
        <div className="flex justify-between gap-2">
          <span className="shrink-0">Receipt #</span>
          <span className="font-semibold text-foreground truncate">{sale.saleNumber}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="shrink-0">Date</span>
          <span className="truncate">{formatDate(sale.saleDate)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="shrink-0">Cashier</span>
          <span className="truncate">{sale.cashierName}</span>
        </div>
        {sale.customerName && (
          <div className="flex justify-between gap-2">
            <span className="shrink-0">Customer</span>
            <span className="font-medium text-foreground truncate">{sale.customerName}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {sale.items.map((item) => (
          <div key={item.id} className="flex justify-between items-start gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words leading-tight">{item.productName}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {item.quantity} x {formatCurrency(item.unitPrice)}
              </p>
            </div>
            <span className="shrink-0 font-medium text-right">{formatCurrency(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <Separator className="border-dashed" />

      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="shrink-0">{formatCurrency(sale.subTotal)}</span>
        </div>
        {sale.loyaltyPointsRedeemed > 0 && (
          <div className="flex justify-between gap-2 text-amber-600 dark:text-amber-400 font-medium">
            <span className="truncate">Points Redeemed ({sale.loyaltyPointsRedeemed.toFixed(2)} pts)</span>
            <span className="shrink-0">-{formatCurrency(sale.loyaltyPointsRedeemed)}</span>
          </div>
        )}
        {sale.discountAmount > 0 && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Discount</span>
            <span className="shrink-0">-{formatCurrency(sale.discountAmount)}</span>
          </div>
        )}
        {sale.taxAmount > 0 && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Tax</span>
            <span className="shrink-0">{formatCurrency(sale.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center gap-2 text-sm font-bold pt-1 border-t">
          <span>Total</span>
          <span className="text-base shrink-0">{formatCurrency(sale.totalAmount)}</span>
        </div>
        {sale.loyaltyPointsEarned > 0 && (
          <div className="flex justify-between gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
            <span>Points Earned (0.001 rate)</span>
            <span className="shrink-0">+{sale.loyaltyPointsEarned.toFixed(2)} pts</span>
          </div>
        )}
      </div>

      <Separator className="border-dashed" />

      <div className="space-y-1 text-xs">
        {sale.payments.map((p) => (
          <div key={p.id} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{PaymentMethodLabels[p.method]}</span>
            <span className="shrink-0 font-medium">{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {sale.changeDue > 0 && (
          <div className="flex justify-between gap-2 font-medium">
            <span>Change</span>
            <span className="shrink-0">{formatCurrency(sale.changeDue)}</span>
          </div>
        )}
      </div>

      <p className="pt-2 text-center text-[11px] text-muted-foreground border-t border-dashed">
        Thank you for your purchase!
      </p>
    </div>
  );
}
