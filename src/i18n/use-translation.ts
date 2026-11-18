import { useLanguageStore } from "./language-store";
import { translations, type Language } from "./translations";

type Translations = typeof translations.en;

export function useTranslation() {
  const { language, setLanguage, toggleLanguage } = useLanguageStore();

  function t<Section extends keyof Translations>(
    section: Section,
    key: keyof Translations[Section]
  ): string {
    const dict = (translations[language] || translations.en) as unknown as Translations;
    const sectionDict = dict[section] as Record<string | number, string>;
    const fallbackSection = translations.en[section] as Record<string | number, string>;
    return sectionDict?.[key as unknown as string] ?? fallbackSection?.[key as unknown as string] ?? String(key);
  }

  return { t, language, setLanguage, toggleLanguage };
}
