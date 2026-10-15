"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Barcode, PackageX, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CategoryChips } from "@/components/pos/category-chips";
import { ShortcutHint } from "@/components/pos/shortcut-hint";
import { useProducts } from "@/lib/hooks/use-products";
import { useCategories } from "@/lib/hooks/use-categories";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { productsApi } from "@/lib/api/products";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductDto } from "@/lib/types";
import { isTypingTarget, isAnyDialogOpen, type CategoryKeyBinding } from "@/lib/hotkeys/config";
import { useHotkeysStore } from "@/store/hotkeys-store";
import { toast } from "sonner";

interface ProductGridProps {
  onSelect: (product: ProductDto) => void;
  categoryId?: string;
  onCategoryChange?: (id: string, name: string) => void;
  categoryBindings?: CategoryKeyBinding[];
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ProductGrid({
  onSelect,
  categoryId: externalCategoryId,
  onCategoryChange,
  categoryBindings = [],
  searchInputRef,
}: ProductGridProps) {
  const [internalCategoryId, setInternalCategoryId] = useState<string>("all");
  const categoryId = externalCategoryId ?? internalCategoryId;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);

  const localSearchInputRef = useRef<HTMLInputElement | null>(null);
  const activeSearchInputRef = searchInputRef ?? localSearchInputRef;

