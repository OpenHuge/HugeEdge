import { Alert, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ErrorState, LoadingState, MetricCard } from "@hugeedge/ui";
import { api } from "../lib/api";
import { queryKeys } from "../lib/session";

export const Route = createFileRoute("/admin/overview")({
  component: OverviewPage,
});

function OverviewPage() {
  const tenants = useQuery({
    queryKey: queryKeys.tenants,
    queryFn: ({ signal }) => api.tenants(signal),
  });
  const nodes = useQuery({
    queryKey: queryKeys.nodes,
    queryFn: ({ signal }) => api.nodes(signal),
  });
  const audit = useQuery({
    queryKey: queryKeys.audit,
    queryFn: ({ signal }) => api.auditLogs(signal),
  });

  if (tenants.isLoading || nodes.isLoading || audit.isLoading) {
    return <LoadingState />;
  }

  const error = tenants.error ?? nodes.error ?? audit.error;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Unable to load overview"}
        onRetry={() => {
          void tenants.refetch();
          void nodes.refetch();
          void audit.refetch();
        }}
      />
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Overview</Title>
        <Text c="dimmed">
          Real-time snapshot of the local operator environment.
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
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
          detail="Recorded operator actions"
        />
      </SimpleGrid>
      <Alert color="blue" variant="light">
        The admin shell is using the real login, refresh, and data APIs against the
        local HugeEdge backend.
      </Alert>
      <Group grow align="stretch">
        <MetricCard
          label="Most Recent Tenant"
          value={tenants.data?.at(-1)?.name ?? "n/a"}
          detail={tenants.data?.at(-1)?.slug ?? "No tenant data yet"}
        />
        <MetricCard
          label="Most Recent Node"
          value={nodes.data?.at(-1)?.name ?? "n/a"}
          detail={nodes.data?.at(-1)?.status ?? "No node data yet"}
        />
      </Group>
    </Stack>
  );
}
