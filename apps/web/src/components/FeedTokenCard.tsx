import {
  Badge,
  Button,
  Card,
  Code,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { FeedFixture } from "../lib/billing-fixtures";
import { OrderStatusBadge } from "./OrderStatusBadge";

export function FeedTokenCard({ feed }: { feed: FeedFixture }) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Title order={4}>{feed.name}</Title>
            <Text size="sm" c="dimmed">
              {feed.subscriptionName} · {feed.clientHint}
            </Text>
          </Stack>
          <Group gap="xs">
            <OrderStatusBadge status={feed.tokenStatus} />
            {feed.deviceBound ? (
              <Badge color="violet" variant="light">
                Device bound
              </Badge>
            ) : null}
          </Group>
        </Group>

        <Group grow align="flex-start">
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              Delivery headers
            </Text>
            {feed.headers.map((header) => (
              <Code key={`${feed.id}-${header.name}`} block>
                {header.name}: {header.value}
              </Code>
            ))}
          </Stack>
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              Metadata
            </Text>
            <Text size="sm">Token ID: {feed.tokenId}</Text>
            <Text size="sm">Last used: {feed.lastUsedAt}</Text>
            <Text size="sm">Expires at: {feed.expiresAt}</Text>
            <Text size="sm">ETag: {feed.etag}</Text>
            <Text size="sm">Usage: {feed.usageSummary}</Text>
          </Stack>
        </Group>

        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            Rotate and revoke stay disabled until Track A exposes feed mutations.
          </Text>
          <Group>
            <Button variant="default" disabled>
              Rotate Token
            </Button>
            <Button color="red" variant="light" disabled>
              Revoke Feed
            </Button>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
