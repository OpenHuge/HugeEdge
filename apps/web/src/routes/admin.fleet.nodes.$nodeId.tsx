import { Code, Stack, Text, Title } from "@mantine/core";
import { ErrorState, LoadingState, MetricCard } from "@hugeedge/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";
import { formatTimestamp } from "../lib/format";
import { queryKeys } from "../lib/session";

export const Route = createFileRoute("/admin/fleet/nodes/$nodeId")({
  component: NodeDetailPage,
});

function NodeDetailPage() {
  const { nodeId } = Route.useParams();
  const query = useQuery({
    queryKey: queryKeys.node(nodeId),
    queryFn: ({ signal }) => api.node(nodeId, signal),
  });

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.error) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Unable to load node"}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (!query.data) {
    return <ErrorState message="Node not found" />;
  }

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>{query.data.name}</Title>
        <Text c="dimmed">Node detail from the current fleet admin API.</Text>
      </Stack>
      <MetricCard
        label="Status"
        value={query.data.status}
        detail={`Adapter: ${query.data.adapterName}`}
      />
      <MetricCard
        label="Created"
        value={formatTimestamp(query.data.createdAt)}
        detail={`Tenant ID: ${query.data.tenantId}`}
      />
      <Code block>{query.data.id}</Code>
    </Stack>
  );
}
