import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { PaymentMethodLabels, type SaleDto } from "@/lib/types";

export function ReceiptView({ sale }: { sale: SaleDto }) {
  return (
    <div className="space-y-4 font-mono text-sm">
      <div className="text-center">
        <p className="text-base font-semibold">සන්ත්‍රිමා ස්ටෝර්ස්</p>
        <p className="text-xs text-muted-foreground">Sales Receipt</p>
      </div>

      <div className="space-y-0.5 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Receipt #</span>
          <span>{sale.saleNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatDate(sale.saleDate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier</span>
          <span>{sale.cashierName}</span>
        </div>
        {sale.customerName && (
          <div className="flex justify-between">
            <span>Customer</span>
            <span>{sale.customerName}</span>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-1.5">
        {sale.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate">{item.productName}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} x {formatCurrency(item.unitPrice)}
              </p>
            </div>
            <span className="shrink-0">{formatCurrency(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(sale.subTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span>-{formatCurrency(sale.discountAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(sale.taxAmount)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(sale.totalAmount)}</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        {sale.payments.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span className="text-muted-foreground">{PaymentMethodLabels[p.method]}</span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {sale.changeDue > 0 && (
          <div className="flex justify-between font-medium">
            <span>Change</span>
            <span>{formatCurrency(sale.changeDue)}</span>
          </div>
        )}
      </div>

      <p className="pt-2 text-center text-xs text-muted-foreground">Thank you for your purchase!</p>
    </div>
  );
}
