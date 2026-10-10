"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Search, Award, Gift } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { CustomerLoyaltyHistoryDialog } from "@/components/customers/loyalty-history-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/lib/hooks/use-customers";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import type { CustomerDto } from "@/lib/types";

interface FormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

const emptyForm: FormState = { name: "", phone: "", email: "", address: "", isActive: true };

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const customers = useCustomers({ page, pageSize: 12, search: debouncedSearch || undefined });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CustomerDto | null>(null);
  const [loyaltyTarget, setLoyaltyTarget] = useState<CustomerDto | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(customer: CustomerDto) {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      isActive: customer.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
    };

    if (editing) {
      updateCustomer.mutate(
        { id: editing.id, data: { ...payload, isActive: form.isActive } },
        {
          onSuccess: () => {
            toast.success("Customer updated");
            setDialogOpen(false);
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      );
    } else {
      createCustomer.mutate(payload, {
        onSuccess: () => {
          toast.success("Customer created");
          setDialogOpen(false);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteCustomer.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Customer deleted");
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(getApiErrorMessage(err));
        setDeleteTarget(null);
      },
    });
  }

  const isSaving = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer records and loyalty."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add Customer
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="rounded-xl border bg-background">
        {customers.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : customers.data && customers.data.items.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total Purchases</TableHead>
                  <TableHead>Royalty Points</TableHead>
                  <TableHead>Points Redeemed</TableHead>
                  <TableHead>Milestone & Gifts</TableHead>
                  <TableHead>Credit Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.data.items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.phone || customer.email || "—"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(customer.totalPurchases)}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setLoyaltyTarget(customer)}
                        className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                        title="Click to view points history"
                      >
                        <Award className="size-3.5" />
                        {customer.loyaltyPoints.toFixed(2)} pts
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.loyaltyPointsRedeemed.toFixed(2)} pts
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {customer.milestoneTier > 0 ? (
                          <Badge variant="outline" className="text-[11px] border-primary/30 bg-primary/5">
                            Tier {customer.milestoneTier} ({customer.milestoneTier * 75}k)
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Below 75k</span>
                        )}
                        {customer.isEligibleForGift && (
                          <button
                            type="button"
                            onClick={() => setLoyaltyTarget(customer)}
                            className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
                          >
                            <Gift className="size-3" /> Gift Eligible
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(customer.creditBalance)}</TableCell>
                    <TableCell>
                      <Badge variant={customer.isActive ? "secondary" : "outline"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Royalty points & ledger history"
                        onClick={() => setLoyaltyTarget(customer)}
                      >
                        <Award className="size-4 text-amber-600 dark:text-amber-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(customer)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              page={customers.data.page}
              totalPages={customers.data.totalPages}
              totalCount={customers.data.totalCount}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer record."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add Customer
              </Button>
            }
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "New Customer"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update customer details." : "Add a new customer record."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
                {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete customer?"
        description={`This will remove "${deleteTarget?.name}" from your records.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteCustomer.isPending}
      />

      <CustomerLoyaltyHistoryDialog
        customer={loyaltyTarget}
        open={!!loyaltyTarget}
        onOpenChange={(o) => !o && setLoyaltyTarget(null)}
      />
    </div>
  );
}
