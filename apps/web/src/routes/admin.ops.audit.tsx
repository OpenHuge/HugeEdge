import { Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { api } from "../lib/api";
import { formatTimestamp } from "../lib/format";
import {
  buildListSearch,
  compareValues,
  includesQuery,
  normalizeListSearch,
} from "../lib/list-state";
import { queryKeys } from "../lib/session";

type AuditSort = "action" | "actorId" | "tenantId" | "createdAt";

const auditSearchSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(["action", "actorId", "tenantId", "createdAt"] satisfies AuditSort[]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/admin/ops/audit")({
  validateSearch: (search) => auditSearchSchema.parse(search),
  component: AuditPage,
});

function AuditPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const rawSearch = Route.useSearch();
  const search = normalizeListSearch<AuditSort>(rawSearch, {
    sort: "createdAt",
    dir: "desc",
  });
  const query = useQuery({
    queryKey: queryKeys.audit,
    queryFn: ({ signal }) => api.auditLogs(signal),
  });

  const rows = (query.data ?? [])
    .filter((log) =>
      includesQuery([log.action, log.actorId, log.tenantId], search.q),
    )
    .sort((left, right) => {
      if (search.sort === "action") {
        return compareValues(left.action, right.action, search.dir);
      }
      if (search.sort === "actorId") {
        return compareValues(left.actorId, right.actorId, search.dir);
      }
      if (search.sort === "tenantId") {
        return compareValues(left.tenantId, right.tenantId, search.dir);
      }
      return compareValues(left.createdAt, right.createdAt, search.dir);
    });

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Audit</Title>
        <Text c="dimmed">Review recent operator actions recorded by the backend.</Text>
      </Stack>
      <DataTable
        rows={rows}
        loading={query.isLoading}
        error={query.error instanceof Error ? query.error.message : null}
        onRetry={() => void query.refetch()}
        emptyTitle="No audit events found"
        emptyDescription="The current filters do not match any recorded actions."
        sort={{ id: search.sort, desc: search.dir === "desc" }}
        onSortChange={(nextSort) =>
          void navigate({
            search: buildListSearch<AuditSort>({
              ...search,
              sort: (nextSort?.id as AuditSort | undefined) ?? "createdAt",
              dir: nextSort?.desc ? "desc" : "asc",
            }),
          })
        }
        toolbar={
          <Group align="end">
            <TextInput
              label="Search"
              placeholder="Filter by action, actor, or tenant"
              value={search.q}
              onChange={(event) =>
                void navigate({
                  search: buildListSearch<AuditSort>({
                    ...search,
                    q: event.currentTarget.value,
                  }),
                })
              }
            />
          </Group>
        }
        columns={[
          {
            id: "action",
            header: "Action",
            accessorFn: (row) => row.action,
            sortable: true,
          },
          {
            id: "actorId",
            header: "Actor",
            accessorFn: (row) => row.actorId,
            sortable: true,
          },
          {
            id: "tenantId",
            header: "Tenant",
            accessorFn: (row) => row.tenantId ?? "system",
            sortable: true,
          },
          {
            id: "createdAt",
            header: "Created",
            accessorFn: (row) => row.createdAt,
            cell: (row) => formatTimestamp(row.createdAt),
            sortable: true,
          },
        ]}
      />
    </Stack>
  );
}
