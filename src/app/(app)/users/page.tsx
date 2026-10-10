"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RequireRole } from "@/components/shared/require-role";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
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
  useDeleteUser,
  useRegisterUser,
  useSetUserStatus,
  useUpdateUser,
  useUsers,
} from "@/lib/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { ROLES, type UserDto } from "@/lib/types";

interface FormState {
  fullName: string;
  email: string;
  password: string;
  role: string;
}

const emptyForm: FormState = { fullName: "", email: "", password: "", role: ROLES.Cashier };

export default function UsersPage() {
  return (
    <RequireRole roles={[ROLES.Admin]}>
      <UsersPageContent />
    </RequireRole>
  );
}

function UsersPageContent() {
  const users = useUsers();
  const registerUser = useRegisterUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const setUserStatus = useSetUserStatus();
  const currentUser = useAuthStore((s) => s.user);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [editUser, setEditUser] = useState<UserDto | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || form.password.length < 8) {
      toast.error("Fill all fields; password must be at least 8 characters.");
      return;
    }

    registerUser.mutate(form, {
      onSuccess: () => {
        toast.success("User created");
        setDialogOpen(false);
        setForm(emptyForm);
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  function handleOpenEdit(user: UserDto) {
    setEditUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      password: "",
      role: user.roles[0] || ROLES.Cashier,
    });
  }

  function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      toast.error("Name and Email are required.");
      return;
    }
    if (editForm.password && editForm.password.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    updateUser.mutate(
      {
        id: editUser.id,
        data: {
          fullName: editForm.fullName.trim(),
          email: editForm.email.trim(),
          password: editForm.password.trim() || undefined,
          role: editForm.role,
        },
      },
      {
        onSuccess: () => {
          toast.success("User updated successfully");
          setEditUser(null);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  function handleToggleStatus(user: UserDto) {
    setUserStatus.mutate(
      { id: user.id, isActive: !user.isActive },
      {
        onSuccess: () => toast.success(`${user.fullName} ${user.isActive ? "deactivated" : "activated"}`),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage staff accounts and roles."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> Add User
          </Button>
        }
      />

      <div className="rounded-xl border bg-background">
        {users.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : users.data && users.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "secondary" : "outline"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground">Active</Label>
                        <Switch
                          checked={user.isActive}
                          disabled={user.id === currentUser?.id || setUserStatus.isPending}
                          onCheckedChange={() => handleToggleStatus(user)}
                        />
                      </div>
                      <div className="flex items-center gap-1 border-l pl-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title="Edit user"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          title={user.id === currentUser?.id ? "You cannot delete your own account" : "Delete user"}
                          disabled={user.id === currentUser?.id || deleteUser.isPending}
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState icon={UserCog} title="No users yet" description="Add your first staff account." />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New User</DialogTitle>
            <DialogDescription>Create a staff account with a role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <PasswordInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => v && setForm({ ...form, role: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.Admin}>Admin</SelectItem>
                  <SelectItem value={ROLES.Manager}>Manager</SelectItem>
                  <SelectItem value={ROLES.Cashier}>Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={registerUser.isPending}>
                {registerUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update staff account details, role, or reset password.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>New Password (optional)</Label>
              <PasswordInput
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep current password"
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep unchanged. Minimum 8 characters if changing.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => v && setEditForm({ ...editForm, role: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.Admin}>Admin</SelectItem>
                  <SelectItem value={ROLES.Manager}>Manager</SelectItem>
                  <SelectItem value={ROLES.Cashier}>Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.fullName ?? "user"}?`}
        description={`Are you sure you want to delete ${deleteTarget?.email}? This action cannot be undone.`}
        confirmLabel="Delete User"
        destructive
        loading={deleteUser.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteUser.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("User deleted successfully");
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          });
        }}
      />
    </div>
  );
}
