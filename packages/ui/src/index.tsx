import {
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import type { ReactNode } from "react";

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active" || status === "ready"
      ? "green"
      : status === "registered"
        ? "blue"
        : "gray";
  return <Badge color={color}>{status}</Badge>;
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <Card withBorder radius="sm" padding="md">
      <Text size="xs" c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Title order={3}>{value}</Title>
      {detail ? <Text size="sm">{detail}</Text> : null}
    </Card>
  );
}

export function LoadingState() {
  return (
    <Group p="lg">
      <Loader size="sm" />
      <Text>Loading</Text>
    </Group>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <Stack p="lg" gap={4}>
      <Title order={4}>{title}</Title>
      <Text c="dimmed">No records found.</Text>
    </Stack>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Stack p="lg" gap={4}>
      <Title order={4}>Unable to load</Title>
      <Text c="red">{message}</Text>
    </Stack>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { key: keyof T; label: string; render?: (row: T) => ReactNode }[];
}) {
  if (rows.length === 0) {
    return <EmptyState title="Empty" />;
  }
  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          {columns.map((column) => (
            <Table.Th key={String(column.key)}>{column.label}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row, index) => (
          <Table.Tr key={String(row.id ?? index)}>
            {columns.map((column) => (
              <Table.Td key={String(column.key)}>
                {column.render
                  ? column.render(row)
                  : String(row[column.key] ?? "")}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
