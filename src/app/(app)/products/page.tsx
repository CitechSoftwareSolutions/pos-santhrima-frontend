"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Search, PackagePlus, X } from "lucide-react";
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
import { getApiErrorMessage } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import { ROLES, type ProductDto } from "@/lib/types";

interface PriceTierRow {
  key: string;
  quantity: string;
  retailPrice: string;
  wholesalePrice: string;
  specialPrice: string;
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
    retailPrice: "",
    wholesalePrice: "",
    specialPrice: "",
  };
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
    setForm({
      ...emptyForm,
      categoryId: categories.data?.[0]?.id ?? "",
      priceTiers: [newTierRow(), newTierRow()],
    });
    setDialogOpen(true);
  }

  function openEdit(product: ProductDto) {
    setEditing(product);
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
      priceTiers: product.priceTiers.map((t) => ({
        key: t.id,
        quantity: String(t.quantity),
        retailPrice: String(t.retailPrice),
        wholesalePrice: t.wholesalePrice === null ? "" : String(t.wholesalePrice),
        specialPrice: t.specialPrice === null ? "" : String(t.specialPrice),
      })),
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

    const filledTiers = form.priceTiers.filter(
      (t) =>
        t.quantity.trim() !== "" ||
        t.retailPrice.trim() !== "" ||
        t.wholesalePrice.trim() !== "" ||
        t.specialPrice.trim() !== "",
    );
    if (filledTiers.some((t) => t.quantity.trim() === "" || t.retailPrice.trim() === "")) {
      toast.error("Every price tier needs a quantity and a retail price.");
      return;
    }
    const priceTiers = filledTiers.map((t) => ({
      quantity: parseFloat(t.quantity),
      retailPrice: parseFloat(t.retailPrice),
      wholesalePrice: t.wholesalePrice.trim() === "" ? null : parseFloat(t.wholesalePrice),
      specialPrice: t.specialPrice.trim() === "" ? null : parseFloat(t.specialPrice),
    }));
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
      retailPrice: parseFloat(form.retailPrice) || 0,
      wholesalePrice: form.wholesalePrice.trim() === "" ? null : parseFloat(form.wholesalePrice),
      specialPrice: form.specialPrice.trim() === "" ? null : parseFloat(form.specialPrice),
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
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v ?? "all");
            setPage(1);
          }}
        >
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
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
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
                value={form.categoryId}
                onValueChange={(v) => v && setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
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

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label>Quantity Price Tiers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...form, priceTiers: [...form.priceTiers, newTierRow()] })}
                >
                  <Plus className="size-3.5" /> Add Tier
                </Button>
              </div>

              {form.priceTiers.length > 0 && (
                <div className="space-y-3">
                  {form.priceTiers.map((tier) => {
                    function updateTier(patch: Partial<PriceTierRow>) {
                      setForm((f) => ({
                        ...f,
                        priceTiers: f.priceTiers.map((t) => (t.key === tier.key ? { ...t, ...patch } : t)),
                      }));
                    }

                    return (
                      <div key={tier.key} className="space-y-3 rounded-md border p-3">
                        <div className="flex items-end gap-3">
                          <div className="w-36 space-y-1">
                            <Label className="text-xs text-muted-foreground">Quantity</Label>
                            <Input
                              type="number"
                              min={0}
                              step={form.allowDecimalQuantity ? "0.001" : "1"}
                              value={tier.quantity}
                              onChange={(e) => updateTier({ quantity: e.target.value })}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-auto text-destructive hover:text-destructive"
                            onClick={() =>
                              setForm({
                                ...form,
                                priceTiers: form.priceTiers.filter((t) => t.key !== tier.key),
                              })
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Retail Price</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={tier.retailPrice}
                              onChange={(e) => updateTier({ retailPrice: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Wholesale Price</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Optional"
                              value={tier.wholesalePrice}
                              onChange={(e) => updateTier({ wholesalePrice: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Special Price</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Optional"
                              value={tier.specialPrice}
                              onChange={(e) => updateTier({ specialPrice: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                e.g. exactly 3 units at Rs. 90, exactly 6 units at Rs. 80. A tier only applies when the sale
                quantity matches it exactly - it&apos;s not a "3 or more" threshold. Add as many or as few as
                you need, or leave them empty for a single-price product. Each tier can set a Retail price
                (required) plus optional Wholesale and Special prices, and cashiers can still edit the price
                freely at checkout.
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

            {editing && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Active</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
            )}

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
