"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Menu, LogOut, User, Settings, Calendar, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useStoreSettings, useToggleSalesShift } from "@/lib/hooks/use-settings";
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
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: settings } = useStoreSettings();
  const toggleTransfer = useToggleSalesShift();

  const isTransferActive = settings?.cashierSalesShiftEnabled ?? true;

  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentDateTime(new Date());
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleTransfer = useCallback(() => {
    const nextState = !isTransferActive;
    toggleTransfer.mutate(nextState);
  }, [isTransferActive, toggleTransfer]);

  const toggleRef = useRef(handleToggleTransfer);
  toggleRef.current = handleToggleTransfer;

  useEffect(() => {
    let lastHandledTime = 0;

    const isPrtScr = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") return true;
      if (e.key === "SysRq" || e.key === "SysReq") return true;
      if (e.keyCode === 44 || e.which === 44) return true;
      return false;
    };

    const handleKeyTrigger = (e: KeyboardEvent) => {
      if (!isPrtScr(e)) return;

      const now = Date.now();
      // Debounce window (600ms) to prevent double firing if OS triggers both keydown and keyup
      if (now - lastHandledTime < 600) {
        return;
      }
      lastHandledTime = now;

      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {}

      toggleRef.current();
    };

    window.addEventListener("keydown", handleKeyTrigger, { capture: true });
    window.addEventListener("keyup", handleKeyTrigger, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyTrigger, { capture: true });
      window.removeEventListener("keyup", handleKeyTrigger, { capture: true });
    };
  }, []);


  const effectiveTransferActive = mounted ? isTransferActive : true;

  const formattedDate = currentDateTime
    ? currentDateTime.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const formattedTime = currentDateTime
    ? currentDateTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "";

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
        {/* Live Date and Time (Left side of Sync Status Dot) */}
        {mounted && currentDateTime && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/40 text-xs text-muted-foreground select-none">
            <Calendar className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium text-foreground/80">{formattedDate}</span>
            <span className="text-border">|</span>
            <Clock className="size-3.5 text-muted-foreground/70" />
            <span className="font-semibold text-foreground tabular-nums tracking-tight">
              {formattedTime}
            </span>
          </div>
        )}

        {/* Status Dot */}
        <button
          type="button"
          onClick={handleToggleTransfer}
          disabled={toggleTransfer.isPending}
          className="relative flex size-8 items-center justify-center rounded-full transition-all hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 cursor-pointer disabled:opacity-60"
          aria-label="Status indicator"
        >
          <span className="relative flex size-2.5 items-center justify-center">
            {effectiveTransferActive ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 duration-1000" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              </>
            ) : (
              <>
                <span className="relative inline-flex size-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              </>
            )}
          </span>
        </button>



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
