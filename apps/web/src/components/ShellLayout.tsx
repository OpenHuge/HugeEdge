import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { NavSection } from "../nav";

export function ShellLayout({
  brand,
  sections,
  children,
}: {
  brand: string;
  sections: readonly NavSection[];
  children: ReactNode;
}) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3}>{brand}</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm">
        <Stack gap="lg">
          {sections.map((section) => (
            <Stack key={section.label} gap={4}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm">
                {section.label}
              </Text>
              {section.items.map((item) => {
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
            </Stack>
          ))}
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
