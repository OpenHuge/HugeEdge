import { Button, Group, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { DataTable, type DataTableSort } from "@hugeedge/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

type TenantSort = "name" | "slug" | "status" | "createdAt";

const tenantsSearchSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(["name", "slug", "status", "createdAt"] satisfies TenantSort[]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/admin/tenants")({
  validateSearch: (search) => tenantsSearchSchema.parse(search),
  component: TenantsPage,
});

function TenantsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const rawSearch = Route.useSearch();
  const search = normalizeListSearch<TenantSort>(rawSearch, {
    sort: "createdAt",
    dir: "desc",
  });
  const query = useQuery({
    queryKey: queryKeys.tenants,
    queryFn: ({ signal }) => api.tenants(signal),
  });

  const rows = (query.data ?? [])
    .filter((tenant) => {
      const statusMatches =
        search.status === "all" ? true : tenant.status === search.status;
      return (
        statusMatches &&
        includesQuery([tenant.name, tenant.slug, tenant.status], search.q)
      );
    })
    .sort((left, right) => {
      if (search.sort === "name") {
        return compareValues(left.name, right.name, search.dir);
      }
      if (search.sort === "slug") {
        return compareValues(left.slug, right.slug, search.dir);
      }
      if (search.sort === "status") {
        return compareValues(left.status, right.status, search.dir);
      }
      return compareValues(left.createdAt, right.createdAt, search.dir);
    });

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Tenants</Title>
        <Text c="dimmed">Search and inspect registered control-plane tenants.</Text>
      </Stack>
      <DataTable
        rows={rows}
        loading={query.isLoading}
        error={query.error instanceof Error ? query.error.message : null}
        onRetry={() => void query.refetch()}
        emptyTitle="No tenants found"
        emptyDescription="Adjust the current search or filter to widen the result set."
        sort={{ id: search.sort, desc: search.dir === "desc" }}
        onSortChange={(nextSort) =>
          void navigate({
            search: buildListSearch<TenantSort>({
              ...search,
              sort: (nextSort?.id as TenantSort | undefined) ?? "createdAt",
              dir: nextSort?.desc ? "desc" : "asc",
            }),
          })
        }
        toolbar={
          <Group align="end">
            <TextInput
              label="Search"
              placeholder="Filter by name or slug"
              value={search.q}
              onChange={(event) =>
                void navigate({
                  search: buildListSearch<TenantSort>({
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
                { value: "active", label: "Active" },
              ]}
              value={search.status}
              onChange={(value) =>
                void navigate({
                  search: buildListSearch<TenantSort>({
                    ...search,
                    status: value ?? "all",
                  }),
                })
              }
            />
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
            id: "slug",
            header: "Slug",
            accessorFn: (row) => row.slug,
            sortable: true,
          },
          {
            id: "status",
            header: "Status",
            accessorFn: (row) => row.status,
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
                <Link
                  to="/admin/tenants/$tenantId"
                  params={{ tenantId: row.id }}
                >
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
