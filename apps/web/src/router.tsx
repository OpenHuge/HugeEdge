import {
  DataTable,
  ErrorState,
  LoadingState,
  MetricCard,
  StatusBadge,
} from "@hugeedge/ui";
import {
  Button,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "./components/AdminLayout";
import { api, tokenStore } from "./lib/api";
import { Activity, Gauge, HardDrive } from "./nav";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/admin/overview" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: () => {
    if (!tokenStore.getAccessToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});

const overviewRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/overview",
  component: OverviewPage,
});

const tenantsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/tenants",
  component: TenantsPage,
});

const nodesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/fleet/nodes",
  component: NodesPage,
});

const auditRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/ops/audit",
  component: AuditPage,
});

const systemRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/system",
  component: SystemPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminRoute.addChildren([
    overviewRoute,
    tenantsRoute,
    nodesRoute,
    auditRoute,
    systemRoute,
  ]),
]);

export const router = createRouter({ routeTree });

export function getRouter() {
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@hugeedge.local");
  const [password, setPassword] = useState("hugeedge");
  const login = useMutation({
    mutationFn: () => api.login(email, password),
    onSuccess: () => navigate({ to: "/admin/overview" }),
  });

  return (
    <Container size={420} py={80}>
      <Stack gap="md">
        <Title order={1}>HugeEdge</Title>
        <Text c="dimmed">Operator control plane</Text>
        <TextInput
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <Button onClick={() => login.mutate()} loading={login.isPending}>
          Sign in
        </Button>
        {login.error ? <Text c="red">{login.error.message}</Text> : null}
      </Stack>
    </Container>
  );
}

function OverviewPage() {
  const tenants = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.tenants(),
  });
  const nodes = useQuery({ queryKey: ["nodes"], queryFn: () => api.nodes() });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.auditLogs(),
  });

  return (
    <Stack>
      <Title order={2}>Overview</Title>
      <Group grow align="stretch">
        <MetricCard
          label="Tenants"
          value={tenants.data?.length ?? 0}
          detail="Active control-plane tenants"
        />
        <MetricCard
          label="Nodes"
          value={nodes.data?.length ?? 0}
          detail="Registered fleet nodes"
        />
        <MetricCard
          label="Audit Events"
          value={audit.data?.length ?? 0}
          detail="Recent operator actions"
        />
      </Group>
    </Stack>
  );
}

function TenantsPage() {
  const query = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.tenants(),
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  return (
    <Stack>
      <Title order={2}>Tenants</Title>
      <DataTable
        rows={query.data ?? []}
        columns={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusBadge status={String(row.status)} />,
          },
          { key: "createdAt", label: "Created" },
        ]}
      />
    </Stack>
  );
}

function NodesPage() {
  const query = useQuery({ queryKey: ["nodes"], queryFn: () => api.nodes() });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Fleet Nodes</Title>
        <Button
          leftSection={<HardDrive size={16} />}
          onClick={() => api.createBootstrapToken()}
        >
          Issue Bootstrap Token
        </Button>
      </Group>
      <DataTable
        rows={query.data ?? []}
        columns={[
          { key: "name", label: "Name" },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusBadge status={String(row.status)} />,
          },
          { key: "adapterName", label: "Adapter" },
          { key: "createdAt", label: "Created" },
        ]}
      />
    </Stack>
  );
}

function AuditPage() {
  const query = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.auditLogs(),
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  return (
    <Stack>
      <Title order={2}>Audit</Title>
      <DataTable
        rows={query.data ?? []}
        columns={[
          { key: "action", label: "Action" },
          { key: "actorId", label: "Actor" },
          { key: "tenantId", label: "Tenant" },
          { key: "createdAt", label: "Created" },
        ]}
      />
    </Stack>
  );
}

function SystemPage() {
  const query = useQuery({
    queryKey: ["capabilities"],
    queryFn: () => api.capabilities(),
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  return (
    <Stack>
      <Title order={2}>System</Title>
      <Group>
        <Button leftSection={<Gauge size={16} />} variant="light">
          WasmEdge
        </Button>
        <Button leftSection={<Activity size={16} />} variant="light">
          eBPF 5.15
        </Button>
      </Group>
      <DataTable
        rows={query.data ?? []}
        columns={[
          { key: "name", label: "Capability" },
          { key: "version", label: "Version" },
          { key: "source", label: "Source" },
        ]}
      />
    </Stack>
  );
}
