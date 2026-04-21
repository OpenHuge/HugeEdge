import { Badge, Group, Text } from "@mantine/core";
import { MetricCard } from "@hugeedge/ui";

export function BillingMetricCard({
  label,
  value,
  detail,
  tone = "gray",
  actionHint,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "gray" | "green" | "yellow" | "red" | "blue";
  actionHint?: string;
}) {
  return (
    <MetricCard
      label={label}
      value={
        <Group gap="xs" align="center">
          <Text inherit component="span">
            {value}
          </Text>
          <Badge color={tone} variant="light">
            Live fixture
          </Badge>
        </Group>
      }
      detail={actionHint ? `${detail} ${actionHint}` : detail}
    />
  );
}
