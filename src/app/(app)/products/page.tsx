"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Search, PackagePlus, X, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { RequireRole } from "@/components/shared/require-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategories } from "@/lib/hooks/use-categories";
import {
  useAdjustStock,
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "@/lib/hooks/use-products";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { productsApi } from "@/lib/api/products";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import { ROLES, type ProductDto } from "@/lib/types";

interface PriceTierRow {
  key: string;
  quantity: string;
  retailDiscountPercent: string;
  wholesaleDiscountPercent: string;
  specialDiscountPercent: string;
}

interface ProductFormState {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  costPrice: string;
  retailPrice: string;
  wholesalePrice: string;
  specialPrice: string;
  priceTiers: PriceTierRow[];
  taxRate: string;
  unit: string;
  allowDecimalQuantity: boolean;
  initialStock: string;
  reorderLevel: string;
  isActive: boolean;
}

function newTierRow(): PriceTierRow {
  return {
    key: crypto.randomUUID(),
    quantity: "",
    retailDiscountPercent: "",
    wholesaleDiscountPercent: "",
    specialDiscountPercent: "",
  };
}

function createDefaultTiers(count = 5): PriceTierRow[] {
  return Array.from({ length: count }, () => newTierRow());
}

function calculateDiscountPrice(basePrice: number, discountPercentStr: string): number | null {
  if (basePrice <= 0) return null;
  const trimmed = discountPercentStr.trim();
  if (trimmed === "") return basePrice;
  const discount = parseFloat(trimmed);
  if (isNaN(discount)) return basePrice;
  const clampedDiscount = Math.min(100, Math.max(0, discount));
  const finalPrice = basePrice * (1 - clampedDiscount / 100);
  return Math.round(finalPrice * 100) / 100;
}

const emptyForm: ProductFormState = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  categoryId: "",
  costPrice: "",
  retailPrice: "",
  wholesalePrice: "",
  specialPrice: "",
  priceTiers: [],
  taxRate: "0",
  unit: "pcs",
  allowDecimalQuantity: false,
  initialStock: "0",
  reorderLevel: "5",
  isActive: true,
};

export default function ProductsPage() {
  return (
    <RequireRole roles={[ROLES.Admin, ROLES.Manager]}>
      <ProductsPageContent />
    </RequireRole>
  );
}

