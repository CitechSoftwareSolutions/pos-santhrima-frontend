import { formatCurrency, formatDate } from "./format";
import {
  PaymentMethodLabels,
  type SaleDto,
  type StoreSettingsDto,
  type TerminalDto,
  type CounterDailySummaryDto,
} from "./types";

interface PrintReceiptOptions {
  settings?: StoreSettingsDto | null;
  terminal?: TerminalDto | null;
}

export function printReceipt(sale: SaleDto, options?: PrintReceiptOptions) {
  if (typeof window === "undefined") return;

  const { settings, terminal } = options || {};
  const paperWidth = terminal?.paperWidth || settings?.defaultPaperWidth || "80mm";
  const is58mm = paperWidth === "58mm";
  const containerWidth = is58mm ? "48mm" : "74mm";
  const fontSize = is58mm ? "11px" : "12px";

  const storeName = settings?.storeName || "සන්ත්‍රිමා ස්ටෝර්ස්";
  const storeAddress = settings?.storeAddress || "";
  const storePhone = settings?.storePhone || "";
  const receiptHeader = settings?.receiptHeader || "";
  const receiptFooter = settings?.receiptFooter || "Thank you for shopping with us! Please come again.";

  const counterName = sale.terminalName || terminal?.name || "";

  const itemsHtml = sale.items
    .map(
      (item) => `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: 600; word-break: break-word;">${escapeHtml(item.productName)}</div>
        <div style="display: flex; justify-content: space-between; font-size: ${is58mm ? "10px" : "11px"}; color: #222;">
          <span>${item.quantity} x ${formatCurrency(item.unitPrice)}${
            item.discountAmount > 0 ? ` (-${formatCurrency(item.discountAmount)})` : ""
          }</span>
          <span style="font-weight: 600;">${formatCurrency(item.lineTotal)}</span>
        </div>
      </div>
    `,
    )
    .join("");

  const paymentsHtml = sale.payments
    .map(
      (p) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>${PaymentMethodLabels[p.method] || "Payment"}:</span>
        <span style="font-weight: 500;">${formatCurrency(p.amount)}</span>
      </div>
    `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${sale.saleNumber}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          body {
            font-family: 'Nirmala UI', 'Courier New', Courier, monospace, sans-serif;
            width: ${containerWidth};
            max-width: ${containerWidth};
            margin: 0 auto;
            padding: 8px 4px 18mm 4px;
            font-size: ${fontSize};
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: 700; }
          .title { font-size: ${is58mm ? "14px" : "16px"}; font-weight: 700; line-height: 1.2; }
          .subtitle { font-size: 11px; margin-top: 2px; }
          .divider {
            border-bottom: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-bottom: 2px solid #000;
            margin: 6px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: ${is58mm ? "14px" : "15px"};
            font-weight: 700;
            padding: 4px 0;
          }
          .barcode-mock {
            font-family: 'Courier New', Courier, monospace;
            letter-spacing: 2px;
            font-size: 16px;
            font-weight: 900;
            margin: 6px 0 2px 0;
          }
        </style>
      </head>
      <body>
        <!-- STORE BRANDING -->
        <div class="text-center">
          <div class="title">${escapeHtml(storeName)}</div>
          ${storeAddress ? `<div class="subtitle">${escapeHtml(storeAddress)}</div>` : ""}
          ${storePhone ? `<div class="subtitle">Tel: ${escapeHtml(storePhone)}</div>` : ""}
          ${receiptHeader ? `<div class="subtitle" style="margin-top: 3px; font-style: italic;">${escapeHtml(receiptHeader)}</div>` : ""}
        </div>

        <div class="divider"></div>

        <!-- SALE METADATA -->
        <div class="row">
          <span>Receipt #:</span>
          <span class="bold">${escapeHtml(sale.saleNumber)}</span>
        </div>
        <div class="row">
          <span>Date:</span>
          <span>${formatDate(sale.saleDate)}</span>
        </div>
        <div class="row">
          <span>Cashier:</span>
          <span>${escapeHtml(sale.cashierName)}</span>
        </div>
        ${
          counterName
            ? `
        <div class="row">
          <span>Counter:</span>
          <span>${escapeHtml(counterName)}</span>
        </div>`
            : ""
        }
        ${
          sale.customerName
            ? `
        <div class="row">
          <span>Customer:</span>
          <span class="bold">${escapeHtml(sale.customerName)}</span>
        </div>`
            : ""
        }

        <div class="divider"></div>

        <!-- ITEMS HEADER -->
        <div class="row bold" style="font-size: ${is58mm ? "10px" : "11px"}; text-transform: uppercase;">
          <span>Item</span>
          <span>Total</span>
        </div>
        <div class="divider" style="margin: 2px 0 4px 0;"></div>

        <!-- ITEMS LIST -->
        ${itemsHtml}

        <div class="divider"></div>

        <!-- TOTALS & DISCOUNTS -->
        <div class="row">
          <span>Subtotal:</span>
          <span>${formatCurrency(sale.subTotal)}</span>
        </div>
        ${
          sale.loyaltyPointsRedeemed > 0
            ? `
        <div class="row">
          <span>Points Redeemed (${sale.loyaltyPointsRedeemed.toFixed(2)} pts):</span>
          <span>-${formatCurrency(sale.loyaltyPointsRedeemed)}</span>
        </div>`
            : ""
        }
        ${
          sale.discountAmount > 0
            ? `
        <div class="row">
          <span>Discount:</span>
          <span>-${formatCurrency(sale.discountAmount)}</span>
        </div>`
            : ""
        }
        ${
          sale.taxAmount > 0
            ? `
        <div class="row">
          <span>Tax:</span>
          <span>${formatCurrency(sale.taxAmount)}</span>
        </div>`
            : ""
        }

        <div class="double-divider"></div>

        <div class="total-row">
          <span>TOTAL:</span>
          <span>${formatCurrency(sale.totalAmount)}</span>
        </div>

        <div class="double-divider"></div>

        <!-- PAYMENTS -->
        ${paymentsHtml}
        ${
          sale.changeDue > 0
            ? `
        <div class="row bold">
          <span>Change:</span>
          <span>${formatCurrency(sale.changeDue)}</span>
        </div>`
            : ""
        }

        ${
          sale.loyaltyPointsEarned > 0
            ? `
        <div class="divider"></div>
        <div class="row" style="font-size: 11px;">
          <span>Royalty Points Earned:</span>
          <span class="bold">+${sale.loyaltyPointsEarned.toFixed(2)} pts</span>
        </div>`
            : ""
        }

        <div class="divider"></div>

        <!-- FOOTER & BARCODE -->
        <div class="text-center">
          <div style="font-size: 11px; margin-bottom: 4px;">${escapeHtml(receiptFooter)}</div>
          <div class="barcode-mock">||| | ||||| || |||| ||| |||</div>
          <div style="font-size: 10px; letter-spacing: 1px;">*${escapeHtml(sale.saleNumber)}*</div>
        </div>

        <!-- FEED BUFFER (Ensures bottom of receipt clears physical tear-bar/cutter) -->
        <div style="height: 18mm; width: 100%;" aria-hidden="true"></div>
      </body>
    </html>
  `;

  // Use a hidden iframe for zero-popup-blocker, isolated printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    } catch {
      // ignore
    }
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: popup window if iframe document is not accessible
    const win = window.open("", "_blank", "width=420,height=600");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      win.addEventListener("afterprint", () => {
        setTimeout(() => {
          try { win.close(); } catch {}
        }, 500);
      });
      setTimeout(() => {
        try { win.print(); } catch {}
      }, 300);
      setTimeout(() => {
        try { win.close(); } catch {}
      }, 60000);
    }
    cleanup();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (win) {
    win.addEventListener("afterprint", () => {
      setTimeout(cleanup, 1000);
    });
  }
  // Safe fallback cleanup (60 seconds) so slow USB/spooler printing is never interrupted
  setTimeout(cleanup, 60000);

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // ignore
    }
  }, 250);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface ReturnSlipItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

