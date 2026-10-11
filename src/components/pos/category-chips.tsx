"use client";

import { useRef, useEffect } from "react";
import { Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortcutHint } from "./shortcut-hint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryDto } from "@/lib/types";
import type { CategoryKeyBinding } from "@/lib/hotkeys/config";

interface CategoryChipsProps {
  categories: CategoryDto[];
  categoryBindings: CategoryKeyBinding[];
  selectedId: string;
  onSelect: (id: string, name: string) => void;
  resultCount?: number;
}

export function CategoryChips({
  categories,
  categoryBindings,
  selectedId,
  onSelect,
  resultCount,
}: CategoryChipsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Map category id to key binding
  const bindingMap = new Map(categoryBindings.map((b) => [b.id, b]));

  // Auto-scroll the active chip into view when changed via keyboard
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeChip = scrollContainerRef.current.querySelector<HTMLElement>(
      `[data-category-id="${selectedId}"]`,
    );
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Mobile dropdown fallback */}
      <div className="block sm:hidden w-full">
        <Select
          items={[
            { value: "all", label: "All categories" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={selectedId}
          onValueChange={(value) => {
            const nextId = value ?? "all";
            const cat = categories.find((c) => c.id === nextId);
            onSelect(nextId, cat?.name ?? "All categories");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All categories">
              {(val: string | null) =>
                val === "all" || !val
                  ? "All categories"
                  : (categories.find((c) => c.id === val)?.name ?? val)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories (A)</SelectItem>
            {categories.map((c) => {
              const binding = bindingMap.get(c.id);
              return (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {binding ? `(${binding.displayKey})` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Segmented chips bar for tablet and desktop */}
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-label="Category filters"
        className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        {/* 'All' category chip */}
        <button
          type="button"
          role="tab"
          aria-selected={selectedId === "all"}
          aria-keyshortcuts="a Alt+a"
          data-category-id="all"
          onClick={() => onSelect("all", "All categories")}
          className={cn(
            "group inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all select-none",
            selectedId === "all"
              ? "border-primary bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/80 font-semibold"
              : "border-border/60 bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Layers className="size-3 shrink-0" />
          <span>All</span>
          {selectedId === "all" && <Check className="size-3 shrink-0 stroke-[2.5]" />}
          <ShortcutHint
            keyName="A"
            altKeyName="Alt+A"
            className={selectedId === "all" ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30" : ""}
          />
          {selectedId === "all" && typeof resultCount === "number" && (
            <span className="ml-0.5 rounded-full bg-primary-foreground/25 px-1.5 py-0.2 text-[10px] font-semibold text-primary-foreground">
              {resultCount}
            </span>
          )}
        </button>

        {/* Dynamic Category Chips */}
        {categories.map((category) => {
          const isSelected = selectedId === category.id;
          const binding = bindingMap.get(category.id);
          const shortcutKey = binding?.displayKey;

          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-keyshortcuts={shortcutKey ? `${shortcutKey.toLowerCase()} Alt+${shortcutKey.toLowerCase()}` : undefined}
              data-category-id={category.id}
              onClick={() => onSelect(category.id, category.name)}
              className={cn(
                "group inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all select-none",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/80 font-semibold"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span className="truncate max-w-[140px]">{category.name}</span>
              {isSelected && <Check className="size-3 shrink-0 stroke-[2.5]" />}
              {shortcutKey && (
                <ShortcutHint
                  keyName={shortcutKey}
                  altKeyName={`Alt+${shortcutKey}`}
                  className={isSelected ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30" : ""}
                />
              )}
              {isSelected && typeof resultCount === "number" && (
                <span className="ml-0.5 rounded-full bg-primary-foreground/25 px-1.5 py-0.2 text-[10px] font-semibold text-primary-foreground">
                  {resultCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
