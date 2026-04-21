import type { Rollout } from "@hugeedge/api-client";
import { DataTable, ErrorState, LoadingState, StatusBadge } from "@hugeedge/ui";
import {
  Button,
  Code,
  Group,
  Modal,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../lib/api";
import { formatTimestamp } from "../lib/format";
import { queryClient } from "../lib/query-client";
import { queryKeys } from "../lib/session";

export const Route = createFileRoute("/admin/ops/rollouts")({
  component: RolloutsPage,
});

function RolloutsPage() {
  const [selectedRolloutId, setSelectedRolloutId] = useState<string | null>(
    null,
  );
  const [opened, disclosure] = useDisclosure(false);
  const query = useQuery({
    queryKey: queryKeys.rollouts,
    queryFn: () => api.rollouts(),
  });
  const detail = useQuery({
    queryKey: queryKeys.rollout(selectedRolloutId),
    queryFn: () => api.rollout(String(selectedRolloutId)),
    enabled: Boolean(selectedRolloutId),
  });
  const rollback = useMutation({
    mutationFn: (rolloutId: string) => api.rollbackRollout(rolloutId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rollouts }),
        queryClient.invalidateQueries({ queryKey: queryKeys.nodes }),
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
            : "Unable to load rollouts"
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <Stack>
      <Title order={2}>Rollouts</Title>
      <DataTable
        rows={query.data ?? []}
        columns={[
          {
            id: "nodeName",
            header: "Node",
            accessorFn: (row) => row.nodeName,
          },
          {
            id: "bundleVersion",
            header: "Bundle",
            accessorFn: (row) => row.bundleVersion,
          },
          {
            id: "status",
            header: "Status",
            accessorFn: (row) => row.status,
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            id: "lastApplyStatus",
            header: "Last Apply",
            accessorFn: (row) => row.lastApplyStatus ?? "",
          },
          {
            id: "healthStatus",
            header: "Health",
            accessorFn: (row) => row.healthStatus ?? "",
            cell: (row) =>
              row.healthStatus ? <StatusBadge status={row.healthStatus} /> : "",
          },
          {
            id: "createdAt",
            header: "Created",
            accessorFn: (row) => row.createdAt,
            cell: (row) => formatTimestamp(row.createdAt),
          },
          {
            id: "completedAt",
            header: "Completed",
            accessorFn: (row) => row.completedAt ?? "",
            cell: (row) => formatTimestamp(row.completedAt),
          },
          {
            id: "actions",
            header: "Actions",
            width: 180,
            cell: (row) => (
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setSelectedRolloutId(row.id);
                    disclosure.open();
                  }}
                >
                  Inspect
                </Button>
                {row.status === "succeeded" ? (
                  <Button
                    size="xs"
                    variant="subtle"
                    loading={rollback.isPending}
                    onClick={() => rollback.mutate(row.id)}
                  >
                    Rollback
                  </Button>
                ) : null}
              </Group>
            ),
          },
        ]}
      />
      <Modal
        opened={opened}
        onClose={disclosure.close}
        title="Rollout Detail"
        centered
        size="lg"
      >
        {detail.isLoading ? <LoadingState /> : null}
        {detail.error ? (
          <ErrorState
            message={
              detail.error instanceof Error
                ? detail.error.message
                : "Unable to load rollout"
            }
          />
        ) : null}
        {detail.data ? <RolloutDetail rollout={detail.data} /> : null}
      </Modal>
    </Stack>
  );
}

function RolloutDetail({ rollout }: { rollout: Rollout }) {
  return (
    <Stack>
      <TextInput label="Node" value={rollout.nodeName} readOnly />
      <TextInput
        label="Bundle Version"
        value={String(rollout.bundleVersion)}
        readOnly
      />
      <TextInput label="Status" value={rollout.status} readOnly />
      <TextInput
        label="Last Apply"
        value={rollout.lastApplyStatus ?? ""}
        readOnly
      />
      <TextInput
        label="Message"
        value={rollout.lastApplyMessage ?? ""}
        readOnly
      />
      <TextInput label="Health" value={rollout.healthStatus ?? ""} readOnly />
      <TextInput
        label="Created"
        value={formatTimestamp(rollout.createdAt)}
        readOnly
      />
      <TextInput
        label="Completed"
        value={formatTimestamp(rollout.completedAt)}
        readOnly
      />
      <Code block>{JSON.stringify(rollout.config ?? {}, null, 2)}</Code>
    </Stack>
  );
}
