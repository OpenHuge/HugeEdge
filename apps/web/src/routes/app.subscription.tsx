import {
  Alert,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { BillingMetricCard } from "../components/BillingMetricCard";
import { EntitlementMeter } from "../components/EntitlementMeter";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { selfServiceBillingFixtures } from "../lib/billing-fixtures";

export const Route = createFileRoute("/app/subscription")({
  component: AppSubscriptionPage,
});

function AppSubscriptionPage() {
  const subscription = selfServiceBillingFixtures.currentSubscription;

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Subscription</Title>
        <Text c="dimmed">
          Current plan, renewal timing, and evaluated entitlements for the
          active account.
        </Text>
      </Stack>

      <Alert color="yellow" variant="light">
        {subscription.notice}
      </Alert>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <BillingMetricCard
          label="Plan"
          value={subscription.planName}
          detail={`Billing interval: ${subscription.billingInterval}`}
          tone="blue"
        />
        <BillingMetricCard
          label="Renewal"
          value={subscription.renewsAt}
          detail="Shown from fixture until subscription detail API is connected."
          tone="gray"
        />
        <BillingMetricCard
          label="Account"
          value={subscription.accountName}
          detail="Hybrid account membership billing principal."
          tone="green"
        />
        <BillingMetricCard
          label="State"
          value={subscription.status}
          detail="Status is derived from the effective subscription lifecycle."
          tone="yellow"
        />
      </SimpleGrid>

      <Paper withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Entitlements</Title>
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
          <Text size="sm">
            Current lifecycle state:{" "}
            <OrderStatusBadge status={subscription.status} />
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}
