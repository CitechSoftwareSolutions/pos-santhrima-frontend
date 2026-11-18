import type { Language } from "@/i18n/translations";

export function getProductName(
  product: { name: string; nameSi?: string | null } | null | undefined,
  lang: Language = "en"
): string {
  if (!product) return "";
  if (lang === "si" && product.nameSi?.trim()) {
    return product.nameSi.trim();
  }
  return product.name || "";
}
