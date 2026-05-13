import {
  Alert,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { EntitlementMeter } from "../components/EntitlementMeter";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import {
  backendPendingCopy,
  operatorBillingFixtures,
} from "../lib/billing-fixtures";

export const Route = createFileRoute("/admin/billing/subscriptions")({
  component: AdminBillingSubscriptionsPage,
});

function AdminBillingSubscriptionsPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Subscriptions</Title>
        <Text c="dimmed">
          Effective lifecycle, renewal posture, and entitlement consumption for
          the current billing period.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Suspend, resume, cancel, and adjust flows stay read-only until
        subscription mutations are exposed by Track A.
      </Alert>

      {operatorBillingFixtures.subscriptions.map((subscription) => (
        <Paper key={subscription.id} withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Title order={4}>{subscription.accountName}</Title>
                <Text size="sm" c="dimmed">
                  {subscription.planName} · renews {subscription.renewsAt} ·{" "}
                  {subscription.billingInterval}
                </Text>
              </Stack>
              <OrderStatusBadge status={subscription.status} />
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <EntitlementMeter
                label="Seats"
                used={subscription.seatsUsed}
                total={subscription.seatsTotal}
                unit="seats"
              />
              <EntitlementMeter
                label="Traffic"
                used={subscription.trafficUsedGb}
                total={subscription.trafficTotalGb}
                unit="GB"
              />
              <EntitlementMeter
                label="Feeds"
                used={subscription.feedCountUsed}
                total={subscription.feedCountTotal}
                unit="feeds"
              />
            </SimpleGrid>

            <Text size="sm">{subscription.notice}</Text>
          </Stack>
        </Paper>
      ))}

      <Text size="sm" c="dimmed">
        {backendPendingCopy}
      </Text>
    </Stack>
  );
}
