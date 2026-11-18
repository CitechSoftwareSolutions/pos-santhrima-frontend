import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Users,
  Truck,
  ClipboardList,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  Tag,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { ROLES } from "@/lib/types";
import type { translations } from "@/i18n/translations";

export type NavTranslationKey = keyof (typeof translations.en.nav);

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
  translationKey?: NavTranslationKey;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", translationKey: "dashboard", icon: LayoutDashboard },
  {
    href: "/pos",
    label: "Point of Sale",
    translationKey: "pos",
    icon: ShoppingCart,
    roles: [ROLES.Admin, ROLES.Manager, ROLES.Cashier],
  },
  { href: "/sales", label: "Sales History", translationKey: "sales", icon: Receipt },
  {
    href: "/products",
    label: "Products",
    translationKey: "products",
    icon: Package,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  {
    href: "/categories",
    label: "Categories",
    translationKey: "categories",
    icon: Tags,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  {
    href: "/customers",
    label: "Customers",
    translationKey: "customers",
    icon: Users,
    roles: [ROLES.Admin, ROLES.Manager, ROLES.Cashier],
  },
  {
    href: "/suppliers",
    label: "Suppliers",
    translationKey: "suppliers",
    icon: Truck,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  {
    href: "/purchases",
    label: "Invoices",
    translationKey: "purchases",
    icon: ClipboardList,
    roles: [ROLES.Admin, ROLES.Manager, ROLES.Cashier],
  },
  {
    href: "/promotions",
    label: "Promotions",
    translationKey: "promotions",
    icon: Tag,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  {
    href: "/reports",
    label: "Reports",
    translationKey: "reports",
    icon: BarChart3,
    roles: [ROLES.Admin, ROLES.Manager, ROLES.SuperSuperAdmin],
  },
  { href: "/users", label: "Users", translationKey: "users", icon: UserCog, roles: [ROLES.Admin] },
  { href: "/cheques", label: "Cheques", translationKey: "cheques", icon: CreditCard, roles: [ROLES.Admin] },
  { href: "/settings", label: "Settings", translationKey: "settings", icon: Settings, roles: [ROLES.Admin, ROLES.SuperSuperAdmin] },
];
