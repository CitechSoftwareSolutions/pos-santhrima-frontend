"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

export function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const allowed = !!user && roles.some((r) => user.roles.includes(r));

  useEffect(() => {
    if (user && !allowed) {
      toast.error("You don't have permission to view that page.");
      router.replace("/");
    }
  }, [user, allowed, router]);

  if (!allowed) return null;

  return <>{children}</>;
}
