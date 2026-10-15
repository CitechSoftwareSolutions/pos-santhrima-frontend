"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Barcode, PackageX, Keyboard, ChevronLeft, ChevronRight } from "lucide-react";
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

const PAGE_SIZE = 12;

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

  const [page, setPage] = useState<number>(1);

  // Reset to page 1 when search or category filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId]);

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
    page,
    pageSize: PAGE_SIZE,
  });

  const productItems = useMemo(
    () => productsQuery.data?.items ?? [],
    [productsQuery.data?.items],
  );

  const totalCount = productsQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalCount);

  const handleCategorySelect = useCallback(
    (id: string, name: string) => {
      if (onCategoryChange) {
        onCategoryChange(id, name);
      } else {
        setInternalCategoryId(id);
      }
    },
    [onCategoryChange],
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
        focusItem(0);
      }
    }
  }

  function focusItem(targetIdx: number) {
    if (targetIdx < 0 || targetIdx >= productItems.length) return;
    setFocusedProductIndex(targetIdx);
    const targetBtn = productButtonRefs.current[targetIdx];
    targetBtn?.focus();
    targetBtn?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  // Global arrow navigation: focus product card when pressing arrow keys outside inputs
  useEffect(() => {
    function handleGlobalArrow(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || isAnyDialogOpen()) return;

      const isArrow =
        e.code === "ArrowDown" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowRight" ||
        e.code === "ArrowLeft";

      if (!isArrow) return;

      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl?.getAttribute("data-product-card") === "true") {
        return;
      }
      if (activeEl?.getAttribute("aria-label")?.startsWith("Cart line")) {
        return;
      }

      if (productItems.length > 0) {
        e.preventDefault();
        const targetIndex =
          focusedProductIndex >= 0 && focusedProductIndex < productItems.length
            ? focusedProductIndex
            : 0;
        focusItem(targetIndex);
      }
    }

    window.addEventListener("keydown", handleGlobalArrow);
    return () => window.removeEventListener("keydown", handleGlobalArrow);
  }, [productItems, focusedProductIndex]);

  // Arrow key grid navigation: 3 columns (or 2/4 depending on screen width)
  const handleProductKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    product: ProductDto,
  ) => {
    const count = productItems.length;
    // Determine rendered column count dynamically
    let cols = 3;
    if (productButtonRefs.current.length >= 2 && productButtonRefs.current[0] && productButtonRefs.current[1]) {
      const firstTop = productButtonRefs.current[0].offsetTop;
      let detectedCols = 0;
      for (const btn of productButtonRefs.current) {
        if (!btn) break;
        if (Math.abs(btn.offsetTop - firstTop) < 6) {
          detectedCols++;
        } else {
          break;
        }
      }
      if (detectedCols > 0) cols = detectedCols;
    }

    switch (e.key) {
      case "ArrowRight": {
        e.preventDefault();
        if (index + 1 < count) {
          focusItem(index + 1);
        }
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        if (index > 0) {
          focusItem(index - 1);
        }
        break;
      }
      case "ArrowDown": {
        e.preventDefault();
        if (index + cols < count) {
          focusItem(index + cols);
        } else if (page < totalPages) {
          // At bottom edge: pressing down navigates to next page
          setPage((p) => p + 1);
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (index >= cols) {
          focusItem(index - 1);
        } else {
          // At top row: move focus back up to search box
          activeSearchInputRef.current?.focus();
          setFocusedProductIndex(-1);
        }
        break;
      }
      case "PageDown": {
        e.preventDefault();
        if (page < totalPages) {
          setPage((p) => p + 1);
        }
        break;
      }
      case "PageUp": {
        e.preventDefault();
        if (page > 1) {
          setPage((p) => p - 1);
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
    <div className="flex h-full flex-col gap-2.5 min-w-0 max-w-full overflow-hidden">
      {/* Top Search & Category Chips */}
      <div className="flex flex-col gap-2 shrink-0 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={activeSearchInputRef}
            placeholder="Search products, or scan barcode + Enter"
            className="pl-9 pr-16 w-full"
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
        <div className="min-w-0 max-w-full overflow-hidden">
          <CategoryChips
            categories={categories}
            categoryBindings={categoryBindings}
            selectedId={categoryId}
            onSelect={handleCategorySelect}
            resultCount={totalCount}
          />
        </div>
      </div>

      {/* Product Cards Container - Vertical Scrolling Down, NEVER Horizontal */}
      <div
        role="region"
        aria-label="Products Grid"
        className="flex-1 min-w-0 overflow-hidden rounded-xl border bg-background p-3 flex flex-col justify-between"
      >
        {/* Scrollable Downwards Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pr-1 scrollbar-thin">
          {productsQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : productItems.length > 0 ? (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5"
              role="grid"
              aria-label="Product items"
            >
              {productItems.map((product, index) => {
                const isOutOfStock = product.stockQuantity <= 0;
                const isFocused = focusedProductIndex === index;

                return (
                  <button
                    key={product.id}
                    type="button"
                    data-product-card="true"
                    ref={(el) => {
                      productButtonRefs.current[index] = el;
                    }}
                    tabIndex={isFocused || (focusedProductIndex === -1 && index === 0) ? 0 : -1}
                    onClick={() => onSelect(product)}
                    onFocus={() => setFocusedProductIndex(index)}
                    onKeyDown={(e) => handleProductKeyDown(e, index, product)}
                    disabled={isOutOfStock}
                    className={cn(
                      "group flex flex-col items-start gap-1 rounded-lg border bg-card p-2.5 text-left transition-all duration-150 min-h-[92px]",
                      "hover:border-primary/50 hover:bg-accent",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:outline-none",
                      isFocused && "ring-2 ring-primary border-primary bg-accent/60 shadow-sm",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-1.5">
                      <span className="text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-foreground">
                        {product.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-wrap">
                      <span>{product.sku}</span>
                      {product.brand && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-foreground/80 truncate max-w-[100px]">
                            {product.brand}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-auto pt-1.5 flex w-full items-center justify-between gap-1">
                      <span className="text-xs sm:text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                        {formatCurrency(product.retailPrice)}
                      </span>
                      <Badge
                        variant={product.stockQuantity <= product.reorderLevel ? "destructive" : "secondary"}
                        className="text-[9px] px-1 py-0 shrink-0 font-normal"
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

        {/* Footer with Previous / Next Pagination Buttons */}
        <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs shrink-0 min-w-0">
          <div className="text-muted-foreground truncate pr-2">
            Showing <span className="font-semibold text-foreground">{startItem}</span>–
            <span className="font-semibold text-foreground">{endItem}</span> of{" "}
            <span className="font-semibold text-foreground">{totalCount}</span> items
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || productsQuery.isLoading}
              className="h-8 px-3 text-xs gap-1.5 font-medium select-none"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </Button>

            <span className="text-xs font-semibold px-2 text-foreground whitespace-nowrap">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || productsQuery.isLoading}
              className="h-8 px-3 text-xs gap-1.5 font-medium select-none"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 ml-1"
              onClick={() => setCheatSheetOpen(true)}
            >
              <Keyboard className="size-3.5" />
              <span className="hidden sm:inline">Shortcuts</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
