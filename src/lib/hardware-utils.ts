import type { TerminalDto, StoreSettingsDto } from "@/lib/types";

/**
 * Plays a clean POS scanner confirmation beep using Web Audio API.
 */
export function playScannerBeep(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // 1760Hz (A6), high crisp POS beep
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Audio context may be restricted by browser policy before first user interaction
  }
}

/**
 * Triggers a test print slip for the given terminal.
 */
export function triggerTestPrint(
  terminal: TerminalDto,
  settings?: StoreSettingsDto | null,
  sourceLabel = "Local Device"
): void {
  const paperWidth = terminal.paperWidth || settings?.defaultPaperWidth || "80mm";
  const storeName = settings?.storeName || "Santhrima Store";
  const header = settings?.receiptHeader || "Welcome to Santhrima Store";
  const now = new Date().toLocaleString();

  const is58mm = paperWidth === "58mm";
  const containerWidth = is58mm ? "48mm" : "72mm";
  const fontSize = is58mm ? "11px" : "12px";

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups to print test receipts.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Test Print - ${terminal.name}</title>
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${containerWidth};
            margin: 0 auto;
            padding: 8px 4px;
            font-size: ${fontSize};
            line-height: 1.3;
            color: #000;
          }
          .text-center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .bold { font-weight: bold; }
          .row { display: flex; justify-content: space-between; font-size: ${fontSize}; }
          .badge {
            display: inline-block;
            border: 1px solid #000;
            padding: 2px 6px;
            font-weight: bold;
            margin: 4px 0;
          }
          .barcode-mock {
            font-family: monospace;
            letter-spacing: 3px;
            background: #eee;
            padding: 4px;
            text-align: center;
            font-size: 13px;
            margin: 6px 0;
            border: 1px solid #999;
          }
        </style>
      </head>
      <body>
        <div class="text-center bold" style="font-size: 14px;">${storeName}</div>
        <div class="text-center" style="font-size: 10px; white-space: pre-line;">${header}</div>
        <div class="divider"></div>
        <div class="text-center">
          <span class="badge">PRINTER TEST SLIP</span>
        </div>
        <div class="divider"></div>
        <div class="row">
          <span>Counter:</span>
          <span class="bold">${terminal.name} (${terminal.terminalCode})</span>
        </div>
        <div class="row">
          <span>Printer Mode:</span>
          <span>${terminal.printerType}</span>
        </div>
        <div class="row">
          <span>Printer Address:</span>
          <span>${terminal.printerAddress || "Default / Local"}</span>
        </div>
        <div class="row">
          <span>Paper Width:</span>
          <span>${paperWidth}</span>
        </div>
        <div class="row">
          <span>Auto-Cut:</span>
          <span>${terminal.autoCutPaper ? "ENABLED" : "DISABLED"}</span>
        </div>
        <div class="row">
          <span>Drawer Kick:</span>
          <span>${terminal.cashDrawerKick ? "ENABLED" : "DISABLED"}</span>
        </div>
        <div class="row">
          <span>Trigger Source:</span>
          <span>${sourceLabel}</span>
        </div>
        <div class="row">
          <span>Date & Time:</span>
          <span>${now}</span>
        </div>
        <div class="divider"></div>
        <div class="text-center bold">BARCODE SCANNER ALIGNMENT</div>
        <div class="barcode-mock">|||||||||||||||||||||||||</div>
        <div class="text-center" style="font-size: 10px;">TEST-TERMINAL-${terminal.counterNumber}</div>
        <div class="divider"></div>
        <div class="text-center bold">STATUS: OK - READY TO SELL</div>
        <div class="divider"></div>
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 800);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
