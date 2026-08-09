"use client";

import { useState } from "react";
import { Search, Barcode, PackageX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/lib/hooks/use-products";
import { useCategories } from "@/lib/hooks/use-categories";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { productsApi } from "@/lib/api/products";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductDto } from "@/lib/types";
import { toast } from "sonner";

export function ProductGrid({ onSelect }: { onSelect: (product: ProductDto) => void }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const debouncedSearch = useDebouncedValue(search, 250);

  const categories = useCategories();
  const products = useProducts({
    search: debouncedSearch || undefined,
    categoryId: categoryId === "all" ? undefined : categoryId,
    isActive: true,
    page: 1,
    pageSize: 40,
  });

  async function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !search.trim()) return;
    const product = await productsApi.lookupByCode(search.trim());
    if (product) {
      onSelect(product);
      setSearch("");
    } else {
      toast.error(`No product found for "${search}"`);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products, or scan barcode + Enter"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleScan}
          />
          <Barcode className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.data?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border bg-background p-3">
        {products.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : products.data && products.data.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.data.items.map((product) => (
              <button
                key={product.id}
                onClick={() => onSelect(product)}
                disabled={product.stockQuantity <= 0}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug line-clamp-2">
                    {product.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{product.sku}</span>
                <div className="mt-1 flex w-full items-center justify-between">
                  <span className="text-sm font-semibold">{formatCurrency(product.retailPrice)}</span>
                  <Badge
                    variant={product.stockQuantity <= product.reorderLevel ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {product.stockQuantity} in stock
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <PackageX className="size-8" />
            <p className="text-sm">No products found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
