import { Alert, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { createFileRoute } from "@tanstack/react-router";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import {
  backendPendingCopy,
  operatorBillingFixtures,
  type InvoiceFixture,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/admin/billing/invoices")({
  component: AdminBillingInvoicesPage,
});

function AdminBillingInvoicesPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Invoices</Title>
        <Text c="dimmed">
          Invoice state, artifact readiness, and manual-rail exposure for
          operator finance review.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Download, void, and refund flows stay read-only until invoice endpoints
        are fully connected.
      </Alert>

      <DataTable<InvoiceFixture>
        rows={operatorBillingFixtures.invoices}
        columns={[
          {
            id: "id",
            header: "Invoice",
            accessorFn: (row) => row.id,
          },
          {
            id: "account",
            header: "Account",
            accessorFn: (row) => row.accountName,
          },
          {
            id: "status",
            header: "Status",
            accessorFn: (row) => row.status,
            cell: (row) => <OrderStatusBadge status={row.status} />,
          },
          {
            id: "total",
            header: "Total",
            accessorFn: (row) => row.total,
          },
          {
            id: "dueAt",
            header: "Due",
            accessorFn: (row) => row.dueAt,
          },
          {
            id: "artifact",
            header: "Artifact",
            accessorFn: (row) => row.artifact,
          },
          {
            id: "source",
            header: "Source",
            accessorFn: (row) => row.source,
          },
        ]}
      />

      <Text size="sm" c="dimmed">
        {backendPendingCopy}
      </Text>
    </Stack>
  );
}