export function printReturnSlip(
  sale: SaleDto,
  returnItems: ReturnSlipItem[],
  totalRefund: number,
  refundMethod: import("./types").PaymentMethod,
  reason?: string,
  options?: PrintReceiptOptions
) {
  if (typeof window === "undefined") return;

  const { settings, terminal } = options || {};
  const paperWidth = terminal?.paperWidth || settings?.defaultPaperWidth || "80mm";
  const is58mm = paperWidth === "58mm";
  const containerWidth = is58mm ? "48mm" : "74mm";
  const fontSize = is58mm ? "11px" : "12px";

  const storeName = settings?.storeName || "සන්ත්‍රිමා ස්ටෝර්ස්";
  const storeAddress = settings?.storeAddress || "";
  const storePhone = settings?.storePhone || "";

  const counterName = sale.terminalName || terminal?.name || "";

  const itemsHtml = returnItems
    .map(
      (item) => `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: 600; word-break: break-word;">${escapeHtml(item.productName)}</div>
        <div style="display: flex; justify-content: space-between; font-size: ${is58mm ? "10px" : "11px"}; color: #222;">
          <span>${item.quantity} returned @ ${formatCurrency(item.unitPrice)}</span>
          <span style="font-weight: 600;">-${formatCurrency(item.refundAmount)}</span>
        </div>
      </div>
    `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Return Slip - ${sale.saleNumber}</title>
        <style>
          @page { size: auto; margin: 0; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            height: auto !important;
          }
          body {
            font-family: 'Nirmala UI', 'Courier New', Courier, monospace, sans-serif;
            width: ${containerWidth};
            max-width: ${containerWidth};
            margin: 0 auto;
            padding: 8px 4px 18mm 4px;
            font-size: ${fontSize};
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .bold { font-weight: 700; }
          .title { font-size: ${is58mm ? "14px" : "16px"}; font-weight: 700; line-height: 1.2; }
          .subtitle { font-size: 11px; margin-top: 2px; }
          .badge {
            display: inline-block;
            border: 1px solid #000;
            padding: 2px 6px;
            font-weight: 700;
            font-size: ${is58mm ? "11px" : "12px"};
            margin-top: 4px;
            text-transform: uppercase;
          }
          .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: ${is58mm ? "13px" : "15px"};
            font-weight: 700;
            padding: 4px 0;
          }
        </style>
      </head>
      <body>
        <!-- STORE BRANDING -->
        <div class="text-center">
          <div class="title">${escapeHtml(storeName)}</div>
          ${storeAddress ? `<div class="subtitle">${escapeHtml(storeAddress)}</div>` : ""}
          ${storePhone ? `<div class="subtitle">Tel: ${escapeHtml(storePhone)}</div>` : ""}
          <div class="badge">RETURN / CREDIT NOTE</div>
        </div>

        <div class="divider"></div>

        <!-- SALE & RETURN METADATA -->
        <div class="row">
          <span>Orig Receipt #:</span>
          <span class="bold">${escapeHtml(sale.saleNumber)}</span>
        </div>
        <div class="row">
          <span>Return Date:</span>
          <span>${formatDate(new Date().toISOString())}</span>
        </div>
        <div class="row">
          <span>Cashier:</span>
          <span>${escapeHtml(sale.cashierName)}</span>
        </div>
        ${counterName ? `<div class="row"><span>Counter:</span><span>${escapeHtml(counterName)}</span></div>` : ""}
        ${sale.customerName ? `<div class="row"><span>Customer:</span><span class="bold">${escapeHtml(sale.customerName)}</span></div>` : ""}

        <div class="divider"></div>

        <!-- ITEMS HEADER -->
        <div class="row bold" style="font-size: ${is58mm ? "10px" : "11px"}; text-transform: uppercase;">
          <span>Returned Items</span>
          <span>Refund</span>
        </div>
        <div class="divider" style="margin: 2px 0 4px 0;"></div>

        <!-- ITEMS LIST -->
        ${itemsHtml}

        <div class="double-divider"></div>

        <div class="total-row">
          <span>TOTAL REFUND:</span>
          <span>${formatCurrency(totalRefund)}</span>
        </div>

        <div class="double-divider"></div>

        <div class="row">
          <span>Refund Method:</span>
          <span class="bold">${PaymentMethodLabels[refundMethod] || "Cash"}</span>
        </div>
        ${reason ? `<div class="row"><span>Reason:</span><span>${escapeHtml(reason)}</span></div>` : ""}

        <div class="divider" style="margin-top: 12px;"></div>

        <div style="margin-top: 16px; padding-top: 8px; border-top: 1px dotted #000;">
          <div style="font-size: 10px; display: flex; justify-content: space-between;">
            <span>Customer Signature</span>
            <span>Date</span>
          </div>
          <div style="height: 18px;"></div>
        </div>

        <div class="text-center" style="margin-top: 10px; font-size: 10px; opacity: 0.8;">
          Returned items have been restored to inventory.
        </div>

        <div style="height: 18mm; width: 100%;" aria-hidden="true"></div>
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      if (iframe.parentNode) document.body.removeChild(iframe);
    } catch {}
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const win = window.open("", "_blank", "width=420,height=600");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      win.addEventListener("afterprint", () => {
        setTimeout(() => { try { win.close(); } catch {} }, 500);
      });
      setTimeout(() => { try { win.print(); } catch {} }, 300);
      setTimeout(() => { try { win.close(); } catch {} }, 60000);
    }
    cleanup();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (win) {
    win.addEventListener("afterprint", () => {
      setTimeout(cleanup, 1000);
    });
  }
  setTimeout(cleanup, 60000);

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {}
  }, 250);
}

