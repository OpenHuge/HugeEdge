import { AppShell, Burger, Button, Group, NavLink, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { actorQueryOptions, logoutSession } from "../lib/session";
import { navItems } from "../nav";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const actor = useQuery(actorQueryOptions());
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
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>HugeEdge</Title>
          </Group>
          <Group gap="md">
            <Stack gap={0} visibleFrom="sm" align="flex-end">
              <Text size="sm" fw={600}>
                {actor.data?.email ?? "Operator"}
              </Text>
              <Text size="xs" c="dimmed">
                Session {actor.data?.sessionId.slice(0, 8) ?? "pending"}
              </Text>
            </Stack>
            <Button
              variant="light"
              onClick={() => {
                void logoutSession().then(() => {
                  window.location.assign("/login");
                });
              }}
            >
              Log out
            </Button>
          </Group>
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
