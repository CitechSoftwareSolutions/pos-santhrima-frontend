"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Menu, Moon, Sun, LogOut, User, Settings, Database, Store as StoreIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/lib/hooks/use-auth";
import { ROLES } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  function handleThemeToggle() {
    const currentlyDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const nextTheme = currentlyDark ? "light" : "dark";
    
    if (typeof document !== "undefined") {
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    setTheme(nextTheme);

    setTimeout(() => {
      queryClient.invalidateQueries();
      if (nextTheme === "dark") {
        toast.info("Switched to Admin Database (Dark Mode)", {
          description: "All shifted sales, records, and reports are now loaded from the Admin database.",
        });
      } else {
        toast.success("Switched to Normal Database (Light Mode)", {
          description: "Active counter sales and store operations loaded from the Normal database.",
        });
      }
    }, 60);
  }

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2.5">
        {isDarkMode ? (
          <Badge
            variant="outline"
            className="hidden sm:inline-flex items-center gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-500 text-xs px-2.5 py-1 font-semibold transition-all shadow-xs"
            title="Connected to Admin Database"
          >
            <Database className="size-3.5 text-amber-500" />
            <span>Admin DB</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="hidden sm:inline-flex items-center gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-xs px-2.5 py-1 font-semibold transition-all shadow-xs"
            title="Connected to Normal Store Database"
          >
            <StoreIcon className="size-3.5 text-emerald-600" />
            <span>Normal DB</span>
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={handleThemeToggle}
          title={isDarkMode ? "Switch to Normal Database (Light Mode)" : "Switch to Admin Database (Dark Mode)"}
        >
          <Sun className="size-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 transition-all" />
          <Moon className="absolute size-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100 transition-all" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="flex items-center gap-2 px-2" />}
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user ? initials(user.fullName) : <User className="size-4" />}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user?.fullName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="font-medium">{user?.fullName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                <div className="flex gap-1 pt-1">
                  {user?.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px]">
                      {r}
                    </Badge>
                  ))}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            {user?.roles.includes(ROLES.Admin) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/settings" className="flex items-center gap-2 w-full" />}>
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
