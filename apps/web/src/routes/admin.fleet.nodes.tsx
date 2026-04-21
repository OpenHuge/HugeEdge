import type { BootstrapToken } from "@hugeedge/api-client";
import { DataTable, ErrorState, LoadingState, StatusBadge } from "@hugeedge/ui";
import {
  Alert,
  Button,
  Code,
  CopyButton,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy } from "lucide-react";
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

type NodeSort = "name" | "status" | "adapterName" | "createdAt";

const nodesSearchSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  sort: z
    .enum(["name", "status", "adapterName", "createdAt"] satisfies NodeSort[])
    .optional(),
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
  const [token, setToken] = useState<BootstrapToken | null>(null);
  const [bootstrapOpened, bootstrapDisclosure] = useDisclosure(false);
  const [rolloutOpened, rolloutDisclosure] = useDisclosure(false);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [note, setNote] = useState("");
  const [configText, setConfigText] = useState('{\n  "mode": "baseline"\n}');
  const query = useQuery({
    queryKey: queryKeys.nodes,
    queryFn: () => api.nodes(),
  });
  const createToken = useMutation({
    mutationFn: () => api.createBootstrapToken(),
    onSuccess: async (result) => {
      setToken(result);
      bootstrapDisclosure.open();
      await queryClient.invalidateQueries({ queryKey: queryKeys.audit });
    },
  });
  const createRollout = useMutation({
    mutationFn: async () => {
      const config = JSON.parse(configText) as Record<string, unknown>;
      return api.createRollout({
        nodeId: selectedNodeId,
        adapterName: "xray-adapter",
        config,
        note,
      });
    },
    onSuccess: async () => {
      setNote("");
      rolloutDisclosure.close();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.nodes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rollouts }),
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
            : "Unable to load nodes"
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

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

  const command = token
    ? `HUGEEDGE_CONTROL_PLANE_URL=http://localhost:8080 HUGEEDGE_BOOTSTRAP_TOKEN=${token.token} go run ./apps/agent/cmd/agent`
    : "";

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Fleet Nodes</Title>
      </Group>
      {createToken.error ? (
        <Alert color="red" variant="light">
          {createToken.error instanceof Error
            ? createToken.error.message
            : "Unable to issue bootstrap token"}
        </Alert>
      ) : null}
      <DataTable
        rows={rows}
        loading={false}
        error={null}
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
              loading={createToken.isPending}
              onClick={() => createToken.mutate()}
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
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            id: "healthStatus",
            header: "Health",
            accessorFn: (row) => row.healthStatus,
            cell: (row) => <StatusBadge status={row.healthStatus} />,
          },
          {
            id: "adapterName",
            header: "Adapter",
            accessorFn: (row) => row.adapterName,
            sortable: true,
          },
          {
            id: "currentConfigVersion",
            header: "Current Config",
            accessorFn: (row) => row.currentConfigVersion ?? 0,
            cell: (row) => String(row.currentConfigVersion ?? ""),
          },
          {
            id: "desiredConfigVersion",
            header: "Desired Config",
            accessorFn: (row) => row.desiredConfigVersion ?? 0,
            cell: (row) => String(row.desiredConfigVersion ?? ""),
          },
          {
            id: "agentVersion",
            header: "Agent",
            accessorFn: (row) => row.agentVersion,
          },
          {
            id: "runtimeVersion",
            header: "Runtime",
            accessorFn: (row) => row.runtimeVersion,
          },
          {
            id: "lastApplyStatus",
            header: "Last Apply",
            accessorFn: (row) => row.lastApplyStatus ?? "",
          },
          {
            id: "lastHeartbeatAt",
            header: "Last Heartbeat",
            accessorFn: (row) => row.lastHeartbeatAt ?? "",
            cell: (row) => formatTimestamp(row.lastHeartbeatAt),
          },
          {
            id: "actions",
            header: "Actions",
            width: 140,
            cell: (row) => (
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  setSelectedNodeId(row.id);
                  setConfigText('{\n  "mode": "baseline"\n}');
                  setNote("");
                  rolloutDisclosure.open();
                }}
              >
                Deploy Config
              </Button>
            ),
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
      <Modal
        opened={bootstrapOpened}
        onClose={bootstrapDisclosure.close}
        title="Bootstrap Token"
        centered
        size="lg"
      >
        <Stack>
          <TextInput label="Token" value={token?.token ?? ""} readOnly />
          <Text size="sm" c="dimmed">
            Expires {formatTimestamp(token?.expiresAt)}
          </Text>
          <Code block>{command}</Code>
          <Group justify="flex-end">
            <CopyButton value={command}>
              {({ copied, copy }) => (
                <Button leftSection={<Copy size={16} />} onClick={copy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={rolloutOpened}
        onClose={rolloutDisclosure.close}
        title="Deploy Config"
        centered
        size="lg"
      >
        <Stack
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            createRollout.mutate();
          }}
        >
          <TextInput label="Node" value={selectedNodeId} readOnly />
          <TextInput
            label="Note"
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
          />
          <Textarea
            label="Config JSON"
            minRows={10}
            value={configText}
            onChange={(event) => setConfigText(event.currentTarget.value)}
          />
          {createRollout.error ? (
            <Alert color="red" variant="light">
              {createRollout.error instanceof Error
                ? createRollout.error.message
                : "Unable to create rollout"}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={rolloutDisclosure.close}>
              Cancel
            </Button>
            <Button type="submit" loading={createRollout.isPending}>
              Create Rollout
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
