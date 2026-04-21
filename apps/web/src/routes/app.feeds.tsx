import { Alert, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { FeedTokenCard } from "../components/FeedTokenCard";
import { selfServiceBillingFixtures } from "../lib/billing-fixtures";

export const Route = createFileRoute("/app/feeds")({
  component: AppFeedsPage,
});

function AppFeedsPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Subscription Feeds</Title>
        <Text c="dimmed">
          Feed inventory, token lifecycle, expiry metadata, and delivery headers
          as exposed to clients.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Rotate and revoke are present as explicit placeholders until Track A
        exposes `/v1/app/subscription-feeds` mutations.
      </Alert>

      {selfServiceBillingFixtures.feeds.map((feed) => (
        <FeedTokenCard key={feed.id} feed={feed} />
      ))}
    </Stack>
  );
}
