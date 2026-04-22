import { Alert, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { createFileRoute } from "@tanstack/react-router";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import {
  selfServiceBillingFixtures,
  type InvoiceFixture,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/app/invoices")({
  component: AppInvoicesPage,
});

function AppInvoicesPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Invoices</Title>
        <Text c="dimmed">
          Issued and historical invoices with artifact readiness and due state.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        PDF downloads and invoice dispute flows stay disabled until invoice
        artifact endpoints are ready.
      </Alert>

      <DataTable<InvoiceFixture>
        rows={selfServiceBillingFixtures.invoices}
        columns={[
          {
            id: "id",
            header: "Invoice",
            accessorFn: (row) => row.id,
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
    </Stack>
  );
}
