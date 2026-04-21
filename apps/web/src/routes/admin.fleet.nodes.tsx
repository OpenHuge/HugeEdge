import { Alert, Button, Group, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { api, isApiError } from "../lib/api";
import { formatTimestamp } from "../lib/format";
import {
  buildListSearch,
  compareValues,
  includesQuery,
  normalizeListSearch,
} from "../lib/list-state";
import { queryKeys } from "../lib/session";

type NodeSort = "name" | "status" | "adapterName" | "createdAt";

const nodesSearchSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(["name", "status", "adapterName", "createdAt"] satisfies NodeSort[]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/admin/fleet/nodes")({
  validateSearch: (search) => nodesSearchSchema.parse(search),
  component: NodesPage,
});

function NodesPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const rawSearch = Route.useSearch();
  const search = normalizeListSearch<NodeSort>(rawSearch, {
    sort: "createdAt",
    dir: "desc",
  });
  const query = useQuery({
    queryKey: queryKeys.nodes,
    queryFn: ({ signal }) => api.nodes(signal),
  });
  const bootstrapToken = useMutation({
    mutationFn: () => api.createBootstrapToken(),
  });

  const rows = (query.data ?? [])
    .filter((node) => {
      const statusMatches =
        search.status === "all" ? true : node.status === search.status;
      return (
        statusMatches &&
        includesQuery([node.name, node.status, node.adapterName], search.q)
      );
    })
    .sort((left, right) => {
      if (search.sort === "name") {
        return compareValues(left.name, right.name, search.dir);
      }
      if (search.sort === "status") {
        return compareValues(left.status, right.status, search.dir);
      }
      if (search.sort === "adapterName") {
        return compareValues(left.adapterName, right.adapterName, search.dir);
      }
      return compareValues(left.createdAt, right.createdAt, search.dir);
    });

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Fleet Nodes</Title>
        <Text c="dimmed">
          Inspect registered nodes and issue a real bootstrap token from the admin API.
        </Text>
      </Stack>
      {bootstrapToken.isSuccess ? (
        <Alert color="green" variant="light">
          Bootstrap token issued. Expires at {formatTimestamp(bootstrapToken.data.expiresAt)}.
        </Alert>
      ) : null}
      {bootstrapToken.error ? (
        <Alert color="red" variant="light">
          {isApiError(bootstrapToken.error)
            ? bootstrapToken.error.message
            : "Unable to issue bootstrap token"}
        </Alert>
      ) : null}
      <DataTable
        rows={rows}
        loading={query.isLoading}
        error={query.error instanceof Error ? query.error.message : null}
        onRetry={() => void query.refetch()}
        emptyTitle="No nodes found"
        emptyDescription="Adjust the current filters to inspect a wider fleet view."
        sort={{ id: search.sort, desc: search.dir === "desc" }}
        onSortChange={(nextSort) =>
          void navigate({
            search: buildListSearch<NodeSort>({
              ...search,
              sort: (nextSort?.id as NodeSort | undefined) ?? "createdAt",
              dir: nextSort?.desc ? "desc" : "asc",
            }),
          })
        }
        toolbar={
          <Group align="end" justify="space-between">
            <Group align="end">
              <TextInput
                label="Search"
                placeholder="Filter by node or adapter"
                value={search.q}
                onChange={(event) =>
                  void navigate({
                    search: buildListSearch<NodeSort>({
                      ...search,
                      q: event.currentTarget.value,
                    }),
                  })
                }
              />
              <Select
                label="Status"
                data={[
                  { value: "all", label: "All statuses" },
                  { value: "ready", label: "Ready" },
                  { value: "registered", label: "Registered" },
                ]}
                value={search.status}
                onChange={(value) =>
                  void navigate({
                    search: buildListSearch<NodeSort>({
                      ...search,
                      status: value ?? "all",
                    }),
                  })
                }
              />
            </Group>
            <Button
              onClick={() => bootstrapToken.mutate()}
              loading={bootstrapToken.isPending}
            >
              Issue Bootstrap Token
            </Button>
          </Group>
        }
        columns={[
          {
            id: "name",
            header: "Name",
            accessorFn: (row) => row.name,
            sortable: true,
          },
          {
            id: "status",
            header: "Status",
            accessorFn: (row) => row.status,
            sortable: true,
          },
          {
            id: "adapterName",
            header: "Adapter",
            accessorFn: (row) => row.adapterName,
            sortable: true,
          },
          {
            id: "createdAt",
            header: "Created",
            accessorFn: (row) => row.createdAt,
            cell: (row) => formatTimestamp(row.createdAt),
            sortable: true,
          },
          {
            id: "actions",
            header: "Actions",
            cell: (row) => (
              <Button component="span" size="xs" variant="subtle">
                <Link to="/admin/fleet/nodes/$nodeId" params={{ nodeId: row.id }}>
                  Inspect
                </Link>
              </Button>
            ),
            width: 110,
          },
        ]}
      />
    </Stack>
  );
}
