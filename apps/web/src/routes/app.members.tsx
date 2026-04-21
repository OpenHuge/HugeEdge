import { Alert, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { createFileRoute } from "@tanstack/react-router";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import {
  selfServiceBillingFixtures,
  type MemberFixture,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/app/members")({
  component: AppMembersPage,
});

function AppMembersPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Members</Title>
        <Text c="dimmed">
          Member roster, billing roles, and seat occupancy with reclaim context.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Invite and seat-reassignment actions stay read-only until Track A wires
        account membership APIs.
      </Alert>

      <DataTable<MemberFixture>
        rows={selfServiceBillingFixtures.members}
        columns={[
          {
            id: "email",
            header: "Member",
            accessorFn: (row) => row.email,
          },
          {
            id: "role",
            header: "Role",
            accessorFn: (row) => row.role,
          },
          {
            id: "seatState",
            header: "Seat",
            accessorFn: (row) => row.seatState,
            cell: (row) => <OrderStatusBadge status={row.seatState} />,
          },
          {
            id: "lastActiveAt",
            header: "Last Active",
            accessorFn: (row) => row.lastActiveAt,
          },
        ]}
      />
    </Stack>
  );
}
