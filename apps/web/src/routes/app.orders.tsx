import { Alert, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { createFileRoute } from "@tanstack/react-router";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import {
  selfServiceBillingFixtures,
  type OrderFixture,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/app/orders")({
  component: AppOrdersPage,
});

function AppOrdersPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Orders</Title>
        <Text c="dimmed">
          Historical self-service orders, payment channel, and activation
          posture.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Pay and retry actions are intentionally read-only until Track A wires
        {" "}
        <code>/v1/app/orders/{'{orderId}'}/pay</code>.
      </Alert>

      <DataTable<OrderFixture>
        rows={selfServiceBillingFixtures.orders}
        columns={[
          {
            id: "id",
            header: "Order",
            accessorFn: (row) => row.id,
          },
          {
            id: "summary",
            header: "Summary",
            accessorFn: (row) => row.summary,
          },
          {
            id: "orderStatus",
            header: "Order Status",
            accessorFn: (row) => row.orderStatus,
            cell: (row) => <OrderStatusBadge status={row.orderStatus} />,
          },
          {
            id: "paymentStatus",
            header: "Payment Status",
            accessorFn: (row) => row.paymentStatus,
            cell: (row) => <OrderStatusBadge status={row.paymentStatus} />,
          },
          {
            id: "channel",
            header: "Channel",
            accessorFn: (row) => row.paymentChannel,
          },
          {
            id: "total",
            header: "Total",
            accessorFn: (row) => row.total,
          },
          {
            id: "createdAt",
            header: "Created",
            accessorFn: (row) => row.createdAt,
          },
          {
            id: "note",
            header: "Status Note",
            accessorFn: (row) => row.approvalNote,
          },
        ]}
      />
    </Stack>
  );
}
