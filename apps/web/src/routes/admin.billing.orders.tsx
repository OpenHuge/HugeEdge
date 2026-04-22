import { Alert, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { createFileRoute } from "@tanstack/react-router";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import {
  backendPendingCopy,
  operatorBillingFixtures,
  type OrderFixture,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/admin/billing/orders")({
  component: AdminBillingOrdersPage,
});

function AdminBillingOrdersPage() {
  const rows = operatorBillingFixtures.orders;

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Orders</Title>
        <Text c="dimmed">
          Order and payment state remain visible even when approval and refund
          mutations are not yet wired.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Approve payment and refund actions are blocked in the UI until Track A
        completes the admin order endpoints.
      </Alert>

      <DataTable<OrderFixture>
        rows={rows}
        columns={[
          {
            id: "id",
            header: "Order",
            accessorFn: (row) => row.id,
          },
          {
            id: "account",
            header: "Account",
            accessorFn: (row) => row.accountName,
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
            id: "approval",
            header: "Approval Context",
            accessorFn: (row) => row.approvalNote,
          },
        ]}
      />

      <Text size="sm" c="dimmed">
        {backendPendingCopy}
      </Text>
    </Stack>
  );
}
