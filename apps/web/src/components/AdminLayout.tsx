import type { ReactNode } from "react";
import { adminNavSections } from "../nav";
import { ShellLayout } from "./ShellLayout";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ShellLayout brand="HugeEdge Admin" sections={adminNavSections}>
      {children}
    </ShellLayout>
  );
}