export function printRegisterSummaryReport(
  summary: CounterDailySummaryDto,
  options?: PrintReceiptOptions
) {
  if (typeof window === "undefined") return;

  const { settings, terminal } = options || {};
  const paperWidth = terminal?.paperWidth || settings?.defaultPaperWidth || "80mm";
  const is58mm = paperWidth === "58mm";
  const containerWidth = is58mm ? "48mm" : "74mm";
  const fontSize = is58mm ? "11px" : "12px";

  const storeName = settings?.storeName || "සන්ත්‍රිමා ස්ටෝර්ස්";
  const storeAddress = settings?.storeAddress || "";
  const storePhone = settings?.storePhone || "";

  const paymentMethodsHtml = summary.paymentMethods
    .map(
      (pm) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>${escapeHtml(pm.methodName)} (${pm.transactionCount}):</span>
        <span style="font-weight: 600;">${formatCurrency(pm.totalAmount)}</span>
      </div>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Daily Counter Summary - ${summary.counterName}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          body {
            font-family: 'Nirmala UI', 'Courier New', Courier, monospace, sans-serif;
            width: ${containerWidth};
            max-width: ${containerWidth};
            margin: 0 auto;
            padding: 8px 4px 18mm 4px;
            font-size: ${fontSize};
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: 700; }
          .title { font-size: ${is58mm ? "13px" : "15px"}; font-weight: 700; line-height: 1.2; }
          .subtitle { font-size: 11px; margin-top: 2px; }
          .report-tag {
            font-size: ${is58mm ? "11px" : "12px"};
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 4px 0;
          }
          .divider {
            border-bottom: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-bottom: 2px solid #000;
            margin: 6px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: ${is58mm ? "13px" : "14px"};
            font-weight: 700;
            padding: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="title">${escapeHtml(storeName)}</div>
          ${storeAddress ? `<div class="subtitle">${escapeHtml(storeAddress)}</div>` : ""}
          ${storePhone ? `<div class="subtitle">Tel: ${escapeHtml(storePhone)}</div>` : ""}
          <div class="report-tag">Daily Counter Summary</div>
        </div>

        <div class="divider"></div>

        <div class="row">
          <span>Counter:</span>
          <span class="bold">${escapeHtml(summary.counterName)} ${summary.terminalCode ? `(${escapeHtml(summary.terminalCode)})` : ""}</span>
        </div>
        <div class="row">
          <span>Cashier:</span>
          <span>${escapeHtml(summary.cashierName)}</span>
        </div>
        <div class="row">
          <span>Opened:</span>
          <span>${formatDate(summary.openedAt)}</span>
        </div>
        <div class="row">
          <span>Closed:</span>
          <span>${formatDate(summary.closedAt)}</span>
        </div>

        <div class="divider"></div>

        <div class="row">
          <span>Total Bills:</span>
          <span class="bold">${summary.totalSalesCount}</span>
        </div>
        <div class="row">
          <span>Gross Sales:</span>
          <span>${formatCurrency(summary.subTotal)}</span>
        </div>
        ${
          summary.totalDiscount > 0
            ? `
        <div class="row">
          <span>Total Discount:</span>
          <span>-${formatCurrency(summary.totalDiscount)}</span>
        </div>`
            : ""
        }
        ${
          summary.totalTax > 0
            ? `
        <div class="row">
          <span>Total Tax:</span>
          <span>${formatCurrency(summary.totalTax)}</span>
        </div>`
            : ""
        }

        <div class="divider"></div>
        <div class="total-row">
          <span>NET REVENUE:</span>
          <span>${formatCurrency(summary.totalRevenue)}</span>
        </div>
        <div class="divider"></div>

        <div class="bold" style="font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">
          Payments by Method:
        </div>
        ${paymentMethodsHtml}

        <div class="double-divider"></div>

        <div class="text-center subtitle" style="margin-top: 6px;">
          Printed: ${new Date().toLocaleString()}
        </div>

        <!-- FEED BUFFER (Ensures bottom of report clears physical tear-bar/cutter) -->
        <div style="height: 18mm; width: 100%;" aria-hidden="true"></div>
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    } catch {
      // ignore
    }
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const win = window.open("", "_blank", "width=400,height=600");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      win.addEventListener("afterprint", () => {
        setTimeout(() => {
          try { win.close(); } catch {}
        }, 500);
      });
      setTimeout(() => {
        try { win.print(); } catch {}
      }, 300);
      setTimeout(() => {
        try { win.close(); } catch {}
      }, 60000);
    }
    cleanup();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (win) {
    win.addEventListener("afterprint", () => {
      setTimeout(cleanup, 1000);
    });
  }
  setTimeout(cleanup, 60000);

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // ignore
    }
  }, 250);
}
