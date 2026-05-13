import { Progress, Stack, Text } from "@mantine/core";

export function EntitlementMeter({
  label,
  used,
  total,
  unit,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
}) {
  const ratio = total === 0 ? 0 : Math.min((used / total) * 100, 100);

  return (
    <Stack gap={6}>
      <Text fw={600}>{label}</Text>
      <Progress
        value={ratio}
        color={ratio >= 90 ? "red" : ratio >= 70 ? "yellow" : "blue"}
      />
      <Text size="sm" c="dimmed">
        {used} / {total} {unit}
      </Text>
    </Stack>
  );
}
