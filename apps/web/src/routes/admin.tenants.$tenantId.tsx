import { Code, Stack, Text, Title } from "@mantine/core";
import { ErrorState, LoadingState, MetricCard } from "@hugeedge/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";
import { formatTimestamp } from "../lib/format";
import { queryKeys } from "../lib/session";

export const Route = createFileRoute("/admin/tenants/$tenantId")({
  component: TenantDetailPage,
});

function TenantDetailPage() {
  const { tenantId } = Route.useParams();
  const query = useQuery({
    queryKey: queryKeys.tenant(tenantId),
    queryFn: ({ signal }) => api.tenant(tenantId, signal),
  });

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.error) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Unable to load tenant"}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (!query.data) {
    return <ErrorState message="Tenant not found" />;
  }

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>{query.data.name}</Title>
        <Text c="dimmed">Tenant detail from the current admin API.</Text>
      </Stack>
      <MetricCard label="Status" value={query.data.status} detail={`Slug: ${query.data.slug}`} />
      <MetricCard
        label="Created"
        value={formatTimestamp(query.data.createdAt)}
        detail={`Tenant ID: ${query.data.id}`}
      />
      <Code block>{query.data.id}</Code>
    </Stack>
  );
}
