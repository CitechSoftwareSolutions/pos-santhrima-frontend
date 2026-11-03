/**
 * Pure TypeScript Code 128 (Subset B) SVG Barcode Generator.
 * Zero external dependencies. Generates standards-compliant, high-density vector barcodes
 * that are 100% readable by physical optical and laser USB/Bluetooth barcode scanners.
 */

// Standard Code 128 pattern table (107 patterns).
// Each 6-digit string represents alternating bar and space widths (sum = 11 modules).
// Pattern 106 (Stop) has 7 digits (sum = 13 modules).
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",                               // 100-106
];

const START_CODE_B = 104;
const STOP_CODE = 106;

export interface BarcodeSvgOptions {
  height?: number;
  barWidth?: number;
  quietZoneModules?: number;
  showText?: boolean;
  fontSize?: number;
}

/**
 * Generates an SVG barcode string for Code 128 (Subset B).
 * Perfectly readable by USB / Bluetooth optical and laser barcode readers.
 */
export function generateBarcodeSvg(data: string, options: BarcodeSvgOptions = {}): string {
  // Clean data: remove any surrounding asterisks from legacy Code 39 formatting
  const rawText = (data || "").trim().replace(/^\*+|\*+$/g, "");
  if (!rawText) return "";

  const barHeight = options.height ?? 46;
  const barUnitWidth = options.barWidth ?? 1.8;
  const quietZoneModules = options.quietZoneModules ?? 10;
  const showText = options.showText ?? true;
  const fontSize = options.fontSize ?? 11;

  // Validate chars (Code 128 B supports ASCII 32 to 126)
  const symbols: number[] = [START_CODE_B];
  let checksumSum = START_CODE_B;

  for (let i = 0; i < rawText.length; i++) {
    const code = rawText.charCodeAt(i);
    const value = code - 32;
    if (value < 0 || value > 94) {
      // Fallback for unexpected characters: map to space (0)
      symbols.push(0);
      checksumSum += (i + 1) * 0;
    } else {
      symbols.push(value);
      checksumSum += (i + 1) * value;
    }
  }

  const checksum = checksumSum % 103;
  symbols.push(checksum);
  symbols.push(STOP_CODE);

  // Compute total modules
  let totalModules = quietZoneModules * 2;
  for (const sym of symbols) {
    const pat = CODE128_PATTERNS[sym] || "212222";
    for (let p = 0; p < pat.length; p++) {
      totalModules += parseInt(pat[p], 10);
    }
  }

  const svgWidth = Math.ceil(totalModules * barUnitWidth);
  const textPadding = showText ? fontSize + 4 : 0;
  const svgHeight = barHeight + textPadding;

  // Build SVG rects
  let currentX = quietZoneModules * barUnitWidth;
  const rects: string[] = [];

  for (const sym of symbols) {
    const pat = CODE128_PATTERNS[sym] || "212222";
    for (let p = 0; p < pat.length; p++) {
      const widthUnits = parseInt(pat[p], 10);
      const pixelWidth = widthUnits * barUnitWidth;
      const isBar = p % 2 === 0;

      if (isBar) {
        rects.push(
          `<rect x="${currentX.toFixed(2)}" y="0" width="${pixelWidth.toFixed(2)}" height="${barHeight}" fill="#000000" />`
        );
      }
      currentX += pixelWidth;
    }
  }

  const textElement = showText
    ? `<text x="${(svgWidth / 2).toFixed(2)}" y="${svgHeight - 1}" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="${fontSize}px" font-weight="700" fill="#000000" letter-spacing="1px">*${rawText}*</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" style="display: block; margin: 0 auto; max-width: 100%; height: auto;">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${rects.join("\n  ")}
  ${textElement}
</svg>`;
}
