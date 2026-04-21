import type { BootstrapToken } from "@hugeedge/api-client";
import {
  DataTable,
  ErrorState,
  LoadingState,
  MetricCard,
  StatusBadge,
} from "@hugeedge/ui";
import {
  Alert,
  Button,
  Code,
  Container,
  CopyButton,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { AdminLayout } from "./components/AdminLayout";
import { api, tokenStore } from "./lib/api";
import { Activity, Gauge } from "./nav";

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
  beforeLoad: async () => {
    if (!tokenStore.getAccessToken()) {
      return;
    }
    try {
      await api.me();
      throw redirect({ to: "/admin/overview" });
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      tokenStore.clear();
    }
  },
  component: LoginPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: async () => {
    if (!tokenStore.getAccessToken()) {
      throw redirect({ to: "/login" });
    }
    try {
      await api.me();
    } catch {
      tokenStore.clear();
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
      <Stack
        component="form"
        gap="md"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate();
        }}
      >
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
        <Button type="submit" loading={login.isPending}>
          Sign in
        </Button>
        {login.error ? (
          <Alert color="red" variant="light">
            {login.error.message}
          </Alert>
        ) : null}
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
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const query = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.tenants(),
  });
  const createTenant = useMutation({
    mutationFn: () => api.createTenant({ name, slug }),
    onSuccess: async () => {
      setName("");
      setSlug("");
      close();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["audit"] }),
      ]);
    },
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Tenants</Title>
        <Button leftSection={<Plus size={16} />} onClick={open}>
          Create Tenant
        </Button>
      </Group>
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
      <Modal opened={opened} onClose={close} title="Create Tenant" centered>
        <Stack
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            createTenant.mutate();
          }}
        >
          <TextInput
            label="Name"
            value={name}
            required
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <TextInput
            label="Slug"
            value={slug}
            required
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
          {createTenant.error ? (
            <Alert color="red" variant="light">
              {createTenant.error.message}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={createTenant.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function NodesPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<BootstrapToken | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const query = useQuery({ queryKey: ["nodes"], queryFn: () => api.nodes() });
  const createToken = useMutation({
    mutationFn: () => api.createBootstrapToken(),
    onSuccess: async (result) => {
      setToken(result);
      open();
      await queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={query.error.message} />;
  const command = token
    ? `HUGEEDGE_CONTROL_PLANE_URL=http://localhost:8080 HUGEEDGE_BOOTSTRAP_TOKEN=${token.token} go run ./apps/agent/cmd/agent`
    : "";
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Fleet Nodes</Title>
        <Button
          leftSection={<KeyRound size={16} />}
          loading={createToken.isPending}
          onClick={() => createToken.mutate()}
        >
          Issue Bootstrap Token
        </Button>
      </Group>
      {createToken.error ? (
        <Alert color="red" variant="light">
          {createToken.error.message}
        </Alert>
      ) : null}
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
          {
            key: "lastHeartbeatAt",
            label: "Last Heartbeat",
            render: (row) => formatDate(row.lastHeartbeatAt),
          },
          { key: "createdAt", label: "Created" },
        ]}
      />
      <Modal
        opened={opened}
        onClose={close}
        title="Bootstrap Token"
        centered
        size="lg"
      >
        <Stack>
          <TextInput label="Token" value={token?.token ?? ""} readOnly />
          <Text size="sm" c="dimmed">
            Expires {formatDate(token?.expiresAt)}
          </Text>
          <Code block>{command}</Code>
          <Group justify="flex-end">
            <CopyButton value={command}>
              {({ copied, copy }) => (
                <Button leftSection={<Copy size={16} />} onClick={copy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Modal>
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
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: () => api.capabilities(),
  });
  const providers = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.providers(),
  });
  const regions = useQuery({
    queryKey: ["regions"],
    queryFn: () => api.regions(),
  });
  if (capabilities.isLoading || providers.isLoading || regions.isLoading) {
    return <LoadingState />;
  }
  const error = capabilities.error ?? providers.error ?? regions.error;
  if (error) return <ErrorState message={error.message} />;
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
      <Title order={3}>Capabilities</Title>
      <DataTable
        rows={capabilities.data ?? []}
        columns={[
          { key: "name", label: "Capability" },
          { key: "version", label: "Version" },
          { key: "source", label: "Source" },
        ]}
      />
      <Title order={3}>Providers</Title>
      <DataTable
        rows={providers.data ?? []}
        columns={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
        ]}
      />
      <Title order={3}>Regions</Title>
      <DataTable
        rows={regions.data ?? []}
        columns={[
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          { key: "providerId", label: "Provider" },
        ]}
      />
    </Stack>
  );
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || value === "") {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "isRedirect" in error &&
    error.isRedirect === true
  );
}
