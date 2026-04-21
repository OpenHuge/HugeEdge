import { Anchor, Button, Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <Container size="md" py={96}>
      <Card withBorder radius="lg" padding="xl">
        <Stack gap="lg">
          <Stack gap={6}>
            <Text c="dimmed" tt="uppercase" fw={700} size="sm">
              HugeEdge
            </Text>
            <Title order={1}>Operator control plane for secure edge operations</Title>
            <Text c="dimmed" maw={640}>
              Use the real admin login flow, inspect tenant and fleet state, and
              validate local development from the same panel used in smoke tests.
            </Text>
          </Stack>
          <Group>
            <Button component={Link} to="/login">
              Sign in
            </Button>
            <Anchor component={Link} to="/admin/overview">
              Open admin
            </Anchor>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
