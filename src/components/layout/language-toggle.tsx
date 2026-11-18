"use client";

import { useEffect, useState } from "react";
import { useLanguageStore } from "@/i18n/language-store";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, toggleLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-7 px-2.5 rounded-md border border-border/50 bg-muted/40 animate-pulse w-16", className)} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cn(
        "flex items-center gap-1.5 h-7 px-2.5 py-1 text-xs font-semibold rounded-md border border-border/60 bg-background/80 hover:bg-muted/80 text-foreground transition-all duration-150 shadow-2xs cursor-pointer select-none",
        className
      )}
      title="Switch Language / භාෂාව මාරු කරන්න"
      aria-label="Switch Language"
    >
      <Languages className="size-3.5 text-primary shrink-0" />
      <span className="tabular-nums">
        {language === "en" ? "සිංහල" : "English"}
      </span>
    </button>
  );
}
