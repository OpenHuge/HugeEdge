import { Alert, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { DataTable } from "@hugeedge/ui";
import { createFileRoute } from "@tanstack/react-router";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import {
  backendPendingCopy,
  operatorBillingFixtures,
  type ResellerFixture,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/admin/billing/resellers")({
  component: AdminBillingResellersPage,
});

function AdminBillingResellersPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Resellers</Title>
        <Text c="dimmed">
          Wallet balance, settlement windows, recharge-code inventory, and
          customer portfolio visibility for the strict two-level reseller model.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Wallet adjustment and recharge-code generation remain read-only until
        admin reseller mutations are available.
      </Alert>

      <DataTable<ResellerFixture>
        rows={operatorBillingFixtures.resellers}
        columns={[
          {
            id: "name",
            header: "Reseller",
            accessorFn: (row) => row.name,
          },
          {
            id: "wallet",
            header: "Wallet Balance",
            accessorFn: (row) => row.walletBalance,
          },
          {
            id: "settlement",
            header: "Settlement",
            accessorFn: (row) => row.settlementStatus,
            cell: (row) => <OrderStatusBadge status={row.settlementStatus} />,
          },
          {
            id: "window",
            header: "Settlement Window",
            accessorFn: (row) => row.settlementWindow,
          },
          {
            id: "customers",
            header: "Customers",
            accessorFn: (row) => row.customerCount,
          },
          {
            id: "codes",
            header: "Recharge Codes",
            accessorFn: (row) => row.rechargeCodeInventory,
          },
          {
            id: "note",
            header: "Notes",
            accessorFn: (row) => row.note,
          },
        ]}
      />

      <Paper withBorder radius="md" p="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={4}>Settlement Rules</Title>
            <Text size="sm">
              Resellers can prepay, create customer accounts, transfer customers,
              issue recharge codes, and receive monthly settlement statements.
            </Text>
          </Stack>
          <Text size="sm" c="dimmed">
            {backendPendingCopy}
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
