import { DataTable, ErrorState, LoadingState } from "@hugeedge/ui";
import { Button, Group, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";
import { queryKeys } from "../lib/session";
import { Activity, Gauge } from "../nav";

export const Route = createFileRoute("/admin/system")({
  component: SystemPage,
});

function SystemPage() {
  const capabilities = useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: () => api.capabilities(),
  });
  const providers = useQuery({
    queryKey: queryKeys.providers,
    queryFn: () => api.providers(),
  });
  const regions = useQuery({
    queryKey: queryKeys.regions,
    queryFn: () => api.regions(),
  });

  if (capabilities.isLoading || providers.isLoading || regions.isLoading) {
    return <LoadingState />;
  }

  const error = capabilities.error ?? providers.error ?? regions.error;
  if (error) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Unable to load system data"
        }
        onRetry={() => {
          void capabilities.refetch();
          void providers.refetch();
          void regions.refetch();
        }}
      />
    );
  }

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
          { id: "name", header: "Capability", accessorFn: (row) => row.name },
          {
            id: "version",
            header: "Version",
            accessorFn: (row) => row.version,
          },
          { id: "source", header: "Source", accessorFn: (row) => row.source },
        ]}
      />
      <Title order={3}>Providers</Title>
      <DataTable
        rows={providers.data ?? []}
        columns={[
          { id: "name", header: "Name", accessorFn: (row) => row.name },
          { id: "slug", header: "Slug", accessorFn: (row) => row.slug },
        ]}
      />
      <Title order={3}>Regions</Title>
      <DataTable
        rows={regions.data ?? []}
        columns={[
          { id: "name", header: "Name", accessorFn: (row) => row.name },
          { id: "code", header: "Code", accessorFn: (row) => row.code },
          {
            id: "providerId",
            header: "Provider",
            accessorFn: (row) => row.providerId,
          },
        ]}
      />
    </Stack>
  );
}
