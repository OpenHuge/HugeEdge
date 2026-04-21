import {
  Alert,
  Button,
  Code,
  Group,
  Modal,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { useDisclosure } from "@mantine/hooks";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { formatTimestamp } from "../lib/format";

type RolloutFixture = {
  id: string;
  nodeName: string;
  bundleVersion: number;
  status: string;
  lastApplyStatus: string;
  healthStatus: string;
  createdAt: string;
  completedAt?: string;
  lastApplyMessage: string;
  config: Record<string, unknown>;
};

const rolloutFixtures: RolloutFixture[] = [
  {
    id: "rollout-320",
    nodeName: "bootstrap-node",
    bundleVersion: 12,
    status: "succeeded",
    lastApplyStatus: "succeeded",
    healthStatus: "online",
    createdAt: "2026-04-21T00:00:00Z",
    completedAt: "2026-04-21T00:03:00Z",
    lastApplyMessage: "Config applied cleanly across baseline adapter settings.",
    config: { mode: "baseline", profile: "stable" },
  },
  {
    id: "rollout-319",
    nodeName: "edge-sfo-1",
    bundleVersion: 11,
    status: "in_progress",
    lastApplyStatus: "pending",
    healthStatus: "registered",
    createdAt: "2026-04-20T18:45:00Z",
    lastApplyMessage: "Awaiting next heartbeat before config confirm.",
    config: { mode: "canary", trafficMirror: true },
  },
];

export const Route = createFileRoute("/admin/ops/rollouts")({
  component: RolloutsPage,
});

function RolloutsPage() {
  const [selectedRolloutId, setSelectedRolloutId] = useState<string | null>(
    null,
  );
  const [opened, disclosure] = useDisclosure(false);
  const selectedRollout = useMemo(
    () =>
      rolloutFixtures.find((rollout) => rollout.id === selectedRolloutId) ??
      null,
    [selectedRolloutId],
  );

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Rollouts</Title>
      </Stack>

      <Alert color="blue" variant="light">
        This rollout console is fixture-driven until the published API client
        catches up with rollout endpoints. Inspect remains available; rollback
        is a disabled placeholder.
      </Alert>

      <DataTable<RolloutFixture>
        rows={rolloutFixtures}
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
            cell: (row) => <OrderStatusBadge status={row.status} />,
          },
          {
            id: "lastApplyStatus",
            header: "Last Apply",
            accessorFn: (row) => row.lastApplyStatus,
            cell: (row) => <OrderStatusBadge status={row.lastApplyStatus} />,
          },
          {
            id: "healthStatus",
            header: "Health",
            accessorFn: (row) => row.healthStatus,
            cell: (row) => <OrderStatusBadge status={row.healthStatus} />,
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
                <Button size="xs" variant="subtle" disabled>
                  Rollback
                </Button>
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
        {selectedRollout ? <RolloutDetail rollout={selectedRollout} /> : null}
      </Modal>
    </Stack>
  );
}

function RolloutDetail({ rollout }: { rollout: RolloutFixture }) {
  return (
    <Stack>
      <TextInput label="Node" value={rollout.nodeName} readOnly />
      <TextInput
        label="Bundle Version"
        value={String(rollout.bundleVersion)}
        readOnly
      />
      <TextInput label="Status" value={rollout.status} readOnly />
      <TextInput label="Last Apply" value={rollout.lastApplyStatus} readOnly />
      <TextInput label="Message" value={rollout.lastApplyMessage} readOnly />
      <TextInput label="Health" value={rollout.healthStatus} readOnly />
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
      <Code block>{JSON.stringify(rollout.config, null, 2)}</Code>
    </Stack>
  );
}
