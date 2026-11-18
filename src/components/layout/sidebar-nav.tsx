"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { useAuthStore } from "@/store/auth-store";
import { useTranslation } from "@/i18n/use-translation";

export function SidebarNav({
  onNavigate,
  isCollapsedRail = false,
}: {
  onNavigate?: () => void;
  isCollapsedRail?: boolean;
}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => user?.roles.includes(r)),
  );

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground",
        isCollapsedRail
          ? "w-16 group-hover/sidebar:w-64 transition-all duration-300 ease-in-out absolute inset-y-0 left-0 border-r z-50 shadow-none group-hover/sidebar:shadow-2xl overflow-hidden"
          : "w-full"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3.5 overflow-hidden shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-xs">
            <ShoppingBag className="size-4.5" />
          </div>
          <span
            className={cn(
              "text-sm font-semibold tracking-tight whitespace-nowrap transition-opacity duration-200",
              isCollapsedRail ? "opacity-0 group-hover/sidebar:opacity-100" : "opacity-100"
            )}
          >
            සන්ත්‍රිමා ස්ටෝර්ස්
          </span>
        </div>
        {isCollapsedRail && (
          <ChevronRight className="size-4 shrink-0 text-sidebar-foreground/50 transition-transform duration-300 group-hover/sidebar:rotate-180" />
        )}
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden p-2">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const displayLabel = item.translationKey ? t("nav", item.translationKey) : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={displayLabel}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <div className="flex size-6 shrink-0 items-center justify-center">
                <Icon className="size-4.5 shrink-0" />
              </div>
              <span
                className={cn(
                  "transition-opacity duration-200 truncate",
                  isCollapsedRail ? "opacity-0 group-hover/sidebar:opacity-100" : "opacity-100"
                )}
              >
                {displayLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
