import { ErrorState, LoadingState, MetricCard } from "@hugeedge/ui";
import { Group, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";
import { queryKeys } from "../lib/session";

export const Route = createFileRoute("/admin/overview")({
  component: OverviewPage,
});

function OverviewPage() {
  const tenants = useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.tenants(),
  });
  const nodes = useQuery({
    queryKey: queryKeys.nodes,
    queryFn: () => api.nodes(),
  });
  const audit = useQuery({
    queryKey: queryKeys.audit,
    queryFn: () => api.auditLogs(),
  });

  if (tenants.isLoading || nodes.isLoading || audit.isLoading) {
    return <LoadingState />;
  }

  const error = tenants.error ?? nodes.error ?? audit.error;
  if (error) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Unable to load overview"
        }
        onRetry={() => {
          void tenants.refetch();
          void nodes.refetch();
          void audit.refetch();
        }}
      />
    );
  }

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
