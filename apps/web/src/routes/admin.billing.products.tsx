import {
  Alert,
  Badge,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import {
  backendPendingCopy,
  operatorBillingFixtures,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/admin/billing/products")({
  component: AdminBillingProductsPage,
});

function AdminBillingProductsPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Catalog Products</Title>
        <Text c="dimmed">
          Products, SKUs, and price versions stay grouped so operator workflows
          can reason about packaging without backend dependencies.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Product create/edit actions will connect to `/v1/admin/catalog/*`
        after Track A lands. This page currently reflects local fixture state.
      </Alert>

      {operatorBillingFixtures.products.map((product) => (
        <Paper key={product.id} withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Title order={4}>{product.name}</Title>
                <Text size="sm" c="dimmed">
                  {product.summary}
                </Text>
              </Stack>
              <Badge variant="light">{product.audience}</Badge>
            </Group>

            {product.skus.map((sku) => (
              <Paper key={sku.id} withBorder radius="md" p="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Text fw={600}>{sku.name}</Text>
                      <Text size="sm" c="dimmed">
                        {sku.entitlementSummary}
                      </Text>
                    </Stack>
                    <Badge color="blue" variant="light">
                      {sku.type}
                    </Badge>
                  </Group>
                  <Table withTableBorder striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Price Version</Table.Th>
                        <Table.Th>Channel</Table.Th>
                        <Table.Th>Currency</Table.Th>
                        <Table.Th>Amount</Table.Th>
                        <Table.Th>Interval</Table.Th>
                        <Table.Th>Visibility</Table.Th>
                        <Table.Th>Effective From</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sku.priceVersions.map((priceVersion) => (
                        <Table.Tr key={priceVersion.id}>
                          <Table.Td>{priceVersion.label}</Table.Td>
                          <Table.Td>{priceVersion.channel}</Table.Td>
                          <Table.Td>{priceVersion.currency}</Table.Td>
                          <Table.Td>{priceVersion.amount}</Table.Td>
                          <Table.Td>{priceVersion.interval}</Table.Td>
                          <Table.Td>{priceVersion.visibility}</Table.Td>
                          <Table.Td>{priceVersion.effectiveFrom}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      ))}

      <Text size="sm" c="dimmed">
        {backendPendingCopy}
      </Text>
    </Stack>
  );
}
