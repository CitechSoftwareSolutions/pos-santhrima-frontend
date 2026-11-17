"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { useAuthStore } from "@/store/auth-store";
import { useAuthHydrated } from "@/lib/hooks/use-auth-hydrated";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const isPosPage = pathname === "/pos";

  useEffect(() => {
    if (hydrated && !useAuthStore.getState().isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-background" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <aside
        className={cn(
          "hidden shrink-0 border-r lg:flex relative z-40 transition-all duration-300",
          isPosPage ? "w-16 group/sidebar" : "w-64"
        )}
      >
        <SidebarNav isCollapsedRail={isPosPage} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <Topbar />
        <main
          className={cn(
            "flex-1 min-h-0",
            isPosPage ? "p-2 sm:p-3 overflow-hidden flex flex-col" : "p-4 lg:p-6 overflow-y-auto"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
