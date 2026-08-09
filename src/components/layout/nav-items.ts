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
  Tag,
  type LucideIcon,
} from "lucide-react";
import { ROLES } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/sales", label: "Sales History", icon: Receipt },
  {
    href: "/products",
    label: "Products",
    icon: Package,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  {
    href: "/categories",
    label: "Categories",
    icon: Tags,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  { href: "/customers", label: "Customers", icon: Users },
  {
    href: "/suppliers",
    label: "Suppliers",
    icon: Truck,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  {
    href: "/purchases",
    label: "Invoices",
    icon: ClipboardList,
    roles: [ROLES.Admin, ROLES.Manager, ROLES.Cashier],
  },
  {
    href: "/promotions",
    label: "Promotions",
    icon: Tag,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: [ROLES.Admin, ROLES.Manager],
  },
  { href: "/users", label: "Users", icon: UserCog, roles: [ROLES.Admin] },
];
