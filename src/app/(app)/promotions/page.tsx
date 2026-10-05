"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RequireRole } from "@/components/shared/require-role";
import { ProductCombobox } from "@/components/shared/product-combobox";
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
import {
  useCreatePromotion,
  useDeletePromotion,
  usePromotions,
  useUpdatePromotion,
} from "@/lib/hooks/use-promotions";
import { getApiErrorMessage } from "@/lib/api/client";
import { describePromotion } from "@/lib/promotion-utils";
import { toDateInputValue } from "@/lib/format";
import { PromotionType, PromotionTypeLabels, ROLES, type ProductDto, type PromotionDto } from "@/lib/types";

interface FormState {
  name: string;
  description: string;
  product: ProductDto | null;
  type: PromotionType;
  buyQuantity: string;
  freeQuantity: string;
  minQuantity: string;
  discountPercent: string;
  bundleQuantity: string;
  bundlePrice: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  product: null,
  type: PromotionType.BuyXGetYFree,
  buyQuantity: "",
  freeQuantity: "",
  minQuantity: "",
  discountPercent: "",
  bundleQuantity: "",
  bundlePrice: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

export default function PromotionsPage() {
  return (
    <RequireRole roles={[ROLES.Admin, ROLES.Manager]}>
      <PromotionsPageContent />
    </RequireRole>
  );
}

function PromotionsPageContent() {
  const promotions = usePromotions();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<PromotionDto | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(promotion: PromotionDto) {
    setEditing(promotion);
    setForm({
      name: promotion.name,
      description: promotion.description ?? "",
      product: {
        id: promotion.productId,
        name: promotion.productName,
      } as ProductDto,
      type: promotion.type,
      buyQuantity: promotion.buyQuantity != null ? String(promotion.buyQuantity) : "",
      freeQuantity: promotion.freeQuantity != null ? String(promotion.freeQuantity) : "",
      minQuantity: promotion.minQuantity != null ? String(promotion.minQuantity) : "",
      discountPercent: promotion.discountPercent != null ? String(promotion.discountPercent) : "",
      bundleQuantity: promotion.bundleQuantity != null ? String(promotion.bundleQuantity) : "",
      bundlePrice: promotion.bundlePrice != null ? String(promotion.bundlePrice) : "",
      startDate: promotion.startDate ? toDateInputValue(new Date(promotion.startDate)) : "",
      endDate: promotion.endDate ? toDateInputValue(new Date(promotion.endDate)) : "",
      isActive: promotion.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.product) {
      toast.error("Name and product are required.");
      return;
    }

    const num = (v: string) => (v.trim() === "" ? null : parseFloat(v));

    const payload = {
      name: form.name,
      description: form.description || null,
      type: form.type,
      buyQuantity: num(form.buyQuantity),
      freeQuantity: num(form.freeQuantity),
      minQuantity: num(form.minQuantity),
      discountPercent: num(form.discountPercent),
      bundleQuantity: num(form.bundleQuantity),
      bundlePrice: num(form.bundlePrice),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    };

    if (editing) {
      updatePromotion.mutate(
        { id: editing.id, data: { ...payload, isActive: form.isActive } },
        {
          onSuccess: () => {
            toast.success("Promotion updated");
            setDialogOpen(false);
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    } else {
      createPromotion.mutate(
        { ...payload, productId: form.product.id },
        {
          onSuccess: () => {
            toast.success("Promotion created");
            setDialogOpen(false);
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deletePromotion.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Promotion deleted");
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err));
        setDeleteTarget(null);
      },
    });
  }

  const isSaving = createPromotion.isPending || updatePromotion.isPending;

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Automatic discount rules applied at checkout (buy X get Y free, bulk discounts, bundles)."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add Promotion
          </Button>
        }
      />

      <div className="rounded-xl border bg-background">
        {promotions.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : promotions.data && promotions.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.data.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell className="font-medium">{promotion.name}</TableCell>
                  <TableCell className="text-muted-foreground">{promotion.productName}</TableCell>
                  <TableCell>{describePromotion(promotion)}</TableCell>
                  <TableCell>
                    <Badge variant={promotion.isActive ? "secondary" : "outline"}>
                      {promotion.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(promotion)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(promotion)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            icon={Tag}
            title="No promotions yet"
            description="Create automatic discount rules like 'Buy 5 Get 1 Free'."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add Promotion
              </Button>
            }
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Promotion" : "New Promotion"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this promotion's rule." : "Set up an automatic discount rule for a product."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label>Product</Label>
              <ProductCombobox
                value={form.product}
                onSelect={(p) => setForm({ ...form, product: p })}
                disabled={!!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Promotion Type</Label>
              <Select
                items={Object.entries(PromotionTypeLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={String(form.type)}
                onValueChange={(v) => v && setForm({ ...form, type: Number(v) as PromotionType })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(val: string | null) =>
                      val != null && (Number(val) in PromotionTypeLabels || val in PromotionTypeLabels)
                        ? PromotionTypeLabels[Number(val) as PromotionType]
                        : val
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PromotionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.type === PromotionType.BuyXGetYFree && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Buy Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    step="0.001"
                    value={form.buyQuantity}
                    onChange={(e) => setForm({ ...form, buyQuantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Free Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    step="0.001"
                    value={form.freeQuantity}
                    onChange={(e) => setForm({ ...form, freeQuantity: e.target.value })}
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  e.g. Buy 5 Get 1 Free → every 6 units bought, 1 is free.
                </p>
              </div>
            )}

            {form.type === PromotionType.BulkPercentOff && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Minimum Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    step="0.001"
                    value={form.minQuantity}
                    onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  e.g. 10+ units get 20% off the whole line.
                </p>
              </div>
            )}

            {form.type === PromotionType.FixedPriceBundle && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Bundle Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    step="0.001"
                    value={form.bundleQuantity}
                    onChange={(e) => setForm({ ...form, bundleQuantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bundle Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.bundlePrice}
                    onChange={(e) => setForm({ ...form, bundlePrice: e.target.value })}
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  e.g. 3 units for a flat Rs. 1,000 total.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date (optional)</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
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
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Promotion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete promotion?"
        description={`This will remove "${deleteTarget?.name}".`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deletePromotion.isPending}
      />
    </div>
  );
}
