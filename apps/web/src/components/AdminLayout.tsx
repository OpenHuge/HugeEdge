import { AppShell, Burger, Group, NavLink, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { navItems } from "../nav";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 248,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3}>HugeEdge</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={item.label}
              active={pathname === item.to}
              leftSection={<Icon size={18} />}
            />
          );
        })}
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
