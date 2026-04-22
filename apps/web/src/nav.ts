import {
  Activity,
  CreditCard,
  FileStack,
  Files,
  GaugeCircle,
  Building2,
  House,
  Package,
  Receipt,
  Rss,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wallet,
  Gauge,
  HardDrive,
  ListChecks,
  RotateCcw,
  Settings,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  items: readonly NavItem[];
};

export const adminNavSections = [
  {
    label: "Operations",
    items: [
      { to: "/admin/overview", label: "Overview", icon: Gauge },
      { to: "/admin/tenants", label: "Tenants", icon: Building2 },
      { to: "/admin/fleet/nodes", label: "Nodes", icon: HardDrive },
      { to: "/admin/ops/rollouts", label: "Rollouts", icon: RotateCcw },
      { to: "/admin/ops/audit", label: "Audit", icon: ListChecks },
      { to: "/admin/system", label: "System", icon: Settings },
    ],
  },
  {
    label: "Billing",
    items: [
      { to: "/admin/billing/overview", label: "Commercial", icon: GaugeCircle },
      { to: "/admin/billing/products", label: "Products", icon: Package },
      {
        to: "/admin/billing/subscriptions",
        label: "Subscriptions",
        icon: FileStack,
      },
      { to: "/admin/billing/orders", label: "Orders", icon: ShoppingCart },
      { to: "/admin/billing/resellers", label: "Resellers", icon: House },
      { to: "/admin/billing/invoices", label: "Invoices", icon: Receipt },
    ],
  },
] satisfies readonly NavSection[];

export const appNavSections = [
  {
    label: "Self-Service",
    items: [
      { to: "/app/store", label: "Store", icon: ShoppingBag },
      { to: "/app/subscription", label: "Subscription", icon: CreditCard },
      { to: "/app/orders", label: "Orders", icon: ShoppingCart },
      { to: "/app/invoices", label: "Invoices", icon: Files },
      { to: "/app/wallet", label: "Wallet", icon: Wallet },
      { to: "/app/members", label: "Members", icon: Users },
      { to: "/app/feeds", label: "Feeds", icon: Rss },
    ],
  },
] satisfies readonly NavSection[];

export { Activity, Gauge, HardDrive };
