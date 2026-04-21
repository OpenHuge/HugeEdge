import { DataTable, ErrorState, LoadingState, StatusBadge } from "@hugeedge/ui";
import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { api } from "../lib/api";
import { formatTimestamp } from "../lib/format";
import {
  buildListSearch,
  compareValues,
  includesQuery,
  normalizeListSearch,
} from "../lib/list-state";
import { queryClient } from "../lib/query-client";
import { queryKeys } from "../lib/session";

type TenantSort = "name" | "slug" | "status" | "createdAt";

const tenantsSearchSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  sort: z
    .enum(["name", "slug", "status", "createdAt"] satisfies TenantSort[])
    .optional(),
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
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const query = useQuery({
    queryKey: queryKeys.tenants,
    queryFn: () => api.tenants(),
  });
  const createTenant = useMutation({
    mutationFn: () => api.createTenant({ name, slug }),
    onSuccess: async () => {
      setName("");
      setSlug("");
      close();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tenants }),
        queryClient.invalidateQueries({ queryKey: queryKeys.audit }),
      ]);
    },
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
            : "Unable to load tenants"
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

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
      <Group justify="space-between">
        <Title order={2}>Tenants</Title>
        <Button onClick={open}>Create Tenant</Button>
      </Group>
      <DataTable
        rows={rows}
        loading={false}
        error={null}
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
          <Group align="end" justify="space-between">
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
            cell: (row) => <StatusBadge status={row.status} />,
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
      <Modal opened={opened} onClose={close} title="Create Tenant" centered>
        <Stack
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            createTenant.mutate();
          }}
        >
          <TextInput
            label="Name"
            value={name}
            required
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <TextInput
            label="Slug"
            value={slug}
            required
            onChange={(event) => setSlug(event.currentTarget.value)}
          />
          {createTenant.error ? (
            <Alert color="red" variant="light">
              {createTenant.error instanceof Error
                ? createTenant.error.message
                : "Unable to create tenant"}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={createTenant.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
