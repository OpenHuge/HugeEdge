import { SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { DataTable, ErrorState, LoadingState, MetricCard } from "@hugeedge/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";
import { queryKeys } from "../lib/session";

export const Route = createFileRoute("/admin/system")({
  component: SystemPage,
});

function SystemPage() {
  const capabilities = useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: ({ signal }) => api.capabilities(signal),
  });
  const providers = useQuery({
    queryKey: queryKeys.providers,
    queryFn: ({ signal }) => api.providers(signal),
  });
  const regions = useQuery({
    queryKey: queryKeys.regions,
    queryFn: ({ signal }) => api.regions(signal),
  });

  if (capabilities.isLoading || providers.isLoading || regions.isLoading) {
    return <LoadingState />;
  }

  const error = capabilities.error ?? providers.error ?? regions.error;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Unable to load system data"}
        onRetry={() => {
          void capabilities.refetch();
          void providers.refetch();
          void regions.refetch();
        }}
      />
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>System</Title>
        <Text c="dimmed">
          Seeded providers, regions, and capability registry from the current backend.
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <MetricCard
          label="Capabilities"
          value={capabilities.data?.length ?? 0}
          detail="Capability registry entries"
        />
        <MetricCard
          label="Providers"
          value={providers.data?.length ?? 0}
          detail="Seeded infrastructure providers"
        />
        <MetricCard
          label="Regions"
          value={regions.data?.length ?? 0}
          detail="Seeded deployment regions"
        />
      </SimpleGrid>
      <DataTable
        rows={capabilities.data ?? []}
        columns={[
          { id: "name", header: "Capability", accessorFn: (row) => row.name },
          { id: "version", header: "Version", accessorFn: (row) => row.version },
          { id: "source", header: "Source", accessorFn: (row) => row.source },
        ]}
      />
      <DataTable
        rows={providers.data ?? []}
        columns={[
          { id: "name", header: "Provider", accessorFn: (row) => row.name },
          { id: "slug", header: "Slug", accessorFn: (row) => row.slug },
        ]}
      />
      <DataTable
        rows={regions.data ?? []}
        columns={[
          { id: "name", header: "Region", accessorFn: (row) => row.name },
          { id: "code", header: "Code", accessorFn: (row) => row.code },
          {
            id: "providerId",
            header: "Provider ID",
            accessorFn: (row) => row.providerId,
          },
        ]}
      />
    </Stack>
  );
}
