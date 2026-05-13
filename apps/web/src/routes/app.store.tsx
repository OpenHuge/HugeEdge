import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  List,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { selfServiceBillingFixtures } from "../lib/billing-fixtures";

export const Route = createFileRoute("/app/store")({
  component: AppStorePage,
});

function AppStorePage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Store</Title>
        <Text c="dimmed">
          Self-service catalog shell for plan selection, add-ons, and checkout
          preview readiness.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Checkout preview and order creation stay disabled until Track A exposes
        `/v1/app/catalog/products`, `/v1/app/checkout/preview`, and
        `/v1/app/orders`.
      </Alert>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }}>
        {selfServiceBillingFixtures.storeProducts.map((product) => (
          <Card key={product.id} withBorder radius="md" padding="lg">
            <Stack gap="md" h="100%">
              <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Title order={4}>{product.name}</Title>
                  <Text size="sm" c="dimmed">
                    {product.summary}
                  </Text>
                </Stack>
                <Badge color="blue" variant="light">
                  {product.interval}
                </Badge>
              </Group>
              <Text fw={700}>{product.price}</Text>
              <List size="sm" spacing="xs">
                {product.highlights.map((highlight) => (
                  <List.Item key={highlight}>{highlight}</List.Item>
                ))}
              </List>
              <Button mt="auto" disabled>
                {product.ctaLabel}
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
