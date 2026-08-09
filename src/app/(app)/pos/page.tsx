"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { AddToCartDialog } from "@/components/pos/add-to-cart-dialog";
import { useCartStore } from "@/store/cart-store";
import type { ProductDto } from "@/lib/types";

export default function PosPage() {
  const addLine = useCartStore((s) => s.addLine);
  const [pendingProduct, setPendingProduct] = useState<ProductDto | null>(null);

  function handleSelect(product: ProductDto) {
    if (product.stockQuantity <= 0) {
      toast.error(`${product.name} is out of stock.`);
      return;
    }
    setPendingProduct(product);
  }

  function handleConfirm(quantity: number, unitPrice: number) {
    if (!pendingProduct) return;
    addLine(pendingProduct, quantity, unitPrice);
    setPendingProduct(null);
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <ProductGrid onSelect={handleSelect} />
      <div className="h-[calc(100vh-8.5rem)] lg:sticky lg:top-0">
        <CartPanel />
      </div>

      <AddToCartDialog
        product={pendingProduct}
        onOpenChange={(o) => !o && setPendingProduct(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
