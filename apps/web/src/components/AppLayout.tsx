import type { ReactNode } from "react";
import { appNavSections } from "../nav";
import { ShellLayout } from "./ShellLayout";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ShellLayout brand="HugeEdge Workspace" sections={appNavSections}>
      {children}
    </ShellLayout>
  );
}