function ProductsPageContent() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 300);

  const categories = useCategories();
  const products = useProducts({
    page,
    pageSize: 12,
    search: debouncedSearch || undefined,
    categoryId: categoryId === "all" ? undefined : categoryId,
  });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const adjustStock = useAdjustStock();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ProductDto | null>(null);
  const [stockTarget, setStockTarget] = useState<ProductDto | null>(null);
  const [stockChange, setStockChange] = useState("");
  const [stockNotes, setStockNotes] = useState("");

  function openCreate() {
    setEditing(null);
    const initialCategory = categories.data?.[0]?.id ?? "";
    setForm({
      ...emptyForm,
      categoryId: initialCategory,
      priceTiers: createDefaultTiers(5),
    });
    if (initialCategory) {
      generateSkuForCategory(initialCategory);
    }
    setDialogOpen(true);
  }

  function openEdit(product: ProductDto) {
    setEditing(product);
    const calcPercent = (base: number, tierPrice: number | null | undefined) => {
      if (tierPrice == null || base <= 0) return "";
      const discount = ((base - tierPrice) / base) * 100;
      const rounded = Math.round(discount * 100) / 100;
      return String(rounded >= 0 ? rounded : 0);
    };

    setForm({
      sku: product.sku,
      barcode: product.barcode ?? "",
      name: product.name,
      description: product.description ?? "",
      categoryId: product.categoryId,
      costPrice: String(product.costPrice),
      retailPrice: String(product.retailPrice),
      wholesalePrice: product.wholesalePrice === null ? "" : String(product.wholesalePrice),
      specialPrice: product.specialPrice === null ? "" : String(product.specialPrice),
      priceTiers:
        product.priceTiers.length > 0
          ? product.priceTiers.map((t) => ({
              key: t.id,
              quantity: String(t.quantity),
              retailDiscountPercent: calcPercent(product.retailPrice, t.retailPrice),
              wholesaleDiscountPercent:
                product.wholesalePrice != null ? calcPercent(product.wholesalePrice, t.wholesalePrice) : "",
              specialDiscountPercent:
                product.specialPrice != null ? calcPercent(product.specialPrice, t.specialPrice) : "",
            }))
          : createDefaultTiers(5),
      taxRate: String(product.taxRate),
      unit: product.unit,
      allowDecimalQuantity: product.allowDecimalQuantity,
      initialStock: String(product.stockQuantity),
      reorderLevel: String(product.reorderLevel),
      isActive: product.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim() || !form.categoryId) {
      toast.error("SKU, name, and category are required.");
      return;
    }

    const baseRetail = parseFloat(form.retailPrice) || 0;
    if (baseRetail <= 0) {
      toast.error("A valid retail price is required.");
      return;
    }

    const baseWholesale =
      form.wholesalePrice.trim() !== "" ? parseFloat(form.wholesalePrice) : null;
    const baseSpecial =
      form.specialPrice.trim() !== "" ? parseFloat(form.specialPrice) : null;

    const hasAnyTierData = (t: PriceTierRow) =>
      t.quantity.trim() !== "" ||
      t.retailDiscountPercent.trim() !== "" ||
      t.wholesaleDiscountPercent.trim() !== "" ||
      t.specialDiscountPercent.trim() !== "";

    const activeTiers = form.priceTiers.filter(hasAnyTierData);
    for (const t of activeTiers) {
      if (!t.quantity.trim()) {
        toast.error("Please enter a quantity for all configured price tiers.");
        return;
      }
      const q = parseFloat(t.quantity);
      if (isNaN(q) || q <= 0) {
        toast.error("Price tier quantity must be greater than 0.");
        return;
      }
      const retDiscount = parseFloat(t.retailDiscountPercent || "0");
      if (isNaN(retDiscount) || retDiscount < 0 || retDiscount > 100) {
        toast.error("Retail discount must be between 0% and 100%.");
        return;
      }
      if (t.wholesaleDiscountPercent.trim() !== "") {
        const wsDiscount = parseFloat(t.wholesaleDiscountPercent);
        if (isNaN(wsDiscount) || wsDiscount < 0 || wsDiscount > 100) {
          toast.error("Wholesale discount must be between 0% and 100%.");
          return;
        }
      }
      if (t.specialDiscountPercent.trim() !== "") {
        const spDiscount = parseFloat(t.specialDiscountPercent);
        if (isNaN(spDiscount) || spDiscount < 0 || spDiscount > 100) {
          toast.error("Special discount must be between 0% and 100%.");
          return;
        }
      }
    }

    const priceTiers = activeTiers.map((t) => {
      const retDiscount = parseFloat(t.retailDiscountPercent || "0");
      const calculatedRetail = Math.round(baseRetail * (1 - retDiscount / 100) * 100) / 100;

      let calculatedWholesale: number | null = null;
      if (baseWholesale !== null && t.wholesaleDiscountPercent.trim() !== "") {
        const wsDiscount = parseFloat(t.wholesaleDiscountPercent);
        if (!isNaN(wsDiscount) && wsDiscount >= 0 && wsDiscount <= 100) {
          calculatedWholesale = Math.round(baseWholesale * (1 - wsDiscount / 100) * 100) / 100;
        }
      }

      let calculatedSpecial: number | null = null;
      if (baseSpecial !== null && t.specialDiscountPercent.trim() !== "") {
        const spDiscount = parseFloat(t.specialDiscountPercent);
        if (!isNaN(spDiscount) && spDiscount >= 0 && spDiscount <= 100) {
          calculatedSpecial = Math.round(baseSpecial * (1 - spDiscount / 100) * 100) / 100;
        }
      }

      return {
        quantity: parseFloat(t.quantity),
        retailPrice: calculatedRetail,
        wholesalePrice: calculatedWholesale,
        specialPrice: calculatedSpecial,
      };
    });

    const uniqueQuantities = new Set(priceTiers.map((t) => t.quantity));
    if (uniqueQuantities.size !== priceTiers.length) {
      toast.error("Price tiers cannot have duplicate quantities.");
      return;
    }

    const payload = {
      sku: form.sku,
      barcode: form.barcode || null,
      name: form.name,
      description: form.description || null,
      categoryId: form.categoryId,
      costPrice: parseFloat(form.costPrice) || 0,
      retailPrice: baseRetail,
      wholesalePrice: baseWholesale,
      specialPrice: baseSpecial,
      taxRate: parseFloat(form.taxRate) || 0,
      unit: form.unit || "pcs",
      allowDecimalQuantity: form.allowDecimalQuantity,
      reorderLevel: parseFloat(form.reorderLevel) || 0,
      imageUrl: null,
      priceTiers,
    };

    if (editing) {
      updateProduct.mutate(
        { id: editing.id, data: { ...payload, isActive: form.isActive } },
        {
          onSuccess: () => {
            toast.success("Product updated");
            setDialogOpen(false);
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    } else {
      createProduct.mutate(
        { ...payload, initialStock: parseFloat(form.initialStock) || 0 },
        {
          onSuccess: () => {
            toast.success("Product created");
            setDialogOpen(false);
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Product deleted");
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err));
        setDeleteTarget(null);
      },
    });
  }

  function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!stockTarget) return;
    const change = parseFloat(stockChange);
    if (Number.isNaN(change) || change === 0) {
      toast.error("Enter a non-zero quantity change.");
      return;
    }
    adjustStock.mutate(
      { id: stockTarget.id, data: { quantityChange: change, notes: stockNotes || null } },
      {
        onSuccess: () => {
          toast.success("Stock adjusted");
          setStockTarget(null);
          setStockChange("");
          setStockNotes("");
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  const isSaving = createProduct.isPending || updateProduct.isPending;

  async function generateSkuForCategory(catId: string) {
    if (!catId) return;
    try {
      const nextSku = await productsApi.getNextSku(catId);
      if (nextSku) {
        setForm((prev) => ({ ...prev, sku: nextSku }));
        return;
      }
    } catch {
      // Fallback below if backend endpoint is not yet reachable
    }

    const cat = categories.data?.find((c) => c.id === catId);
    const raw = cat?.name?.trim().replace(/[^a-zA-Z0-9]/g, "") || "";
    const code = (raw.length >= 2 ? raw.slice(0, 2) : raw.padEnd(2, "X")).toUpperCase();
    const prefix = `SKU-${code}-`;

    let maxNum = 0;
    products.data?.items.forEach((p) => {
      if (p.sku?.startsWith(prefix)) {
        const numPart = p.sku.slice(prefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });

    const nextNum = maxNum + 1;
    const formatted = `${prefix}${String(nextNum).padStart(4, "0")}`;
    setForm((prev) => ({ ...prev, sku: formatted }));
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog and stock levels."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add Product
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or barcode..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          items={[
            { value: "all", label: "All categories" },
            ...(categories.data?.map((c) => ({ value: c.id, label: c.name })) ?? []),
          ]}
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories">
              {(val: string | null) =>
                val === "all" || !val
                  ? "All categories"
                  : (categories.data?.find((c) => c.id === val)?.name ?? val)
              }
            </SelectValue>
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

      <div className="rounded-xl border bg-background">
        {products.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : products.data && products.data.items.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.data.items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.sku}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.categoryName}</TableCell>
                    <TableCell>{formatCurrency(product.retailPrice)}</TableCell>
                    <TableCell>
                      <Badge variant={product.isLowStock ? "destructive" : "secondary"}>
                        {product.stockQuantity} {product.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "secondary" : "outline"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Adjust stock"
                        onClick={() => setStockTarget(product)}
                      >
                        <PackagePlus className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(product)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              page={products.data.page}
              totalPages={products.data.totalPages}
              totalCount={products.data.totalCount}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try adjusting your filters, or add a new product."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add Product
              </Button>
            }
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update product details." : "Add a new product to your catalog."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>SKU</Label>
                  {!editing && form.categoryId && (
                    <button
                      type="button"
                      onClick={() => generateSkuForCategory(form.categoryId)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      title="Re-generate SKU"
                    >
                      <Sparkles className="size-3" />
                      Auto-generate
                    </button>
                  )}
                </div>
                <Input
                  value={form.sku}
                  placeholder={form.categoryId ? "Auto-generated SKU" : "Select category to auto-generate"}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                items={categories.data?.map((c) => ({ value: c.id, label: c.name }))}
                value={form.categoryId || null}
                onValueChange={(v) => {
                  if (!v) return;
                  setForm((prev) => ({ ...prev, categoryId: v }));
                  if (!editing) {
                    generateSkuForCategory(v);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category">
                    {(val: string | null) =>
                      val
                        ? (categories.data?.find((c) => c.id === val)?.name ?? val)
                        : "Select category"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cost Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <Label>Selling Prices</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Retail Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.retailPrice}
                    onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Wholesale Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Optional"
                    value={form.wholesalePrice}
                    onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Special Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Optional"
                    value={form.specialPrice}
                    onChange={(e) => setForm({ ...form, specialPrice: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Retail is required. Wholesale and Special are optional - they apply when no exact-quantity
                tier matches and a cashier picks that price type at checkout (falling back to Retail if not
                set).
              </p>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Quantity Price Tiers</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter discount percentages from the selling prices above. Prices calculate in real-time.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...form, priceTiers: [...form.priceTiers, newTierRow()] })}
                >
                  <Plus className="size-3.5" /> Add Tier
                </Button>
              </div>

              {form.priceTiers.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-28 text-xs font-semibold">Quantity</TableHead>
                        <TableHead className="min-w-36 text-xs font-semibold">Retail Discount</TableHead>
                        <TableHead className="min-w-36 text-xs font-semibold">Wholesale Discount</TableHead>
                        <TableHead className="min-w-36 text-xs font-semibold">Special Discount</TableHead>
                        <TableHead className="w-10 p-0 text-center"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.priceTiers.map((tier) => {
                        const baseRetail = parseFloat(form.retailPrice) || 0;
                        const baseWholesale =
                          form.wholesalePrice.trim() !== "" ? parseFloat(form.wholesalePrice) : null;
                        const baseSpecial =
                          form.specialPrice.trim() !== "" ? parseFloat(form.specialPrice) : null;

                        const calcRetail = calculateDiscountPrice(
                          baseRetail,
                          tier.retailDiscountPercent,
                        );
                        const calcWholesale =
                          baseWholesale !== null
                            ? calculateDiscountPrice(baseWholesale, tier.wholesaleDiscountPercent)
                            : null;
                        const calcSpecial =
                          baseSpecial !== null
                            ? calculateDiscountPrice(baseSpecial, tier.specialDiscountPercent)
                            : null;

                        function updateTier(patch: Partial<PriceTierRow>) {
                          setForm((f) => ({
                            ...f,
                            priceTiers: f.priceTiers.map((t) => (t.key === tier.key ? { ...t, ...patch } : t)),
                          }));
                        }

                        return (
                          <TableRow key={tier.key}>
                            <TableCell className="py-2.5 align-top">
                              <Input
                                type="number"
                                min={0}
                                step={form.allowDecimalQuantity ? "0.001" : "1"}
                                placeholder="Qty"
                                value={tier.quantity}
                                onChange={(e) => updateTier({ quantity: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell className="py-2.5 align-top">
                              <div className="space-y-1">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    placeholder="0"
                                    value={tier.retailDiscountPercent}
                                    onChange={(e) =>
                                      updateTier({ retailDiscountPercent: e.target.value })
                                    }
                                    className="h-8 pr-6 text-sm"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                    %
                                  </span>
                                </div>
                                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  {baseRetail <= 0 ? (
                                    <span className="text-muted-foreground font-normal text-[11px]">
                                      Set retail price
                                    </span>
                                  ) : calcRetail !== null ? (
                                    formatCurrency(calcRetail)
                                  ) : (
                                    <span className="text-muted-foreground font-normal">-</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 align-top">
                              <div className="space-y-1">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    placeholder={baseWholesale !== null ? "0" : "N/A"}
                                    disabled={baseWholesale === null}
                                    value={tier.wholesaleDiscountPercent}
                                    onChange={(e) =>
                                      updateTier({ wholesaleDiscountPercent: e.target.value })
                                    }
                                    className="h-8 pr-6 text-sm disabled:opacity-50"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                    %
                                  </span>
                                </div>
                                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  {baseWholesale === null ? (
                                    <span className="text-muted-foreground font-normal text-[11px]">
                                      No base wholesale
                                    </span>
                                  ) : calcWholesale !== null ? (
                                    formatCurrency(calcWholesale)
                                  ) : (
                                    <span className="text-muted-foreground font-normal">-</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 align-top">
                              <div className="space-y-1">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    placeholder={baseSpecial !== null ? "0" : "N/A"}
                                    disabled={baseSpecial === null}
                                    value={tier.specialDiscountPercent}
                                    onChange={(e) =>
                                      updateTier({ specialDiscountPercent: e.target.value })
                                    }
                                    className="h-8 pr-6 text-sm disabled:opacity-50"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                    %
                                  </span>
                                </div>
                                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  {baseSpecial === null ? (
                                    <span className="text-muted-foreground font-normal text-[11px]">
                                      No base special
                                    </span>
                                  ) : calcSpecial !== null ? (
                                    formatCurrency(calcSpecial)
                                  ) : (
                                    <span className="text-muted-foreground font-normal">-</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 align-top text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setForm({
                                    ...form,
                                    priceTiers: form.priceTiers.filter((t) => t.key !== tier.key),
                                  })
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                  No quantity tiers added yet. Click &quot;Add Tier&quot; to configure bulk discount pricing.
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Enter the discount percentage for each tier. The discounted unit price is calculated in real-time
                from the Selling Prices above. Each tier applies when the sale quantity matches it.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  placeholder="pcs, kg, bottle..."
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label>Initial Stock</Label>
                  <Input
                    type="number"
                    min={0}
                    step={form.allowDecimalQuantity ? "0.001" : "1"}
                    value={form.initialStock}
                    onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  min={0}
                  step={form.allowDecimalQuantity ? "0.001" : "1"}
                  value={form.reorderLevel}
                  onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">Sold by weight/volume</Label>
                <p className="text-xs text-muted-foreground">
                  Allow fractional quantities (e.g. 0.5 kg) at checkout.
                </p>
              </div>
              <Switch
                checked={form.allowDecimalQuantity}
                onCheckedChange={(v) => setForm({ ...form, allowDecimalQuantity: v })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockTarget} onOpenChange={(o) => !o && setStockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {stockTarget?.name} — current stock: {stockTarget?.stockQuantity} {stockTarget?.unit}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="space-y-2">
              <Label>Quantity Change</Label>
              <Input
                type="number"
                step={stockTarget?.allowDecimalQuantity ? "0.001" : "1"}
                placeholder="e.g. 10 or -5"
                value={stockChange}
                onChange={(e) => setStockChange(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use a positive number to add stock, negative to remove.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStockTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adjustStock.isPending}>
                {adjustStock.isPending ? "Saving..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete product?"
        description={`This will remove "${deleteTarget?.name}" from your catalog.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteProduct.isPending}
      />
    </div>
  );
}
