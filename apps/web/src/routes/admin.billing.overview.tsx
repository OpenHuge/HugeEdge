import {
  Alert,
  Badge,
  Button,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { BillingMetricCard } from "../components/BillingMetricCard";
import {
  backendPendingCopy,
  operatorBillingFixtures,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/admin/billing/overview")({
  component: AdminBillingOverviewPage,
});

function AdminBillingOverviewPage() {
  const { overview, subscriptions, orders, invoices, resellers } =
    operatorBillingFixtures;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={2}>Billing Overview</Title>
          <Text c="dimmed">
            Operator billing shell for catalog health, exposure, and settlement
            posture.
          </Text>
        </Stack>
        <Button disabled>Sync Billing State</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
        {overview.metrics.map((metric) => (
          <BillingMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            tone={metric.tone}
          />
        ))}
      </SimpleGrid>

      <Alert color="blue" variant="light">
        {backendPendingCopy}
      </Alert>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Paper withBorder radius="md" p="lg">
          <Stack gap="md">
            <Title order={4}>Lifecycle Snapshot</Title>
            <Group gap="sm">
              <Badge color="green" variant="light">
                {subscriptions.filter((subscription) => subscription.status === "active").length} active
              </Badge>
              <Badge color="blue" variant="light">
                {subscriptions.filter((subscription) => subscription.status === "trialing").length} trialing
              </Badge>
              <Badge color="yellow" variant="light">
                {
                  subscriptions.filter((subscription) => subscription.status === "grace").length
                }{" "}
                in grace
              </Badge>
            </Group>
            <List spacing="sm" size="sm">
              {overview.highlights.map((highlight) => (
                <List.Item key={highlight}>{highlight}</List.Item>
              ))}
            </List>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="lg">
          <Stack gap="md">
            <Title order={4}>Backlog Signals</Title>
            <Text size="sm">
              {orders.filter((order) => order.paymentStatus === "pending").length}{" "}
              orders are blocked on manual rails,{" "}
              {invoices.filter((invoice) => invoice.status === "overdue").length}{" "}
              invoices are overdue, and {resellers.length} resellers currently
              hold prepaid balance.
            </Text>
            <Text size="sm" c="dimmed">
              This shell is intentionally fixture-driven so operator routing and
              page contracts can ship before Track A completes the API surface.
            </Text>
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
