import {
  Activity,
  Building2,
  Gauge,
  HardDrive,
  ListChecks,
  Settings,
} from "lucide-react";

export const navItems = [
  { to: "/admin/overview", label: "Overview", icon: Gauge },
  { to: "/admin/tenants", label: "Tenants", icon: Building2 },
  { to: "/admin/fleet/nodes", label: "Nodes", icon: HardDrive },
  { to: "/admin/ops/audit", label: "Audit", icon: ListChecks },
  { to: "/admin/system", label: "System", icon: Settings },
] as const;

export { Activity, Gauge, HardDrive };
