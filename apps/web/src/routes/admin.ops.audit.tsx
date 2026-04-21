import { DataTable, ErrorState, LoadingState } from "@hugeedge/ui";
import { Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";
import { formatTimestamp } from "../lib/format";
import { queryKeys } from "../lib/session";

export const Route = createFileRoute("/admin/ops/audit")({
  component: AuditPage,
});

function AuditPage() {
  const query = useQuery({
    queryKey: queryKeys.audit,
    queryFn: () => api.auditLogs(),
  });

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.error) {
    return (
      <ErrorState
        message={
          query.error instanceof Error
            ? query.error.message
            : "Unable to load audit logs"
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <Stack>
      <Title order={2}>Audit</Title>
      <DataTable
        rows={query.data ?? []}
        columns={[
          { id: "action", header: "Action", accessorFn: (row) => row.action },
          { id: "actorId", header: "Actor", accessorFn: (row) => row.actorId },
          {
            id: "tenantId",
            header: "Tenant",
            accessorFn: (row) => row.tenantId ?? "",
          },
          {
            id: "createdAt",
            header: "Created",
            accessorFn: (row) => row.createdAt,
            cell: (row) => formatTimestamp(row.createdAt),
          },
        ]}
      />
    </Stack>
  );
}
