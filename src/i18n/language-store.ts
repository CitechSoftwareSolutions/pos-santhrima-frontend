import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "./translations";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
      toggleLanguage: () =>
        set((state) => ({ language: state.language === "en" ? "si" : "en" })),
    }),
    {
      name: "pos-language-storage",
    }
  )
);
