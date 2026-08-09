"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RequireRole } from "@/components/shared/require-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useRegisterUser, useSetUserStatus, useUsers } from "@/lib/hooks/use-auth";
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
  const setUserStatus = useSetUserStatus();
  const currentUser = useAuthStore((s) => s.user);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

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
                    <div className="flex items-center justify-end gap-2">
                      <Label className="text-xs text-muted-foreground">Active</Label>
                      <Switch
                        checked={user.isActive}
                        disabled={user.id === currentUser?.id || setUserStatus.isPending}
                        onCheckedChange={() => handleToggleStatus(user)}
                      />
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
              <Input
                type="password"
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
    </div>
  );
}