  const productButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);

  const setCheatSheetOpen = useHotkeysStore((s) => s.setCheatSheetOpen);
  const searchKeyDisplay = useHotkeysStore((s) => s.getActionDisplay("search", "/"));
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];

  const productsQuery = useProducts({
    search: debouncedSearch || undefined,
    categoryId: categoryId === "all" ? undefined : categoryId,
    isActive: true,
    page: 1,
    pageSize: 60,
  });

  const productItems = useMemo(
    () => productsQuery.data?.items ?? [],
    [productsQuery.data?.items],
  );

  const totalCount = productsQuery.data?.totalCount ?? productItems.length;

  const handleCategorySelect = useCallback(
    (id: string, name: string) => {
      if (onCategoryChange) {
        onCategoryChange(id, name);
      } else {
        setInternalCategoryId(id);
      }
      toast.info(`Category: ${name} · ${totalCount} items`, { duration: 1500 });
    },
    [onCategoryChange, totalCount],
  );

  // Barcode scan handler
  async function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      try {
        const product = await productsApi.lookupByCode(search.trim());
        if (product) {
          onSelect(product);
          setSearch("");
        } else {
          toast.error(`No product found for "${search}"`);
        }
      } catch {
        toast.error(`Barcode scan failed for "${search}"`);
      }
      return;
    }

    // Move to first product card on ArrowDown from search box
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (productItems.length > 0) {
        setFocusedProductIndex(0);
        const targetBtn = productButtonRefs.current[0];
        targetBtn?.focus();
        targetBtn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    }
  }

  // Calculate dynamic grid columns
  const getGridColumnCount = useCallback(() => {
    if (typeof window === "undefined") return 3;
    const width = window.innerWidth;
    if (width >= 1280) return 4;
    if (width >= 640) return 3;
    return 2;
  }, []);

  // Global arrow navigation: when focus is on nothing / body / outside inputs and dialogs,
  // pressing any arrow key immediately focuses and selects the product card!
  useEffect(() => {
    function handleGlobalArrow(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || isAnyDialogOpen()) return;

      const isArrow =
        e.code === "ArrowDown" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowRight" ||
        e.code === "ArrowLeft";

      if (!isArrow) return;

      // If focus is already inside a product card button, let the card's local handler manage it
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl?.getAttribute("data-product-card") === "true") {
        return;
      }

      // If user is inside cart list items, let cart navigation handle it
      if (activeEl?.getAttribute("aria-label")?.startsWith("Cart line")) {
        return;
      }

      if (productItems.length > 0) {
        e.preventDefault();
        const targetIndex =
          focusedProductIndex >= 0 && focusedProductIndex < productItems.length
            ? focusedProductIndex
            : 0;
        setFocusedProductIndex(targetIndex);
        const targetBtn = productButtonRefs.current[targetIndex];
        targetBtn?.focus();
        targetBtn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    }

    window.addEventListener("keydown", handleGlobalArrow);
    return () => window.removeEventListener("keydown", handleGlobalArrow);
  }, [productItems, focusedProductIndex]);

  // Arrow key grid navigation
  const handleProductKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    product: ProductDto,
  ) => {
    const cols = getGridColumnCount();
    const count = productItems.length;

    switch (e.key) {
      case "ArrowRight": {
        e.preventDefault();
        const next = Math.min(count - 1, index + 1);
        setFocusedProductIndex(next);
        const nextBtn = productButtonRefs.current[next];
        nextBtn?.focus();
        nextBtn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const prev = Math.max(0, index - 1);
        setFocusedProductIndex(prev);
        const prevBtn = productButtonRefs.current[prev];
        prevBtn?.focus();
        prevBtn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        break;
      }
      case "ArrowDown": {
        e.preventDefault();
        const next = Math.min(count - 1, index + cols);
        setFocusedProductIndex(next);
        const nextBtn = productButtonRefs.current[next];
        nextBtn?.focus();
        nextBtn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (index < cols) {
          // On the top row: move focus back up to the search input
          activeSearchInputRef.current?.focus();
          setFocusedProductIndex(-1);
        } else {
          const prev = Math.max(0, index - cols);
          setFocusedProductIndex(prev);
          const prevBtn = productButtonRefs.current[prev];
          prevBtn?.focus();
          prevBtn?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        }
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        onSelect(product);
        break;
      }
    }
  };

  // Keep button refs array size matched
  useEffect(() => {
    productButtonRefs.current = productButtonRefs.current.slice(0, productItems.length);
  }, [productItems]);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top Search & Category Chips */}
      <div className="flex flex-col gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={activeSearchInputRef}
            placeholder="Search products, or scan barcode + Enter"
            className="pl-9 pr-16"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleScan}
            aria-keyshortcuts="/ F2 Alt+s"
          />
          <div className="absolute right-3 top-1/2 flex items-center gap-1.5 -translate-y-1/2 text-muted-foreground">
            <ShortcutHint keyName={searchKeyDisplay} altKeyName="Alt+S" />
            <Barcode className="size-4 opacity-70" />
          </div>
        </div>

        {/* Category Chips Bar */}
        <CategoryChips
          categories={categories}
          categoryBindings={categoryBindings}
          selectedId={categoryId}
          onSelect={handleCategorySelect}
          resultCount={totalCount}
        />
      </div>

      {/* Product Cards Grid */}
      <div
        role="region"
        aria-label="Products Grid"
        className="flex-1 overflow-y-auto rounded-xl border bg-background p-3 flex flex-col justify-between"
      >
        <div>
          {productsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          ) : productItems.length > 0 ? (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
              role="grid"
              aria-label="Product items"
            >
              {productItems.map((product, index) => {
                const isOutOfStock = product.stockQuantity <= 0;
                return (
                  <button
                    key={product.id}
                    data-product-card="true"
                    ref={(el) => {
                      productButtonRefs.current[index] = el;
                    }}
                    tabIndex={focusedProductIndex === index || (focusedProductIndex === -1 && index === 0) ? 0 : -1}
                    onClick={() => onSelect(product)}
                    onFocus={() => setFocusedProductIndex(index)}
                    onKeyDown={(e) => handleProductKeyDown(e, index, product)}
                    disabled={isOutOfStock}
                    className={cn(
                      "group flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-all duration-150",
                      "hover:border-primary/50 hover:bg-accent",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                      focusedProductIndex === index && "ring-2 ring-primary border-primary bg-accent/60 shadow-sm",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug line-clamp-2">
                        {product.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{product.sku}</span>
                      {product.brand && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-foreground/80">{product.brand}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-auto pt-2 flex w-full items-center justify-between">
                      <span className="text-sm font-semibold">{formatCurrency(product.retailPrice)}</span>
                      <Badge
                        variant={product.stockQuantity <= product.reorderLevel ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {product.stockQuantity} in stock
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <PackageX className="size-8" />
              <p className="text-sm">No products found in this category.</p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Discovery Hint */}
        <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">{totalCount}</span> products found
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => setCheatSheetOpen(true)}
          >
            <Keyboard className="size-3" />
            <span>Press</span>
            <kbd className="font-mono text-[10px] px-1 py-0.2 rounded border bg-muted font-semibold">?</kbd>
            <span>for shortcuts</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
